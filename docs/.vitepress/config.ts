import { defineConfig } from 'vitepress'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Minimal VitePress config used only to validate and preview that the public
// docs build. This config is NOT mirrored to the private website repository:
// the website keeps its own theme, navigation, and build config. It reads the
// same docs/locales.json registry so the local preview matches the published
// navigation for both languages.
type LocaleEntry = {
  slug: string
  label: string
  lang: string
  link: string
  nav?: unknown[]
  sidebar?: unknown[]
}

const registry = JSON.parse(
  readFileSync(fileURLToPath(new URL('../locales.json', import.meta.url)), 'utf8'),
) as { locales: LocaleEntry[] }

const locales = Object.fromEntries(
  registry.locales.map((entry) => [
    entry.slug,
    {
      label: entry.label,
      lang: entry.lang,
      ...(entry.slug === 'root' ? {} : { link: entry.link }),
      themeConfig: {
        nav: entry.nav ?? [],
        sidebar: entry.sidebar ?? [],
      },
    },
  ]),
)

export default defineConfig({
  title: 'Moe Icons',
  description: 'Moe Icons documentation',
  srcDir: '.',
  base: '/docs/',
  outDir: '../.docs-dist',
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/moewolf-dev/moe-icons' },
    ],
  },
  locales,
})
