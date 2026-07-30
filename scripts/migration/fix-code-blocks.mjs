#!/usr/bin/env node
/**
 * Göç artığı kod bloklarını doğru elemente taşır.
 *
 *   node scripts/migration/fix-code-blocks.mjs          # kuru çalıştırma (rapor)
 *   node scripts/migration/fix-code-blocks.mjs --yaz    # uygula
 *
 * NEDEN: Eski site düz paragrafları görsel kutu diye <pre> içine koymuş, göç
 * aracı da onları markdown kod bloğuna çevirmiş. Sonuç: 108 blok daktilo
 * yazısıyla dizilmiş Türkçe cümle, yanlarında "kopyala" düğmesi ve yatay taşma.
 *
 * KURALLAR
 *   1) Aralarında yalnızca boş satır olan ARDIŞIK bloklar (≥2)  → madde listesi
 *   2) Hemen önünde kısa bir düz metin satırı olan blok (etiket) → "### etiket"
 *      + paragraf. Bu ayrıca başlıksız sayfa sorununu da çözer: o etiketler
 *      zaten bölüm adıydı, işaretlemesi yoktu.
 *   3) İçeriği URL/teknik değer olan blok                        → DOKUNULMAZ
 *   4) Yalnız kalan diğer bloklar                                → paragraf
 *
 * Blok içindeki `ters tırnak` işaretleri korunur — paragrafta inline kod olur.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DOCS = join(ROOT, 'content', 'docs');
const YAZ = process.argv.includes('--yaz');

/** Gerçek kod mu? URL, dosya yolu, komut → dokunma. */
const GERCEK_KOD = (s) =>
  /^https?:\/\//.test(s.trim()) ||
  /^[a-z-]+\s+--?[a-z]/.test(s.trim()) ||
  /^(npm|node|git|gh|curl|cd)\s/.test(s.trim());

/** Etiket olabilir mi? Kısa, noktayla bitmeyen, işaretlemesiz düz satır. */
const ETIKET_OLABILIR = (s) =>
  s.length > 0 &&
  s.length <= 60 &&
  !/^[#>\-*|!]/.test(s) &&
  !/^\d+\./.test(s) &&
  !/^<\//.test(s) &&
  !/^!\[/.test(s) &&
  !s.endsWith(':') &&
  !s.endsWith('.');

function walk(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (n.endsWith('.mdx')) out.push(p);
  }
  return out;
}

const sayac = { liste: 0, baslik: 0, paragraf: 0, kod: 0 };
const rapor = [];

for (const file of walk(DOCS)) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');

  // --- blokları bul ---
  const bloklar = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^```/.test(lines[i])) continue;
    const bas = i;
    let j = i + 1;
    while (j < lines.length && !/^```\s*$/.test(lines[j])) j++;
    bloklar.push({ bas, son: j, icerik: lines.slice(bas + 1, j) });
    i = j;
  }
  if (!bloklar.length) continue;

  // --- ardışıklık: aralarında yalnız boş satır olanları grupla ---
  const gruplar = [];
  for (const b of bloklar) {
    const onceki = gruplar.at(-1)?.at(-1);
    const arasi = onceki ? lines.slice(onceki.son + 1, b.bas) : null;
    if (onceki && arasi.every((l) => l.trim() === '')) gruplar.at(-1).push(b);
    else gruplar.push([b]);
  }

  // --- her blok için karar ---
  const kararlar = new Map();
  for (const g of gruplar) {
    if (g.length >= 2) {
      for (const b of g) kararlar.set(b.bas, { tip: 'liste', grup: g });
      continue;
    }
    const b = g[0];
    const metin = b.icerik.join('\n').trim();
    if (GERCEK_KOD(metin)) {
      kararlar.set(b.bas, { tip: 'kod' });
      continue;
    }
    // Önündeki boş olmayan satır etiket mi?
    let k = b.bas - 1;
    while (k >= 0 && lines[k].trim() === '') k--;
    const aday = k >= 0 ? lines[k].trim() : '';
    const bosMu = b.bas - k === 1; // blok etikete YAPIŞIK olmalı
    kararlar.set(b.bas, bosMu && ETIKET_OLABILIR(aday) ? { tip: 'baslik', etiketSatir: k } : { tip: 'paragraf' });
  }

  // --- yeniden yaz ---
  const cikti = [];
  const atla = new Set();
  for (let i = 0; i < lines.length; i++) {
    if (atla.has(i)) continue;
    const karar = kararlar.get(i);
    if (!karar) {
      cikti.push(lines[i]);
      continue;
    }
    const b = bloklar.find((x) => x.bas === i);

    if (karar.tip === 'kod') {
      for (let k = b.bas; k <= b.son; k++) cikti.push(lines[k]);
      for (let k = b.bas; k <= b.son; k++) atla.add(k);
      sayac.kod++;
      continue;
    }

    if (karar.tip === 'liste') {
      // grubun ilk bloğunda tüm grubu tek listeye çevir
      if (karar.grup[0].bas !== b.bas) continue;
      for (const g of karar.grup) {
        cikti.push(`- ${g.icerik.join(' ').trim()}`);
        for (let k = g.bas; k <= g.son; k++) atla.add(k);
        sayac.liste++;
      }
      // gruptaki bloklar arasındaki boş satırları da yut
      for (let k = karar.grup[0].bas; k <= karar.grup.at(-1).son; k++) atla.add(k);
      continue;
    }

    if (karar.tip === 'baslik') {
      // etiket satırını çıktıdan geri al, başlık olarak yaz
      const etiket = lines[karar.etiketSatir].trim();
      while (cikti.length && cikti.at(-1).trim() === '') cikti.pop();
      if (cikti.at(-1)?.trim() === etiket) cikti.pop();
      cikti.push('', `### ${etiket}`, '');
      sayac.baslik++;
    } else {
      sayac.paragraf++;
    }
    // gövdeyi paragraf(lar) olarak yaz
    const paragraflar = b.icerik.join('\n').trim().split(/\n\s*\n/);
    cikti.push(paragraflar.map((p) => p.replace(/\n/g, ' ').trim()).join('\n\n'));
    for (let k = b.bas; k <= b.son; k++) atla.add(k);
  }

  const yeni = cikti.join('\n').replace(/\n{3,}/g, '\n\n');
  if (yeni !== src) {
    rapor.push(`${rel}: ${bloklar.length} blok`);
    if (YAZ) writeFileSync(file, yeni, 'utf8');
  }
}

console.log(`${YAZ ? 'UYGULANDI' : 'KURU ÇALIŞTIRMA'}\n`);
for (const r of rapor) console.log('  ' + r);
console.log(
  `\n  madde listesine: ${sayac.liste}` +
    `\n  ### başlık + paragraf: ${sayac.baslik}` +
    `\n  düz paragraf: ${sayac.paragraf}` +
    `\n  kod olarak korundu: ${sayac.kod}` +
    `\n  TOPLAM: ${sayac.liste + sayac.baslik + sayac.paragraf + sayac.kod}`,
);
