import { site } from './site';

/** Fumadocs iskeletinin beklediği sabitler — kaynak: site.ts */
export const appName = site.name;
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

/**
 * GitHub reposu — "GitHub'da Düzenle" bağlantıları ve MCP akışı için.
 * Repo oluşturulduğunda user/repo değerlerini güncelleyin.
 */
export const gitConfig = {
  user: process.env.NEXT_PUBLIC_GITHUB_USER ?? 'servicecore',
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? 'servicecore-docs',
  branch: 'main',
};
