/**
 * MemeForge - Quick Meme Editor
 */

// Canvas dimensions
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 480;

// State
let canvas;
let images = [];
let currentLayout = 'single';
let currentAspect = '1:1';

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Initialize Fabric.js canvas
  canvas = new fabric.Canvas('meme-canvas', {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#1a1a2e'
  });

  // Connect to background to clear badge
  try {
    chrome.runtime.connect({ name: 'popup' });
  } catch (e) {
    // Ignore if not in extension context
  }

  // Event listeners
  setupEventListeners();
  
  // Load image from context menu if any
  loadContextMenuImage();
}

function setupEventListeners() {
  // Paste from clipboard
  document.addEventListener('paste', handlePaste);
  
  // Drop zone
  const dropZone = document.getElementById('drop-zone');
  dropZone.addEventListener('dragover', handleDragOver);
  dropZone.addEventListener('dragleave', handleDragLeave);
  dropZone.addEventListener('drop', handleDrop);
  dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => handleFiles(e.target.files);
    input.click();
  });
  
  // Canvas area also accepts drops
  const canvasArea = document.querySelector('.canvas-area');
  canvasArea.addEventListener('dragover', handleDragOver);
  canvasArea.addEventListener('dragleave', handleDragLeave);
  canvasArea.addEventListener('drop', handleDrop);
  
  // Layout buttons
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLayout = btn.dataset.layout;
      renderCanvas();
    });
  });
  
  // Aspect ratio
  document.getElementById('aspect-ratio').addEventListener('change', (e) => {
    currentAspect = e.target.value;
    updateCanvasSize();
    renderCanvas();
  });
  
  // Add text
  document.getElementById('add-text-btn').addEventListener('click', addText);
  
  // Text controls
  document.getElementById('font-family').addEventListener('change', updateSelectedText);
  document.getElementById('font-size').addEventListener('input', (e) => {
    document.getElementById('font-size-value').textContent = e.target.value;
    updateSelectedText();
  });
  document.getElementById('text-color').addEventListener('input', updateSelectedText);
  document.getElementById('stroke-color').addEventListener('input', updateSelectedText);
  document.getElementById('stroke-width').addEventListener('input', updateSelectedText);
  
  // Delete text
  document.getElementById('delete-text-btn').addEventListener('click', deleteSelectedText);
  
  // Copy to clipboard
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  
  // Canvas selection events
  canvas.on('selection:created', showTextControls);
  canvas.on('selection:updated', showTextControls);
  canvas.on('selection:cleared', hideTextControls);
}

// Clipboard paste
async function handlePaste(e) {
  const items = e.clipboardData?.items;
  if (!items) return;
  
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const blob = item.getAsFile();
      await addImageFromBlob(blob);
    }
  }
}

// Drag & drop
function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
}

function handleFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      addImageFromBlob(file);
    }
  }
}

// Add image from blob/file
async function addImageFromBlob(blob) {
  const url = URL.createObjectURL(blob);
  
  return new Promise((resolve) => {
    fabric.Image.fromURL(url, (img) => {
      images.push({
        id: Date.now(),
        fabricImage: img,
        url: url
      });
      
      addImageThumbnail(images[images.length - 1]);
      renderCanvas();
      hideEmptyState();
      resolve();
    });
  });
}

// Add image from URL (for context menu)
async function addImageFromURL(url) {
  try {
    // Try to fetch the image to handle CORS
    const response = await fetch(url);
    const blob = await response.blob();
    await addImageFromBlob(blob);
  } catch (e) {
    console.log('Fetch failed, trying direct load:', e);
    // Fallback: try loading directly (might work for some URLs)
    fabric.Image.fromURL(url, (img) => {
      if (img) {
        images.push({
          id: Date.now(),
          fabricImage: img,
          url: url
        });
        
        addImageThumbnail(images[images.length - 1]);
        renderCanvas();
        hideEmptyState();
      } else {
        console.error('Failed to load image from URL:', url);
        alert('Could not load image. Try saving it first, then drag & drop.');
      }
    }, { crossOrigin: 'anonymous' });
  }
}

