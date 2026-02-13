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
let currentBgColor = '#000000'; // Default to black
let selectedImageId = null; // Currently selected image for adjustment
let paddingTop = 0;
let paddingBottom = 0;
let paddingLeft = 0;
let paddingRight = 0;

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
  
  // Per-image zoom & position controls
  document.getElementById('image-zoom').addEventListener('input', (e) => {
    if (!selectedImageId) return;
    const img = images.find(i => i.id === selectedImageId);
    if (img) {
      img.zoom = parseInt(e.target.value);
      document.getElementById('zoom-value').textContent = img.zoom + '%';
      renderCanvas();
      saveImagesToStorage();
    }
  });
  
  document.getElementById('image-pos-x').addEventListener('input', (e) => {
    if (!selectedImageId) return;
    const img = images.find(i => i.id === selectedImageId);
    if (img) {
      img.posX = parseInt(e.target.value);
      renderCanvas();
      saveImagesToStorage();
    }
  });
  
  document.getElementById('image-pos-y').addEventListener('input', (e) => {
    if (!selectedImageId) return;
    const img = images.find(i => i.id === selectedImageId);
    if (img) {
      img.posY = parseInt(e.target.value);
      renderCanvas();
      saveImagesToStorage();
    }
  });
  
  document.getElementById('reset-adjust').addEventListener('click', () => {
    if (!selectedImageId) return;
    const img = images.find(i => i.id === selectedImageId);
    if (img) {
      img.zoom = 100;
      img.posX = 0;
      img.posY = 0;
      updateImageAdjustUI(img);
      renderCanvas();
      saveImagesToStorage();
    }
  });
  
  // Padding controls
  document.getElementById('padding-all').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    paddingTop = paddingBottom = paddingLeft = paddingRight = val;
    document.getElementById('padding-value').textContent = val;
    document.getElementById('padding-top').value = val;
    document.getElementById('padding-bottom').value = val;
    document.getElementById('padding-left').value = val;
    document.getElementById('padding-right').value = val;
    renderCanvas();
  });
  
  document.getElementById('padding-top').addEventListener('input', (e) => {
    paddingTop = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('padding-bottom').addEventListener('input', (e) => {
    paddingBottom = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('padding-left').addEventListener('input', (e) => {
    paddingLeft = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('padding-right').addEventListener('input', (e) => {
    paddingRight = parseInt(e.target.value);
    renderCanvas();
  });
  
  document.getElementById('reset-padding').addEventListener('click', () => {
    paddingTop = paddingBottom = paddingLeft = paddingRight = 0;
    document.getElementById('padding-all').value = 0;
    document.getElementById('padding-value').textContent = '0';
    document.getElementById('padding-top').value = 0;
    document.getElementById('padding-bottom').value = 0;
    document.getElementById('padding-left').value = 0;
    document.getElementById('padding-right').value = 0;
    renderCanvas();
  });
  
  // Copy to clipboard
  document.getElementById('copy-btn').addEventListener('click', copyToClipboard);
  
  // Canvas selection events
  canvas.on('selection:created', showTextControls);
  canvas.on('selection:updated', showTextControls);
  canvas.on('selection:cleared', hideTextControls);
  
  // Collapsible sections
  document.getElementById('image-adjust-toggle').addEventListener('click', () => {
    toggleCollapsible('image-adjust-content', 'image-adjust-toggle');
  });
  
  document.getElementById('padding-toggle').addEventListener('click', () => {
    toggleCollapsible('padding-content', 'padding-toggle');
  });
}

function toggleCollapsible(contentId, toggleId) {
  const content = document.getElementById(contentId);
  const toggle = document.getElementById(toggleId);
  const icon = toggle.querySelector('.collapse-icon');
  
  content.classList.toggle('collapsed');
  
  if (content.classList.contains('collapsed')) {
    icon.style.transform = 'rotate(-90deg)';
  } else {
    icon.style.transform = 'rotate(0deg)';
  }
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
        fabricImage: img,
        zoom: 100,
        posX: 0,
        posY: 0
      };
      
      images.push(imageData);
      addImageThumbnail(imageData);
      
      // Auto-select the first image or newly added image
      selectImage(imageData.id);
      
      renderCanvas();
      hideEmptyState();
      saveImagesToStorage();
      resolve();
    });
  });
}

// Add image from data URL (for loading from storage)
function addImageFromDataURL(dataUrl, id, zoom = 100, posX = 0, posY = 0) {
  return new Promise((resolve) => {
    fabric.Image.fromURL(dataUrl, (img) => {
      const imageData = {
        id: id || Date.now(),
        dataUrl: dataUrl,
        fabricImage: img,
        zoom: zoom,
        posX: posX,
        posY: posY
      };
      
      images.push(imageData);
      addImageThumbnail(imageData);
      resolve();
    });
  });
}

// Select image for adjustment
function selectImage(id) {
  selectedImageId = id;
  
  // Update thumbnail selection UI
  document.querySelectorAll('.image-thumb-container').forEach(el => {
    el.classList.toggle('selected', el.dataset.id == id);
  });
  
  // Update adjustment controls
  const img = images.find(i => i.id === id);
  if (img) {
    updateImageAdjustUI(img);
    document.getElementById('selected-image-label').textContent = `Image ${images.indexOf(img) + 1} selected`;
  }
}

function updateImageAdjustUI(img) {
  document.getElementById('image-zoom').value = img.zoom;
  document.getElementById('zoom-value').textContent = img.zoom + '%';
  document.getElementById('image-pos-x').value = img.posX;
  document.getElementById('image-pos-y').value = img.posY;
}

