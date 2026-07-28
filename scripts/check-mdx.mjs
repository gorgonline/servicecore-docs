#!/usr/bin/env node
/**
 * İçerik doğrulayıcı — CI ve yerel kullanım için.
 *   1) Her .mdx dosyası geçerli MDX mi?
 *   2) Frontmatter'da title var mı?
 *   3) Görsel yolları public/ altında gerçekten var mı?
 *   4) İç bağlantılar (/docs/...) mevcut bir sayfaya mı gidiyor?
 *   5) meta.json'lar geçerli JSON mu ve saydıkları dosyalar var mı?
 *
 * Kullanım: node scripts/check-mdx.mjs
 */
import { compile } from '@mdx-js/mdx';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'content', 'docs');
const PUBLIC = join(ROOT, 'public');

const errors = [];
const warnings = [];

/** Klasörü gez, koşula uyan dosyaları topla */
function walk(dir, test) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, test));
    else if (test(name)) out.push(p);
  }
  return out;
}

const mdxFiles = walk(DOCS, (n) => n.endsWith('.mdx'));
const metaFiles = walk(DOCS, (n) => n === 'meta.json');

/** Dosya yolundan site URL'i üret: content/docs/a/b.mdx -> /docs/a/b */
function urlOf(file) {
  let rel = relative(DOCS, file).replace(/\\/g, '/').replace(/\.mdx$/, '');
  if (rel === 'index') return '/docs';
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  return `/docs/${rel}`;
}

const knownUrls = new Set(mdxFiles.map(urlOf));

for (const file of mdxFiles) {
  const rel = relative(ROOT, file);
  const raw = readFileSync(file, 'utf8');

  // --- frontmatter ---
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) {
    errors.push(`${rel}: frontmatter yok`);
    continue;
  }
  if (!/^title:\s*\S/m.test(fm[1])) errors.push(`${rel}: frontmatter'da title yok`);
  if (!/^description:\s*\S/m.test(fm[1]))
    warnings.push(`${rel}: description yok (arama sonuçlarında boş görünür)`);

  const body = raw.slice(fm[0].length);

  // --- MDX sözdizimi ---
  try {
    await compile(body, { format: 'mdx' });
  } catch (e) {
    errors.push(`${rel}: MDX hatası — ${String(e.message).split('\n')[0]}`);
  }

  // --- görseller ---
  for (const m of body.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/g)) {
    if (!existsSync(join(PUBLIC, m[1]))) errors.push(`${rel}: görsel yok — ${m[1]}`);
  }

  // --- iç bağlantılar ---
  for (const m of body.matchAll(/\]\((\/docs[^)\s#]*)/g)) {
    const target = m[1].replace(/\/$/, '');
    if (!knownUrls.has(target)) errors.push(`${rel}: kırık iç bağlantı — ${target}`);
  }
}

// --- meta.json bütünlüğü ---
for (const file of metaFiles) {
  const rel = relative(ROOT, file);
  let meta;
  try {
    meta = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${rel}: geçersiz JSON — ${e.message}`);
    continue;
  }
  const dir = dirname(file);
  for (const name of meta.pages ?? []) {
    const isPage = existsSync(join(dir, `${name}.mdx`));
    const isDir = existsSync(join(dir, name)) && statSync(join(dir, name)).isDirectory();
    if (!isPage && !isDir) errors.push(`${rel}: "${name}" adında sayfa/klasör yok`);
  }
  // meta'da sayılmayan sayfalar
  const listed = new Set(meta.pages ?? []);
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.mdx') && !listed.has(f.replace(/\.mdx$/, '')))
      warnings.push(`${rel}: "${f}" meta.json'da listelenmemiş (sırada sona düşer)`);
  }
}

// --- rapor ---
console.log(`${mdxFiles.length} sayfa, ${metaFiles.length} meta.json denetlendi`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} uyarı`);
  for (const w of warnings.slice(0, 20)) console.log('  ' + w);
  if (warnings.length > 20) console.log(`  … ve ${warnings.length - 20} uyarı daha`);
}
if (errors.length) {
  console.error(`\n✗ ${errors.length} hata`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log('\n✓ Tüm kontroller geçti');
