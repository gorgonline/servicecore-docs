import { getPageImage, getPageMarkdownUrl, source } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  EditOnGitHub,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/notebook/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { gitConfig } from '@/lib/shared';

function githubUrlFor(path: string) {
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/content/docs/${path}`;
}

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
  const markdownUrl = getPageMarkdownUrl(page).url;
  const githubUrl = githubUrlFor(page.path);
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
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} githubUrl={githubUrl} />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // göreli dosya yollarıyla diğer sayfalara bağlantı verilebilsin
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
      <div className="mt-10 flex flex-row items-center justify-between gap-4 border-t pt-6 text-sm text-fd-muted-foreground">
        <span>Bu sayfada eksik veya hatalı bilgi mi var?</span>
        <EditOnGitHub href={githubUrl} />
      </div>
      {reviewedLabel && (
        <p className="mt-3 text-xs text-fd-muted-foreground">
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
