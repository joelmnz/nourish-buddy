import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const INPUT_SVG = join(process.cwd(), 'client/public/icon.svg');
const OUTPUT_DIR = join(process.cwd(), 'client/public');
const SIZES = [192, 512] as const;

function ensureDir(path: string) {
  try {
    mkdirSync(path, { recursive: true });
  } catch {
    // ignore
  }
}

function generatePng(size: (typeof SIZES)[number]) {
  const svgBuffer = readFileSync(INPUT_SVG);
  const svgStr = svgBuffer.toString();
  // Inject width and height attributes to ensure correct output size
  const svgWithSize = svgStr.replace('<svg ', `<svg width="${size}" height="${size}" `);
  
  const resvg = new Resvg(svgWithSize, {
    // sharpen a bit for small sizes
    shapeRendering: 2,
    textRendering: 2,
    imageRendering: 2,
    font: { loadSystemFonts: true },
    background: 'transparent',
  });
  const png = resvg.render().asPng();
  const outPath = join(OUTPUT_DIR, `icon-${size}.png`);
  ensureDir(dirname(outPath));
  writeFileSync(outPath, png);
  return outPath;
}

try {
  const outputs = SIZES.map(generatePng);
  console.log(`Generated icons:\n- ${outputs.join('\n- ')}`);
  process.exit(0);
} catch (err) {
  console.error('Failed to generate icons:', err);
  process.exit(1);
}
