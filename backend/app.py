from flask import Flask, request, jsonify
import requests
import os
import logging
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
TAVUS_API_URL = "https://tavusapi.com/v2/conversations"

logging.basicConfig(level=logging.INFO)


@app.route("/start-conversation", methods=["POST"])
def start_conversation():
    payload = {
        "replica_id": os.getenv("TAVUS_REPLICA_ID"),
        "persona_id": os.getenv("TAVUS_PERSONA_ID"),
        "callback_url": os.getenv(
            "TAVUS_CALLBACK_URL", "https://your-real-domain.com/webhook"
        ),
        "conversation_name": request.json.get(
            "conversation_name", "A Meeting with a Potential Client"
        ),
        "conversational_context": request.json.get(
            "context",
            "You are the company's AI video engagement agent, replacing traditional web forms. Your job is to warmly greet potential clients, ask them what services theyre looking for, and help assess whether their needs align with the companys offerings. If their request is not a fit, kindly suggest reaching out via email. Be helpful, trustworthy, and human-like.",
            # THIS IS WHERE WE WOULD ALSO NEED TO PASS THE CAL.COM NEXT 10 FREE SLOTS JSON TOO
        ),
        "custom_greeting": request.json.get("greeting", "Hey there!"),
        "properties": {
            "max_call_duration": 3600,
            "participant_left_timeout": 60,
            "participant_absent_timeout": 300,
            "enable_recording": True,
            "enable_closed_captions": True,
            "apply_greenscreen": False,
            "language": "english",
            "recording_s3_bucket_name": "conversation-recordings",
            "recording_s3_bucket_region": "us-east-1",
            "aws_assume_role_arn": "",
        },
    }

    headers = {"Content-Type": "application/json", "x-api-key": TAVUS_API_KEY}

    try:
        response = requests.post(TAVUS_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        if e.response is not None:
            print("Tavus Error Response:", e.response.status_code, e.response.text)
        else:
            print("Tavus Error:", str(e))
        return jsonify({"error": "Failed to start Tavus conversation"}), 500


@app.route("/")
def home():
    return "Tavus Conversation Starter is Running!"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)  # REMOVE debug=True IN PRODUCTION
