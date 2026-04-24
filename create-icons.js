const fs = require('fs');
const path = require('path');

function createPNG(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a73e8;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#34a853;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" rx="${width * 0.2}" fill="url(#grad)"/>
    <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="${width * 0.5}" fill="white">A</text>
  </svg>`;

  const data = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${data}`;
}

const sizes = [16, 48, 128];
const icons = [];

sizes.forEach(size => {
  icons.push({
    name: `icon${size}.png`,
    data: createPNG(size, size)
  });
});

console.log('Created data URI icons. For production:');
console.log('1. Install ImageMagick: brew install imagemagick');
console.log('2. Run: convert icon.svg icon.png');
console.log('\nCurrent icons are SVG data URIs embedded as PNG references.');
console.log('Chrome will accept these during development but may warn.');

fs.writeFileSync(path.join(__dirname, 'icons', 'icon-manifest.txt'),
  'For Chrome Web Store submission, convert SVG to PNG:\n' +
  '1. brew install imagemagick\n' +
  '2. cd icons && convert icon16.svg icon16.png\n' +
  '3. convert icon48.svg icon48.png\n' +
  '4. convert icon128.svg icon128.png'
);