# Servicecore Dokümantasyonu

**docs.servicecore.app** sitesinin kaynak deposu. Tüm içerik Markdown (`.mdx`)
dosyalarında tutulur; personel kendi AI asistanı üzerinden MCP ile güncelleyebilir.

| | |
|---|---|
| Framework | [Fumadocs](https://fumadocs.dev) 16 + Next.js 16 |
| Arama | Orama (Türkçe tokenizer, derleme anında indekslenir) |
| Barındırma | Vercel — `main` dalına birleşince otomatik yayınlanır |
| İçerik | `content/docs/**` — 196 sayfa, 647 görsel |

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

## Yayına alma (tek seferlik kurulum)

Bu depo yereldedir; katkı akışının çalışması için GitHub'a ve Vercel'e
bağlanması gerekir.

### 1. Depoyu yayına alın

```bash
./scripts/publish.sh
```

Hedef `gorgonline/servicecore-docs` olur (`gh`'de oturum açmış hesap).
Betik sırasıyla: ön koşulları doğrular → `npm run check` çalıştırır → depo
adresini `README.md`, `docs/mcp-kurulumu.md` ve `src/lib/shared.ts` içine
yerleştirip commit eder → depoyu **public** oluşturup `main`'i gönderir → dal
korumasını kurar (doğrudan push kapalı, PR + 1 onay + CI zorunlu) → sonucu
API'den okuyup doğrular. Depo oluşturmadan önce onay sorar; tekrar
çalıştırılabilir, tamamlanmış adımları atlar.

Bir organizasyona almak isterseniz org adını argüman verin —
`./scripts/publish.sh <org-adi>` — ama org'un GitHub'da önceden açılmış olması
gerekir; oluşturmanın REST API'si yok.

> **Depo neden public?** Ücretsiz planda dal koruması yalnızca public depolarda
> çalışıyor — özel depoda GitHub `403 "Upgrade to GitHub Pro"` döndürüyor.
> Koruma olmadan `main`'e doğrudan yazılabilir ve bu depodaki tüm inceleme akışı
> (bkz. [CLAUDE.md](CLAUDE.md) §4) kâğıt üstünde kalır. İçerik zaten
> `docs.servicecore.app` üzerinden herkese açık yayınlandığı için public depo
> ek bir bilgi sızdırmaz. Depoyu özel tutmak isterseniz GitHub Team gerekir.

### 2. Vercel'e bağlayın

[vercel.com/new](https://vercel.com/new) → depoyu içe aktarın → framework
otomatik algılanır → Deploy. Ardından:

- **Settings → Domains** → `docs.servicecore.app` (DNS'te CNAME'i Vercel'in
  verdiği hedefe yönlendirin).
- **Settings → Environment Variables** → `NEXT_PUBLIC_GITHUB_USER` ve
  `NEXT_PUBLIC_GITHUB_REPO`. Sayfa altındaki "GitHub'da Düzenle" bağlantıları
  bunlardan üretilir; tanımlanmazsa
  [`src/lib/shared.ts`](src/lib/shared.ts) içindeki varsayılanlar kullanılır.

### 3. Ekibi ekleyin

13 kişiyi ortak çalışan olarak ekleyin — [Settings →
Access](https://github.com/gorgonline/servicecore-docs/settings/access) ya da:

```bash
gh api -X PUT repos/gorgonline/servicecore-docs/collaborators/<kullanici> -f permission=push
```

Sonra [docs/mcp-kurulumu.md](docs/mcp-kurulumu.md) kılavuzunu paylaşın — herkes
kendi AI asistanını bir kez bağlayıp doğal dille katkı verebilir.

### 4. İnceleyicileri tanımlayın

[`.github/CODEOWNERS`](.github/CODEOWNERS) kutudan çıktığı gibi çalışır:
varsayılan sahip tanımlı olduğu için her PR'a inceleyici atanır. Bölüm bazlı
sahiplik için ilgili satırları **kullanıcı adlarıyla** açın:

```
/content/docs/teknisyen/    @ahmet @ayse
/content/docs/yonetici/     @mehmet
```

> Dosyadaki `@org/ekip` biçimindeki örnek satırlar yorumda: **ekip sözdizimi
> yalnızca organizasyonda geçerlidir**, kişisel hesapta çalışmaz. Kod sahibi
> olacak kişinin depoda yazma yetkisi olmalı; olmayan sahip sessizce yok sayılır.

Bölüm satırları dolduktan sonra kod sahibi onayını zorunlu yapın:

```bash
gh api -X PATCH repos/gorgonline/servicecore-docs/branches/main/protection/required_pull_request_reviews \
  -F require_code_owner_reviews=true
```

> **Kilitlenmemek için:** `main`'de 1 onay zorunlu ve kimse kendi PR'ını
> onaylayamaz. Henüz başka ortak çalışan yokken tıkanmamak adına koruma
> yönetici hesabını kapsamıyor (`enforce_admins=false`). Ekip eklendikten sonra
> sıkılaştırmak için: `gh api -X PATCH repos/gorgonline/servicecore-docs/branches/main/protection -F enforce_admins=true`

### 5. Sonradan: organizasyona taşıma

Organizasyon açtığınızda depoyu **Settings → Transfer ownership** ile oraya
taşıyabilirsiniz. GitHub eski adresten yenisine otomatik yönlendirme kurar —
kimsenin bağlantısı, PR'ları ve git geçmişi kırılmaz. Ardından
`./scripts/publish.sh <org-adi>` çalıştırıp ekip bazlı sahipliği devreye alın.

> `servicecore` org adı GitHub'da başkası tarafından alınmış. Alan adıyla uyumlu
> olduğu için `servicecore-app` öneriliyor; `servicecoreapp`, `servicecore-tr`,
> `getservicecore` de müsait.

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
redirects.json         Eski URL → yeni URL haritası (384 kalıcı yönlendirme)
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
dosyaları elde olmadığı için 522 HTML sayfası ayrıştırılmış; 171 içerik sayfası,
647 görsel (169'u sayfa içine gömülü base64'ten çıkarılmış), 25 bölüm giriş
sayfası ve kenar çubuğu sıralaması geri kazanılmıştır. Kaynakta hiç `##` başlık
kullanılmadığı için bölüm başlıkları (`<p><strong>…</strong>`) gerçek başlıklara
çevrilmiştir — sayfa içi gezinme listesi bu sayede çalışır.

Eski sitedeki **CSSMAAdmin** bölümü yayınlanmamıştır: aynı 12 konu
`admin-egitimleri/genel-panel-ayarlari` altında çalışan YouTube videoları ve
açıklama metniyle zaten mevcuttur (CSSMAAdmin sürümünün videoları istemci
tarafında yükleniyordu, statik çıktıda adresleri yoktu). Bu bölümün eski
URL'leri çalışan karşılıklarına yönlendirilir.

Doğrulama: eski sitenin 207 URL'sinin tamamı yeni sitede çalışan bir sayfaya
ulaşır; 197 yayınlanan adresin tamamı 200 döner, 648 görselin tamamı çözülür.
