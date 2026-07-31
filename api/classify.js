export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_URL = process.env.WASTE_API_URL || 'https://waste-classification-api-3dd9.onrender.com/api/v1/classify';
  const API_KEY = process.env.WASTE_API_KEY || '16462165';

  try {
    const rawBody = await getRawBody(req);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'content-type': req.headers['content-type']
      },
      body: rawBody
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Proxy request failed', details: err.message });
  }
}
