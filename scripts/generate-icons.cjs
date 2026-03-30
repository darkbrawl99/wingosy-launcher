const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const svgPath = path.join(iconsDir, 'icon.svg');

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);
  
  const sizes = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
  ];
  
  for (const { name, size } of sizes) {
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(path.join(iconsDir, name));
    console.log(`Generated ${name}`);
  }
  
  // Generate ICO (Windows icon) - needs multiple sizes in one file
  // Dynamic import for ESM module
  const { default: pngToIco } = await import('png-to-ico');
  
  const icoSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];
  
  for (const size of icoSizes) {
    const pngPath = path.join(iconsDir, `temp_${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    pngBuffers.push(pngPath);
  }
  
  // Create ICO from PNGs
  const icoBuffer = await pngToIco(pngBuffers);
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
  console.log('Generated icon.ico');
  
  // Clean up temp files
  for (const pngPath of pngBuffers) {
    fs.unlinkSync(pngPath);
  }
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
