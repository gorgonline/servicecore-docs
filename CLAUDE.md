# Servicecore Dokümantasyonu — AI Ajanları İçin Kılavuz

Bu depo, **docs.servicecore.app** adresinde yayınlanan dokümantasyon sitesidir.
Personel, kendi AI asistanı (Claude Code / Claude Desktop / Cursor) üzerinden
MCP ile bu depoyu güncelleyerek dokümantasyona katkı verir.

Bu dosya, bir AI ajanının doğru yeri bulup doğru biçimde yazması için
gereken tüm kuralları içerir. **Değişiklik yapmadan önce baştan sona okuyun.**

---

## 1. Nerede ne var

```
content/docs/              ← TÜM dokümantasyon içeriği (.mdx). Yalnızca burası düzenlenir.
  index.mdx                  ana giriş sayfası
  meta.json                  bölümlerin sırası
  teknisyen/                 Teknisyen Kılavuzu
  kullanici/                 Kullanıcı Kılavuzu (son kullanıcı)
  yonetici/                  Yönetici Kılavuzu (admin paneli)
  entegrasyonlar/            Entegrasyon Kılavuzu
  migration.mdx              Migration Kılavuzu
  kurulum/                   Kurulum Kılavuzu
  esm/                       ESM Kılavuzu
  admin-egitimleri/          CSSM-A admin eğitim videoları
  teknisyen-egitimleri/      CSSM-P teknisyen eğitim videoları

public/img/<bölüm>/        ← ekran görüntüleri, bölüm klasörüne göre ayrılmış
src/                       ← site kodu (tasarım/altyapı; içerik katkısında dokunulmaz)
src/app/tokens.css         ← TÜM renk/ölçü/font token'ları (tek kaynak)
scripts/migration/         ← eski Docusaurus sitesinden dönüştürme aracı (arşiv)
```

**Kural:** İçerik katkısı = yalnızca `content/docs/**` ve `public/img/**`.
`src/`, `next.config.mjs`, `package.json` gibi dosyalara içerik güncellemesi
sırasında dokunulmaz.

---

## 2. Sayfa biçimi

Her `.mdx` dosyası şu frontmatter ile başlar:

```mdx
---
title: "Sayfa Başlığı"
description: "Sayfayı bir cümleyle özetleyen açıklama (arama sonuçlarında görünür)"
reviewed: "2026-07-30"
owner: ahmet
---
```

- `title` — kenar çubuğunda ve sayfa başlığında görünür. **Zorunlu.**
- `description` — arama ve kart açıklamalarında kullanılır. **Şiddetle önerilir**, 155 karakteri geçmesin.
- `reviewed` — içeriğin ürünle en son doğrulandığı tarih. **Tırnak içinde, `YYYY-MM-DD`.**
  Bkz. §7.
- `owner` — sayfadan sorumlu GitHub kullanıcısı (`@` olmadan). Boş olabilir.

### Yazım kuralları

| Durum | Doğru | Yanlış |
|---|---|---|
| Kısa arayüz terimi | `` `Genel Ayarlar` `` | **Genel Ayarlar** |
| Orta uzunlukta etiket | `**Çözüm Süresi Hedefi**` | `` `Çözüm Süresi Hedefi` `` |
| Uzun liste/cümle | düz metin | `` `çok uzun virgüllü liste` `` |
| Bölüm başlığı | `## Başlık` | `**Başlık**` tek satırda |

- Başlık seviyeleri: sayfa başlığı frontmatter'da (`title`), gövdede `##` ile başlanır. Gövdede `#` kullanılmaz.
- Uzun sayfalarda mutlaka `##` başlıklar olsun — sağdaki "Bu sayfada" listesi bunlardan üretilir.

### Kullanılabilir bileşenler

```mdx
<Callout type="info" title="ÖNEMLİ">Bilgi notu.</Callout>
<Callout type="warn" title="DİKKAT">Uyarı.</Callout>
<Callout type="error">Hata/kritik uyarı.</Callout>

<Accordions type="single">
  <Accordion title="Detaylar">Katlanabilir içerik.</Accordion>
</Accordions>

<Cards>
  <Card title="Başlık" href="/docs/bolum/sayfa">Açıklama</Card>
</Cards>
```

Video gömme (YouTube):

```mdx
<iframe src="https://www.youtube.com/embed/VIDEO_ID" title="Video başlığı"
  className="w-full aspect-video rounded-xl border" allowFullScreen />
```

### Görseller

