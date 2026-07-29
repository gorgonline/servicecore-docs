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
const TODAY = new Date().toISOString().slice(0, 10);
/** Saat dilimi payı — bkz. reviewed denetimi. UTC bugün + 1 gün. */
const TOLERANS = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

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

  // --- tazelik alanı ---
  // Tarih TIRNAKLI olmalı: çıplak 2026-07-30 YAML'de Date nesnesine dönüşür ve
  // ayrıştırıcı yerel saat dilimine göre yorumlayınca gün kayabilir.
  const reviewed = fm[1].match(/^reviewed:\s*(.*)$/m);
  if (!reviewed) {
    warnings.push(`${rel}: reviewed yok (çürüme raporunda "tarihi yok" olarak listelenir)`);
  } else if (!/^"\d{4}-\d{2}-\d{2}"$/.test(reviewed[1].trim())) {
    errors.push(
      `${rel}: reviewed biçimi geçersiz — "YYYY-MM-DD" bekleniyor ` +
        `(tırnak dahil), bulunan: ${reviewed[1].trim() || '(boş)'}`,
    );
  } else if (reviewed[1].trim().slice(1, 11) > TOLERANS) {
    // Bir günlük tolerans: yazar yerel takvimine göre tarih atar, CI ise UTC'de
    // çalışır. Türkiye UTC+3, yani gece yarısından sonra yazılan "bugün" UTC'de
    // yarın görünür — sıkı karşılaştırma her seferinde yanlış hata verir.
    // Toleransın ötesi gerçek yazım hatasıdır (ör. yıl 2027).
    errors.push(
      `${rel}: reviewed tarihi gelecekte — ${reviewed[1].trim()} ` +
        `(bugün UTC: ${TODAY})`,
    );
  }

  const body = raw.slice(fm[0].length);

  // --- MDX sözdizimi ---
  try {
    await compile(body, { format: 'mdx' });
  } catch (e) {
    errors.push(`${rel}: MDX hatası — ${String(e.message).split('\n')[0]}`);
  }

  // Kod blokları ve satır içi kod örnek metindir; içindeki yol/bağlantı
  // benzeri diziler gerçek referans değildir — denetim dışı bırakılır.
  const prose = body
    .replace(/^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');

  // --- görseller ---
  for (const m of prose.matchAll(/!\[[^\]]*\]\((\/[^)\s]+)\)/g)) {
    if (!existsSync(join(PUBLIC, decodeURIComponent(m[1]))))
      errors.push(`${rel}: görsel yok — ${m[1]}`);
  }

  // --- iç bağlantılar (markdown bağlantıları + Card/href bileşenleri) ---
  const targets = [
    ...[...prose.matchAll(/\]\((\/docs[^)\s#]*)/g)].map((m) => m[1]),
    ...[...prose.matchAll(/href=["'](\/docs[^"'#]*)/g)].map((m) => m[1]),
  ];
  for (const t of targets) {
    const target = t.replace(/\/$/, '');
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
    // Fumadocs meta sözdizimi: "---Ayraç---" başlık ayracı, "..." kalan
    // sayfalar, "!gizli" hariç tutma, "[Etiket](/yol)" harici bağlantı.
    if (/^---.*---$/.test(name) || name === '...' || name === 'z...' ||
        name.startsWith('!') || name.startsWith('['))
      continue;
    const bare = name.replace(/^\.\.\./, '');
    const isPage = existsSync(join(dir, `${bare}.mdx`));
    const isDir = existsSync(join(dir, bare)) && statSync(join(dir, bare)).isDirectory();
    if (!isPage && !isDir) errors.push(`${rel}: "${name}" adında sayfa/klasör yok`);
  }
  // meta'da sayılmayan sayfalar
  // (index.mdx bilinçli olarak listelenmez — Fumadocs klasör başlığını
  //  doğrudan giriş sayfasına bağlar; listelenirse menüde tekrar eder)
  const listed = new Set(meta.pages ?? []);
  for (const f of readdirSync(dir)) {
    const name = f.replace(/\.mdx$/, '');
    if (f.endsWith('.mdx') && name !== 'index' && !listed.has(name))
      warnings.push(`${rel}: "${f}" meta.json'da listelenmemiş (sırada sona düşer)`);
  }
  if (dir !== DOCS && (meta.pages ?? []).includes('index'))
    warnings.push(`${rel}: "index" listelenmiş — kenar çubuğunda bölüm adı iki kez görünür`);
}

// --- yönlendirme sağlığı (redirects.json) ---
// Bu üç kontrol gerçek üretim hatalarını yakalar:
//   a) hedefi olmayan kural  -> eski adres 404
//   b) yalnızca büyük/küçük harfte ayrışan kural -> next.config eşleştirmesi
//      harf duyarsız olduğu için kural kendi hedefiyle de eşleşir ve SONSUZ
//      YÖNLENDİRME DÖNGÜSÜ oluşur (bu durum `src/proxy.ts` işidir)
//   c) kaynağın küçük harfli hâli gerçek bir sayfa ise o sayfa da kaçırılır
const REDIRECTS = join(ROOT, 'redirects.json');
if (existsSync(REDIRECTS)) {
  let rules;
  try {
    rules = JSON.parse(readFileSync(REDIRECTS, 'utf8'));
  } catch (e) {
    errors.push(`redirects.json: geçersiz JSON — ${e.message}`);
    rules = [];
  }
  const norm = (s) => {
    let out = s;
    try {
      out = decodeURIComponent(s);
    } catch {
      /* bozuk kodlama — olduğu gibi bırak */
    }
    return out.normalize('NFC').replace(/\/$/, '');
  };
  for (const r of rules) {
    const src = norm(r.source ?? '');
    const dest = norm((r.destination ?? '').split('#')[0]);
    if (!knownUrls.has(dest))
      errors.push(`redirects.json: "${r.source}" geçersiz hedefe gidiyor — ${r.destination}`);
    if (src.toLowerCase() === dest.toLowerCase())
      errors.push(
        `redirects.json: "${r.source}" yalnızca harf farkıyla kendi hedefine gidiyor — ` +
          `sonsuz yönlendirme döngüsü olur, src/proxy.ts içinde çözün`,
      );
    else if (knownUrls.has(src.toLowerCase()))
      errors.push(
        `redirects.json: "${r.source}" kuralı harf duyarsız eşleşme yüzünden ` +
          `gerçek "${src.toLowerCase()}" sayfasını da kaçırır — src/proxy.ts içinde çözün`,
      );
  }
}

// --- değişen sayfada tarih güncellendi mi? ---
// Yalnızca FRESHNESS_BASE tanımlıysa çalışır (CI, PR'ın hedef dalını verir).
// Yerelde sessizce atlanır; geliştirici her kaydetmede uyarı görmesin.
//
// UYARI, hata değil: yazım düzeltmesi gibi değişikliklerde tarihi ilerletmek
// yanlış olur — "içerik ürünle yeniden doğrulandı" demek istemiyoruz. Kararı
// inceleyiciye bırakıyoruz, ama görünmez kalmasın.
const BASE = process.env.FRESHNESS_BASE;
if (BASE) {
  const { execFileSync } = await import('node:child_process');
  const git = (...args) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  try {
    const changed = git('diff', '--name-only', `${BASE}...HEAD`, '--', 'content/docs')
      .split('\n')
      .filter((f) => f.endsWith('.mdx'));

    for (const f of changed) {
      // Dosya bu PR'da eklenmişse tarih zaten yeni; kontrol etmeye gerek yok.
      const patch = git('diff', '-U0', `${BASE}...HEAD`, '--', f);
      if (/^\+\+\+ b\//m.test(patch) && /^--- \/dev\/null/m.test(patch)) continue;
      if (!/^\+reviewed:/m.test(patch)) {
        warnings.push(
          `${f}: içerik değişmiş ama reviewed tarihi güncellenmemiş — ` +
            `ürünle yeniden doğruladıysanız tarihi bugüne çekin`,
        );
      }
    }
    console.log(`tazelik: ${changed.length} değişen sayfa denetlendi (taban: ${BASE})`);
  } catch (e) {
    // Sığ klon, eksik taban dalı vb. — denetimi kırma, sebebini yaz.
    warnings.push(`tazelik denetimi atlandı (git karşılaştırması yapılamadı): ${e.message.split('\n')[0]}`);
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
