/**
 * Real Production API Integration Smoke Tests
 * Run with: npm run test:e2e
 * @jest-environment node
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

describe('Live Production API Integration Smoke Tests', () => {
  const SOM_API_URL = process.env.SOM_API_URL || 'https://som-color-extractor.onrender.com/api/v1/palette';
  const SOM_API_KEY = process.env.SOM_API_KEY;

  const WASTE_API_URL = process.env.WASTE_API_URL || 'https://waste-classification-api-3dd9.onrender.com/api/v1/classify';
  const WASTE_API_KEY = process.env.WASTE_API_KEY;

  const TYLERAI_WORKFLOW_URL = process.env.TYLERAI_WORKFLOW_URL || 'https://opacity-referee-thirty.ngrok-free.dev/webhook/109f5b2a-50c4-4e63-b1d8-eeb1472e74c5/chat';

  async function warmupEndpoint(endpointUrl, retries = 5, delayMs = 5000) {
    let origin = endpointUrl;
    try {
      origin = new URL(endpointUrl).origin;
    } catch (e) {
      // fallback if URL parsing fails
    }
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(origin, { method: 'GET' });
        if (res.ok || res.status < 500) {
          console.log(`[Warmup] Pinged ${origin} successfully (Status: ${res.status})`);
          return true;
        }
      } catch (err) {
        console.warn(`[Warmup] Attempt ${i + 1}/${retries} failed for ${origin}: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    return false;
  }

  beforeAll(async () => {
    console.log('Warming up Render free-tier API services before integration tests...');
    await Promise.all([
      warmupEndpoint(SOM_API_URL),
      warmupEndpoint(WASTE_API_URL)
    ]);
  }, 120000);

  test('Live SOM Color Extractor API endpoint should return valid 3x3 palette', async () => {
    const imagePath = path.join(__dirname, '../assets/images/Avatar.png');
    const imageBuffer = fs.readFileSync(imagePath);

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'Avatar.png');
    formData.append('grid_x', '3');
    formData.append('grid_y', '3');

    const response = await fetch(SOM_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': SOM_API_KEY
      },
      body: formData
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('palette');
    expect(Array.isArray(data.palette)).toBe(true);
    expect(data.palette.length).toBe(9);
  }, 120000);

  test('Live AI Waste Classifier API endpoint should categorize image into top-k predictions', async () => {
    const imagePath = path.join(__dirname, '../assets/images/Avatar.png');
    const imageBuffer = fs.readFileSync(imagePath);

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'Avatar.png');
    formData.append('model_name', 'best');
    formData.append('top_k', '10');

    const response = await fetch(WASTE_API_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': WASTE_API_KEY
      },
      body: formData
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('prediction');
    expect(data).toHaveProperty('confidence_percentage');
    expect(data).toHaveProperty('top_k_predictions');
    expect(data.top_k_predictions.length).toBeGreaterThan(0);
  }, 120000);

  test('Live Tyler AI n8n Webhook endpoint should respond to prompt queries', async () => {
    const payload = {
      chatInput: 'Tell me about yourself',
      action: 'sendMessage',
      sessionId: `ci-eval-session-${Date.now()}`
    };

    const response = await fetch(TYLERAI_WORKFLOW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(payload)
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    const reply = typeof data === 'string' ? data : (data.output || data.text || data.message || JSON.stringify(data));
    expect(reply).toBeTruthy();
  }, 90000);
});
