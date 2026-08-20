import { defineConfig } from 'vitepress'

// Minimal VitePress config used only to validate that the public docs build.
// This config is NOT mirrored to the private website repository: the website
// keeps its own theme, navigation, and build config.
export default defineConfig({
  title: 'Moe Icons',
  description: 'Moe Icons documentation',
  srcDir: '.',
  base: '/docs/',
  outDir: '../.docs-dist',
  locales: {
    root: { label: 'English', lang: 'en' },
    cn: { label: 'Chinese', lang: 'cn', link: '/cn' },
  },
})
