const fs = require('fs');

// Simple 1x1 purple pixel PNG as base, we'll need actual icons later
// For now, create minimal valid PNGs

function createSimplePNG(size) {
  // This creates a minimal valid PNG with a purple gradient-ish color
  // In production, replace with actual icons
  
  const { createCanvas } = require('canvas');
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Purple gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // White "M"
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('M', size/2, size/2 + size*0.05);
  
  return canvas.toBuffer('image/png');
}

try {
  [16, 48, 128].forEach(size => {
    const buffer = createSimplePNG(size);
    fs.writeFileSync(`icon${size}.png`, buffer);
    console.log(`Created icon${size}.png`);
  });
} catch (e) {
  console.log('Canvas not available, creating placeholder icons...');
  // Create minimal 1-pixel PNGs as placeholders
  const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  [16, 48, 128].forEach(size => {
    fs.writeFileSync(`icon${size}.png`, placeholder);
    console.log(`Created placeholder icon${size}.png`);
  });
}
