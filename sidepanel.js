/**
 * MemeForge - Side Panel Editor
 * Namespaced and optimized
 */

const MemeForge = {
  // Constants
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 400,
  MAX_IMAGE_SIZE: 800, // Max dimension for storage compression
  STORAGE_DEBOUNCE_MS: 500,
  
  // State
  canvas: null,
  images: [], // { id, dataUrl, fabricImage, zoom, posX, posY }
  currentLayout: 'single',
  currentAspect: '1:1',
  currentBgColor: '#000000',
  selectedImageId: null,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  
  // Debounce timer
  saveTimeout: null,

  // Initialize
  async init() {
    this.canvas = new fabric.Canvas('meme-canvas', {
      width: this.CANVAS_WIDTH,
      height: this.CANVAS_HEIGHT,
      backgroundColor: this.currentBgColor
    });

    this.setupEventListeners();
    await this.loadSavedImages();
    this.loadContextMenuImage();
  },

  // Debounced save
  debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveImagesToStorage(), this.STORAGE_DEBOUNCE_MS);
  },

  setupEventListeners() {
    // Paste from clipboard
    document.addEventListener('paste', (e) => this.handlePaste(e));
    
    // Drop zone
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    dropZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    dropZone.addEventListener('drop', (e) => this.handleDrop(e));
    dropZone.addEventListener('click', () => this.openFilePicker());
    
    // Canvas area also accepts drops
    const canvasArea = document.querySelector('.canvas-area');
    canvasArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    canvasArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    canvasArea.addEventListener('drop', (e) => this.handleDrop(e));
    
    // Clear all images
    document.getElementById('clear-images').addEventListener('click', () => this.clearAllImages());
    
    // Layout buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentLayout = btn.dataset.layout;
        this.renderCanvas();
      });
    });
    
    // Background toggle
    document.querySelectorAll('.toggle-btn[data-bg]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.toggle-btn[data-bg]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentBgColor = btn.dataset.bg;
        this.canvas.setBackgroundColor(this.currentBgColor, () => this.canvas.renderAll());
      });
    });
    
    // Aspect ratio
    document.getElementById('aspect-ratio').addEventListener('change', (e) => {
      this.currentAspect = e.target.value;
      this.updateCanvasSize();
      this.renderCanvas();
    });
    
    // Add text
    document.getElementById('add-text-btn').addEventListener('click', () => this.addText());
    
    // Text controls
    document.getElementById('font-family').addEventListener('change', () => this.updateSelectedText());
    document.getElementById('font-size').addEventListener('input', () => this.updateSelectedText());
    document.getElementById('text-color').addEventListener('input', () => this.updateSelectedText());
    document.getElementById('stroke-color').addEventListener('input', () => this.updateSelectedText());
    document.getElementById('stroke-width').addEventListener('input', () => this.updateSelectedText());
    
    // Delete text
    document.getElementById('delete-text-btn').addEventListener('click', () => this.deleteSelectedText());
    
    // Per-image zoom & position controls (with debounced save)
    document.getElementById('image-zoom').addEventListener('input', (e) => {
      if (!this.selectedImageId) return;
      const img = this.images.find(i => i.id === this.selectedImageId);
      if (img) {
        img.zoom = parseInt(e.target.value);
        document.getElementById('zoom-value').textContent = img.zoom + '%';
        this.renderCanvas();
        this.debouncedSave();
      }
    });
    
    document.getElementById('image-pos-x').addEventListener('input', (e) => {
      if (!this.selectedImageId) return;
      const img = this.images.find(i => i.id === this.selectedImageId);
      if (img) {
        img.posX = parseInt(e.target.value);
        this.renderCanvas();
        this.debouncedSave();
      }
    });
    
    document.getElementById('image-pos-y').addEventListener('input', (e) => {
      if (!this.selectedImageId) return;
      const img = this.images.find(i => i.id === this.selectedImageId);
      if (img) {
        img.posY = parseInt(e.target.value);
        this.renderCanvas();
        this.debouncedSave();
      }
    });
    
    document.getElementById('reset-adjust').addEventListener('click', () => {
      if (!this.selectedImageId) return;
      const img = this.images.find(i => i.id === this.selectedImageId);
      if (img) {
        img.zoom = 100;
        img.posX = 0;
        img.posY = 0;
        this.updateImageAdjustUI(img);
        this.renderCanvas();
        this.debouncedSave();
      }
    });
    
    // Padding controls (with debounced save)
    document.getElementById('padding-all').addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      this.paddingTop = this.paddingBottom = this.paddingLeft = this.paddingRight = val;
      document.getElementById('padding-value').textContent = val;
      document.getElementById('padding-top').value = val;
      document.getElementById('padding-bottom').value = val;
      document.getElementById('padding-left').value = val;
      document.getElementById('padding-right').value = val;
      this.renderCanvas();
    });
    
    document.getElementById('padding-top').addEventListener('input', (e) => {
      this.paddingTop = parseInt(e.target.value);
      this.renderCanvas();
    });
    
    document.getElementById('padding-bottom').addEventListener('input', (e) => {
      this.paddingBottom = parseInt(e.target.value);
      this.renderCanvas();
    });
    
    document.getElementById('padding-left').addEventListener('input', (e) => {
      this.paddingLeft = parseInt(e.target.value);
      this.renderCanvas();
    });
    
    document.getElementById('padding-right').addEventListener('input', (e) => {
      this.paddingRight = parseInt(e.target.value);
      this.renderCanvas();
    });
    
    document.getElementById('reset-padding').addEventListener('click', () => {
      this.paddingTop = this.paddingBottom = this.paddingLeft = this.paddingRight = 0;
      document.getElementById('padding-all').value = 0;
      document.getElementById('padding-value').textContent = '0';
      document.getElementById('padding-top').value = 0;
      document.getElementById('padding-bottom').value = 0;
      document.getElementById('padding-left').value = 0;
      document.getElementById('padding-right').value = 0;
      this.renderCanvas();
    });
    
    // Copy to clipboard
    document.getElementById('copy-btn').addEventListener('click', () => this.copyToClipboard());
    
    // Canvas selection events
    this.canvas.on('selection:created', () => this.showTextControls());
    this.canvas.on('selection:updated', () => this.showTextControls());
    this.canvas.on('selection:cleared', () => this.hideTextControls());
    
    // Collapsible sections
    document.getElementById('image-adjust-toggle').addEventListener('click', () => {
      this.toggleCollapsible('image-adjust-content', 'image-adjust-toggle');
    });
    
    document.getElementById('padding-toggle').addEventListener('click', () => {
      this.toggleCollapsible('padding-content', 'padding-toggle');
    });
  },

  toggleCollapsible(contentId, toggleId) {
    const content = document.getElementById(contentId);
    const toggle = document.getElementById(toggleId);
    const icon = toggle.querySelector('.collapse-icon');
    
    content.classList.toggle('collapsed');
    icon.style.transform = content.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
  },

  openFilePicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => this.handleFiles(e.target.files);
    input.click();
  },

  async handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        await this.addImageFromBlob(blob);
      }
    }
  },

  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  },

  handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  },

  handleDrop(e) {
    e.preventDefault();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    this.handleFiles(e.dataTransfer.files);
  },

  handleFiles(files) {
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        this.addImageFromBlob(file);
      }
    }
  },

  // Compress image for storage
  compressImage(dataUrl, maxSize = this.MAX_IMAGE_SIZE) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        
        // Only compress if larger than maxSize
        if (width <= maxSize && height <= maxSize) {
          resolve(dataUrl);
          return;
        }
        
        // Scale down
        if (width > height) {
          height = (height / width) * maxSize;
          width = maxSize;
        } else {
          width = (width / height) * maxSize;
          height = maxSize;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Use JPEG for smaller size
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl); // Fallback
      img.src = dataUrl;
    });
  },

  blobToDataURL(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  },

  async addImageFromBlob(blob) {
    try {
      const dataUrl = await this.blobToDataURL(blob);
      const compressedUrl = await this.compressImage(dataUrl);
      
      return new Promise((resolve) => {
        fabric.Image.fromURL(dataUrl, (img) => {
          const imageData = {
            id: Date.now() + Math.random(), // Prevent collision
            dataUrl: compressedUrl, // Store compressed version
            fabricImage: img,
            zoom: 100,
            posX: 0,
            posY: 0
          };
          
          this.images.push(imageData);
          this.addImageThumbnail(imageData);
          this.selectImage(imageData.id);
          this.renderCanvas();
          this.hideEmptyState();
          this.debouncedSave();
          resolve();
        });
      });
    } catch (err) {
      console.error('Failed to add image:', err);
      this.showError('Failed to add image');
    }
  },

  addImageFromDataURL(dataUrl, id, zoom = 100, posX = 0, posY = 0) {
    return new Promise((resolve) => {
      fabric.Image.fromURL(dataUrl, (img) => {
        const imageData = {
          id: id || Date.now() + Math.random(),
          dataUrl: dataUrl,
          fabricImage: img,
          zoom,
          posX,
          posY
        };
        
        this.images.push(imageData);
        this.addImageThumbnail(imageData);
        resolve();
      });
    });
  },

  selectImage(id) {
    this.selectedImageId = id;
    
    document.querySelectorAll('.image-thumb-container').forEach(el => {
      el.classList.toggle('selected', el.dataset.id == id);
    });
    
    const img = this.images.find(i => i.id === id);
    if (img) {
      this.updateImageAdjustUI(img);
      document.getElementById('selected-image-label').textContent = `Image ${this.images.indexOf(img) + 1} selected`;
    }
  },

  updateImageAdjustUI(img) {
    document.getElementById('image-zoom').value = img.zoom;
    document.getElementById('zoom-value').textContent = img.zoom + '%';
    document.getElementById('image-pos-x').value = img.posX;
    document.getElementById('image-pos-y').value = img.posY;
  },

  addImageThumbnail(imageData) {
    const container = document.createElement('div');
    container.className = 'image-thumb-container';
    container.dataset.id = imageData.id;
    container.setAttribute('role', 'button');
    container.setAttribute('aria-label', `Select image ${this.images.length}`);
    container.tabIndex = 0;
    
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('image-thumb-remove')) return;
      this.selectImage(imageData.id);
    });
    
    container.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectImage(imageData.id);
      }
    });
    
    const thumb = document.createElement('img');
    thumb.className = 'image-thumb';
    thumb.src = imageData.dataUrl;
    thumb.alt = 'Image thumbnail';
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'image-thumb-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', 'Remove image');
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      this.removeImage(imageData.id);
    };
    
    container.appendChild(thumb);
    container.appendChild(removeBtn);
    document.getElementById('image-list').appendChild(container);
  },

  removeImage(id) {
    // Dispose fabric image to free memory
    const imgData = this.images.find(img => img.id === id);
    if (imgData?.fabricImage?.dispose) {
      imgData.fabricImage.dispose();
    }
    
    this.images = this.images.filter(img => img.id !== id);
    document.querySelector(`[data-id="${id}"]`)?.remove();
    
    if (this.selectedImageId === id) {
      if (this.images.length > 0) {
        this.selectImage(this.images[0].id);
      } else {
        this.selectedImageId = null;
        document.getElementById('selected-image-label').textContent = 'Click a thumbnail to select';
      }
    }
    
    this.renderCanvas();
    this.debouncedSave();
    
    if (this.images.length === 0) {
      this.showEmptyState();
    }
  },

  clearAllImages() {
    // Dispose all fabric images
    this.images.forEach(img => {
      if (img.fabricImage?.dispose) {
        img.fabricImage.dispose();
      }
    });
    
    this.images = [];
    this.selectedImageId = null;
    document.getElementById('image-list').innerHTML = '';
    document.getElementById('selected-image-label').textContent = 'Click a thumbnail to select';
    this.renderCanvas();
    this.saveImagesToStorage();
    this.showEmptyState();
  },

  async saveImagesToStorage() {
    const imageDataArray = this.images.map(img => ({
      id: img.id,
      dataUrl: img.dataUrl,
      zoom: img.zoom,
      posX: img.posX,
      posY: img.posY
    }));
    
    try {
      await chrome.storage.local.set({ savedImages: imageDataArray });
    } catch (e) {
      console.error('Failed to save images:', e);
      if (e.message?.includes('QUOTA')) {
        this.showError('Storage full. Try removing some images.');
      }
    }
  },

  async loadSavedImages() {
    try {
      const result = await chrome.storage.local.get(['savedImages']);
      if (result.savedImages?.length > 0) {
        for (const imgData of result.savedImages) {
          await this.addImageFromDataURL(
            imgData.dataUrl, 
            imgData.id,
            imgData.zoom || 100,
            imgData.posX || 0,
            imgData.posY || 0
          );
        }
        if (this.images.length > 0) {
          this.selectImage(this.images[0].id);
        }
        this.renderCanvas();
        this.hideEmptyState();
      }
    } catch (e) {
      console.error('Failed to load saved images:', e);
    }
  },

  showError(message) {
    // Simple error display - could be enhanced with a toast
    const btn = document.getElementById('copy-btn');
    const originalText = btn.textContent;
    btn.textContent = '⚠️ ' + message;
    btn.style.background = '#ff3b30';
    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = '';
    }, 3000);
  },

  // Canvas rendering - optimized with single renderAll
  renderCanvas() {
    const textObjects = this.canvas.getObjects().filter(obj => obj.type === 'textbox');
    this.canvas.clear();
    this.canvas.setBackgroundColor(this.currentBgColor, () => {});
    
    textObjects.forEach(obj => this.canvas.add(obj));
    
    if (this.images.length === 0) {
      this.canvas.renderAll();
      return;
    }
    
    const imageLeft = this.paddingLeft;
    const imageTop = this.paddingTop;
    const imageWidth = this.canvas.width - this.paddingLeft - this.paddingRight;
    const imageHeight = this.canvas.height - this.paddingTop - this.paddingBottom;
    
    // Collect all image render operations
    const renderOps = [];
    
    switch (this.currentLayout) {
      case 'single':
        renderOps.push(...this.getSingleImageOps(imageWidth, imageHeight, imageLeft, imageTop));
        break;
      case 'vertical':
        renderOps.push(...this.getVerticalStackOps(imageWidth, imageHeight, imageLeft, imageTop));
        break;
      case 'horizontal':
        renderOps.push(...this.getHorizontalSplitOps(imageWidth, imageHeight, imageLeft, imageTop));
        break;
      case 'grid':
        renderOps.push(...this.getGridOps(imageWidth, imageHeight, imageLeft, imageTop));
        break;
    }
    
    // Execute all operations then render once
    let pending = renderOps.length;
    if (pending === 0) {
      this.canvas.renderAll();
      return;
    }
    
    renderOps.forEach(op => {
      op.imgData.fabricImage.clone((img) => {
        this.scaleAndPositionImage(img, op.x, op.y, op.w, op.h, op.imgData);
        this.canvas.add(img);
        this.canvas.sendToBack(img);
        pending--;
        if (pending === 0) {
          this.canvas.renderAll();
        }
      });
    });
  },

  getSingleImageOps(width, height, offsetX, offsetY) {
    if (this.images.length === 0) return [];
    return [{ imgData: this.images[0], x: offsetX, y: offsetY, w: width, h: height }];
  },

  getVerticalStackOps(width, height, offsetX, offsetY) {
    const ops = [];
    const halfHeight = height / 2;
    if (this.images.length >= 1) {
      ops.push({ imgData: this.images[0], x: offsetX, y: offsetY, w: width, h: halfHeight });
    }
    if (this.images.length >= 2) {
      ops.push({ imgData: this.images[1], x: offsetX, y: offsetY + halfHeight, w: width, h: halfHeight });
    }
    return ops;
  },

  getHorizontalSplitOps(width, height, offsetX, offsetY) {
    const ops = [];
    const halfWidth = width / 2;
    if (this.images.length >= 1) {
      ops.push({ imgData: this.images[0], x: offsetX, y: offsetY, w: halfWidth, h: height });
    }
    if (this.images.length >= 2) {
      ops.push({ imgData: this.images[1], x: offsetX + halfWidth, y: offsetY, w: halfWidth, h: height });
    }
    return ops;
  },

  getGridOps(width, height, offsetX, offsetY) {
    const ops = [];
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const positions = [
      [offsetX, offsetY], [offsetX + halfWidth, offsetY],
      [offsetX, offsetY + halfHeight], [offsetX + halfWidth, offsetY + halfHeight]
    ];
    
    for (let i = 0; i < Math.min(this.images.length, 4); i++) {
      const pos = positions[i];
      ops.push({ imgData: this.images[i], x: pos[0], y: pos[1], w: halfWidth, h: halfHeight });
    }
    return ops;
  },

  scaleAndPositionImage(img, x, y, maxWidth, maxHeight, imgData) {
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
    let scale = Math.max(scaleX, scaleY) * (zoom / 100);
    
    img.scale(scale);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const overflowX = scaledWidth - maxWidth;
    const overflowY = scaledHeight - maxHeight;
    const offsetX = (posX / 100) * overflowX;
    const offsetY = (posY / 100) * overflowY;
    
    img.set({
      left: x + (maxWidth - scaledWidth) / 2 - offsetX,
      top: y + (maxHeight - scaledHeight) / 2 - offsetY
    });
    
    img.clipPath = new fabric.Rect({
      left: x,
      top: y,
      width: maxWidth,
      height: maxHeight,
      absolutePositioned: true
    });
  },

  updateCanvasSize() {
    let width = this.CANVAS_WIDTH;
    let height = this.CANVAS_HEIGHT;
    
    switch (this.currentAspect) {
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
    
    this.canvas.setDimensions({ width, height });
  },

  addText() {
    const text = new fabric.Textbox('YOUR TEXT', {
      left: this.canvas.width / 2,
      top: this.canvas.height / 2,
      originX: 'center',
      originY: 'center',
      fontFamily: document.getElementById('font-family').value,
      fontSize: parseInt(document.getElementById('font-size').value),
      fill: document.getElementById('text-color').value,
      stroke: document.getElementById('stroke-color').value,
      strokeWidth: parseInt(document.getElementById('stroke-width').value),
      textAlign: 'center',
      width: this.canvas.width * 0.8,
      editable: true,
      paintFirst: 'stroke',
      lockUniScaling: true
    });
    
    if (text.setControlsVisibility) {
      text.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false });
    }
    
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    this.canvas.renderAll();
    
    this.showTextControls();
  },

  updateSelectedText() {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'textbox') return;
    
    activeObject.set({
      fontFamily: document.getElementById('font-family').value,
      fontSize: parseInt(document.getElementById('font-size').value),
      fill: document.getElementById('text-color').value,
      stroke: document.getElementById('stroke-color').value,
      strokeWidth: parseInt(document.getElementById('stroke-width').value)
    });
    
    this.canvas.renderAll();
  },

  deleteSelectedText() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
      this.canvas.remove(activeObject);
      this.canvas.renderAll();
      this.hideTextControls();
    }
  },

  showTextControls() {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject && activeObject.type === 'textbox') {
      document.getElementById('text-controls').classList.remove('hidden');
      
      document.getElementById('font-family').value = activeObject.fontFamily || 'Impact';
      document.getElementById('font-size').value = activeObject.fontSize || 32;
      document.getElementById('text-color').value = activeObject.fill || '#ffffff';
      document.getElementById('stroke-color').value = activeObject.stroke || '#000000';
      document.getElementById('stroke-width').value = activeObject.strokeWidth || 2;
    }
  },

  hideTextControls() {
    const hasText = this.canvas.getObjects().some(obj => obj.type === 'textbox');
    if (!hasText) {
      document.getElementById('text-controls').classList.add('hidden');
    }
  },

  showEmptyState() {
    document.getElementById('empty-state').classList.remove('hidden');
  },

  hideEmptyState() {
    document.getElementById('empty-state').classList.add('hidden');
  },

  async copyToClipboard() {
    const btn = document.getElementById('copy-btn');
    
    try {
      this.canvas.discardActiveObject();
      this.canvas.renderAll();
      
      const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1 });
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
  },

  async loadContextMenuImage() {
    try {
      const result = await chrome.storage.local.get(['contextMenuImageUrl']);
      if (result.contextMenuImageUrl) {
        const url = result.contextMenuImageUrl;
        
        // Validate URL
        if (!/^https?:\/\/.+/i.test(url)) {
          console.error('Invalid URL:', url);
          return;
        }
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        
        const blob = await response.blob();
        await this.addImageFromBlob(blob);
        
        chrome.storage.local.remove('contextMenuImageUrl');
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        console.error('Image fetch timed out');
      } else {
        console.error('Failed to load context menu image:', e);
      }
    }
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => MemeForge.init());