// Thumbnail management
function addImageThumbnail(imageData) {
  const container = document.createElement('div');
  container.className = 'image-thumb-container';
  container.dataset.id = imageData.id;
  
  const thumb = document.createElement('img');
  thumb.className = 'image-thumb';
  thumb.src = imageData.url;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'image-thumb-remove';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => removeImage(imageData.id);
  
  container.appendChild(thumb);
  container.appendChild(removeBtn);
  document.getElementById('image-list').appendChild(container);
}

function removeImage(id) {
  images = images.filter(img => img.id !== id);
  document.querySelector(`[data-id="${id}"]`)?.remove();
  renderCanvas();
  
  if (images.length === 0) {
    showEmptyState();
  }
}

// Canvas rendering
function renderCanvas() {
  // Clear canvas objects but keep background
  canvas.getObjects().forEach(obj => {
    if (obj.type !== 'textbox') {
      canvas.remove(obj);
    }
  });
  
  if (images.length === 0) return;
  
  const width = canvas.width;
  const height = canvas.height;
  
  switch (currentLayout) {
    case 'single':
      renderSingleImage(width, height);
      break;
    case 'vertical':
      renderVerticalStack(width, height);
      break;
    case 'horizontal':
      renderHorizontalSplit(width, height);
      break;
    case 'grid':
      renderGrid(width, height);
      break;
  }
  
  canvas.renderAll();
}

function renderSingleImage(width, height) {
  if (images.length === 0) return;
  
  // Clone the image to avoid reuse issues
  images[0].fabricImage.clone((img) => {
    scaleAndPositionImage(img, 0, 0, width, height);
    canvas.add(img);
    canvas.renderAll();
    bringTextToFront();
  });
}

function renderVerticalStack(width, height) {
  const halfHeight = height / 2;
  
  if (images.length >= 1) {
    images[0].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, 0, width, halfHeight);
      canvas.add(img);
      canvas.renderAll();
      bringTextToFront();
    });
  }
  
  if (images.length >= 2) {
    images[1].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, halfHeight, width, halfHeight);
      canvas.add(img);
      canvas.renderAll();
      bringTextToFront();
    });
  }
}

function renderHorizontalSplit(width, height) {
  const halfWidth = width / 2;
  
  if (images.length >= 1) {
    images[0].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, 0, halfWidth, height);
      canvas.add(img);
      canvas.renderAll();
      bringTextToFront();
    });
  }
  
  if (images.length >= 2) {
    images[1].fabricImage.clone((img) => {
      scaleAndPositionImage(img, halfWidth, 0, halfWidth, height);
      canvas.add(img);
      canvas.renderAll();
      bringTextToFront();
    });
  }
}

function renderGrid(width, height) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const positions = [
    [0, 0], [halfWidth, 0],
    [0, halfHeight], [halfWidth, halfHeight]
  ];
  
  for (let i = 0; i < Math.min(images.length, 4); i++) {
    const pos = positions[i];
    images[i].fabricImage.clone((img) => {
      scaleAndPositionImage(img, pos[0], pos[1], halfWidth, halfHeight);
      canvas.add(img);
      canvas.renderAll();
      bringTextToFront();
    });
  }
}

function bringTextToFront() {
  canvas.getObjects().forEach(obj => {
    if (obj.type === 'textbox') {
      canvas.bringToFront(obj);
    }
  });
}

function scaleAndPositionImage(img, x, y, maxWidth, maxHeight) {
  // Reset any previous transformations
  img.set({
    left: x,
    top: y,
    scaleX: 1,
    scaleY: 1,
    selectable: false
  });
  
  // Scale to fit
  const scaleX = maxWidth / img.width;
  const scaleY = maxHeight / img.height;
  const scale = Math.min(scaleX, scaleY);
  
  img.scale(scale);
  
  // Center within the area
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  img.set({
    left: x + (maxWidth - scaledWidth) / 2,
    top: y + (maxHeight - scaledHeight) / 2
  });
}

