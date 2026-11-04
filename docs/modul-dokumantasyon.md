---
name: modul-dokumantasyonu
description: Bir ServiceCore modülünün dokümantasyonunu canlı uygulamadan, işaretli 2× ekran görüntüleriyle baştan yazar. Kullanıcı bir modül adresi verdiğinde (ör. https://localhost:5098/Contract/IndexV2) ya da "X modülünü dokümante et", "X'in dokümanını çıkar/yenile" dediğinde kullan.
argument-hint: <modül adresi, ör. https://localhost:5098/KnowledgeManagement/IndexV2>
---

# Modül dokümantasyonu

Verilen adresteki modülün dokümantasyonunu, Bilgi Bankası (KB) bölümüyle **aynı kalitede** üretir: canlı uygulamadan doğrulanmış metin, CSS seçicisinden kırpılıp işaretlenmiş 2× görseller, temizlenmiş eski içerik, yeşil kontroller ve ürün hatalarını da listeleyen bir rapor.

Referans teslim: `content/docs/teknisyen/moduller/bilgi-bankasi/` ve görsel tanımları `shots/kb-*.json` (ana depoda `ServiceCoreApp.AutomationE2E/shots/`, bir kopyası da bu skill'in `shots/` klasöründe; `prb-*.json` ikinci örnektir). Bir kurala emin olamadığında o teslime bak; oradaki düzen standarttır.

Bu dosya `CLAUDE.md`'yi tamamlar, onun yerine geçmez. `CLAUDE.md` §2 (sayfa biçimi, ekran görüntüsü standardı), §3 (meta.json), §4 (değişiklik akışı) ve §7 (reviewed tarihi) aynen geçerlidir.

## Teslim tanımı

İş bittiğinde şunlar hazır olmalı; biri eksikse iş bitmemiştir:

1. `content/docs/<bölüm>/<modül>/` altında `genel-bakis.mdx`, kartlı `index.mdx` ve konu sayfaları; `meta.json` sırası.
2. Her sayfada en az bir görsel; her görselin hemen altında ❶❷… tablosu. Görseller `public/img/<bölüm>/<önek>-<sayfa>-<konu>.png`, ekranın tamamını gösteren her görselin adı `-yerlesim` ile biter.
3. Her görselin ana depoda `shots/<önek>-<sayfa>.json` tanımı; `node shots/run.mjs shots/<önek>-*.json` hepsini hatasız yeniden üretir.
4. Yerini yeni sayfaya bırakan eski sayfalar ve eski görseller kaldırılmış; eski adresler `redirects.json` ile yeni sayfalara yönlenmiş.
5. `npm run check:mdx` ve `npm run build` geçiyor; birkaç sayfa yerel sitede açılıp gözle kontrol edilmiş.
6. Kullanıcıya rapor (bkz. "Rapor"). **Commit ve PR yalnızca kullanıcı isteyince.**

## 0. Ortamı bul

```bash
# Çalışan uygulamanın klasörü (…/ServiceCoreApp/ServiceCoreApp.Mvc) ve kaynak deposu
PID=$(lsof -tiTCP:5098 -sTCP:LISTEN | head -1)
MVC=$(lsof -p "$PID" -a -d cwd -Fn | sed -n 's/^n//p'); echo "$MVC"
APP_ROOT="$(dirname "$MVC")"            # envanter ajanı BU kaynağı tarar (ekranda çalışan kod)
# Görsel hattı ve araçlar: önce çalışan uygulamanın deposunda, yoksa diğer kopyalarda ara
E2E="$APP_ROOT/ServiceCoreApp.AutomationE2E"
if [ ! -f "$E2E/shots/run.mjs" ]; then
  # Hem ~/Documents/repo/ServiceCore/… hem ~/Documents/repo/sc4/ServiceCore/… düzenini bulur
  ALT=$(find ~/Documents/repo -maxdepth 7 \( -name node_modules -o -name .git -o -name bin -o -name obj \) -prune \
        -o -path '*/ServiceCoreApp.AutomationE2E/shots/run.mjs' -print 2>/dev/null | head -1)
  [ -n "$ALT" ] && E2E=$(dirname "$(dirname "$ALT")")
fi
echo "$E2E"; ls "$E2E/shots/run.mjs"
# Uygulamanın kullandığı veritabanı adı (parola değil, yalnız ad)
grep -io 'Database=[^;"]*' "$MVC/appsettings.Development.json" | sort -u
```

- **Araçlar hiçbir kopyada yoksa** (ana depoya henüz commit edilmediyse ya da skill başka bir makineye kurulduysa), bu skill'in klasöründeki `shots/` klasörünü kopyala. Skill klasörü, skill yüklenirken "Base directory for this skill" satırında yazar:
  ```bash
  cp -Rn "<skill klasörü>/shots" "$E2E/"   # -n: var olan dosyaların üzerine yazmaz
  ```
  Araçlar `$E2E/node_modules`'taki `playwright` ve `mssql` paketlerini kullandığı için mutlaka E2E klasörünün içinden çalıştırılır. Araçlarda değişiklik yaparsan skill klasöründeki kopyayı da güncelle (`cp -R "$E2E/shots/." "<skill klasörü>/shots/"`), yoksa dağıtılan skill eski kalır.
- Veritabanı bağlantısı `SC_DB_SERVER`, `SC_DB_PORT`, `SC_DB_USER`, `SC_DB_PASSWORD`, `SC_DB_NAME` ortam değişkenlerinden okunur. Varsayılanlar ana depodaki `helpers/env.ts` ile aynıdır; yerel kurulum farklıysa kullanıcıdan değerleri iste.
- **Uygulama ile araçlar farklı depolarda olabilir.** Geliştiricinin makinesinde birden çok kopya bulunur (`sc4`, `sc6`…). Uygulama hangi kopyadan çalışıyorsa envanter ve kod doğrulaması **o kopyanın kaynağından** yapılır. Araçlar ise yalnızca adres ve veritabanıyla çalıştığı için `shots/` hangi kopyadaysa oradan çalıştırılır; görsel tanımları da oraya yazılır. Raporda iki yolu da belirt.
- Birden çok veritabanı adı çıkarsa her birinde modülün ana tablosuna `SELECT COUNT(*)` at; veri olanı kullan, emin olamazsan kullanıcıya sor.
- Uygulama iş sırasında durursa (`ERR_CONNECTION_REFUSED`) kendin başlatma; kullanıcıya söyle. O ana kadar üretilen görseller geçerlidir, hata veren görseller dosyaya yazılmaz.
- Uygulama **DEBUG** derlemesiyle çalışmalı; giriş `/Account/PlaywrightLogin` ile süper admin olarak yapılır. Araçlar 4xx alırsa kullanıcıya söyle, başka giriş yolu deneme.
- `$E2E/node_modules` yoksa `npm install` ve `npx playwright install chromium` (E2E klasöründe).
- Docs deposunda `origin/main`'den yeni dal aç ve upstream'i kaldır (yanlışlıkla `main`'e itilmesin):
  ```bash
  git fetch -q origin && git switch -c docs/<modul-adi> origin/main && git branch --unset-upstream
  ```
- Görsel çıktısı varsayılan olarak ana deponun kardeşi olan docs deposuna gider. Farklıysa `SC_DOCS_REPO=<docs yolu>`.

## 1. Envanter (kaynak koddan)

Bir **Explore** alt ajanı başlat ve "very thorough" tarama iste. İstem şablonu:

> `<ANA_DEPO>` deposunda `<ADRES>` adresinde sunulan `<MODÜL>` modülünün, son kullanıcı düzeyinde Türkçe dokümantasyon yazmak ve Playwright ile ekran görüntüsü almak için eksiksiz özellik envanterini çıkar. Bul ve raporla: (1) frontend giriş noktası ve her ekranın/sekmenin/diyaloğun rotası; (2) her ekrandaki işlemler ve **kullanıcıya göründüğü hâliyle Türkçe etiketler** (anahtarları `JSResources/Resource.tr-TR.resx` ve `CommonObjects/LocalResource/Resource.tr-TR.resx` üzerinden çöz); (3) kırpma ve işaretleme için kararlı seçiciler (`data-testid`, id, ayırt edici sınıflar); (4) yetkiler ve rol modeli, onay/durum akışları ve etiketleri; (5) son kullanıcı portalındaki karşılığı; (6) bayrağa bağlı, yarım kalmış, TODO olan ya da çalışmayan her şey (bunları çalışıyor diye yazmayacağız). Dosya değiştirme.

Envanteri **ipucu** olarak kullan; ekranda gördüğünle çelişirse ekran kazanır, davranış sorusunda kod kazanır.

## 2. Mevcut dokümanı oku

- Modülün `content/docs/...` klasörü, `meta.json`'u, kullandığı görseller.
- `grep -n "<eski-yol>" redirects.json` → eski adreslerin hangi sayfaya gittiği.
- Diğer bölümlerden bu modüle verilen bağlantılar (`grep -rn "<modül-yolu>" content`).
- Diğer modüllerin düzenini koru: kenar çubuğunda ilk sayfa **Genel Bakış**; `index.mdx` yalnızca "Bu bölümdeki sayfalar" kartları.

## 2b. Veri ön koşulları

Keşfe başlamadan önce ekranların dolu açılacağından emin ol; boş ekran ne doğru görsel ne doğru metin verir.

- **Demo veri:** Modülün kayıtlarını say ve görsellerde kullanacağın örnekleri seç. Her ekran için en zengin kaydı bul (bağlı kaydı, çözümü, notu, görevi olan; açık ve kapalı birer örnek):
  ```bash
  SC_DB_NAME=<db> node shots/tools/sql.mjs "SELECT p.Id, p.StatusId, (SELECT COUNT(*) FROM <Alt_Tablo> a WHERE a.ParentId=p.Id) AS alt FROM <AnaTablo> p"
  ```
  Kayıt yoksa ya da yetersizse kullanıcıdan demo veri iste; kendin üretme.
- **Tasarlanabilir formlar:** Oluşturma ekranı ve bazı pencereler (iş günlüğü, görev) içeriğini `CustomForms` tablosundaki formdan alır. Modülün türü için form yoksa sayfa yalnızca boş bir `Özel Form` seçimiyle açılır ve `Kaydet` sessizce hiçbir şey yapmaz:
  ```bash
  SC_DB_NAME=<db> node shots/tools/sql.mjs "SELECT CustomFormTicketType, COUNT(*) adet, SUM(CASE WHEN IsDefault=1 THEN 1 ELSE 0 END) varsayilan FROM CustomForms GROUP BY CustomFormTicketType"
  ```
  Eksikse **kullanıcıya sor**. Onay gelirse HealthCheck'teki "Varsayılan Formları Ekle"yi KULLANMA (eksik olan bütün türleri ekler); `CustomFormsService.AddDefaultForms`'taki ilgili türün dalını birebir uygulayarak yalnız o modülün varsayılan formunu ekle (`wwwroot/CustomForms/<Tür>/DefaultForm.txt`, `IsDefault=1`, `CustomFormUserType=1`). Eklediğin kaydın id'sini rapora yaz.
- **Varsayılan liste süzgeci:** Liste açılışta bazı kayıtları gizleyebilir (ör. kapalı aşamadakiler). Ekrandaki toplamı veritabanıyla karşılaştır; fark varsa nedenini bul ve dokümanda belirt ("Kapalı kayıtları görmek için `Aşama: Kapalı`").
- Veritabanına yazılan her şey (form, ayar) kullanıcı onayıyla ve en dar kapsamla yapılır; başka hiçbir veri değiştirilmez.

## 3. Canlı keşif

Her ekranı, sekmeyi, menüyü, açılır pencereyi tek tek aç ve ekran görüntüsüne **gerçekten bak** (Read ile). Araçlar ana depoda, `$E2E` klasöründen çalıştırılır:

```bash
node shots/tools/kesif.mjs <adres> --buttons --shot=$SCRATCH/x.png          # iskelet + görünen metinler + görüntü
node shots/tools/kesif.mjs <adres> --click="<seçici>" --root=".antd-latest-modal"   # tıkla, açılan pencerenin iskeleti
node shots/tools/secici.mjs <adres> -- "<seçici>" "<seçici>"                  # seçici tutuyor mu (✓ / gizli / ✗)
node shots/tools/ipucu.mjs <adres> "<simge seçicisi>" [--click=…]             # etiketsiz simgelerin ipucu metni
SC_DB_NAME=<db> node shots/tools/sql.mjs "SELECT TOP 10 …"                    # demo veri bulmak (yalnız SELECT)
```

- **Hiçbir şeyi kaydetme, silme, gönderme.** Pencereyi aç, görüntüle, kapat. Gerekiyorsa bir alanda seçim yap (ör. kategori) ama kaydetme.
- Simgeyle gösterilen düğmelerin adını tahmin etme; `ipucu.mjs` ile ekrandaki ipucu metnini oku ve metinde onu kullan.
- Bir pencere boş açılıyorsa (`Veri Yok`) bunun nedenini bul: tanımsız veri mi (otomasyon kuralı, yazdırma şablonu, form), yoksa hata mı. Tanımsız veriyse ekranı görselsiz anlat ve "kurumunuzda tanımlı … gerektirir" de; raporda belirt.
- Veri değiştiren bir düğmenin davranışını (ör. "onayla türü ilerletir") canlıda deneme; **istemcinin gönderdiği alanlar ile sunucunun okuduğu alanları karşılaştırarak** koddan doğrula. Uyuşmuyorsa çalışmıyordur: dokümanda çalışan yolu anlat (ör. "türü `Düzenle` ile değiştirin"), uyuşmazlığı dosya:satır ile rapora yaz.
- Etiketleri ekranda yazdığı gibi not et (büyük/küçük harf, noktalama dahil).
- Gezerken gördüğün ürün hatalarını kanıtıyla not et (bkz. Rapor). Bir değerin doğru gösterilip gösterilmediğinden şüphelenirsen veritabanıyla karşılaştır.

## 4. Sayfa planı

Modüle göre uyarlanan tipik set:

| Sayfa | İçerik |
|---|---|
| `genel-bakis` | Modül ne işe yarar, temel kavramlar tablosu, ekranın yerleşim haritası, kenar/üst menü, diğer modüllerle bağlantı |
| liste / bulma | Liste, arama, sıralama, filtreler, görünümler, toplu işlemler, kart/satır menüsü |
| detay / okuma | Detay ekranının bölümleri, sağ panel, menüler |
| oluşturma / düzenleme | Form alanları (zorunlular), şablon/sihirbaz/içe aktarma varsa |
| durum / onay akışı | Durum tablosu, `mermaid` akış şeması, kim neyi yapabilir |
| yetkiler / paylaşım | Rol yetkileri tablosu, kayıt bazlı kısıtlar |
| yönetim ekranları | Rapor, otomasyon, denetim vb. |
| tercihler | Kişisel ayarlar |

- Dosya adları Türkçe, küçük harf, tireli (`onay-ve-yasam-dongusu`). Görsel öneki modüle özgü kısa ad (`kb-`, `szl-`…).
- Bir sayfa bir konu. Çok uzarsa böl.

## 5. Görseller

Tanım biçimi `shots/run.mjs`'in başında yazar; örnekler `shots/kb-*.json`. Her sayfa için bir JSON (`"page"` alanı o sayfanın yolu, gerekirse `"imgDir": "yonetici"`).

### Ölçü

- Varsayılan viewport **1100×800**, ölçek **2×**. Görsel docs sitesinde kendi piksel genişliğinde çizilir (sütun ~736 px).
  - **Yerleşim haritası:** ekranın tamamı ya da modülün içerik alanı, ≤ ~1160 CSS px genişlik. Sütuna küçülür, keskin kalır.
  - **Detay:** tek bir öğe. ≤ ~370 CSS px genişlik sitede 2× büyütülmüş görünür (standarttaki "2–3× büyütme"); 370–852 arası sütuna sığar.
  - Uzun görselden kaçın: `maxHeight` ile kes, gerekirse ikiye böl. Dar ve uzun bir öğe 2× ölçekte ekranı kaplar.
- Uygulamanın üst menüsü görsele girmez (kabuk). Modülün kendi kenar çubuğu yalnızca genel bakışta gösterilir; diğer görseller içerik alanından kırpılır.
- Sayfanın altındaki öğeler için `"height"` büyütülür (ör. 3400); geniş düzen gereken ekranlarda `"width": 1280/1440`.
- **Sağ panel kayboluyorsa genişliği artır.** Ant Design `xl` kırılımında (1200 px) detay ekranlarının sağ paneli (özellikler, filtre paneli) alta iner ya da gizlenir. Böyle modüllerde tanımın tepesinde `"viewport": {"width": 1280, "height": 860}`, detay görsellerinde `"width": 1440` kullan.
- Bir paneli kırparken `"pad": 10` ver; 0 verilirse kenardaki rozetler görselin dışında kalır.
- Dar ve uzun bir paneli (filtre paneli, özellik listesi) tek görselde verme; anlamlı iki parçaya böl ya da yalnız anlatılan kısmı kırp.

### İşaretler

- Metinde adı geçen **her** düğme, alan ve bölüm kutulanır ve tablodaki numarayla eşleşir. Numara sırası okuma sırasıdır (soldan sağa, yukarıdan aşağı).
- Yerleşim haritasında 3–7, detayda 2–7 işaret. Menülerde satırları gruplayarak kutula (`"sel": [ilk, son]`).
- Rozet metnin üstüne binmesin: alt alta dizilen öğelerde `lm`/`rm`, yan yana küçük simgelerde dönüşümlü `tl`/`bl`.
- Görselin içine metin yazılmaz; anlam tabloda.

### Veri ve durum

- Ekranda test verisi varsa ("test", "dsa", "TEST", "KB test: …") ya başka bir kayıt seç (`sql.mjs` ile bul) ya da `eval` adımıyla **yalnız görüntüde** gizle; raporda belirt.
- Ürün hatası yüzünden yanlış görünen bir değer görselde yer almasın; durumu doğru gösteren başka bir kayıt seç ve hatayı raporla.
- Form ve editör örnekleri tarayıcıda doldurulur, **kaydedilmez** (TipTap için `document.querySelector('.ProseMirror').editor.commands.setContent(html)`).

### Döngü

```bash
node shots/run.mjs shots/<önek>-<sayfa>.json            # üret
node shots/run.mjs shots/<önek>-<sayfa>.json --only=ad  # tek görsel
```

Ürettiğin **her** görseli aç ve kontrol et: iskelet ya da yükleniyor göstergesi yok mu; ipucu baloncuğu, fare imleci, yarım kesilmiş öğe var mı; kutular doğru öğede mi; rozetler metni kapatıyor mu; boş beyaz alan fazla mı; okunaklı mı. Düzelt, tekrar üret.

### Bilinen tuzaklar

- Ant Design sınıfları `antd-latest-` önekli. Açık pencere: `.antd-latest-modal:visible .antd-latest-modal-content`; çekmece: `.antd-latest-drawer-content:visible`; açılır menü: `.antd-latest-dropdown:visible ul`; alt menü: `.antd-latest-dropdown-menu-submenu-popup:visible ul`.
- Playwright seçicileri: `:has-text()`, `:text-is()`, `>> nth=1`, `:visible`, `>> xpath=..` (ebeveyn). Seçicide XPath birleşimi (`|`) kullanma, sözdizimi hatası verir.
- `:text-is()` antd sekmelerinde, menü öğelerinde ve AngularJS etiketlerinde çoğu zaman tutmaz (metnin çevresinde boşluk ya da iç içe öğe vardır); `:has-text()` kullan. Tam eşleşme şartsa `text="…"` seçicisi dene.
- CSS modüllerinin sınıf adları karışıktır (`list-base-card_container__a1b2c`); `[class*=list-base-card_container]` ile eşleştir. Aynı id birden çok kez kullanılabilir (ör. her kartta `#sc-base-card`); id'ye güvenme, `>> nth=…` ile seç.
- Gizli kopyalar: bazı listeler aynı öğeyi gizli olarak da çizer (kart alt bilgisi, antd tablosunun ölçüm satırı). `secici.mjs` "gizli" diyorsa `:visible` ekle; tablolarda `tbody tr.antd-latest-table-row` kullan ve sekmeli ekranlarda `.antd-latest-tabs-tabpane-active` içine daralt.
- Fareyle açılan menüler için `"keepMouse": true`; aksi hâlde fare köşeye çekilir ve menü kapanabilir. İpucu baloncukları zaten gizlenir.
- Etiket öğesi satırın tamamını kaplıyorsa (onay kutusu listeleri, yetki ekranları) kutu gereksiz geniş çıkar; onay kutusunu ya da `text=` ile metnin kendisini işaretle.
- Zaman çizelgesi gibi öğelerde kutunun sınırı metinden kayık olabilir; tek tek işaretlemek yerine bütün çizelgeyi `"pad": 12` ve `"badge": "tl"` ile işaretle.
- Toplu işlem çubuğu gibi seçime bağlı öğelerde yalnız o öğeyi kırp; geniş kırpma ilgisiz bir kartı seçili gösterir.
- `run.mjs` hata verdiğinde mesajın sonunda bulunamayan seçici yazar (`— seçici: …`); onu `secici.mjs` ile dene.
- Metin seçimine bağlı arayüzler: `{ "dragSelect": "<metin seçicisi>" }`.
- Ağaç/seçim listeleri: seçeneğe `.antd-latest-select-tree-node-content-wrapper[title='…']` ya da `.antd-latest-select-item-option:has-text('…')` ile tıklanır.
- `input` çoğu zaman bir sarmalayıcının içindedir; kutu dar çıkarsa sarmalayıcıyı işaretle (`span.antd-latest-input-affix-wrapper:has(input[…])`).
- Bir görsel tutmazsa `secici.mjs` ile hangi seçicinin bulunamadığına bak.

### Çok görselli modüller

30'dan fazla görsel varsa tanımları elle yazmak yerine scratchpad'de küçük bir betikle üret (ör. Python; `card(n)`, `tab(anahtar)`, `mark(sel, n, badge)` gibi yardımcılarla). Betik **tekrar çalıştırıldığında aynı dosyayı üretmeli**; var olan tanıma ekleme yapan betik her çalışmada kopya görsel bırakır. Asıl kaynak yine `shots/*.json` dosyalarıdır; betik yalnız yazma kolaylığıdır ve teslim edilmez.

## 6. Metin

Her sayfanın iskeleti:

```mdx
---
title: "Sayfa Başlığı"
description: "Tek cümle, ≤155 karakter."
reviewed: "<bugün YYYY-AA-GG>"
owner: <GitHub kullanıcı adı>
---

Bir-iki cümlelik giriş: bu ekran ne işe yarar, nereden açılır.

## Bölüm

![Açıklayıcı alt metin](/img/teknisyen/<önek>-<sayfa>-<konu>.png)

| # | Öğe | Ne işe yarar |
|---|---|---|
| ❶ | `Kısa etiket` | … |
| ❷ | **Daha uzun bir etiket** | … |
```

- **Doğrulanmamış bilgi yazılmaz.** Kaynak sırası: canlı ekran > kaynak kod > hiç yazma. Davranış iddiası (ör. "onaya gider", "silinmez", "180 gün") için koda bak. Doğrulayamadığını ya yumuşat ya da çıkar.
- Etiketler ekrandaki yazımıyla birebir. Kısa olanlar `` `kod` ``; tablonun dar ilk sütunlarında 12 karakteri aşan etiket **kalın** (kod biçimi dar sütunda harf harf kırılır). `` `X` ve `Y` `` gibi ikili etiketler de dar sütunda **X** ve **Y** yazılır.
- İlk iki sütunu dar olan üç sütunlu tablolardan kaçın (ör. Durum | Aşama | Açıklama): Türkçe uzun kelimeler sütun içinde ortadan bölünür. Dar sütunları birleştir ("`Açık` (açık aşama)") ya da tabloyu iki sütuna indir. Sayfayı yerel sitede açıp tablo kırılmalarına bak.
- Okura "siz" diye hitap et, kısa ve görev odaklı cümleler kur. Yetki gerektiren işlemlerde kimin görebildiğini yaz.
- Durum geçişleri için `mermaid` akış şeması kullan; şemanın tüm işlemleri göstermediğini belirt ve tabloyu ver.
- Bağlantılar mutlak: `/docs/teknisyen/moduller/<modül>/<sayfa>`; sayfa içi çapa: `#başlık-slug`.
- `Callout` yalnız gerçekten dikkat isteyen yerde (`info` İPUCU/ÖNEMLİ, `warn` DİKKAT).
- Bayrağa bağlı ya da çalışmayan özellikleri çalışıyormuş gibi yazma; rapora ekle.

## 7. Temizlik

```bash
git rm <yerini yeni sayfaya bırakan eski sayfalar>
# Kullanılmayan görseller (yalnız bu modülün önekleri)
for f in public/img/teknisyen/<eski-önek>*; do n=$(basename $f); grep -rq "$n" content src || git rm -q "$f"; done
```

- `redirects.json`: eski sayfaya giden her kuralın `destination`'ını yeni sayfaya çevir (zincir oluşturma) ve eski adres için yeni kural ekle. Var olan biçimi koru (2 boşluk girinti, Türkçe karakterler kaçışsız).
- `grep -rn "<eski-sayfa-adı>" content src` boş dönmeli.

## 8. Doğrulama

```bash
npm run check:mdx
npm run build            # Node 22.12'den eskiyse: NODE_OPTIONS=--experimental-require-module npm run build
                         # "Cannot find module" alırsan önce: npm ci
NODE_OPTIONS=--experimental-require-module npm run dev   # sonra sayfaları tarayıcıda aç
```

- Geliştirme sunucusu ile derleme aynı `.next` klasörünü kullanır. `npm run dev` açıkken `npm run build` çalıştırma: önce sunucuyu durdur, derlemeden sonra yeniden başlat.

- Yerel sitede en az genel bakışı, bir uzun tablolu sayfayı ve mermaid şemalı sayfayı aç; tablo kırılmalarını, görsel boyutlarını ve şemayı gözle kontrol et.
- Son olarak `for f in shots/<önek>-*.json; do node shots/run.mjs "$f"; done` ile tüm görselleri baştan üret; hatasız bitmeli.

## Rapor

Kullanıcıya Türkçe, kısa başlıklarla:

1. **Ne yapıldı:** sayfalar, görsel sayısı, kaldırılan sayfa/görseller, yönlendirmeler, kontrol sonuçları (yerel ortam notlarıyla).
2. **Kararlar:** yorumladığın istekler, ekranda gizlediğin test verisi, seçtiğin örnek kayıtlar.
3. **Yazılmayanlar:** doğrulanamayan, bayrağa bağlı ya da çalışmayan özellikler ve neden.
4. **Üründe bulunan hatalar:** önem sırasıyla; her biri için ekran, ne görülüyor, ne beklenirdi, kanıt (veritabanı değeri, dosya:satır). Güvenlik açıkları (sunucuda uygulanmayan kural, yetki özniteliği olmayan uç nokta) en üstte.
5. **Veritabanına yazılanlar:** kullanıcı onayıyla eklenen her kayıt (tablo, id, neden). Yoksa "yok" yaz.
6. **Sıradaki adım:** commit + PR onayı sorusu. Modülün bütün değişiklikleri (sayfalar, görseller, `redirects.json`) **tek dal, tek PR**'dır. Ana depodaki `shots/` dosyaları da commit edilmemişse belirt.

## İsteğe bağlı: web sitesi paketi

Kullanıcı tasarım ya da web sitesi için paket isterse: **kırmızı kutulu görseller yalnız dokümantasyon içindir, web sitesi paketine girmez.** Pakette tek bir `img/` klasörü olur ve içinde işaretsiz görseller bulunur:

```bash
mkdir -p <paket>/img
for f in shots/<önek>-*.json; do SC_NO_MARKS=1 SC_DOCS_IMG=<paket>/img node shots/run.mjs "$f"; done
```

Üretilen görsellerden birkaçını açıp kutu ya da rozet kalmadığını kontrol et.

Paketin tek Markdown dosyası, siteyi kuracak kişinin (ya da yapay zekânın) başka kaynağa ihtiyaç duymadan siteyi kurabileceği biçimde yazılır. Referans: `…/repo/kb-tasarim-paketi/kb-bilgi-bankasi.md`. İçermesi gerekenler:

- siteyi kuracak kişiye notlar (görseller 2×, kırpılmaz, üzerine metin yazılmaz; uydurma rakam, logo ya da fiyat eklenmez),
- ürün özeti, slogan seçenekleri, ses tonu,
- renk paleti ve yazı tipi (ürünün kendi CSS değişkenlerinden: `grep -rhoE "\-\-kb-[a-z-]+:\s*#[0-9a-f]+"` benzeri),
- site haritası ve üst menü,
- bölüm bölüm başlık, alt başlık, metin, maddeler, düğmeler, hangi görselin hangi düzende kullanılacağı,
- SSS, SEO başlık/açıklama/anahtar kelimeler,
- görsel envanteri (dosya, alt metin, önerilen bölüm, ölçü) ve terimler.

Metinler dokümandaki doğrulanmış bilgiden türetilir; yeni özellik uydurulmaz.

## Son kontrol listesi

- [ ] Her ekran ve pencere canlı açıldı, görüntüsüne bakıldı
- [ ] Her görsel tek tek açılıp kontrol edildi; `run.mjs` tüm tanımları hatasız üretiyor
- [ ] Her görselin altında ❶ tablosu; metinde geçen her öğe işaretli
- [ ] Davranış iddiaları canlı ya da kodla doğrulandı
- [ ] Kenar çubuğunda ilk sayfa Genel Bakış; `index.mdx` kartlı; `meta.json` sırası doğru
- [ ] `reviewed` bugün, tırnaklı; `owner` dolu; açıklamalar ≤155 karakter
- [ ] Eski sayfa ve görseller kaldırıldı, yönlendirmeler güncel, kırık bağlantı yok
- [ ] `check:mdx` ve `build` geçti; sayfalar yerel sitede gözle kontrol edildi
- [ ] Veritabanına yalnız kullanıcı onayıyla, en dar kapsamla yazıldı ve raporlandı
- [ ] Rapor: kararlar, yazılmayanlar, ürün hataları; commit/PR için onay istendi
