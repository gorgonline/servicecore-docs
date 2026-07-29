#!/usr/bin/env node
/**
 * Tazelik alanlarını (`reviewed`, `owner`) her sayfanın frontmatter'ına ekler.
 *
 *   node scripts/add-freshness.mjs [YYYY-MM-DD]
 *
 * Tarih verilmezse bugün kullanılır. Tekrar çalıştırılabilir: alanı zaten olan
 * sayfaya DOKUNMAZ, mevcut tarihi ezmez. Yeni sayfa eklendiğinde tekrar
 * çalıştırıp eksikleri tamamlayabilirsiniz.
 *
 * Neden gerekli: bir sayfanın en son ne zaman ürünle karşılaştırıldığını git
 * geçmişi söylemez — virgül düzeltmesi de commit'tir. Bu yüzden "içerik
 * doğrulandı" bilgisi ayrı ve elle taşınır.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'content', 'docs');

const DATE = process.argv[2] ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(DATE)) {
  console.error(`✗ Geçersiz tarih: "${DATE}" — YYYY-MM-DD bekleniyor`);
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

let added = 0;
let skipped = 0;
const broken = [];

for (const file of walk(DOCS)) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, 'utf8');

  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    broken.push(rel);
    continue;
  }

  const block = fm[1];
  if (/^reviewed:/m.test(block)) {
    skipped++;
    continue;
  }

  // Alanları frontmatter'ın SONUNA ekle: title/description üstte kalsın,
  // sayfayı açan kişi önce içeriği tanımlayan alanları görsün.
  //
  // Tarih TIRNAK İÇİNDE: YAML çıplak 2026-07-30'u Date nesnesine çevirir,
  // ayrıştırıcı onu yerel saat dilimine göre yorumlayınca gün kayabilir.
  // Tırnaklı hâli her ayrıştırıcıda düz metin olarak kalır.
  const lines = [block, `reviewed: "${DATE}"`];
  if (!/^owner:/m.test(block)) lines.push('owner:');

  writeFileSync(file, raw.replace(fm[0], `---\n${lines.join('\n')}\n---`), 'utf8');
  added++;
}

console.log(`${added} sayfaya eklendi, ${skipped} sayfada zaten vardı (tarih: ${DATE})`);
if (broken.length) {
  console.error(`\n✗ frontmatter'ı olmayan ${broken.length} dosya atlandı:`);
  for (const b of broken) console.error(`   ${b}`);
  process.exit(1);
}
