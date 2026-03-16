import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'src', 'assets');

const DELAY_MS = 300;
const IMAGE_WIDTH = 1500; // download at 1500px wide, Astro will optimize further

const GALLERIES = [
  { slug: 'aqueous-ecology-niagara', title: 'Aqueous Ecology: Niagara', order: 1 },
  { slug: 'forest-rebel', title: 'Forest Rebel', order: 2 },
  { slug: 'rotten-apple', title: 'Rotten Apple', order: 3 },
  { slug: 'body-photograms-in-the-void', title: 'Body Photograms (in the void)', order: 4 },
  { slug: 'liquid-intelligence', title: 'Liquid Intelligence', order: 5 },
  { slug: 'discards', title: 'Discards', order: 6 },
  { slug: 'overgrowth', title: 'Overgrowth', order: 7 },
  { slug: 'numina', title: 'Numina', order: 8 },
  { slug: 'reverse-solarization', title: 'Reverse Solarization', order: 9 },
  { slug: 'polaroids', title: 'Polaroids', order: 10 },
  { slug: 'chaotic-good', title: 'Chaotic Good', order: 11 },
  { slug: 'hundred-trees', title: '100 Trees', order: 12, urlSlug: '100-trees', captionPattern: 'Tree ({n})' },
  { slug: 'aethereality', title: 'Aethereality', order: 13 },
  { slug: 'flowers-simply-bloom', title: 'Flowers Simply Bloom', order: 14 },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract image URLs from Squarespace gallery page HTML
 */
function extractImageUrls(html) {
  const urls = new Set();

  // Match data-src attributes (Squarespace lazy-loaded images)
  const dataSrcRegex = /data-src="(https:\/\/images\.squarespace-cdn\.com\/content\/[^"]+)"/g;
  let match;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // Match regular src attributes for squarespace CDN images
  const srcRegex = /src="(https:\/\/images\.squarespace-cdn\.com\/content\/[^"]+)"/g;
  while ((match = srcRegex.exec(html)) !== null) {
    // Skip tiny thumbnails (100w or less)
    if (!match[1].includes('?format=') || !match[1].includes('100w')) {
      urls.add(match[1]);
    }
  }

  // Also check for noscript img tags which often have the full URLs
  const noscriptRegex = /<noscript>.*?<img[^>]+src="(https:\/\/images\.squarespace-cdn\.com\/content\/[^"]+)"[^>]*>.*?<\/noscript>/gs;
  while ((match = noscriptRegex.exec(html)) !== null) {
    urls.add(match[1]);
  }

  // Clean URLs: strip any existing format params and return base URLs
  return [...urls].map((url) => {
    // Remove query string to get base URL
    return url.split('?')[0];
  });
}

/**
 * Extract description text from the page
 */
function extractDescription(html) {
  // Look for common Squarespace text block patterns
  const textBlockRegex = /<div[^>]*class="[^"]*sqs-block-content[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  const texts = [];
  let match;

  while ((match = textBlockRegex.exec(html)) !== null) {
    // Strip HTML tags, decode entities
    let text = match[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 20) {
      texts.push(text);
    }
  }

  return texts.join('\n\n');
}

/**
 * Download a single image
 */
