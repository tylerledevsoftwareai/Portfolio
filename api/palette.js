export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_URL = process.env.SOM_API_URL || 'https://som-color-extractor.onrender.com/api/v1/palette';
  const API_KEY = process.env.SOM_API_KEY || 'secret_key_som_9988';

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'content-type': req.headers['content-type']
      },
      body: req
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy request failed', details: err.message });
  }
}
