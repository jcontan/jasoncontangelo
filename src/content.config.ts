import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const galleries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/galleries' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    imageCount: z.number(),
    imagePrefix: z.string().default(''),
    captionPattern: z.string().optional(),
    externalLink: z.string().url().optional(),
    externalLinkText: z.string().optional(),
  }),
});

export const collections = { galleries };
