# Dokümantasyona Nasıl Katkı Vereceğiz

**Ekip toplantısı — Salı 4 Ağustos 2026, 17:30**

Docs sitesi yenilendi ve artık herkes kendi AI asistanından güncelleyebiliyor. Bu
sayfa toplantıda takip edeceğimiz sıra; sonrasında da başvuru kaynağı olarak kalır.

| | |
|---|---|
| Site | https://servicecore-docs.vercel.app/docs |
| Depo | https://github.com/gorgonline/servicecore-docs |
| Kurulum kılavuzu | [docs/mcp-kurulumu.md](mcp-kurulumu.md) |

---

## Gündem — 45 dakika

| Saat | Konu | Süre |
|---|---|---|
| 17:30 | Neden değişti | 5 dk |
| 17:35 | **Herkes kurulumu yapar — canlı** | 15 dk |
| 17:50 | Birlikte bir sayfa güncelleyelim | 10 dk |
| 18:00 | Kurallar ve sık hatalar | 8 dk |
| 18:08 | Bölüm sahipliği dağıtımı | 7 dk |

---

## 1. Neden değişti

Eski dokümantasyon tek kişiye bağlıydı ve güncellenmiyordu. Yeni yapıda **işi biten
kişi kendi AI asistanına söylüyor**, asistan sayfayı bulup düzenliyor ve inceleme için
gönderiyor.

| Konu | Önce | Şimdi |
|---|---|---|
| Güncelleme | Tek kişi, elle | Herkes, AI ile |
| Hata kontrolü | Yok | Otomatik — bozuk bağlantı, eksik görsel, sözdizimi |
| Yayına çıkış | Elle | Onaydan sonra otomatik |
| Güncellik | Bilinmiyordu | Her sayfada son doğrulama tarihi |
| Geri alma | Zor | Tek tık |

---

## 2. Kurulum — toplantıda hep birlikte

Bir kez yapılır, sonra sadece konuşarak katkı verirsiniz. Yaklaşık 5 dakika.

### Adım 1 — GitHub davetini kabul edin

https://github.com/gorgonline/servicecore-docs/invitations

E-posta ile geldi. **Kabul etmeden hiçbir şey çalışmaz** — en sık atlanan adım budur.

### Adım 2 — Token üretin

GitHub → Settings → Developer settings → Personal access tokens →
**Fine-grained tokens** → Generate new token

```
Repository access : Only select repositories → servicecore-docs
İzinler           : Contents        Read and write
                    Pull requests   Read and write
Süre              : 90 gün
```

> Depo listede çıkmıyorsa 1. adımı yapmamışsınızdır.

### Adım 3 — AI asistanınıza bağlayın

