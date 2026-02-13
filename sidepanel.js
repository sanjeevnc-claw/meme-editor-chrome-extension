/**
 * MemeForge - Side Panel Editor
 */

// Canvas dimensions
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

// State
let canvas;
let images = []; // { id, dataUrl, fabricImage, zoom, posX, posY }
let currentLayout = 'single';
let currentAspect = '1:1';
let currentBgColor = '#ffffff';
let imageZoom = 100;
let imagePosX = 0;
let imagePosY = 0;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Initialize Fabric.js canvas
  canvas = new fabric.Canvas('meme-canvas', {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: currentBgColor
  });

  // Setup event listeners
  setupEventListeners();
  
  // Load saved images from storage
  await loadSavedImages();
  
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
  dropZone.addEventListener('click', openFilePicker);
  
  // Canvas area also accepts drops
  const canvasArea = document.querySelector('.canvas-area');
  canvasArea.addEventListener('dragover', handleDragOver);
  canvasArea.addEventListener('dragleave', handleDragLeave);
  canvasArea.addEventListener('drop', handleDrop);
  
  // Clear all images
  document.getElementById('clear-images').addEventListener('click', clearAllImages);
  
  // Layout buttons
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLayout = btn.dataset.layout;
      renderCanvas();
    });
  });
  
  // Background toggle
  document.querySelectorAll('.toggle-btn[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn[data-bg]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBgColor = btn.dataset.bg;
      canvas.setBackgroundColor(currentBgColor, () => canvas.renderAll());
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
  document.getElementById('font-size').addEventListener('input', updateSelectedText);
  document.getElementById('text-color').addEventListener('input', updateSelectedText);
  document.getElementById('stroke-color').addEventListener('input', updateSelectedText);
  document.getElementById('stroke-width').addEventListener('input', updateSelectedText);
  
  // Delete text
  document.getElementById('delete-text-btn').addEventListener('click', deleteSelectedText);
  
  // Image zoom & position
  document.getElementById('image-zoom').addEventListener('input', (e) => {
    imageZoom = parseInt(e.target.value);
    document.getElementById('zoom-value').textContent = imageZoom + '%';
    renderCanvas();
  });
  
  document.getElementById('image-pos-x').addEventListener('input', (e) => {
    imagePosX = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('image-pos-y').addEventListener('input', (e) => {
    imagePosY = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('reset-adjust').addEventListener('click', () => {
    imageZoom = 100;
    imagePosX = 0;
    imagePosY = 0;
    document.getElementById('image-zoom').value = 100;
    document.getElementById('zoom-value').textContent = '100%';
    document.getElementById('image-pos-x').value = 0;
    document.getElementById('image-pos-y').value = 0;
    renderCanvas();
  });
  
  // Copy to clipboard
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  
  // Canvas selection events
  canvas.on('selection:created', showTextControls);
  canvas.on('selection:updated', showTextControls);
  canvas.on('selection:cleared', hideTextControls);
}

function openFilePicker() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.multiple = true;
  input.onchange = (e) => handleFiles(e.target.files);
  input.click();
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
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  handleFiles(e.dataTransfer.files);
}

function handleFiles(files) {
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      addImageFromBlob(file);
    }
  }
}

// Convert blob to data URL for storage
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Add image from blob/file
async function addImageFromBlob(blob) {
  const dataUrl = await blobToDataURL(blob);
  
  return new Promise((resolve) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      const imageData = {
        id: Date.now(),
        dataUrl: dataUrl,
        fabricImage: img
      };
      
      images.push(imageData);
      addImageThumbnail(imageData);
      renderCanvas();
      hideEmptyState();
      saveImagesToStorage();
      resolve();
    });
  });
}

// Add image from data URL (for loading from storage)
function addImageFromDataURL(dataUrl, id) {
  return new Promise((resolve) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      const imageData = {
        id: id || Date.now(),
        dataUrl: dataUrl,
        fabricImage: img
      };
      
      images.push(imageData);
      addImageThumbnail(imageData);
      resolve();
    });
  });
}

// Thumbnail management
function addImageThumbnail(imageData) {
  const container = document.createElement('div');
  container.className = 'image-thumb-container';
  container.dataset.id = imageData.id;
  
  const thumb = document.createElement('img');
  thumb.className = 'image-thumb';
  thumb.src = imageData.dataUrl;
  
  const removeBtn = document.createElement('button');
  removeBtn.className = 'image-thumb-remove';
  removeBtn.textContent = '×';
  removeBtn.onclick = (e) => {
    e.stopPropagation();
    removeImage(imageData.id);
  };
  
  container.appendChild(thumb);
  container.appendChild(removeBtn);
  document.getElementById('image-list').appendChild(container);
}

