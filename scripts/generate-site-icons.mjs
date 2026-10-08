/**
 * 군산시탁구협회 사이트 아이콘 생성.
 * 현재 헤더에서 사용하는 로고의 왼쪽 심볼만 추출합니다.
 * 실행: node scripts/generate-site-icons.mjs
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'public/images/association-logo-2026.webp');
const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

async function iconPng(symbolBuffer, size) {
  // 작은 favicon에서도 심볼이 화면을 충분히 채우도록 여백을 6%로 유지합니다.
  const padding = Math.max(1, Math.round(size * 0.06));
  const inner = size - padding * 2;
  return sharp(symbolBuffer)
    .resize(inner, inner, { fit: 'contain', background: transparent, kernel: 'lanczos3' })
    .extend({ top: padding, bottom: padding, left: padding, right: padding, background: transparent })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function multiSizeIco(pngs) {
  // PNG 압축 데이터가 들어 있는 표준 Windows ICO: 16/32/48 px.
  const header = Buffer.alloc(6 + pngs.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  for (const [index, [size, png]] of pngs.entries()) {
    const entry = 6 + index * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  }
  return Buffer.concat([header, ...pngs.map(([, png]) => png)]);
}

async function save(relative, buffer) {
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(relative + ' (' + buffer.length + ' bytes)');
}

async function main() {
  const input = await readFile(source);
  const metadata = await sharp(input).metadata();
  if (metadata.width !== 600 || metadata.height !== 167) {
    throw new Error('협회 로고 크기가 변경됐습니다. 심볼 영역을 다시 확인해주세요.');
  }

  // 심볼은 x=7~173, 문구는 x=181부터 시작하며 사이에 투명한 공간이 있습니다.
  const cropped = await sharp(input)
    .extract({ left: 0, top: 0, width: 174, height: 167 })
    .png()
    .toBuffer();
  const symbol = await sharp(cropped)
    .trim({ background: '#00000000', threshold: 8 })
    .png()
    .toBuffer();

  const sizes = [16, 32, 48, 180, 192, 512];
  const variants = new Map();
  for (const size of sizes) {
    const buffer = await iconPng(symbol, size);
    const info = await sharp(buffer).metadata();
    if (info.width !== size || info.height !== size || !info.hasAlpha) {
      throw new Error('아이콘 검증 실패: ' + size + 'px');
    }
    variants.set(size, buffer);
  }

  await save('src/app/favicon.ico', multiSizeIco([16, 32, 48].map((size) => [size, variants.get(size)])));
  await save('src/app/icon.png', variants.get(512));
  await save('src/app/apple-icon.png', variants.get(180));
  await save('public/icons/icon-192.png', variants.get(192));
  await save('public/icons/icon-512.png', variants.get(512));
  console.log('사이트 아이콘 생성 완료: ICO 16/32/48, PNG 180/192/512');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