Claude Code (terminal veya VS Code):

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer TOKENINIZ"
```

Cursor ve Claude Desktop ayarları için [mcp-kurulumu.md](mcp-kurulumu.md).

> **Token'ı kimseyle paylaşmayın.** Herkes kendi token'ını üretir. Kaybolursa
> GitHub'dan hemen iptal edin.

---

## 3. Katkı nasıl veriliyor

Dosya açmıyorsunuz, git komutu yazmıyorsunuz. Sadece ne değiştiğini söylüyorsunuz.

```
Siz anlatırsınız → AI sayfayı bulur, düzenler → PR açılır → otomatik kontrol
→ önizleme adresi → onay → yayında
```

**Böyle söyleyin:**

> Servicecore dokümantasyon deposunda (gorgonline/servicecore-docs), teknisyen
> kılavuzundaki çağrılar sayfasına toplu kapatma özelliğini ekle. Yeni dal aç, PR gönder.

> Yönetici kılavuzu → Gelişmiş Ayarlar sayfasındaki SLA ekran görüntüsü eskidi.
> Yenisini koyuyorum, açıklamayı da yeni arayüze göre güncelle.

> Kurulum kılavuzuna "Sandbox gereksinimleri" başlığıyla yeni sayfa ekle,
> meta.json'a da eklemeyi unutma.

İlk istekte depo adını söyleyin: `gorgonline/servicecore-docs`. Asistan yazım
kurallarını depodaki `CLAUDE.md` dosyasından kendisi okuyor, siz anlatmak zorunda
değilsiniz.

---

## 4. Kurallar

| | Kural | Neden |
|---|---|---|
| ✓ | Her değişiklik PR ile gelir | `main` korumalı, doğrudan yazılamaz |
| ✓ | En az 1 onay gerekir | Kendi PR'ınızı kendiniz onaylayamazsınız |
| ✓ | Sayfayı ürüne bakarak doğruladıysanız `reviewed` tarihini bugüne çekin | Çürüme takibi buradan çalışıyor |
| ✓ | Yeni sayfayı `meta.json`'a ekleyin | Yoksa menüde görünmez |
| ✗ | Sadece yazım düzelttiyseniz tarihi ilerletmeyin | Yanlış tarih, eski tarihten zararlıdır |
| ✗ | `src/`, `package.json` gibi dosyalara dokunmayın | İçerik katkısı yalnızca `content/docs/` |
| ✗ | Emin olmadığınız bilgiyi yazmayın | Yanlış doküman, eksik dokümandan kötüdür |

---

## 5. Sık karşılaşılanlar

**"Depoya erişemiyorum" / 403**
Daveti kabul etmemişsinizdir ya da token'da bu depo seçili değildir.

**Token üretirken depo listede yok**
Aynı sebep: davet kabul edilmemiş.

**Otomatik kontrol kırmızı yandı**
Genelde MDX sözdizimi. Hata mesajını asistanınıza verin, düzeltir. Yerelde
`npm run check:mdx` aynı işi yapar.

**AI yanlış sayfayı buldu**
Yolu birlikte verin. Sayfa yolları adresle aynıdır:
`…/docs/yonetici/gelismis` → `content/docs/yonetici/gelismis.mdx`

**Token 90 günde doluyor**
Yeni token üretip bağlantıyı güncelleyin.

---

## 6. Bölüm sahipliği — toplantıda dolduralım

Her bölümün bir sahibi olmalı. Sahip, o bölüme gelen PR'a otomatik inceleyici atanır
ve haftalık çürüme raporunda eskiyen sayfalar ona düşer. Boş kalırsa hepsi tek kişiye
yığılır.

| Bölüm | Sayfa | Sahip |
|---|---|---|
| Teknisyen Kılavuzu | 44 | |
| Admin Eğitimleri (CSSM-A) | 51 | |
| Yönetici Kılavuzu | 19 | |
| Teknisyen Eğitimleri (CSSM-P) | 14 | |
| Kullanıcı Kılavuzu | 12 | |
| Kurulum Kılavuzu | 11 | |
| ESM Kılavuzu | 6 | |
| Entegrasyon Kılavuzu | 3 | |

Dağıtım netleştiğinde sahipler `.github/CODEOWNERS` dosyasına ve sayfaların `owner`
alanına yazılır.

---

## 7. Toplantıda mutlaka söylenmesi gerekenler

**`docs.servicecore.app` henüz ESKİ siteyi gösteriyor.** Alan adı yeni siteye
taşınmadı. Müşteriye link atarken şimdilik `servicecore-docs.vercel.app` kullanın.
Taşıma yapıldığında haber verilecek.

**Daveti kabul etmeyen var.** Toplantı öncesi
[ortak çalışan listesini](https://github.com/gorgonline/servicecore-docs/settings/access)
kontrol edin; bekleyen varsa toplantıda hatırlatın.

**665 ekran görüntüsünün açıklaması eksik.** Alt metinleri anlamsız ("admin"). Görme
engelli kullanıcı ve arama motoru için önemli. Bölüm sahipleri kendi bölümlerinde
kademeli düzeltebilir.