// Canvas size based on aspect ratio
function updateCanvasSize() {
  let width = CANVAS_WIDTH;
  let height = CANVAS_HEIGHT;
  
  switch (currentAspect) {
    case '1:1':
      height = width;
      break;
    case '4:3':
      height = width * (3/4);
      break;
    case '16:9':
      height = width * (9/16);
      break;
    case '9:16':
      height = width * (16/9);
      if (height > 500) {
        height = 500;
        width = height * (9/16);
      }
      break;
    case 'free':
      // Keep current
      break;
  }
  
  canvas.setDimensions({ width, height });
}

// Text functions
function addText() {
  const text = new fabric.Textbox('YOUR TEXT', {
    left: canvas.width / 2,
    top: canvas.height / 2,
    originX: 'center',
    originY: 'center',
    fontFamily: document.getElementById('font-family').value,
    fontSize: parseInt(document.getElementById('font-size').value),
    fill: document.getElementById('text-color').value,
    stroke: document.getElementById('stroke-color').value,
    strokeWidth: parseInt(document.getElementById('stroke-width').value),
    textAlign: 'center',
    width: canvas.width * 0.8,
    editable: true,
    paintFirst: 'stroke'
  });
  
  canvas.add(text);
  canvas.setActiveObject(text);
  text.enterEditing();
  text.selectAll();
  canvas.renderAll();
  
  showTextControls();
}

function updateSelectedText() {
  const activeObject = canvas.getActiveObject();
  if (!activeObject || activeObject.type !== 'textbox') return;
  
  activeObject.set({
    fontFamily: document.getElementById('font-family').value,
    fontSize: parseInt(document.getElementById('font-size').value),
    fill: document.getElementById('text-color').value,
    stroke: document.getElementById('stroke-color').value,
    strokeWidth: parseInt(document.getElementById('stroke-width').value)
  });
  
  canvas.renderAll();
}

function deleteSelectedText() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'textbox') {
    canvas.remove(activeObject);
    canvas.renderAll();
    hideTextControls();
  }
}

function showTextControls() {
  const activeObject = canvas.getActiveObject();
  if (activeObject && activeObject.type === 'textbox') {
    document.getElementById('text-controls').classList.remove('hidden');
    
    // Update controls to match selected text
    document.getElementById('font-family').value = activeObject.fontFamily;
    document.getElementById('font-size').value = activeObject.fontSize;
    document.getElementById('font-size-value').textContent = activeObject.fontSize;
    document.getElementById('text-color').value = activeObject.fill;
    document.getElementById('stroke-color').value = activeObject.stroke || '#000000';
    document.getElementById('stroke-width').value = activeObject.strokeWidth || 2;
  }
}

function hideTextControls() {
  // Keep controls visible if there are any text objects
  const hasText = canvas.getObjects().some(obj => obj.type === 'textbox');
  if (!hasText) {
    document.getElementById('text-controls').classList.add('hidden');
  }
}

// Empty state
function showEmptyState() {
  document.getElementById('empty-state').classList.remove('hidden');
}

function hideEmptyState() {
  document.getElementById('empty-state').classList.add('hidden');
}

// Copy to clipboard
async function copyToClipboard() {
  const btn = document.getElementById('copy-btn');
  
  try {
    // Deselect any active object to hide selection handles
    canvas.discardActiveObject();
    canvas.renderAll();
    
    // Get canvas as blob
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const blob = await (await fetch(dataURL)).blob();
    
    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    
    // Success feedback
    btn.textContent = '✓ Copied!';
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.textContent = '📋 Copy to Clipboard';
      btn.classList.remove('success');
    }, 2000);
    
  } catch (err) {
    console.error('Failed to copy:', err);
    btn.textContent = '❌ Failed';
    setTimeout(() => {
      btn.textContent = '📋 Copy to Clipboard';
    }, 2000);
  }
}

// Context menu image loading
function loadContextMenuImage() {
  chrome.storage.local.get(['contextMenuImageUrl'], (result) => {
    if (result.contextMenuImageUrl) {
      addImageFromURL(result.contextMenuImageUrl);
      // Clear it so it doesn't reload next time
      chrome.storage.local.remove('contextMenuImageUrl');
    }
  });
}
