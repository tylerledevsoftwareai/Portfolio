async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { mode, chatInput, sessionId } = req.body || {};

  const WORKFLOWS = {
    interview: 'https://opacity-referee-thirty.ngrok-free.dev/webhook/tyler-le-interview-prep/chat',
    professional: 'https://opacity-referee-thirty.ngrok-free.dev/webhook/109f5b2a-50c4-4e63-b1d8-eeb1472e74c5/chat'
  };

  const targetUrl = WORKFLOWS[mode] || WORKFLOWS.professional;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        chatInput: chatInput || '',
        action: 'sendMessage',
        sessionId: sessionId || `eval-session-${Date.now()}`
      })
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy request to n8n webhook failed', details: err.message });
  }
}

module.exports = handler;
module.exports.default = handler;
