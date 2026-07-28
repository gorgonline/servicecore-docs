/**
 * Site geneli sabitler — tek kaynak.
 * Alan adı değişirse yalnızca burası güncellenir.
 */
export const site = {
  name: 'Servicecore Docs',
  title: 'Servicecore Dokümantasyonu',
  description:
    'Servicecore hizmet yönetimi platformunun teknisyen, kullanıcı ve ' +
    'yönetici kılavuzları, entegrasyon ve kurulum dokümanları ile eğitim videoları.',
  /** Üretim adresi — Vercel dağıtımından sonra gerekirse güncelleyin. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://docs.servicecore.app',
  locale: 'tr_TR',
  links: {
    app: 'https://servicecore.app/',
    support: 'https://support.servicecore.app/',
    linkedin: 'https://www.linkedin.com/company/servicecoresw',
  },
} as const;
