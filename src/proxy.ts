import { NextRequest, NextResponse } from 'next/server';
import { isMarkdownPreferred, rewritePath } from 'fumadocs-core/negotiation';
import { docsContentRoute, docsRoute } from '@/lib/shared';

const { rewrite: rewriteDocs } = rewritePath(
  `${docsRoute}{/*path}`,
  `${docsContentRoute}{/*path}/content.md`,
);
const { rewrite: rewriteSuffix } = rewritePath(
  `${docsRoute}{/*path}.md`,
  `${docsContentRoute}{/*path}/content.md`,
);

/**
 * Eski Docusaurus adreslerinin bir bölümü büyük harf içeriyordu
 * (`/docs/Esm/esmYonetimi`). Yeni yollar tamamen küçük harf ve barındırma
 * ortamı (Vercel) harf duyarlı; bu adresler kendiliğinden 404 verir.
 *
 * Bu düzeltme `next.config.mjs` yönlendirmeleriyle YAPILAMAZ: oradaki
 * eşleştirme harf duyarsızdır, dolayısıyla
 *   /docs/Esm/baslangic -> /docs/esm/baslangic
 * kuralı kendi hedefiyle de eşleşir ve sonsuz yönlendirme döngüsü üretir.
 * Ayrıca kaynağın küçük harfli hâli BAŞKA bir gerçek sayfaya denk geldiğinde
 * (`/docs/Teknisyen/raporlar` ile `/docs/teknisyen/raporlar`) o sayfa da
 * kaçırılır. İki durum da yalnızca harf duyarlı bir katmanda çözülebilir.
 */

/** Küçük harfe çevirmenin yanlış sayfaya götürdüğü adresler. Harf duyarlı eşleşir. */
const EXACT_REDIRECTS: Record<string, string> = {
  // Eski "Teknisyen Eğitimi" bölümü; küçük harfli hâli Teknisyen
  // Kılavuzu'nun raporlar bölümüne denk geldiği için ayrıca ele alınır.
  '/docs/Teknisyen/raporlar': '/docs/teknisyen-egitimleri/raporlar',
};

function normalizedDocsPath(pathname: string): string | null {
  const exact = EXACT_REDIRECTS[pathname];
  if (exact) return exact;
  if (!pathname.startsWith(`${docsRoute}/`)) return null;

  // `pathname` yüzde-kodlu gelir (`.../dilkaynag%C4%B1ayar`). Doğrudan
  // küçük harfe çevirmek onaltılık haneleri de küçültür (`%c4%b1`), yol
  // aslında değişmemişken değişmiş görünür ve sonsuz döngü oluşur.
  // Bu yüzden karşılaştırma çözülmüş yol üzerinden yapılır.
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null; // bozuk yüzde kodlaması — dokunmadan geç
  }
  const lowered = decoded.toLowerCase();
  return lowered === decoded ? null : lowered;
}

export default function proxy(request: NextRequest) {
  const normalized = normalizedDocsPath(request.nextUrl.pathname);
  if (normalized) {
    const url = request.nextUrl.clone();
    url.pathname = normalized;
    return NextResponse.redirect(url, 308);
  }

  const result = rewriteSuffix(request.nextUrl.pathname);
  if (result) {
    return NextResponse.rewrite(new URL(result, request.nextUrl));
  }

  if (isMarkdownPreferred(request)) {
    const result = rewriteDocs(request.nextUrl.pathname);

    if (result) {
      return NextResponse.rewrite(new URL(result, request.nextUrl));
    }
  }

  return NextResponse.next();
}
