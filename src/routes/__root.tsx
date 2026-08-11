import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { ClientOnly } from '#/components/ClientOnly'
import { CrackTransition } from '#/components/site/CrackTransition'
import { EmberCursor } from '#/components/site/EmberCursor'
import { UiSound } from '#/components/site/UiSound'
import appCss from '../styles.css?url'

const SITE = 'https://kaldera.studio'
const TITLE = 'KALDERA: The AI studio that builds its own tools.'
const DESCRIPTION =
  'Kaldera Studio makes films, art and video with AI, and hands creators the tools it builds. Aurea and Cinevido, forged in production on a single GPU.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: TITLE,
      },
      {
        name: 'theme-color',
        content: '#0B0B0D',
      },
      { name: 'description', content: DESCRIPTION },
      // Share cards. The image is the brand lockup over the fissure, so a
      // pasted link looks like the page rather than like a favicon on grey.
      // Re-shoot it from /og/card.html after any brand change:
      //   npm run dev
      //   chrome --headless=new --window-size=1200,630 --force-device-scale-factor=1 \
      //     --screenshot=public/og/kaldera-og.png http://localhost:3000/og/card.html
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Kaldera' },
      { property: 'og:title', content: TITLE },
      { property: 'og:description', content: DESCRIPTION },
      { property: 'og:image', content: `${SITE}/og/kaldera-og.png` },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      {
        property: 'og:image:alt',
        content:
          'The Kaldera mark, a fractured caldera ring with one molten arc, above the KALDERA wordmark on obsidian.',
      },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: TITLE },
      { name: 'twitter:description', content: DESCRIPTION },
      { name: 'twitter:image', content: `${SITE}/og/kaldera-og.png` },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      // The display face gates the hero (the particle wordmark rasterises it)
      // and the mono face is the preloader's own voice — both must be in
      // flight before the CSS even parses. Inter swaps in when it lands.
      { rel: 'preload', href: '/fonts/archivo.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'preload', href: '/fonts/jbmono.woff2', as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/og/kaldera-touch.png' },
      { rel: 'canonical', href: SITE },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {/* First tab stop on every route — the landing is a long scroll and
            the nav sits above a full-screen canvas. */}
        <a href="#main" className="u-skip u-mono">
          Skip to content
        </a>
        {children}
        {/* Shell-level polish (P5). All client-only: each does its own
            capability check, but none of them can server-render. */}
        <ClientOnly>
          <CrackTransition />
          <EmberCursor />
          <UiSound />
        </ClientOnly>
        <Scripts />
      </body>
    </html>
  )
}
