import { getPageImage, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from 'fumadocs-ui/layouts/notebook/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

/**
 * "2026-07-30" → "30 Temmuz 2026". Tarih TIRNAKLI geldiği için düz metindir;
 * new Date() ile ayrıştırmıyoruz çünkü çıplak ISO tarihi UTC sayılır ve
 * yerel saat diliminde bir gün geriye kayabilir. Parçalayıp adlandırıyoruz.
 */
const AYLAR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

function tarihYaz(iso: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const ay = AYLAR[Number(m[2]) - 1];
  if (!ay) return null;
  return `${Number(m[3])} ${ay} ${m[1]}`;
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const reviewedLabel = page.data.reviewed ? tarihYaz(page.data.reviewed) : null;

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      // Ana içerik landmark'ı: ekran okuyucu ve "içeriğe atla" bağlantısı için
      role="main"
      aria-label="Sayfa içeriği"
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      {/* Katkıcıya yönelik düğmeler (Markdown'ı Kopyala / Aç) bilinçli olarak
          YOK: bu site müşteriye açılıyor, okuyan kitle katkı veren kitle değil.
          Ekip katkıyı AI + MCP ile veriyor, bu düğmelerden değil. */}
      <DocsDescription className="mb-0 border-b pb-6">{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // göreli dosya yollarıyla diğer sayfalara bağlantı verilebilsin
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      {/* "GitHub'da Düzenle" de aynı sebeple kaldırıldı — müşteriyi depoya
          götürmesi istenmiyor. "Son doğrulama" KALIYOR: müşteriye link
          atarken dokümanın ne zaman doğrulandığını göstermek değerli. */}
      {reviewedLabel && (
        // Tarih "veri" katmanı: mono + geniş harf aralığı, anlatıdan ayrışır.
        <p className="sc-microlabel mt-10 border-t pt-6">
          Son doğrulama: <time dateTime={page.data.reviewed}>{reviewedLabel}</time>
        </p>
      )}
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImage(page).url,
    },
  };
}
