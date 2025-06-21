import { useState } from 'react';
import './App.css';

function App() {
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStartConversation = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/start-conversation', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
      });
      const data = await res.json();
      setVideoUrl(data.video_url);
    } catch (err) {
      console.error("Error fetching video:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Video AI Agent</h1>
      <button onClick={handleStartConversation}>
        {loading ? 'Loading...' : 'Start Conversation'}
      </button>

      {videoUrl && (
        <div style={{ marginTop: '20px' }}>
          <video src={videoUrl} controls autoPlay width="500" />
        </div>
      )}
    </div>
  );
}

export default App;
