# Servicecore Dokümantasyonu

**docs.servicecore.app** sitesinin kaynak deposu. Tüm içerik Markdown (`.mdx`)
dosyalarında tutulur; personel kendi AI asistanı üzerinden MCP ile güncelleyebilir.

| | |
|---|---|
| Framework | [Fumadocs](https://fumadocs.dev) 16 + Next.js 16 |
| Arama | Orama (Türkçe tokenizer, derleme anında indekslenir) |
| Barındırma | Vercel — `main` dalına birleşince otomatik yayınlanır |
| İçerik | `content/docs/**` — 210 sayfa, 647 görsel |

---

## Hızlı başlangıç

```bash
npm install
npm run dev          # http://localhost:3000
```

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (anlık yenileme) |
| `npm run build` | Üretim derlemesi |
| `npm run check:mdx` | İçerik kontrolü: frontmatter, MDX sözdizimi, görseller, bağlantılar, `meta.json` |
| `npm run check` | İçerik kontrolü + derleme (CI'ın yaptığı) |
| `npm run types:check` | TypeScript kontrolü |

---

## Dokümantasyon nasıl güncellenir?

Üç yol var; hangisi size uygunsa:

### 1. AI asistanı ile (önerilen)

Kendi AI asistanınıza (Claude Code, Claude Desktop, Cursor) GitHub MCP
bağlantısını bir kez kurun, sonra doğal dille söyleyin:

> "Yönetici kılavuzundaki gelişmiş ayarlar sayfasına yeni eskalasyon
> ayarını ekle, PR aç."

Kurulum ve kullanım: **[docs/mcp-kurulumu.md](docs/mcp-kurulumu.md)**

### 2. GitHub arayüzünden

İlgili sayfanın altındaki **"GitHub'da Düzenle"** bağlantısına tıklayın,
düzenleyin, PR açın.

### 3. Yerelde

```bash
git checkout -b docs/konu-adi
# content/docs altında düzenle
npm run check:mdx
git commit -am "docs: eskalasyon ayarı eklendi"
git push -u origin docs/konu-adi
```

Her üç yolda da: **PR açılır → CI kontrolleri çalışır → Vercel önizleme
adresi üretir → bölüm sahibi onaylar → `main`'e birleşir → otomatik yayınlanır.**

Yazım kuralları, bileşenler ve klasör yapısı: **[CLAUDE.md](CLAUDE.md)**
(AI ajanları bu dosyayı otomatik okur; insanlar için de aynı kılavuz geçerlidir.)

---

## Depo yapısı

```
content/docs/          İçerik (.mdx) — katkıların %99'u burada
  <bölüm>/meta.json    Kenar çubuğu sırası ve bölüm başlığı
public/img/<bölüm>/    Ekran görüntüleri
src/app/tokens.css     Tüm renk/ölçü/font token'ları — tasarımın tek kaynağı
src/app/design.css     İçerik sunum katmanı (tipografi, figürler, kod)
src/lib/site.ts        Site adı, adres, dış bağlantılar
src/lib/i18n-tr.ts     Arayüz metinlerinin Türkçe çevirileri
scripts/check-mdx.mjs  İçerik doğrulayıcı (CI kullanır)
scripts/migration/     Eski Docusaurus sitesinden dönüştürme aracı (arşiv)
redirects.json         Eski URL → yeni URL haritası (235 kalıcı yönlendirme)
```

---

## Tasarım

Renkler, yazı tipleri, köşe yuvarlaklıkları ve genişlikler **yalnızca**
[`src/app/tokens.css`](src/app/tokens.css) dosyasından yönetilir. Örneğin
marka rengini değiştirmek için tek satır yeterlidir:

```css
--sc-brand: #0070f3;
```

Bileşenlerin içinde sabit renk **yazılmaz**; hepsi bu token'lara referans verir.
Açık ve koyu tema farkı da yalnızca token katmanında tanımlıdır.

---

## Yayınlama

`main` dalına birleşen her değişiklik Vercel tarafından otomatik yayınlanır.
Her PR için ayrı bir önizleme adresi üretilir; onay öncesi orada görülebilir.

Alan adı `docs.servicecore.app` olarak yapılandırıldığında eski sitenin tüm
URL'leri (`/docs/adminpaneli/genel` gibi) `redirects.json` üzerinden yeni
adreslerine kalıcı (308) yönlendirilir — arama motoru sıralaması korunur.

---

## Migration notları

Bu site, eski Docusaurus sitesinin derlenmiş HTML çıktısından
(`scripts/migration/convert.py`) otomatik olarak üretilmiştir. Kaynak Markdown
dosyaları elde olmadığı için 522 HTML sayfası ayrıştırılmış; 183 içerik sayfası,
647 görsel (169'u sayfa içine gömülü base64'ten çıkarılmış), 27 bölüm giriş
sayfası ve kenar çubuğu sıralaması geri kazanılmıştır.

Bekleyen tek iş: **CSSM-A Admin (Arşiv)** bölümündeki 11 eğitim videosu.
Videolar (~2,4 GB) depoya konulamayacağı için YouTube'a yüklenip sayfalara
gömülmelidir; ilgili sayfalarda bunu belirten bir uyarı kutusu bulunur.
