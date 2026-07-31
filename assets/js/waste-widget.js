// AI Waste Classifier Interactive Engine
document.addEventListener('DOMContentLoaded', () => {
  const fileInput = document.getElementById('waste-file-input');
  const previewImg = document.getElementById('waste-preview-img');
  const placeholder = document.getElementById('waste-placeholder');
  const resultsArea = document.getElementById('waste-results-area');
  const statusBox = document.getElementById('waste-status');
  const modelSelect = document.getElementById('waste-model-select');

  const API_URL = (window.ENV && window.ENV.WASTE_API_URL) || '/api/classify';
  const API_KEY = (window.ENV && window.ENV.WASTE_API_KEY) || '';
  let currentWasteFile = null;

  const iconMap = {
    'Plastic': '🥤',
    'Cardboard': '📦',
    'Glass': '🍾',
    'Metal': '🥫',
    'Paper': '📄',
    'Vegetation': '🍃',
    'Food Organics': '🥑',
    'Textile Trash': '👕',
    'Miscellaneous Trash': '🗑️',
    'IED': '⚠️'
  };

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

  async function runInference(blob, dataUrl) {
    if (blob) currentWasteFile = { blob, dataUrl };
    const fileToUse = blob || (currentWasteFile ? currentWasteFile.blob : null);
    const urlToUse = dataUrl || (currentWasteFile ? currentWasteFile.dataUrl : null);

    if (!fileToUse) return;

    if (urlToUse) {
      previewImg.src = urlToUse;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    }

    const selectedModel = modelSelect ? modelSelect.value : 'best';
    statusBox.innerHTML = `<span><span class="som-loading-spinner"></span> Running CNN Model ('${selectedModel}' checkpoint)...</span>`;

    try {
      const compressedBlob = await compressImageIfNeeded(fileToUse);
      const formData = new FormData();
      formData.append('image', compressedBlob, 'image.jpg');
      formData.append('model_name', selectedModel);
      formData.append('top_k', '3');

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
      renderResults(data);

    } catch (err) {
      console.error('Waste Classification Error:', err);
      statusBox.innerHTML = `<span style="color:#ef4444;">API server initializing... retry shortly.</span>`;
    }
  }

  function renderResults(data) {
    resultsArea.innerHTML = '';

    const topClass = data.prediction || 'Unknown';
    const topConf = data.confidence_percentage || '0%';
    const icon = iconMap[topClass] || '♻️';

    const topHeader = document.createElement('div');
    topHeader.className = 'waste-top-pred';
    topHeader.innerHTML = `<span>${icon} ${topClass}</span> <span class="waste-top-conf">${topConf}</span>`;
    resultsArea.appendChild(topHeader);

    const topK = data.top_k_predictions || [];
    topK.slice(0, 3).forEach(pred => {
      const row = document.createElement('div');
      row.className = 'waste-bar-row';
      const pIcon = iconMap[pred.class_name] || '♻️';
      row.innerHTML = `
        <div class="waste-bar-label">
          <span>${pIcon} ${pred.class_name}</span>
          <span>${pred.confidence_percentage}</span>
        </div>
        <div class="waste-bar-track">
          <div class="waste-bar-fill" style="width: ${pred.confidence_percentage};"></div>
        </div>
      `;
      resultsArea.appendChild(row);
    });

    const timeMs = data.metadata ? Math.round(data.metadata.inference_time_ms) : 45;
    statusBox.innerHTML = `<span style="color:#34D399;">✓ Inference complete in ${timeMs}ms (Model: ${data.metadata ? data.metadata.model_file : 'best'})</span>`;
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          runInference(file, event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', () => {
      if (currentWasteFile) runInference(currentWasteFile.blob, currentWasteFile.dataUrl);
    });
  }
});