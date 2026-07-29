import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

/**
 * Tazelik alanları — bkz. CLAUDE.md §7.
 *
 * `reviewed`: sayfanın en son ne zaman ÜRÜNLE karşılaştırıldığı. Git tarihi bu
 * bilgiyi vermez (virgül düzeltmesi de commit'tir), o yüzden elle taşınır.
 * `owner`: sayfadan sorumlu GitHub kullanıcısı. Henüz dağıtılmadığı için boş
 * olabilir; boş YAML değeri null olarak gelir.
 */
const freshnessSchema = {
  reviewed: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'reviewed alanı YYYY-MM-DD biçiminde olmalı')
    .optional(),
  owner: z.string().nullish(),
};

// You can customize Zod schemas for frontmatter and `meta.json` here
// see https://fumadocs.dev/docs/mdx/collections
export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend(freshnessSchema),
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
