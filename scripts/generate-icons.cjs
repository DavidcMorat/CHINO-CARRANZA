const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('Notice: sharp is not available. Checking for pre-generated icons...');
}

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// If sharp is missing but icons already exist in public/, succeed without failing CI
if (!sharp) {
  if (fs.existsSync(path.join(publicDir, 'pwa-512x512.png'))) {
    console.log('✓ Using pre-generated icons in public folder. Skipping generation.');
    process.exit(0);
  } else {
    console.error('Error: sharp is required to generate icons for the first time.');
    process.exit(1);
  }
}

// Find source icon (newIcon.png as requested by the user for PWA desktop icon)
const candidatePaths = [
  path.join(rootDir, 'newIcon.png'),
  path.join(publicDir, 'newIcon.png')
];

let sourcePath = candidatePaths.find(p => fs.existsSync(p));

if (!sourcePath) {
  console.error('Error: newIcon.png not found in root or public folder');
  process.exit(1);
}

console.log(`Using source PWA icon: ${sourcePath}`);

async function generateIcons() {
  try {
    // 1. Ensure public/newIcon.png exists as a backup
    const publicNewIcon = path.join(publicDir, 'newIcon.png');
    if (sourcePath !== publicNewIcon) {
      fs.copyFileSync(sourcePath, publicNewIcon);
    }

    // 2. Standard PWA 512x512
    await sharp(sourcePath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'pwa-512x512.png'));
    console.log('✓ Generated pwa-512x512.png');

    // 3. Standard PWA 192x192
    await sharp(sourcePath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'pwa-192x192.png'));
    console.log('✓ Generated pwa-192x192.png');

    // 4. Android Maskable Icon 512x512 (Safe-zone centered with #0f172a theme background)
    // Inner icon at ~80% (410x410) so Android's circle/squircle crop doesn't cut edges
    const innerBuffer = await sharp(sourcePath)
      .resize(410, 410, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: 512,
        height: 512,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a (dark theme)
      }
    })
      .composite([
        {
          input: innerBuffer,
          top: 51,
          left: 51
        }
      ])
      .png()
      .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
    console.log('✓ Generated pwa-maskable-512x512.png (with safe-zone padding)');

    // 5. Apple Touch Icon 180x180
    const appleInner = await sharp(sourcePath)
      .resize(150, 150, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    await sharp({
      create: {
        width: 180,
        height: 180,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
      }
    })
      .composite([
        {
          input: appleInner,
          top: 15,
          left: 15
        }
      ])
      .png()
      .toFile(path.join(publicDir, 'apple-touch-icon.png'));
    console.log('✓ Generated apple-touch-icon.png');

    // 6. Favicons (32x32 and 16x16)
    await sharp(sourcePath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-32x32.png'));
    console.log('✓ Generated favicon-32x32.png');

    await sharp(sourcePath)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(publicDir, 'favicon-16x16.png'));
    console.log('✓ Generated favicon-16x16.png');

    // 7. SVG Favicons and Icon containing the new PWA icon as embedded high-res image
    const pwa512Buf = fs.readFileSync(path.join(publicDir, 'pwa-512x512.png'));
    const b64 = pwa512Buf.toString('base64');
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${b64}" width="512" height="512" />
</svg>`;

    fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
    fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
    console.log('✓ Generated icon.svg and favicon.svg matching newIcon.png');

    console.log('\nAll PWA icons successfully generated from newIcon.png!');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
}

generateIcons();