- Yol: `/img/<bölüm>/<ad>.png` — dosya fiziksel olarak `public/img/<bölüm>/` altında.
- Markdown: `![Açıklayıcı alt metin](/img/yonetici/admin12.png)`
- Yeni ekran görüntüsü eklerken **ilgili bölüm klasörüne** koyun, adı anlamlı olsun.
- Görseller otomatik çerçevelenir/gölgelenir; ek stil vermeyin.

### Ekran görüntüsü standardı

Ekran görüntüsü, metnin söylediğini **göstermek** içindir. Tam ekran bir
yakalama bunu yapmaz: figür sütunu 46rem (≈736px) olduğu için 1900px'lik bir
görüntü %38 ölçekle çizilir, arayüzdeki 13px metin ekranda 5px'e düşer ve
görselde tıklayıp büyütme yoktur. Kural üç maddede özetlenir: **kırp, iki
katman kullan, işaretle.**

**1. Kırp — kabuk görsele girmez.**
Sol menü, üst menü ve proje kenar çubuğu her sayfada aynıdır; tekrar
göstermek yer harcar. Yalnızca anlatılan bölge yakalanır. Hedef genişlik
**≤900px**; 736px'in altı 1:1 çizilir ve en okunaklısıdır. Uzun sayfalarda
görsel anlamlı bir yükseklikle sınırlanır (2000px'lik bir sayfa görüntüsü
kimseye bir şey anlatmaz).

**2. İki katman — yerleşim + detay.**

| Katman | Ne gösterir | Tipik ölçü |
|---|---|---|
| **Yerleşim haritası** | Ekranın bölümleri, "ne nerede" | ~880px, 3–5 işaret |
| **Detay** | Tek bir öğenin anatomisi | ~500–740px, 2–3× büyütme, 3–7 işaret |

Yerleşim haritası okuyucuyu yönlendirir, detay görseli tek tek alanları
anlatır. Bir sayfada tek bir tam ekran görüntüsü ikisini birden yapamaz.

**3. İşaretle — kırmızı kutu + numaralı rozet.**
Kutu `#D92D20`, 3px, dışında 2px beyaz halo (beyaz ve renkli zeminde okunur).
Rozet aynı kırmızıda dolu daire, beyaz rakam, kutunun köşesinde. Ok yalnızca
kutulanamayacak kadar küçük öğede kullanılır.

**Görselin içine metin YAZILMAZ.** Anlamlar hemen altındaki tabloda ❶❷❸ ile
verilir. Sebep: metin görselin dışında kaldığı sürece aranabilir, çevrilebilir
ve düzeltilebilir; görsele gömülürse her kelime değişikliği yeniden yakalama
gerektirir.

```mdx
![Pano ekranının bölümleri](/img/teknisyen/proje-pano-yerlesim.png)

| # | Bölüm | Ne işe yarar |
|---|---|---|
| ❶ | Özet şeridi | Kart adedi, sütun sayısı ve hikaye puanı toplamı |
| ❷ | Süzgeç çubuğu | Arama, kişi/takım süzgeci, sıralama ve gruplama |
```

**Adlandırma:** `proje-<sayfa>-<konu>.png`. Yerleşim haritası daima
`-yerlesim` ile biter, böylece sayfanın giriş görseli bir bakışta ayırt edilir.

**Üretim:** Görseller elle kırpılmaz. Ana depodaki
`ServiceCoreApp.AutomationE2E` altındaki Playwright hattı, sayfayı gerçek
uygulamada açar, **CSS seçicisinden** kırpar ve işaret kutularını yine
seçiciden hesaplar. Koordinat değil seçici saklandığı için arayüz kaydığında
görselleri yeniden üretmek tek komuttur; spec dosyaları `shots/<sayfa>.json`.

---

## 3. Kenar çubuğu ve sıralama — `meta.json`

Her klasörde bir `meta.json` vardır:

```json
{
  "title": "Yönetici Kılavuzu",
  "pages": ["baslangic", "genel", "organizasyon"]
}
```

- `pages` dizisi **sıralamayı belirler**; dosya adları uzantısız yazılır.
- Alt klasörler de aynı dizide klasör adıyla yer alır.
- **Yeni sayfa eklerken `meta.json`'a da eklemeyi unutmayın**, yoksa sıralamanın sonunda kalır.
- Klasörün `index.mdx` dosyası `pages` dizisine **YAZILMAZ**. Fumadocs klasör
  başlığını zaten giriş sayfasına bağlar; listelenirse kenar çubuğunda bölüm
  adı iki kez görünür (`npm run check:mdx` bunu uyarı olarak yakalar).

---

## 4. Değişiklik akışı (ZORUNLU)

`main` dalı korumalıdır; doğrudan yazılamaz. Her değişiklik:

