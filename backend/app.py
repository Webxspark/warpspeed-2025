from flask import Flask, request, jsonify
import requests
import os
import logging
from dotenv import load_dotenv
from flask_cors import CORS
from sarvamai import SarvamAI
import json
load_dotenv()

app = Flask(__name__)
CORS(app)

TAVUS_API_KEY = os.getenv("TAVUS_API_KEY")
TAVUS_API_URL = "https://tavusapi.com/v2/conversations"


sarvamClient = SarvamAI(
api_subscription_key=os.getenv("SARVAM_API_KEY")
)

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
            "participant_left_timeout": 10,
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



#fetch the conversation details from conversation id
@app.route("/conversation/<conversation_id>", methods=["GET"])
def get_conversation(conversation_id):
    headers = {"Content-Type": "application/json", "x-api-key": TAVUS_API_KEY}
    url = f"{TAVUS_API_URL}/{conversation_id}?verbose=true"
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        finalResp = (response.json())
        transcript = finalResp["events"][2]['properties']['transcript'][1:]
        # stringify the transcript
        transcript_str = json.dumps(transcript)

        response = sarvamClient.chat.completions(
            messages=[
                {
                "role": "system", "content": '''
                    You are a helpful assistant that summarizes the conversation transcript and provides the following details in JSON format:
                    {
                        "ai_summary": <string[max:1000]>,
                        "requirements": <string[max:1500]>,
                        "requirement_summary": <string[max:100]>,
                        "notes": <string[max:1000]>,
                        "suggestions": <string[max:1000]>,
                        "client_name": <string[max:100]>,
                        "client_email": <string[max:100]>,
                        "client_phone": <string[max:100]>,
                    }
                    Fill N/A for any missing fields.
                '''
                },
                {
                    "role": "user",
                    "content": f"Here is the conversation transcript:\n{transcript_str}\n\nPlease summarize the conversation and provide the required details in JSON format. Make sure to provide valid, parseable JSON without any explanation text."
                }
            ],

        )
        
        # Get the response content
        content_str = response.choices[0].message.content
        print("Raw response content:", content_str)
        
        try:
            # Parse the content as JSON
            parsed_json = json.loads(content_str)
            print("Parsed JSON:", parsed_json)
            # Return the parsed JSON directly
            return jsonify(parsed_json)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # Return the raw content if parsing fails
            return jsonify({"raw_content": content_str, "error": "Could not parse as JSON"})

    except requests.exceptions.RequestException as e:
        if e.response is not None:
            print("Tavus Error Response:", e.response.status_code, e.response.text)
        else:
            print("Tavus Error:", str(e))
        return jsonify({"error": "Failed to fetch conversation details"}), 500



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)  # REMOVE debug=True IN PRODUCTION
