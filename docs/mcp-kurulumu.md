# AI Asistanınızla Dokümantasyonu Güncelleme (MCP Kurulumu)

Bu kılavuz, kendi AI asistanınızdan Servicecore dokümantasyonunu güncellemenizi
sağlar. Bir kez kurarsınız, sonra sadece konuşarak katkı verirsiniz:

> "Bugün olay modülüne toplu kapatma özelliğini ekledik. Teknisyen kılavuzundaki
> olaylar sayfasını güncelle ve PR aç."

AI, ilgili sayfayı bulur, düzenler, yeni bir dal açıp PR gönderir. Siz Vercel
önizlemesinde sonucu görür, onaylarsınız.

---

## Nasıl çalışır?

```
Siz  ──►  AI asistanınız  ──►  GitHub MCP  ──►  yeni dal + PR
                                                     │
                          Vercel önizleme  ◄──────────┤
                                                     │
                              onay + merge  ──►  docs.servicecore.app
```

**MCP (Model Context Protocol)**, AI asistanlarının dış sistemlere bağlanma
standardıdır. GitHub'ın resmi MCP sunucusunu kullanıyoruz — ek bir sunucu
kurmaya, bakım yapmaya gerek yok.

---

## Ön koşul: GitHub erişimi

1. GitHub hesabınızın Servicecore organizasyonunda ve bu depoda **yazma**
   yetkisi olmalı (yöneticinizden isteyin).
2. Bir **fine-grained personal access token** üretin (önerilen ve her istemcide
   çalışan yöntem): GitHub → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → **Generate new token**
     - Repository access: **yalnızca bu depo**
     - İzinler: `Contents: Read and write`, `Pull requests: Read and write`
     - Süre: 90 gün (dolduğunda yenileyin)

> Token'ı kimseyle paylaşmayın. Yalnızca bu depoya yetkilendirildiği için
> kaybolursa etkisi sınırlıdır; yine de hemen iptal edin.

---

## Kurulum

### Claude Code (terminal veya VS Code)

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer <TOKEN>"
```

`<TOKEN>` yerine ürettiğiniz fine-grained token'ı yazın.

İstemciniz tarayıcı tabanlı oturum açmayı destekliyorsa sunucuyu header'sız
ekleyip `/mcp` menüsünden **Authenticate** ile de bağlanmayı deneyebilirsiniz;
desteklenmiyorsa yukarıdaki token yöntemi her durumda çalışır.

Bağlantıyı doğrulayın:

```bash
claude mcp list
```

### Claude Desktop

1. **Ayarlar → Connectors → Add custom connector**
2. Ad: `GitHub`, adres: `https://api.githubcopilot.com/mcp/`
3. **Connect** deyip istemcinin yönlendirdiği kimlik doğrulama adımını tamamlayın.

> Claude Desktop'ın özel bağlayıcıları tarayıcı tabanlı kimlik doğrulama bekler.
> Bağlantı kurulamazsa Claude Code (terminal) üzerinden token'lı yöntemi kullanın.

### Cursor

`~/.cursor/mcp.json` dosyasına ekleyin:

```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "headers": { "Authorization": "Bearer <TOKEN>" }
    }
  }
}
```

---

## Kullanım

Kurulumdan sonra asistanınıza doğal dille söyleyin. İyi bir istek şunları içerir:
**hangi bölüm**, **ne değişti**, **PR açılsın**.

**Örnekler**

> Servicecore dokümantasyon deposunda (gorgonline/servicecore-docs) yönetici
> kılavuzundaki "Gelişmiş Ayarlar" sayfasına, SLA politikalarına eklenen
> "hafta sonu hariç tut" seçeneğini anlat. Yeni bir dalda PR aç.

> Teknisyen kılavuzu → Modüller → Çağrılar sayfasındaki ekran görüntüsü eskidi.
> Yerine yenisini koy: (görsel yolu). Açıklamayı da yeni arayüze göre güncelle.

> Kurulum kılavuzuna "Sandbox ortam gereksinimleri" başlığıyla yeni bir sayfa
> ekle. İçerik: (...). meta.json'a da ekle ve PR aç.

**İpuçları**

- İlk istekte depo adını belirtin: `gorgonline/servicecore-docs`.
- Asistan depodaki `CLAUDE.md` dosyasını okur; yazım kuralları ve klasör yapısı
  oradan otomatik gelir. "Kuralları CLAUDE.md'den oku" demeniz yeterlidir.
- Emin olmadığınız bilgiyi yazdırmayın — dokümantasyonda yanlış bilgi,
  eksik bilgiden daha zararlıdır.
- Büyük değişiklikleri tek PR'da toplamayın; konu başına bir PR daha kolay incelenir.

---

## Kurallar

| | |
|---|---|
| ✅ | Yeni bir dal açılır (`docs/konu-adi`), PR ile birleşir |
| ✅ | Değişiklik yalnızca `content/docs/**` ve `public/img/**` altında olur |
| ✅ | Frontmatter'da `title` ve `description` bulunur |
| ✅ | Yeni sayfa `meta.json`'a eklenir |
| ❌ | `main` dalına doğrudan yazılmaz (zaten korumalıdır) |
| ❌ | `src/`, `package.json`, `next.config.mjs` içerik katkısında değiştirilmez |

PR açıldığında otomatik olarak:
1. **CI** çalışır — MDX sözdizimi, kırık görsel/bağlantı, `meta.json` tutarlılığı
   ve derleme kontrol edilir.
2. **Vercel** o PR'a özel bir önizleme adresi üretir.
3. **Bölüm sahibi** inceler ve onaylar. (Otomatik inceleyici ataması için
   `.github/CODEOWNERS` dosyasının doldurulmuş olması gerekir; henüz
   doldurulmadıysa PR'a inceleyiciyi elle ekleyin.)

---

## Sorun giderme

**"Bu depoya erişemiyorum" / 403**
GitHub hesabınızın depoda yazma yetkisi yok ya da token'ın kapsamı dar.
Fine-grained token'da bu deponun seçili ve `Contents: Read and write` izninin
verili olduğundan emin olun.

**Asistan yanlış sayfayı buluyor**
Bölüm yolunu birlikte verin: "content/docs/yonetici/gelismis.mdx dosyasında…".
Sayfa yolları site adresiyle aynıdır: `docs.servicecore.app/docs/yonetici/gelismis`
→ `content/docs/yonetici/gelismis.mdx`.

**CI kırmızı**
Genelde MDX sözdizimi hatasıdır. Hata mesajını asistanınıza verip düzeltmesini
isteyin, ya da yerelde `npm run check:mdx` çalıştırın.

**Token süresi doldu**
Yeni token üretip MCP bağlantısını güncelleyin (`claude mcp remove github`
sonra tekrar `add`).

---

## Neden bu yaklaşım?

- **Merkezi:** Tüm dokümantasyon tek depoda; herkes aynı kaynağı günceller.
- **İzlenebilir:** Her değişiklik kim tarafından, ne zaman, neden yapıldı — git
  geçmişinde kalıcı.
- **Güvenli:** PR + onay + otomatik kontrol; hatalı içerik yayına çıkmadan yakalanır.
- **Geri alınabilir:** Yanlış bir değişiklik tek tıkla geri alınır.
- **Bakımsız:** Kendi sunucumuzu işletmiyoruz; GitHub'ın resmi MCP sunucusu yeterli.

İleride ihtiyaç olursa (ör. teknik olmayan personel için daha basit bir arayüz),
`search_docs` / `update_doc` gibi dokümana özel araçlar sunan kendi MCP
sunucumuzu bu siteye ekleyebiliriz — mimari buna hazır.
