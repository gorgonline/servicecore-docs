#!/usr/bin/env node
/**
 * Çürüme raporu — `reviewed` tarihi eskimiş sayfaları listeler.
 *
 *   node scripts/stale-report.mjs [gün]      # varsayılan 90
 *
 * Markdown tablo basar; haftalık GitHub Action bunu tek bir issue'ya yazar.
 * Çıkış kodu her zaman 0 — bu bir rapor, bir kapı değil.
 *
 * Sahibi olan sayfalar sahibine göre gruplanır, olmayanlar "sahipsiz" başlığı
 * altında toplanır; böylece toplantıda dağıtılacak liste hazır olur.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'content', 'docs');
const LIMIT = Number(process.argv[2] ?? 90);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.mdx')) out.push(p);
  }
  return out;
}

/** content/docs/a/b.mdx -> /docs/a/b */
function urlOf(file) {
  let rel = relative(DOCS, file).replace(/\\/g, '/').replace(/\.mdx$/, '');
  if (rel === 'index') return '/docs';
  if (rel.endsWith('/index')) rel = rel.slice(0, -'/index'.length);
  return `/docs/${rel}`;
}

// Gün farkı UTC üzerinden sayılıyor: iki tarih de YYYY-MM-DD, saat bilgisi yok.
// Date.UTC ile karşılaştırmak yerel saat diliminden kaynaklanan ±1 gün
// kaymasını engeller.
const GUN = 86_400_000;
function gunFarki(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const bugun = new Date().toISOString().slice(0, 10).split('-').map(Number);
  return Math.floor(
    (Date.UTC(bugun[0], bugun[1] - 1, bugun[2]) - Date.UTC(y, m - 1, d)) / GUN,
  );
}

const stale = [];
const tarihsiz = [];

for (const file of walk(DOCS)) {
  const raw = readFileSync(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) continue;

  const title = fm[1].match(/^title:\s*"?(.*?)"?\s*$/m)?.[1] ?? relative(DOCS, file);
  const owner = fm[1].match(/^owner:\s*"?@?([\w-]+)"?\s*$/m)?.[1] ?? null;
  const reviewed = fm[1].match(/^reviewed:\s*"(\d{4}-\d{2}-\d{2})"\s*$/m)?.[1] ?? null;
  const kayit = { title, owner, url: urlOf(file), path: relative(ROOT, file) };

  if (!reviewed) tarihsiz.push(kayit);
  else {
    const yas = gunFarki(reviewed);
    if (yas > LIMIT) stale.push({ ...kayit, reviewed, yas });
  }
}

stale.sort((a, b) => b.yas - a.yas);

const toplam = stale.length + tarihsiz.length;
if (toplam === 0) {
  console.log(`Tüm sayfalar ${LIMIT} günden yeni. Çürüyen sayfa yok. ✓`);
  process.exit(0);
}

const satir = (p) =>
  `| [${p.title}](${p.url}) | ${p.reviewed ?? '—'} | ${p.yas ?? '—'} | ${p.owner ? '@' + p.owner : '—'} |`;

console.log(
  `${LIMIT} günden eski **${stale.length}** sayfa var` +
    (tarihsiz.length ? `, ayrıca **${tarihsiz.length}** sayfada tarih yok` : '') +
    '.\n',
);

// Sahibe göre grupla — herkes kendi listesini görsün.
const gruplar = new Map();
for (const p of stale) {
  const k = p.owner ?? '__sahipsiz__';
  if (!gruplar.has(k)) gruplar.set(k, []);
  gruplar.get(k).push(p);
}

// Sahipsizler en sona: adı olanlar önce iş görsün.
const sirali = [...gruplar.entries()].sort(([a], [b]) =>
  a === '__sahipsiz__' ? 1 : b === '__sahipsiz__' ? -1 : a.localeCompare(b),
);

for (const [sahip, sayfalar] of sirali) {
  console.log(
    sahip === '__sahipsiz__'
      ? `\n### Sahibi atanmamış (${sayfalar.length})\n`
      : `\n### @${sahip} (${sayfalar.length})\n`,
  );
  console.log('| Sayfa | Son doğrulama | Gün | Sahip |');
  console.log('|---|---|---|---|');
  for (const p of sayfalar) console.log(satir(p));
}

// Liste uzunluğu sınırlı: issue gövdesi 200 satırlık tabloya dönüşürse kimse
// okumaz. Kesilen sayı AÇIKÇA yazılıyor — sessiz kırpma "hepsi bu" gibi görünür.
const KESIM = 60;
if (tarihsiz.length) {
  console.log(`\n### Tarihi olmayan sayfalar (${tarihsiz.length})\n`);
  console.log('| Sayfa | Dosya |');
  console.log('|---|---|');
  for (const p of tarihsiz.slice(0, KESIM)) console.log(`| [${p.title}](${p.url}) | \`${p.path}\` |`);
  if (tarihsiz.length > KESIM)
    console.log(
      `\n_… ve ${tarihsiz.length - KESIM} sayfa daha. Tam liste: ` +
        '`node scripts/stale-report.mjs`_',
    );
}

console.log(
  '\n---\n' +
    'Bir sayfayı ürünle karşılaştırıp doğruladıysanız frontmatter\'daki ' +
    '`reviewed` tarihini bugüne çekin. İçerik değiştiyse önce güncelleyin.\n\n' +
    'Sahipsiz sayfalar için `owner:` alanına sorumlunun GitHub kullanıcı adını yazın.',
);
