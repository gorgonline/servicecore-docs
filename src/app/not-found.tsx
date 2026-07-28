import Link from 'next/link';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <p className="mb-3 text-sm font-medium text-fd-muted-foreground">404</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight">
          Sayfa bulunamadı
        </h1>
        <p className="mb-8 max-w-md text-fd-muted-foreground">
          Aradığınız sayfa taşınmış, adı değişmiş veya kaldırılmış olabilir.
          Dokümantasyon ana sayfasından veya arama kutusundan devam edebilirsiniz.
        </p>
        <Link
          href="/docs"
          className="rounded-lg bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
        >
          Dokümantasyona dön
        </Link>
      </main>
    </HomeLayout>
  );
}
