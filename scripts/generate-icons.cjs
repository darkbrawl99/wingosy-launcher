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
  
  // Generate ICO (Windows icon) - use 256x256 as base
  const ico256 = await sharp(svg)
    .resize(256, 256)
    .png()
    .toBuffer();
  
  // For ICO we need to create a proper ICO file with multiple sizes
  // Sharp can output to ico format on Windows
  await sharp(svg)
    .resize(256, 256)
    .toFile(path.join(iconsDir, 'icon.ico'));
  console.log('Generated icon.ico');
  
  console.log('Icon generation complete!');
}

generateIcons().catch(console.error);
