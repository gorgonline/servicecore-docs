#!/usr/bin/env bash
#
# Depoyu GitHub'a alır ve katkı akışını çalışır hâle getirir.
#
#   ./scripts/publish.sh              # kişisel hesaba (gh'de açık olan kullanıcı)
#   ./scripts/publish.sh <org-adi>    # organizasyona
#
# Tekrar çalıştırılabilir: var olan adımları atlar, eksikleri tamamlar.
# Hiçbir şeyi sessizce ezmez — depo oluşturmadan önce onay sorar.
#
# Depo PUBLIC açılır: ücretsiz planda dal koruması yalnızca public depolarda
# çalışıyor (özel depoda GitHub 403 "Upgrade to GitHub Pro" döndürür) ve koruma
# olmadan main'e doğrudan yazılabilir, yani inceleme akışı kâğıt üstünde kalır.
#
# Kişisel hesaba alınan depo sonradan bir organizasyona TAŞINABİLİR; GitHub eski
# adresten yenisine otomatik yönlendirme kurar, PR'lar ve geçmiş korunur.

set -euo pipefail

OWNER="${1:-}"
REPO="servicecore-docs"
CI_JOB="İçerik ve derleme kontrolü"   # .github/workflows/ci.yml → jobs.check.name
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

die()  { printf '\n✗ %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  ✓ %s\n' "$1"; }
skip() { printf '  · %s\n' "$1"; }

# ---------------------------------------------------------------- ön kontroller
step "Ön kontroller"

command -v gh  >/dev/null || die "gh CLI kurulu değil: brew install gh"
gh auth status >/dev/null 2>&1 || die "gh oturumu yok: gh auth login"
ME="$(gh api user --jq .login)"
ok "gh oturumu açık ($ME)"

# Hedef verilmediyse kişisel hesap. Tarayıcı gerektirmez; org oluşturmanın
# REST API'si olmadığı için organizasyona almak GitHub'da elle açılmasını ister.
[ -n "$OWNER" ] || OWNER="$ME"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "burası bir git deposu değil"

if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "Çalışma ağacı kirli. Önce commit edin ya da stash'leyin."
fi
ok "çalışma ağacı temiz"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || die "main dalında olmalısınız (şu an: $BRANCH)"
ok "dal: main"

# Hedef ya kendi hesabınız ya da üye olduğunuz bir organizasyon olmalı.
if [ "$OWNER" = "$ME" ]; then
  IS_ORG=0
  ok "hedef: kişisel hesap ($OWNER) — ekip yerine tek tek ortak çalışan eklenir"
else
  IS_ORG=1
  gh api "orgs/$OWNER" --jq .login >/dev/null 2>&1 || die \
    "'$OWNER' diye bir organizasyon bulunamadı.
   Tarayıcıdan açın: https://github.com/organizations/plan  (Free planı yeterli)
   Ya da argümansız çalıştırıp kişisel hesabınıza alın: ./scripts/publish.sh"
  ok "organizasyon bulundu: $OWNER"

  gh api user/orgs --jq '.[].login' 2>/dev/null | grep -qx "$OWNER" || die \
    "'$OWNER' organizasyonuna üye görünmüyorsunuz (ya da token'da read:org yetkisi yok).
   Token yetkisi için: gh auth refresh -h github.com -s read:org,repo"
  ok "organizasyona üyesiniz"
fi

# ------------------------------------------------------- yayın öncesi doğrulama
step "İçerik ve derleme doğrulaması (CI'ın çalıştırdığının aynısı)"
npm run check >/dev/null 2>&1 || die "npm run check başarısız. Kırık hâlde yayına almayın:
   ayrıntı için: npm run check"
ok "içerik, derleme ve tip kontrolü geçti"

# ------------------------------------------------------------ depo adını yerleştir
step "Depo adresini dosyalara yerleştir"

