// SOM Color Extractor Interactive Engine
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('som-file-input');
  const previewImg = document.getElementById('som-preview-img');
  const placeholder = document.getElementById('som-placeholder');
  const paletteGrid = document.getElementById('som-palette-grid');
  const statusBox = document.getElementById('som-status');
  const gridSelect = document.getElementById('som-grid-select');

  const API_URL = (window.ENV && window.ENV.SOM_API_URL) || '/api/palette';
  const API_KEY = (window.ENV && window.ENV.SOM_API_KEY) || '';
  let currentSomFile = null;

  function compressImageIfNeeded(file, maxDimension = 800) {
    return new Promise((resolve) => {
      if (!file || file.size < 1024 * 1024) {
        return resolve(file);
      }

      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            resolve(blob || file);
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function extractPalette(blob, dataUrl) {
    if (blob) currentSomFile = { blob, dataUrl };
    const fileToUse = blob || (currentSomFile ? currentSomFile.blob : null);
    const urlToUse = dataUrl || (currentSomFile ? currentSomFile.dataUrl : null);

    if (!fileToUse) return;

    if (urlToUse) {
      previewImg.src = urlToUse;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    }

    const gridSize = gridSelect ? gridSelect.value : '3';
    paletteGrid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    paletteGrid.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;

    statusBox.innerHTML = `<span><span class="som-loading-spinner"></span> Running SOM Vector Quantization (${gridSize}x${gridSize})...</span>`;

    try {
      const compressedBlob = await compressImageIfNeeded(fileToUse);
      const formData = new FormData();
      formData.append('image', compressedBlob, 'image.jpg');
      formData.append('grid_x', gridSize);
      formData.append('grid_y', gridSize);

      const headers = {};
      if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      renderPalette(data.palette, data.summary);

    } catch (err) {
      console.error('SOM Extraction Error:', err);
      statusBox.innerHTML = `<span style="color:#ef4444;">API server initializing... retry shortly.</span>`;
    }
  }

  function renderPalette(palette, summary) {
    paletteGrid.innerHTML = '';
    palette.forEach(item => {
      const swatch = document.createElement('div');
      swatch.className = 'som-swatch';
      swatch.style.backgroundColor = item.hex;
      swatch.title = `Click to copy ${item.hex}`;

      const hexLabel = document.createElement('span');
      hexLabel.className = 'som-swatch-hex';
      hexLabel.textContent = item.hex;

      swatch.appendChild(hexLabel);

      swatch.addEventListener('click', () => {
        navigator.clipboard.writeText(item.hex);
        hexLabel.textContent = 'Copied!';
        setTimeout(() => { hexLabel.textContent = item.hex; }, 1200);
      });

      paletteGrid.appendChild(swatch);
    });

    const epochs = summary ? summary.total_epochs_run : '100';
    statusBox.innerHTML = `<span style="color:#38BDF8;">✓ Done (${epochs} epochs). Click swatch to copy HEX!</span>`;
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          extractPalette(file, event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (gridSelect) {
    gridSelect.addEventListener('change', () => {
      if (currentSomFile) extractPalette(currentSomFile.blob, currentSomFile.dataUrl);
    });
  }
});
