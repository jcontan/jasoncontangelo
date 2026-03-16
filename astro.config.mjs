import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://jcontan.github.io',
  base: '/jasoncontangelo',
  output: 'static',
  integrations: [sitemap()],
});