SUBBED=0
sub() { # dosya, eski, yeni
  local file="$1" from="$2" to="$3"
  if grep -qF -- "$from" "$file" 2>/dev/null; then
    # Değerler ORTAM DEĞİŞKENİYLE geçiliyor, perl programına gömülmüyor:
    # aksi halde içlerindeki '/' s///  ayracını, '@' ise dizi interpolasyonunu
    # bozar (örn. "@servicecore/" → s/\Q@servicecore/\E/... = sözdizimi hatası).
    FROM="$from" TO="$to" perl -pi -e 'BEGIN { $f = $ENV{FROM}; $t = $ENV{TO} } s/\Q$f\E/$t/g' "$file"
    ok "$file"
    SUBBED=1
  else
    skip "$file (zaten güncel)"
  fi
}

sub README.md            "<org>"                       "$OWNER"
sub docs/mcp-kurulumu.md "servicecore/servicecore-docs" "$OWNER/$REPO"

# gitConfig varsayılanı da düzeltilmeli: 'servicecore' org adı GitHub'da
# BAŞKASINA ait, yani ortam değişkeni tanımlanmadığında "GitHub'da Düzenle"
# bağlantıları yabancı bir depoya giderdi. Tırnaklı biçimde eşleştiriyoruz;
# tırnaksız 'servicecore' aynı satırdaki 'servicecore-docs' ile de eşleşir.
sub src/lib/shared.ts    "?? 'servicecore'"            "?? '$OWNER'"

# CODEOWNERS'taki bölüm bazlı satırlar @org/ekip biçiminde ve bu sözdizimi
# YALNIZCA organizasyonda geçerli. Kişisel hesapta ekip diye bir şey yok;
# satırlar yorumda kalır, etkin olan varsayılan sahip iş görür.
if [ "$IS_ORG" = "1" ]; then
  sub .github/CODEOWNERS "@servicecore/" "@$OWNER/"
else
  skip ".github/CODEOWNERS (kişisel hesap — ekip satırları yorumda bırakıldı)"
fi

if [ "$SUBBED" = "1" ]; then
  git add README.md docs/mcp-kurulumu.md .github/CODEOWNERS src/lib/shared.ts
  git commit -q -m "Depo adresi $OWNER/$REPO olarak güncellendi"
  ok "commit edildi"
fi

# ------------------------------------------------------------------- depo + push
step "GitHub deposu"

if gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  skip "$OWNER/$REPO zaten var"
  git remote get-url origin >/dev/null 2>&1 \
    || git remote add origin "https://github.com/$OWNER/$REPO.git"
  git push -u origin main
  ok "main gönderildi"
else
  printf '  %s deposu PUBLIC olarak oluşturulacak ve main gönderilecek.\n' "$OWNER/$REPO"
  printf '  Devam? [e/H] '
  read -r answer
  case "$answer" in
    e|E|y|Y) ;;
    *) die "iptal edildi" ;;
  esac
  gh repo create "$OWNER/$REPO" \
    --public \
    --source=. \
    --remote=origin \
    --push \
    --description "docs.servicecore.app — Servicecore dokümantasyonu (Fumadocs + Next.js)"
  ok "depo oluşturuldu ve gönderildi"
fi

# --------------------------------------------------------------- dal koruması
step "main dal koruması"

