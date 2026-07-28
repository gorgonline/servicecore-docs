import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Image from 'next/image';
import { site } from './site';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <Image
            src="/logo.png"
            alt="Servicecore"
            width={24}
            height={24}
            className="rounded"
          />
          {site.name}
        </>
      ),
    },
    links: [
      { text: 'Servicecore', url: site.links.app, external: true },
      { text: 'Destek', url: site.links.support, external: true },
    ],
  };
}
