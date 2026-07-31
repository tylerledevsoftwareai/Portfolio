/**
 * Unit Tests for AI Waste Classifier Widget (assets/js/waste-widget.js)
 * @jest-environment jsdom
 */

describe('AI Waste Classifier Widget Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="waste-widget">
        <input type="file" id="waste-file-input" />
        <img id="waste-preview-img" style="display:none;" />
        <div id="waste-placeholder">Upload an image</div>
        <div id="waste-results-area"></div>
        <div id="waste-status">Ready</div>
        <select id="waste-model-select">
          <option value="best" selected>best</option>
          <option value="final_v2">final_v2</option>
        </select>
      </div>
    `;

    window.ENV = {
      WASTE_API_URL: 'https://waste-classification-api-3dd9.onrender.com/api/v1/classify',
      WASTE_API_KEY: 'test_waste_key'
    };

    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should initialize waste classifier event listeners on DOMContentLoaded', () => {
    require('../assets/js/waste-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('waste-file-input');
    const modelSelect = document.getElementById('waste-model-select');

    expect(fileInput).not.toBeNull();
    expect(modelSelect).not.toBeNull();
  });

  test('should execute inference and render probability progress bars', async () => {
    const mockData = {
      prediction: 'Glass',
      confidence_percentage: '94.50%',
      top_k_predictions: [
        { rank: 1, class_name: 'Glass', confidence_percentage: '94.50%' },
        { rank: 2, class_name: 'Plastic', confidence_percentage: '4.20%' }
      ],
      metadata: { inference_time_ms: 42.15, model_file: 'best_model.keras' }
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    require('../assets/js/waste-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('waste-file-input');
    const file = new File(['dummy bytes'], 'glass.jpg', { type: 'image/jpeg' });

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fileInput.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const resultsArea = document.getElementById('waste-results-area');
    const statusBox = document.getElementById('waste-status');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://waste-classification-api-3dd9.onrender.com/api/v1/classify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-API-Key': 'test_waste_key' }
      })
    );

    expect(resultsArea.textContent).toContain('Glass');
    expect(resultsArea.textContent).toContain('94.50%');
    expect(statusBox.textContent).toContain('Inference complete in 42ms');
  });

  test('should re-run inference when model checkpoint select changes', async () => {
    const mockData = {
      prediction: 'Cardboard',
      confidence_percentage: '88.10%',
      top_k_predictions: [
        { rank: 1, class_name: 'Cardboard', confidence_percentage: '88.10%' }
      ],
      metadata: { inference_time_ms: 38.0, model_file: 'final_v2.keras' }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    require('../assets/js/waste-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('waste-file-input');
    const modelSelect = document.getElementById('waste-model-select');
    const file = new File(['dummy bytes'], 'box.jpg', { type: 'image/jpeg' });

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fileInput.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    // Change model checkpoint
    modelSelect.value = 'final_v2';
    modelSelect.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('should handle Waste API error gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error('Internal Server Error'));

    require('../assets/js/waste-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('waste-file-input');
    const file = new File(['dummy bytes'], 'box.jpg', { type: 'image/jpeg' });

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fileInput.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const statusBox = document.getElementById('waste-status');
    expect(statusBox.textContent).toContain('API server initializing');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
