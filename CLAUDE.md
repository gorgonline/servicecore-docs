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
  cssma-admin/               CSSM-A arşiv (videoları taşınmayı bekliyor)

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
---
```

- `title` — kenar çubuğunda ve sayfa başlığında görünür. **Zorunlu.**
- `description` — arama ve kart açıklamalarında kullanılır. **Şiddetle önerilir**, 155 karakteri geçmesin.

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

---

## 3. Kenar çubuğu ve sıralama — `meta.json`

Her klasörde bir `meta.json` vardır:

```json
{
  "title": "Yönetici Kılavuzu",
  "pages": ["index", "baslangic", "genel", "organizasyon"]
}
```

- `pages` dizisi **sıralamayı belirler**; dosya adları uzantısız yazılır.
- Alt klasörler de aynı dizide klasör adıyla yer alır.
- **Yeni sayfa eklerken `meta.json`'a da eklemeyi unutmayın**, yoksa sıralamanın sonunda kalır.
- `index` her zaman ilk sırada olur (klasörün giriş sayfası).

---

## 4. Değişiklik akışı (ZORUNLU)

`main` dalı korumalıdır; doğrudan yazılamaz. Her değişiklik:

1. **Bul** — ilgili sayfayı `content/docs/` altında ara (arama için sayfa başlıkları ve `description` alanları iyi ipucudur).
2. **Dal aç** — `docs/<kısa-konu-adı>` biçiminde yeni bir dal.
3. **Düzenle** — yalnızca ilgili `.mdx` dosyalarını ve gerekiyorsa `meta.json`'u değiştir.
4. **PR aç** — başlık Türkçe ve açıklayıcı olsun; PR açıklamasında *ne değişti, neden* yaz.
5. **Önizle** — Vercel her PR için otomatik önizleme adresi üretir; değişikliği orada gör.
6. **Onay** — ilgili bölüm sahibi onayladıktan sonra birleştirilir; birleşince otomatik yayınlanır.

**Asla:** doğrudan `main`'e commit, `content/docs` dışında içerik değişikliği,
mevcut sayfaların toplu yeniden yazımı, kaynağı belirsiz bilgi ekleme.

---

## 5. Doğrulama

Değişiklikten sonra mümkünse çalıştırın (CI zaten çalıştırır):

```bash
npm run build       # içerik + MDX sözdizimi + link bütünlüğü
npm run check:mdx   # yalnızca MDX sözdizimi (hızlı)
```

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