# require_code_owner_reviews şimdilik KAPALI: CODEOWNERS'ta henüz var olmayan
# ekiplere atıf varsa GitHub kuralı çözemez ve her PR'da uyarı gösterir.
# Ekipler oluşturulduktan sonra true'ya çevirin (README → Yayına alma, 5. adım).
if gh api -X PUT "repos/$OWNER/$REPO/branches/main/protection" --input - >/dev/null <<JSON
{
  "required_status_checks": { "strict": true, "contexts": ["$CI_JOB"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
then
  ok "doğrudan push kapalı; PR + 1 onay + CI zorunlu"
else
  die "dal koruması kurulamadı. Depo public mi, organizasyonda admin misiniz?"
fi

# ------------------------------------------------------------------- doğrulama
step "Sonuç doğrulaması"

gh api "repos/$OWNER/$REPO" --jq '"  görünürlük: " + (if .private then "ÖZEL (dal koruması ücretli plan ister!)" else "public" end)'
gh api "repos/$OWNER/$REPO/branches/main/protection" \
  --jq '"  onay sayısı: \(.required_pull_request_reviews.required_approving_review_count)  |  zorunlu kontrol: \(.required_status_checks.contexts | join(", "))"'

cat <<NEXT

────────────────────────────────────────────────────────────
Depo yayında: https://github.com/$OWNER/$REPO

Kalan adımlar tarayıcıdan (API'si yok ya da hesap yetkisi ister):

1. VERCEL — https://vercel.com/new
   $OWNER/$REPO deposunu içe aktarın. Framework otomatik algılanır.
   Ortam değişkenleri (Settings → Environment Variables):
       NEXT_PUBLIC_GITHUB_USER = $OWNER
       NEXT_PUBLIC_GITHUB_REPO = $REPO
   Bunlar sayfa altındaki "GitHub'da Düzenle" bağlantılarını besler.

2. ALAN ADI — Vercel → Settings → Domains → docs.servicecore.app
   DNS'te CNAME kaydını Vercel'in verdiği hedefe yönlendirin.

NEXT

if [ "$IS_ORG" = "1" ]; then
cat <<NEXT_ORG
3. EKİPLER — https://github.com/orgs/$OWNER/teams
   Şu ekipleri oluşturup üyeleri ekleyin:
       dokumantasyon, destek, urun, entegrasyon, implementasyon, web
   Sonra .github/CODEOWNERS içindeki ilgili satırları yorumdan çıkarın
   ve dal korumasında require_code_owner_reviews'ı açın:

       gh api -X PATCH repos/$OWNER/$REPO/branches/main/protection/required_pull_request_reviews \\
         -F require_code_owner_reviews=true

4. EKİBİ DAVET EDİN — 13 kişi:
       https://github.com/orgs/$OWNER/people
   Kurulum kılavuzunu paylaşın: docs/mcp-kurulumu.md
NEXT_ORG
else
cat <<NEXT_USER
3. EKİBİ EKLEYİN — 13 kişiyi ortak çalışan olarak ekleyin:
       https://github.com/$OWNER/$REPO/settings/access
   ya da terminalden, kullanıcı adıyla:
       gh api -X PUT repos/$OWNER/$REPO/collaborators/<kullanici> -f permission=push

   Kurulum kılavuzunu paylaşın: docs/mcp-kurulumu.md

4. İNCELEYİCİ — kişisel hesapta EKİP yok, o yüzden .github/CODEOWNERS
   tek tek kullanıcı adı ister. Şu an varsayılan sahip @$OWNER; ekip
   geldikçe bölüm satırlarını gerçek kullanıcı adlarıyla açın, örn:
       /content/docs/teknisyen/   @ahmet @ayse

   DİKKAT: main'de 1 onay zorunlu ve kendi PR'ınızı kendiniz
   onaylayamazsınız. Henüz başka ortak çalışan yokken kilitlenmemek için
   koruma yönetici hesabını KAPSAMIYOR (enforce_admins=false) — kendi
   PR'ınızı "merge without waiting" ile birleştirebilirsiniz. Ekip
   eklendikten sonra bunu sıkılaştırmak isterseniz:
       gh api -X PATCH repos/$OWNER/$REPO/branches/main/protection \\
         -F enforce_admins=true

5. SONRA: organizasyon açıldığında depoyu oraya taşıyın
   (Settings → Transfer ownership). GitHub eski adresten yönlendirme kurar;
   kimsenin bağlantısı, PR'ları ve geçmiş kırılmaz. Ardından
   ./scripts/publish.sh <org-adi> ile ekip bazlı sahipliği devreye alın.
NEXT_USER
fi

printf '\n────────────────────────────────────────────────────────────\n'
