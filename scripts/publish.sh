#!/usr/bin/env bash
#
# Depoyu GitHub'a alır ve katkı akışını çalışır hâle getirir.
#
#   ./scripts/publish.sh <org-adi>
#
# Tekrar çalıştırılabilir: var olan adımları atlar, eksikleri tamamlar.
# Hiçbir şeyi sessizce ezmez — her dış işlemden önce ne yapacağını yazar.
#
# ÖN KOŞUL: organizasyon GitHub'da açılmış olmalı. Org oluşturmanın REST API'si
# yok, tarayıcıdan yapılır: https://github.com/organizations/plan (Free yeterli).

set -euo pipefail

ORG="${1:-}"
REPO="servicecore-docs"
CI_JOB="İçerik ve derleme kontrolü"   # .github/workflows/ci.yml → jobs.check.name
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

die()  { printf '\n✗ %s\n' "$1" >&2; exit 1; }
step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }
ok()   { printf '  ✓ %s\n' "$1"; }
skip() { printf '  · %s\n' "$1"; }

[ -n "$ORG" ] || die "Kullanım: ./scripts/publish.sh <org-adi>
   Örn: ./scripts/publish.sh servicecore-app
   ('servicecore' adı GitHub'da başkası tarafından alınmış.)"

# ---------------------------------------------------------------- ön kontroller
step "Ön kontroller"

command -v gh  >/dev/null || die "gh CLI kurulu değil: brew install gh"
gh auth status >/dev/null 2>&1 || die "gh oturumu yok: gh auth login"
ok "gh oturumu açık ($(gh api user --jq .login))"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "burası bir git deposu değil"

if [ -n "$(git status --porcelain)" ]; then
  git status --short
  die "Çalışma ağacı kirli. Önce commit edin ya da stash'leyin."
fi
ok "çalışma ağacı temiz"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
[ "$BRANCH" = "main" ] || die "main dalında olmalısınız (şu an: $BRANCH)"
ok "dal: main"

# Organizasyonun var olduğunu ve içinde depo açma yetkiniz olduğunu doğrula.
if ! gh api "orgs/$ORG" --jq .login >/dev/null 2>&1; then
  die "'$ORG' organizasyonu bulunamadı.
   Tarayıcıdan açın: https://github.com/organizations/plan  (Free planı yeterli)
   Sonra bu betiği tekrar çalıştırın."
fi
ok "organizasyon bulundu: $ORG"

if ! gh api user/orgs --jq '.[].login' 2>/dev/null | grep -qx "$ORG"; then
  die "'$ORG' organizasyonuna üye görünmüyorsunuz (ya da token'da read:org yetkisi yok).
   Token yetkisi için: gh auth refresh -h github.com -s read:org,repo"
fi
ok "organizasyona üyesiniz"

# ------------------------------------------------------- yayın öncesi doğrulama
step "İçerik ve derleme doğrulaması (CI'ın çalıştırdığının aynısı)"
npm run check >/dev/null 2>&1 || die "npm run check başarısız. Kırık hâlde yayına almayın:
   ayrıntı için: npm run check"
ok "içerik, derleme ve tip kontrolü geçti"

# ------------------------------------------------------------ org adını yerleştir
step "Org adını dosyalara yerleştir"

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

sub README.md            "<org>"                       "$ORG"
sub docs/mcp-kurulumu.md "servicecore/servicecore-docs" "$ORG/$REPO"
sub .github/CODEOWNERS   "@servicecore/"               "@$ORG/"

if [ "$SUBBED" = "1" ]; then
  git add README.md docs/mcp-kurulumu.md .github/CODEOWNERS
  git commit -q -m "Depo adresi gerçek organizasyonla ($ORG) güncellendi"
  ok "commit edildi"
fi

# ------------------------------------------------------------------- depo + push
step "GitHub deposu"

if gh repo view "$ORG/$REPO" >/dev/null 2>&1; then
  skip "$ORG/$REPO zaten var"
  git remote get-url origin >/dev/null 2>&1 \
    || git remote add origin "https://github.com/$ORG/$REPO.git"
  git push -u origin main
  ok "main gönderildi"
else
  printf '  %s deposu PUBLIC olarak oluşturulacak ve main gönderilecek.\n' "$ORG/$REPO"
  printf '  Devam? [e/H] '
  read -r answer
  case "$answer" in
    e|E|y|Y) ;;
    *) die "iptal edildi" ;;
  esac
  gh repo create "$ORG/$REPO" \
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
if gh api -X PUT "repos/$ORG/$REPO/branches/main/protection" --input - >/dev/null <<JSON
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

gh api "repos/$ORG/$REPO" --jq '"  görünürlük: " + (if .private then "ÖZEL (dal koruması ücretli plan ister!)" else "public" end)'
gh api "repos/$ORG/$REPO/branches/main/protection" \
  --jq '"  onay sayısı: \(.required_pull_request_reviews.required_approving_review_count)  |  zorunlu kontrol: \(.required_status_checks.contexts | join(", "))"'

cat <<NEXT

────────────────────────────────────────────────────────────
Depo yayında: https://github.com/$ORG/$REPO

Kalan adımlar tarayıcıdan (API'si yok ya da hesap yetkisi ister):

1. VERCEL — https://vercel.com/new
   $ORG/$REPO deposunu içe aktarın. Framework otomatik algılanır.
   Ortam değişkenleri (Settings → Environment Variables):
       NEXT_PUBLIC_GITHUB_USER = $ORG
       NEXT_PUBLIC_GITHUB_REPO = $REPO
   Bunlar sayfa altındaki "GitHub'da Düzenle" bağlantılarını besler.

2. ALAN ADI — Vercel → Settings → Domains → docs.servicecore.app
   DNS'te CNAME kaydını Vercel'in verdiği hedefe yönlendirin.

3. EKİPLER — https://github.com/orgs/$ORG/teams
   Şu ekipleri oluşturup üyeleri ekleyin:
       dokumantasyon, destek, urun, entegrasyon, implementasyon, web
   Sonra .github/CODEOWNERS içindeki ilgili satırları yorumdan çıkarın
   ve dal korumasında require_code_owner_reviews'ı açın:

       gh api -X PATCH repos/$ORG/$REPO/branches/main/protection/required_pull_request_reviews \\
         -F require_code_owner_reviews=true

4. EKİBİ DAVET EDİN — 13 kişi:
       https://github.com/orgs/$ORG/people
   Kurulum kılavuzunu paylaşın: docs/mcp-kurulumu.md

────────────────────────────────────────────────────────────
NEXT
