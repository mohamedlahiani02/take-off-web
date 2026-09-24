import { promises as fs } from 'node:fs'
import path from 'node:path'
import { publicApiBase } from '@/lib/api/base'

const prototypeRoot = path.join(process.cwd(), 'prototype')

const htmlRoutes: Record<string, string> = {
  'Take Off - Gateway.dc.html': '/',
  'Take Off - Padel.dc.html': '/padel',
  'Take Off - Padel Reserve.dc.html': '/padel/reserve',
  'Take Off - Pilates.dc.html': '/pilates',
  'Take Off - Pilates Classes.dc.html': '/pilates/classes',
  'Take Off - Store.dc.html': '/store',
  'Take Off - Coaches.dc.html': '/coaches',
}

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
}

export async function prototypeHtml(fileName: keyof typeof htmlRoutes) {
  const filePath = path.join(prototypeRoot, fileName)
  let html = await fs.readFile(filePath, 'utf8')

  // Injected for the browser, so this must be the public URL: API_URL is a
  // server-only override and would send the page to a foreign origin.
  const apiScript = `<script>window.TAKEOFF_API_URL="${publicApiBase()}";</script>`
  html = html.replace('<script src="./support.js"></script>', apiScript + '\n<script src="./support.js"></script>')

  return new Response(rewritePrototypeHtml(html), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

export async function prototypeAsset(segments: string[]) {
  const filePath = await resolvePrototypePath(segments)

  if (!filePath) {
    return new Response('Not found', { status: 404 })
  }

  const body = await fs.readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  // JS files get a short TTL so updated scripts are picked up within a day;
  // static assets (images, fonts) stay cached for a year.
  const cacheControl = ext === '.js' ? 'public, max-age=86400' : 'public, max-age=31536000, immutable'

  return new Response(body, {
    headers: {
      'content-type': mimeTypes[ext] ?? 'application/octet-stream',
      'cache-control': cacheControl,
    },
  })
}

function rewritePrototypeHtml(html: string) {
  let out = html

  for (const [file, route] of Object.entries(htmlRoutes)) {
    const encoded = file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(encoded, 'g'), route)
  }

  return out
    .replaceAll('./support.js', '/prototype-assets/support.js?v=12')
    .replaceAll('./image-slot.js', '/prototype-assets/image-slot.js?v=12')
    .replaceAll('./api-client.js', '/prototype-assets/api-client.js?v=12')
    .replaceAll('./auth.js', '/prototype-assets/auth.js?v=12')
    .replaceAll('./menu.js', '/prototype-assets/menu.js?v=12')
    .replaceAll('./cart.js', '/prototype-assets/cart.js?v=12')
    .replaceAll('./mobile.css', '/prototype-assets/mobile.css?v=12')
    .replaceAll('./Logo/', '/prototype-assets/Logo/')
    .replaceAll('./logo/', '/prototype-assets/Logo/')
    .replaceAll('./photos/', '/prototype-assets/Photos/')
    .replaceAll('./Photos/', '/prototype-assets/Photos/')
    .replaceAll('./videos/', '/prototype-assets/Videos/')
    .replaceAll('./Videos/', '/prototype-assets/Videos/')
    .replaceAll('./uploads/', '/prototype-assets/uploads/')
}

async function resolvePrototypePath(segments: string[]) {
  let current = prototypeRoot

  for (const rawSegment of segments) {
    const segment = decodeURIComponent(rawSegment)

    if (!segment || segment === '.' || segment === '..' || /[\\/]/.test(segment)) {
      return null
    }

    const entries = await fs.readdir(current, { withFileTypes: true })
    const match = entries.find((entry) => entry.name.toLowerCase() === segment.toLowerCase())

    if (!match) return null

    current = path.join(current, match.name)
  }

  const relative = path.relative(prototypeRoot, current)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  const stat = await fs.stat(current)

  return stat.isFile() ? current : null
}