function removeImage(id) {
  images = images.filter(img => img.id !== id);
  document.querySelector(`[data-id="${id}"]`)?.remove();
  renderCanvas();
  saveImagesToStorage();
  
  if (images.length === 0) {
    showEmptyState();
  }
}

function clearAllImages() {
  images = [];
  document.getElementById('image-list').innerHTML = '';
  renderCanvas();
  saveImagesToStorage();
  showEmptyState();
}

// Storage
async function saveImagesToStorage() {
  const imageDataArray = images.map(img => ({
    id: img.id,
    dataUrl: img.dataUrl
  }));
  
  try {
    await chrome.storage.local.set({ savedImages: imageDataArray });
  } catch (e) {
    console.log('Failed to save images:', e);
  }
}

async function loadSavedImages() {
  try {
    const result = await chrome.storage.local.get(['savedImages']);
    if (result.savedImages && result.savedImages.length > 0) {
      for (const imgData of result.savedImages) {
        await addImageFromDataURL(imgData.dataUrl, imgData.id);
      }
      renderCanvas();
      hideEmptyState();
    }
  } catch (e) {
    console.log('Failed to load saved images:', e);
  }
}

// Canvas rendering
function renderCanvas() {
  // Remove all non-text objects
  const textObjects = canvas.getObjects().filter(obj => obj.type === 'textbox');
  canvas.clear();
  canvas.setBackgroundColor(currentBgColor, () => {});
  
  // Re-add text objects
  textObjects.forEach(obj => canvas.add(obj));
  
  if (images.length === 0) {
    canvas.renderAll();
    return;
  }
  
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
}

function renderSingleImage(width, height) {
  if (images.length === 0) return;
  
  images[0].fabricImage.clone((img) => {
    scaleAndPositionImage(img, 0, 0, width, height);
    canvas.add(img);
    canvas.sendToBack(img);
    canvas.renderAll();
  });
}

function renderVerticalStack(width, height) {
  const halfHeight = height / 2;
  
  if (images.length >= 1) {
    images[0].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, 0, width, halfHeight);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
  
  if (images.length >= 2) {
    images[1].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, halfHeight, width, halfHeight);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
}

function renderHorizontalSplit(width, height) {
  const halfWidth = width / 2;
  
  if (images.length >= 1) {
    images[0].fabricImage.clone((img) => {
      scaleAndPositionImage(img, 0, 0, halfWidth, height);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
  
  if (images.length >= 2) {
    images[1].fabricImage.clone((img) => {
      scaleAndPositionImage(img, halfWidth, 0, halfWidth, height);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
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
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
}

function scaleAndPositionImage(img, x, y, maxWidth, maxHeight) {
  img.set({
    left: x,
    top: y,
    scaleX: 1,
    scaleY: 1,
    selectable: false,
    evented: false
  });
  
  const scaleX = maxWidth / img.width;
  const scaleY = maxHeight / img.height;
  let scale = Math.max(scaleX, scaleY); // Cover the area
  
  // Apply zoom factor
  scale = scale * (imageZoom / 100);
  
  img.scale(scale);
  
  // Center within the area + position offset
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Position offset as percentage of overflow
  const overflowX = scaledWidth - maxWidth;
  const overflowY = scaledHeight - maxHeight;
  const offsetX = (imagePosX / 100) * overflowX;
  const offsetY = (imagePosY / 100) * overflowY;
  
  img.set({
    left: x + (maxWidth - scaledWidth) / 2 - offsetX,
    top: y + (maxHeight - scaledHeight) / 2 - offsetY
  });
  
  // Clip to the area
  img.clipPath = new fabric.Rect({
    left: x,
    top: y,
    width: maxWidth,
    height: maxHeight,
    absolutePositioned: true
  });
}

// Canvas size
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
      width = 280;
      height = width * (16/9);
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
    
    document.getElementById('font-family').value = activeObject.fontFamily || 'Impact';
    document.getElementById('font-size').value = activeObject.fontSize || 32;
    document.getElementById('text-color').value = activeObject.fill || '#ffffff';
    document.getElementById('stroke-color').value = activeObject.stroke || '#000000';
    document.getElementById('stroke-width').value = activeObject.strokeWidth || 2;
  }
}

function hideTextControls() {
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
    canvas.discardActiveObject();
    canvas.renderAll();
    
    const dataURL = canvas.toDataURL({ format: 'png', quality: 1 });
    const blob = await (await fetch(dataURL)).blob();
    
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    
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
async function loadContextMenuImage() {
  try {
    const result = await chrome.storage.local.get(['contextMenuImageUrl']);
    if (result.contextMenuImageUrl) {
      // Fetch and convert to blob
      const response = await fetch(result.contextMenuImageUrl);
      const blob = await response.blob();
      await addImageFromBlob(blob);
      
      chrome.storage.local.remove('contextMenuImageUrl');
    }
  } catch (e) {
    console.log('Failed to load context menu image:', e);
  }
}
