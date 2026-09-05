const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// 1. Regular App Icon SVG (Red Protagonist, Squircle, Shield, Crossed Wrench & Gear)
const regularSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Racing Red Gradient -->
    <linearGradient id="redBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="45%" stop-color="#dc2626" />
      <stop offset="85%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#7f1d1d" />
    </linearGradient>

    <!-- Top Gloss Overlay -->
    <linearGradient id="glossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.35" />
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>

    <!-- Shield Gradient -->
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1e24" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>

    <!-- Chrome / Silver Gradient -->
    <linearGradient id="chromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#cbd5e1" />
      <stop offset="70%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>

    <!-- Bright Red Stroke Accent -->
    <linearGradient id="brightRedAccent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f87171" />
      <stop offset="50%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>

    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#450a0a" flood-opacity="0.65" />
    </filter>
  </defs>

  <!-- Base Squircle Background (Heavy Red Protagonist) -->
  <rect width="512" height="512" rx="112" fill="url(#redBg)" />
  
  <!-- Subtle Internal Bevel Border -->
  <rect x="12" y="12" width="488" height="488" rx="100" fill="none" stroke="#fca5a5" stroke-width="4" stroke-opacity="0.45" />
  
  <!-- Gloss Highlights -->
  <path d="M 20 120 C 20 60, 60 20, 120 20 L 392 20 C 452 20, 492 60, 492 120 C 492 220, 360 270, 256 270 C 152 270, 20 220, 20 120 Z" fill="url(#glossGrad)" />

  <!-- Outer Speed Badges / Stripes on Red Field -->
  <path d="M 64 256 L 110 256" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.8" />
  <path d="M 402 256 L 448 256" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.8" />
  
  <!-- Central Emblem Container with Shadow -->
  <g filter="url(#dropShadow)">
    <!-- Automotive Crest Shield -->
    <path d="M 256 90 L 386 140 C 386 280, 256 395, 256 395 C 256 395, 126 280, 126 140 Z"
          fill="url(#shieldGrad)"
          stroke="url(#brightRedAccent)"
          stroke-width="14"
          stroke-linejoin="round" />

    <!-- Inner Shield Rim -->
    <path d="M 256 112 L 364 154 C 364 266, 256 365, 256 365 C 256 365, 148 266, 148 154 Z"
          fill="none"
          stroke="#ffffff"
          stroke-width="3"
          stroke-opacity="0.25" />

    <!-- Crossed Racing Wrenches (Mechanic / Automotive) -->
    <!-- Wrench 1: Top-Left to Bottom-Right -->
    <g transform="translate(256, 235) rotate(-38)">
      <!-- Handle -->
      <rect x="-14" y="-95" width="28" height="190" rx="8" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="2" />
      <rect x="-5" y="-60" width="10" height="120" rx="4" fill="#dc2626" opacity="0.85" />
      <!-- Open Head Top -->
      <path d="M -26 -90 C -26 -115, 26 -115, 26 -90 L 14 -90 L 8 -75 L -8 -75 L -14 -90 Z" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="3" />
      <!-- Ring Head Bottom -->
      <circle cx="0" cy="95" r="24" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="95" r="13" fill="#09090b" />
    </g>

    <!-- Wrench 2: Top-Right to Bottom-Left -->
    <g transform="translate(256, 235) rotate(38)">
      <!-- Handle -->
      <rect x="-14" y="-95" width="28" height="190" rx="8" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="2" />
      <rect x="-5" y="-60" width="10" height="120" rx="4" fill="#dc2626" opacity="0.85" />
      <!-- Open Head Top -->
      <path d="M -26 -90 C -26 -115, 26 -115, 26 -90 L 14 -90 L 8 -75 L -8 -75 L -14 -90 Z" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="3" />
      <!-- Ring Head Bottom -->
      <circle cx="0" cy="95" r="24" fill="url(#chromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="95" r="13" fill="#09090b" />
    </g>

    <!-- Mechanical Center Gear -->
    <g transform="translate(256, 235)">
      <!-- Gear Outer Ring with Teeth -->
      <circle cx="0" cy="0" r="54" fill="#18181b" stroke="#ef4444" stroke-width="8" />
      
      <!-- 8 Gear Teeth -->
      <rect x="-9" y="-66" width="18" height="15" rx="3" fill="#ef4444" />
      <rect x="-9" y="51" width="18" height="15" rx="3" fill="#ef4444" />
      <rect x="-66" y="-9" width="15" height="18" rx="3" fill="#ef4444" />
      <rect x="51" y="-9" width="15" height="18" rx="3" fill="#ef4444" />
      <g transform="rotate(45)">
        <rect x="-9" y="-66" width="18" height="15" rx="3" fill="#ef4444" />
        <rect x="-9" y="51" width="18" height="15" rx="3" fill="#ef4444" />
        <rect x="-66" y="-9" width="15" height="18" rx="3" fill="#ef4444" />
        <rect x="51" y="-9" width="15" height="18" rx="3" fill="#ef4444" />
      </g>

      <!-- Inner Hub -->
      <circle cx="0" cy="0" r="38" fill="url(#redBg)" stroke="#ffffff" stroke-width="3" />
      
      <!-- Stylized Monogram "C" (Carranza / Chino) -->
      <path d="M 12 -16 C -18 -16, -18 16, 12 16 L 12 8 C 0 8, 0 -8, 12 -8 Z" fill="#ffffff" />
    </g>

    <!-- Workshop Lettering / Banner Badge -->
    <g transform="translate(256, 345)">
      <rect x="-85" y="-14" width="170" height="28" rx="14" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
      <text x="0" y="5" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="13" letter-spacing="2" text-anchor="middle">
        CARRANZA
      </text>
    </g>
  </g>

  <!-- Bottom Accent Dot -->
  <circle cx="256" cy="462" r="6" fill="#fca5a5" opacity="0.8" />