async function downloadImage(url, destPath) {
  const downloadUrl = `${url}?format=${IMAGE_WIDTH}w`;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      console.error(`  Failed to download: ${response.status} ${downloadUrl}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(destPath, buffer);
    return true;
  } catch (err) {
    console.error(`  Error downloading ${downloadUrl}: ${err.message}`);
    return false;
  }
}

/**
 * Process a single gallery
 */
async function processGallery(gallery) {
  const urlSlug = gallery.urlSlug || gallery.slug;
  const url = `https://jasoncontangelo.com/${urlSlug}`;
  const destDir = join(ASSETS, 'galleries', gallery.slug);

  console.log(`\n📷 Processing: ${gallery.title} (${url})`);

  // Fetch the gallery page
  let html;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Failed to fetch page: ${response.status}`);
      return { ...gallery, imageCount: 0, description: '' };
    }
    html = await response.text();
  } catch (err) {
    console.error(`  Error fetching page: ${err.message}`);
    return { ...gallery, imageCount: 0, description: '' };
  }

  // Extract image URLs and description
  const imageUrls = extractImageUrls(html);
  const description = extractDescription(html);

  console.log(`  Found ${imageUrls.length} images`);

  if (imageUrls.length === 0) {
    console.log('  No images found, skipping download');
    return { ...gallery, imageCount: 0, description };
  }

  // Create destination directory
  await mkdir(destDir, { recursive: true });

  // Download images
  let downloaded = 0;
  for (let i = 0; i < imageUrls.length; i++) {
    const num = String(i + 1).padStart(3, '0');
    const prefix = gallery.slug === 'hundred-trees' ? 'tree-' : '';
    const filename = `${prefix}${num}.jpg`;
    const destPath = join(destDir, filename);

    if (existsSync(destPath)) {
      downloaded++;
      continue; // Skip already downloaded
    }

    const success = await downloadImage(imageUrls[i], destPath);
    if (success) {
      downloaded++;
      process.stdout.write(`  Downloaded ${downloaded}/${imageUrls.length}\r`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`  Downloaded ${downloaded}/${imageUrls.length} images`);

  return { ...gallery, imageCount: imageUrls.length, description };
}

/**
 * Download homepage hero image
 */
async function downloadHomepage() {
  console.log('\n🏠 Processing: Homepage');

  const response = await fetch('https://jasoncontangelo.com');
  const html = await response.text();
  const imageUrls = extractImageUrls(html);

  if (imageUrls.length > 0) {
    const destDir = join(ASSETS, 'homepage');
    await mkdir(destDir, { recursive: true });
    const destPath = join(destDir, 'icon-black-halo.jpg');

    if (!existsSync(destPath)) {
      await downloadImage(imageUrls[0], destPath);
      console.log('  Downloaded hero image');
    } else {
      console.log('  Hero image already exists');
    }
  } else {
    console.log('  No hero image found');
  }
}

/**
 * Download about page portrait
 */
async function downloadAbout() {
  console.log('\n👤 Processing: About page');

  const response = await fetch('https://jasoncontangelo.com/about');
  const html = await response.text();
  const imageUrls = extractImageUrls(html);

  if (imageUrls.length > 0) {
    const destDir = join(ASSETS, 'about');
    await mkdir(destDir, { recursive: true });
    const destPath = join(destDir, 'jason-portrait.jpg');

    if (!existsSync(destPath)) {
      await downloadImage(imageUrls[0], destPath);
      console.log('  Downloaded portrait');
    } else {
      console.log('  Portrait already exists');
    }
  } else {
    console.log('  No portrait found');
  }
}

/**
 * Write gallery manifest and markdown files
 */
async function writeGalleryFiles(results) {
  const manifestPath = join(ROOT, 'scripts', 'gallery-manifest.json');
  await writeFile(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\n📄 Wrote manifest to ${manifestPath}`);

  // Write markdown files for content collection
  const contentDir = join(ROOT, 'src', 'content', 'galleries');
  await mkdir(contentDir, { recursive: true });

  for (const gallery of results) {
    const frontmatter = [
      '---',
      `title: "${gallery.title}"`,
      `order: ${gallery.order}`,
      `imageCount: ${gallery.imageCount}`,
    ];

    if (gallery.slug === 'hundred-trees') {
      frontmatter.push(`imagePrefix: "tree-"`);
    }

    if (gallery.captionPattern) {
      frontmatter.push(`captionPattern: "${gallery.captionPattern}"`);
    }

    if (gallery.slug === 'hundred-trees') {
      frontmatter.push(`externalLink: "https://opensea.io/collection/100-trees-by-jason-contangelo"`);
      frontmatter.push(`externalLinkText: "View on OpenSea"`);
    }

    frontmatter.push('---');
    frontmatter.push('');

    // Add description if we extracted one
    if (gallery.description) {
      frontmatter.push(gallery.description);
    }

    const mdPath = join(contentDir, `${gallery.slug}.md`);
    await writeFile(mdPath, frontmatter.join('\n') + '\n');
    console.log(`  Wrote ${gallery.slug}.md`);
  }
}

// Main
async function main() {
  console.log('=== Jason Contangelo Portfolio Image Downloader ===\n');

  // Download homepage and about images
  await downloadHomepage();
  await downloadAbout();

  // Process all galleries
  const results = [];
  for (const gallery of GALLERIES) {
    const result = await processGallery(gallery);
    results.push(result);
  }

  // Write manifest and markdown files
  await writeGalleryFiles(results);

  // Summary
  const totalImages = results.reduce((sum, g) => sum + g.imageCount, 0);
  console.log(`\n✅ Done! Downloaded ${totalImages} images across ${results.length} galleries.`);
}

main().catch(console.error);
