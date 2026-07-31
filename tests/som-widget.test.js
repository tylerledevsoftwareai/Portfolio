/**
 * Unit Tests for SOM Color Extractor Widget (assets/js/som-widget.js)
 * @jest-environment jsdom
 */

describe('SOM Color Extractor Widget Suite', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="som-widget">
        <input type="file" id="som-file-input" />
        <img id="som-preview-img" style="display:none;" />
        <div id="som-placeholder">Upload an image</div>
        <div id="som-palette-grid"></div>
        <div id="som-status">Ready</div>
        <select id="som-grid-select">
          <option value="3" selected>3x3</option>
          <option value="4">4x4</option>
        </select>
      </div>
    `;

    window.ENV = {
      SOM_API_URL: 'https://som-color-extractor.onrender.com/api/v1/palette',
      SOM_API_KEY: 'test_secret_key'
    };

    global.fetch = jest.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve())
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('should initialize SOM widget event listeners on DOMContentLoaded', () => {
    require('../assets/js/som-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('som-file-input');
    const gridSelect = document.getElementById('som-grid-select');

    expect(fileInput).not.toBeNull();
    expect(gridSelect).not.toBeNull();
  });

  test('should handle successful SOM palette extraction response and swatch click', async () => {
    const mockResponse = {
      palette: [
        { index: 0, rgb: [255, 0, 0], hex: '#FF0000', percentage: 50.0 },
        { index: 1, rgb: [0, 255, 0], hex: '#00FF00', percentage: 50.0 }
      ],
      summary: { total_epochs_run: 50 }
    };

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    require('../assets/js/som-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('som-file-input');
    const gridSelect = document.getElementById('som-grid-select');
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fileInput.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const statusBox = document.getElementById('som-status');
    const grid = document.getElementById('som-palette-grid');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://som-color-extractor.onrender.com/api/v1/palette',
      expect.objectContaining({
        method: 'POST',
        headers: { 'X-API-Key': 'test_secret_key' }
      })
    );

    expect(grid.children.length).toBe(2);
    expect(statusBox.textContent).toContain('Done (50 epochs)');

    // Test swatch click handler
    const firstSwatch = grid.children[0];
    firstSwatch.dispatchEvent(new Event('click'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('#FF0000');

    // Test grid select change handler with stored file
    gridSelect.value = '4';
    gridSelect.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('should handle API failure gracefully with status update', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockRejectedValueOnce(new Error('Network Error'));

    require('../assets/js/som-widget.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const fileInput = document.getElementById('som-file-input');
    const file = new File(['dummy content'], 'test.png', { type: 'image/png' });

    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    fileInput.dispatchEvent(new Event('change'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const statusBox = document.getElementById('som-status');
    expect(statusBox.textContent).toContain('API server initializing');
    expect(consoleSpy).toHaveBeenCalled();
  });
});