// Thumbnail management
function addImageThumbnail(imageData) {
  const container = document.createElement('div');
  container.className = 'image-thumb-container';
  container.dataset.id = imageData.id;
  
  // Make thumbnail clickable to select
  container.addEventListener('click', (e) => {
    if (e.target.classList.contains('image-thumb-remove')) return;
    selectImage(imageData.id);
  });
  
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
  
  // If removed image was selected, select another or clear
  if (selectedImageId === id) {
    if (images.length > 0) {
      selectImage(images[0].id);
    } else {
      selectedImageId = null;
      document.getElementById('selected-image-label').textContent = 'Click a thumbnail to select';
    }
  }
  
  renderCanvas();
  saveImagesToStorage();
  
  if (images.length === 0) {
    showEmptyState();
  }
}

function clearAllImages() {
  images = [];
  selectedImageId = null;
  document.getElementById('image-list').innerHTML = '';
  document.getElementById('selected-image-label').textContent = 'Click a thumbnail to select';
  renderCanvas();
  saveImagesToStorage();
  showEmptyState();
}

// Storage - now saves per-image zoom/position
async function saveImagesToStorage() {
  const imageDataArray = images.map(img => ({
    id: img.id,
    dataUrl: img.dataUrl,
    zoom: img.zoom,
    posX: img.posX,
    posY: img.posY
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
        await addImageFromDataURL(
          imgData.dataUrl, 
          imgData.id,
          imgData.zoom || 100,
          imgData.posX || 0,
          imgData.posY || 0
        );
      }
      // Select first image
      if (images.length > 0) {
        selectImage(images[0].id);
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
  
  // Calculate image area with padding on all sides
  const imageLeft = paddingLeft;
  const imageTop = paddingTop;
  const imageWidth = canvas.width - paddingLeft - paddingRight;
  const imageHeight = canvas.height - paddingTop - paddingBottom;
  
  switch (currentLayout) {
    case 'single':
      renderSingleImage(imageWidth, imageHeight, imageLeft, imageTop);
      break;
    case 'vertical':
      renderVerticalStack(imageWidth, imageHeight, imageLeft, imageTop);
      break;
    case 'horizontal':
      renderHorizontalSplit(imageWidth, imageHeight, imageLeft, imageTop);
      break;
    case 'grid':
      renderGrid(imageWidth, imageHeight, imageLeft, imageTop);
      break;
  }
}

function renderSingleImage(width, height, offsetX = 0, offsetY = 0) {
  if (images.length === 0) return;
  
  const imgData = images[0];
  imgData.fabricImage.clone((img) => {
    scaleAndPositionImage(img, offsetX, offsetY, width, height, imgData);
    canvas.add(img);
    canvas.sendToBack(img);
    canvas.renderAll();
  });
}

function renderVerticalStack(width, height, offsetX = 0, offsetY = 0) {
  const halfHeight = height / 2;
  
  if (images.length >= 1) {
    const imgData = images[0];
    imgData.fabricImage.clone((img) => {
      scaleAndPositionImage(img, offsetX, offsetY, width, halfHeight, imgData);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
  
  if (images.length >= 2) {
    const imgData = images[1];
    imgData.fabricImage.clone((img) => {
      scaleAndPositionImage(img, offsetX, offsetY + halfHeight, width, halfHeight, imgData);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
}

function renderHorizontalSplit(width, height, offsetX = 0, offsetY = 0) {
  const halfWidth = width / 2;
  
  if (images.length >= 1) {
    const imgData = images[0];
    imgData.fabricImage.clone((img) => {
      scaleAndPositionImage(img, offsetX, offsetY, halfWidth, height, imgData);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
  
  if (images.length >= 2) {
    const imgData = images[1];
    imgData.fabricImage.clone((img) => {
      scaleAndPositionImage(img, offsetX + halfWidth, offsetY, halfWidth, height, imgData);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
}

function renderGrid(width, height, offsetX = 0, offsetY = 0) {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const positions = [
    [offsetX, offsetY], [offsetX + halfWidth, offsetY],
    [offsetX, offsetY + halfHeight], [offsetX + halfWidth, offsetY + halfHeight]
  ];
  
  for (let i = 0; i < Math.min(images.length, 4); i++) {
    const pos = positions[i];
    const imgData = images[i];
    imgData.fabricImage.clone((img) => {
      scaleAndPositionImage(img, pos[0], pos[1], halfWidth, halfHeight, imgData);
      canvas.add(img);
      canvas.sendToBack(img);
      canvas.renderAll();
    });
  }
}

function scaleAndPositionImage(img, x, y, maxWidth, maxHeight, imgData) {
  // Get per-image zoom and position (with defaults)
  const zoom = imgData?.zoom || 100;
  const posX = imgData?.posX || 0;
  const posY = imgData?.posY || 0;
  
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
  
  // Apply per-image zoom factor
  scale = scale * (zoom / 100);
  
  img.scale(scale);
  
  // Center within the area + position offset
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Position offset as percentage of overflow
  const overflowX = scaledWidth - maxWidth;
  const overflowY = scaledHeight - maxHeight;
  const offsetX = (posX / 100) * overflowX;
  const offsetY = (posY / 100) * overflowY;
  
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
    paintFirst: 'stroke',
    lockUniScaling: true
  });
  
  // Hide middle scaling controls (corners only for uniform scaling)
  if (text.setControlsVisibility) {
    text.setControlsVisibility({
      mt: false,
      mb: false,
      ml: false,
      mr: false
    });
  }
  
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
