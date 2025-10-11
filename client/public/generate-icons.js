const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const color = '#10b981';

sizes.forEach(size => {
  const canvas = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${color}" rx="128"/>
  <path fill="#fff" d="M256 96c-88.4 0-160 71.6-160 160s71.6 160 160 160 160-71.6 160-160S344.4 96 256 96zm0 280c-66.3 0-120-53.7-120-120s53.7-120 120-120 120 53.7 120 120-53.7 120-120 120z"/>
  <circle cx="256" cy="256" r="80" fill="#fff"/>
  <path fill="${color}" d="M256 196c-33.1 0-60 26.9-60 60s26.9 60 60 60 60-26.9 60-60-26.9-60-60-60zm0 90c-16.5 0-30-13.5-30-30s13.5-30 30-30 30 13.5 30 30-13.5 30-30 30z"/>
  <path fill="#fff" d="M310 220h-20v-40c0-11-9-20-20-20s-20 9-20 20v40h-20c-11 0-20 9-20 20s9 20 20 20h20v20c0 11 9 20 20 20s20-9 20-20v-20h20c11 0 20-9 20-20s-9-20-20-20z"/>
</svg>
  `.trim();
  
  fs.writeFileSync(
    path.join(__dirname, `icon-${size}.svg`),
    canvas
  );
  
  console.log(`Created icon-${size}.svg (use an SVG-to-PNG converter to create icon-${size}.png)`);
});

console.log('\nTo convert to PNG, you can:');
console.log('1. Use an online tool like https://cloudconvert.com/svg-to-png');
console.log('2. Install imagemagick: convert icon-192.svg icon-192.png');
console.log('3. Install sharp: npx sharp-cli -i icon-192.svg -o icon-192.png');