</svg>
`;

// 2. Maskable Icon SVG (Full-bleed red background, safe-zone scaled)
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="mRedBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="45%" stop-color="#dc2626" />
      <stop offset="85%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#7f1d1d" />
    </linearGradient>
    <linearGradient id="mGlossGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <linearGradient id="mShieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1e24" />
      <stop offset="100%" stop-color="#09090b" />
    </linearGradient>
    <linearGradient id="mChromeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="40%" stop-color="#cbd5e1" />
      <stop offset="70%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#f8fafc" />
    </linearGradient>
    <linearGradient id="mBrightRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f87171" />
      <stop offset="50%" stop-color="#ef4444" />
      <stop offset="100%" stop-color="#b91c1c" />
    </linearGradient>
    <filter id="mDropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#450a0a" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Full bleed square background without rounded corners for maskable clipping -->
  <rect width="512" height="512" fill="url(#mRedBg)" />
  <rect width="512" height="256" fill="url(#mGlossGrad)" />

  <!-- Scaled slightly inside (0.8 scale) to strictly fit within 80% circle safe-zone -->
  <g transform="translate(256, 256) scale(0.82) translate(-256, -256)" filter="url(#mDropShadow)">
    <!-- Automotive Crest Shield -->
    <path d="M 256 80 L 396 135 C 396 290, 256 410, 256 410 C 256 410, 116 290, 116 135 Z"
          fill="url(#mShieldGrad)"
          stroke="url(#mBrightRed)"
          stroke-width="16"
          stroke-linejoin="round" />

    <path d="M 256 104 L 372 150 C 372 274, 256 378, 256 378 C 256 378, 140 274, 140 150 Z"
          fill="none"
          stroke="#ffffff"
          stroke-width="3.5"
          stroke-opacity="0.25" />

    <!-- Crossed Racing Wrenches -->
    <g transform="translate(256, 240) rotate(-38)">
      <rect x="-15" y="-100" width="30" height="200" rx="8" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="2" />
      <rect x="-5" y="-65" width="10" height="130" rx="4" fill="#dc2626" opacity="0.85" />
      <path d="M -28 -95 C -28 -120, 28 -120, 28 -95 L 15 -95 L 9 -78 L -9 -78 L -15 -95 Z" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="100" r="25" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="100" r="14" fill="#09090b" />
    </g>

    <g transform="translate(256, 240) rotate(38)">
      <rect x="-15" y="-100" width="30" height="200" rx="8" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="2" />
      <rect x="-5" y="-65" width="10" height="130" rx="4" fill="#dc2626" opacity="0.85" />
      <path d="M -28 -95 C -28 -120, 28 -120, 28 -95 L 15 -95 L 9 -78 L -9 -78 L -15 -95 Z" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="100" r="25" fill="url(#mChromeGrad)" stroke="#1e293b" stroke-width="3" />
      <circle cx="0" cy="100" r="14" fill="#09090b" />
    </g>

    <!-- Mechanical Center Gear -->
    <g transform="translate(256, 240)">
      <circle cx="0" cy="0" r="56" fill="#18181b" stroke="#ef4444" stroke-width="8" />
      <rect x="-9" y="-68" width="18" height="16" rx="3" fill="#ef4444" />
      <rect x="-9" y="52" width="18" height="16" rx="3" fill="#ef4444" />
      <rect x="-68" y="-9" width="16" height="18" rx="3" fill="#ef4444" />
      <rect x="52" y="-9" width="16" height="18" rx="3" fill="#ef4444" />
      <g transform="rotate(45)">
        <rect x="-9" y="-68" width="18" height="16" rx="3" fill="#ef4444" />
        <rect x="-9" y="52" width="18" height="16" rx="3" fill="#ef4444" />
        <rect x="-68" y="-9" width="16" height="18" rx="3" fill="#ef4444" />
        <rect x="52" y="-9" width="16" height="18" rx="3" fill="#ef4444" />
      </g>
      <circle cx="0" cy="0" r="40" fill="url(#mRedBg)" stroke="#ffffff" stroke-width="3" />
      <path d="M 12 -16 C -18 -16, -18 16, 12 16 L 12 8 C 0 8, 0 -8, 12 -8 Z" fill="#ffffff" />
    </g>

    <!-- Lettering Banner -->
    <g transform="translate(256, 355)">
      <rect x="-85" y="-14" width="170" height="28" rx="14" fill="#dc2626" stroke="#ffffff" stroke-width="2.5" />
      <text x="0" y="5" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="13" letter-spacing="2" text-anchor="middle">
        CARRANZA
      </text>
    </g>
  </g>
</svg>
`;

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVGs
fs.writeFileSync(path.join(publicDir, 'icon.svg'), regularSvg.trim());
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), regularSvg.trim());
console.log('Written icon.svg and favicon.svg');

// Render PNGs
function renderToPng(svgStr, width, height, outputPath) {
  const resvg = new Resvg(svgStr, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render().asPng();
  fs.writeFileSync(outputPath, pngData);
  console.log(`Generated ${path.basename(outputPath)} (${width}x${height}, ${pngData.length} bytes)`);
}

renderToPng(regularSvg, 512, 512, path.join(publicDir, 'pwa-512x512.png'));
renderToPng(regularSvg, 192, 192, path.join(publicDir, 'pwa-192x192.png'));
renderToPng(maskableSvg, 512, 512, path.join(publicDir, 'pwa-maskable-512x512.png'));
renderToPng(regularSvg, 180, 180, path.join(publicDir, 'apple-touch-icon.png'));
renderToPng(regularSvg, 32, 32, path.join(publicDir, 'favicon-32x32.png'));
renderToPng(regularSvg, 16, 16, path.join(publicDir, 'favicon-16x16.png'));

console.log('All PWA icons generated successfully!');