1. **Bul** — ilgili sayfayı `content/docs/` altında ara (arama için sayfa başlıkları ve `description` alanları iyi ipucudur).
2. **Dal aç** — `docs/<kısa-konu-adı>` biçiminde yeni bir dal.
3. **Düzenle** — yalnızca ilgili `.mdx` dosyalarını ve gerekiyorsa `meta.json`'u değiştir.
4. **PR aç** — başlık Türkçe ve açıklayıcı olsun; PR açıklamasında *ne değişti, neden* yaz.
5. **Önizle** — Vercel her PR için otomatik önizleme adresi üretir; değişikliği orada gör.
6. **Onay** — bir inceleyici onayladıktan sonra birleştirilir; birleşince otomatik yayınlanır. (Bölüm sahipleri `.github/CODEOWNERS`'ta tanımlıysa otomatik atanır.)

**Asla:** doğrudan `main`'e commit, `content/docs` dışında içerik değişikliği,
mevcut sayfaların toplu yeniden yazımı, kaynağı belirsiz bilgi ekleme.

---

## 5. Doğrulama

Değişiklikten sonra mümkünse çalıştırın (CI zaten çalıştırır):

```bash
npm run check:mdx   # hızlı: frontmatter, MDX sözdizimi, görseller, bağlantılar, meta.json
npm run build       # tam derleme (arama indeksi, yönlendirmeler, tüm sayfalar)
```

`npm run check:mdx` saniyeler sürer ve içerik hatalarının neredeyse tamamını
yakalar; her değişiklikten sonra çalıştırın. `npm run build` yalnızca daha
büyük değişikliklerde gerekir.

Sık hatalar:
- MDX'te `<` ve `{` özel karakterdir; düz metinde geçiyorsa `\<` şeklinde kaçırın veya `` ` `` içine alın.
- Bileşen etiketleri kapatılmalı (`<iframe ... />`).
- Frontmatter'daki `"` tırnaklarının dengeli olduğundan emin olun.

---

## 6. İçerik ilkeleri

- **Dil:** Türkçe. Arayüz terimleri ürün içindeki yazımıyla birebir aynı olmalı.
- **Kaynak:** Yalnızca doğrulanmış bilgi yazılır. Emin olunmayan davranış dokümante edilmez.
- **Ekran görüntüleri:** Arayüz değiştiyse görsel de güncellenmelidir; eski görsel yanlış bilgiden beterdir.
- **Kapsam:** Bir sayfa bir konuyu anlatır. Sayfa çok uzarsa alt sayfalara bölün ve `meta.json`'u güncelleyin.

---

## 7. Tazelik — `reviewed` tarihi (ÖNEMLİ)

Dokümantasyonun en büyük düşmanı çürümedir: arayüz değişir, sayfa eski kalır,
kimse hangi sayfanın güncel olduğunu bilemez. `reviewed` alanı bunu ölçülebilir
kılar.

**Ne demek:** "Bu sayfanın içeriği şu tarihte ürünle karşılaştırıldı ve doğruydu."
Git tarihi bu bilgiyi **vermez** — virgül düzeltmesi de commit'tir.

**Kural:**

| Yaptığınız iş | `reviewed` |
|---|---|
| Sayfayı ürüne bakarak güncelledin / doğruladın | **bugüne çek** |
| Yeni sayfa yazdın | **bugünün tarihi** |
| Sadece yazım/noktalama düzelttin | **dokunma** |
| Bağlantı yolunu düzelttin, içerik aynı | **dokunma** |

Yanlış tarih, eski tarihten daha zararlıdır: sayfa taze görünür ama değildir.
**Ürüne bakmadıysanız tarihi ilerletmeyin.**

Biçim tırnaklı olmalı — `reviewed: "2026-07-30"`. Tırnaksız yazılırsa YAML bunu
tarih nesnesine çevirir ve saat dilimine göre gün kayar; `npm run check:mdx`
bunu hata olarak yakalar.

**Otomatik takip:** Her pazartesi bir iş çalışır, 90 günden eski sayfaları tek
issue'da sahibine göre gruplayıp listeler (`tazelik` etiketli). PR'da bir
sayfanın içeriği değişip tarihi güncellenmemişse CI uyarı verir — engellemez,
kararı inceleyiciye bırakır.

Çürüme listesini elle görmek için:

```bash
node scripts/stale-report.mjs        # 90 günden eskiler
node scripts/stale-report.mjs 30     # 30 günden eskiler
```

Yeni sayfalara alanı toplu eklemek için: `node scripts/add-freshness.mjs`
(var olan tarihleri ezmez).
