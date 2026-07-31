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
  const SOM_API_KEY = process.env.SOM_API_KEY || '123';

  const WASTE_API_URL = process.env.WASTE_API_URL || 'https://waste-classification-api-3dd9.onrender.com/api/v1/classify';
  const WASTE_API_KEY = process.env.WASTE_API_KEY || '123';

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
  }, 90000);

  test('Live AI Waste Classifier API endpoint should categorize image into top-k predictions', async () => {
    const imagePath = path.join(__dirname, '../assets/images/Avatar.png');
    const imageBuffer = fs.readFileSync(imagePath);

    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    formData.append('image', blob, 'Avatar.png');
    formData.append('model_name', 'best');
    formData.append('top_k', '3');

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
  }, 90000);
});
