/**
 * Web App Manifest & Icons — unit tests
 * Requirements: MANIFEST-01 through MANIFEST-06
 *
 * Tests read static files from the filesystem (no browser runtime needed).
 * Run with: rtk vitest run src/__tests__/manifest.test.ts
 */
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const projectRoot = path.resolve(__dirname, '../../')
const manifestPath = path.join(projectRoot, 'public/manifest.webmanifest')
const indexHtmlPath = path.join(projectRoot, 'index.html')
const iconsDir = path.join(projectRoot, 'public/icons')

// ---------------------------------------------------------------------------
// MANIFEST-01: manifest.webmanifest fields
// ---------------------------------------------------------------------------
describe('MANIFEST-01: manifest.webmanifest has required fields', () => {
  let manifest: Record<string, unknown>

  it('public/manifest.webmanifest exists', () => {
    expect(fs.existsSync(manifestPath)).toBe(true)
  })

  it('manifest is valid JSON', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    expect(() => { manifest = JSON.parse(raw) as Record<string, unknown> }).not.toThrow()
    manifest = JSON.parse(raw) as Record<string, unknown>
  })

  it('name is "Presizion \u2014 Cluster Refresh Sizing"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.name).toBe('Presizion \u2014 Cluster Refresh Sizing')
  })

  it('short_name is "Presizion"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.short_name).toBe('Presizion')
  })

  it('start_url is "/presizion/"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.start_url).toBe('/presizion/')
  })

  it('scope is "/presizion/"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.scope).toBe('/presizion/')
  })

  it('display is "standalone"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.display).toBe('standalone')
  })

  it('theme_color is "#3B82F6"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.theme_color).toBe('#3B82F6')
  })

  it('background_color is "#ffffff"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(raw) as Record<string, unknown>
    expect(manifest.background_color).toBe('#ffffff')
  })
})

// ---------------------------------------------------------------------------
// MANIFEST-02: Standard icon PNGs (192x192 and 512x512)
// ---------------------------------------------------------------------------
describe('MANIFEST-02: standard icon PNGs exist', () => {
  it('public/icons/pwa-192x192.png exists', () => {
    expect(fs.existsSync(path.join(iconsDir, 'pwa-192x192.png'))).toBe(true)
  })

  it('public/icons/pwa-512x512.png exists', () => {
    expect(fs.existsSync(path.join(iconsDir, 'pwa-512x512.png'))).toBe(true)
  })

  it('manifest icons array has entry for 192x192 with /presizion/ src prefix', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as { icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> }
    const icon192 = manifest.icons.find(i => i.sizes === '192x192')
    expect(icon192).toBeDefined()
    expect(icon192?.src).toMatch(/^\/presizion\/icons\//)
    expect(icon192?.type).toBe('image/png')
  })

  it('manifest icons array has entry for 512x512 (any purpose) with /presizion/ src prefix', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as { icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> }
    const icon512Any = manifest.icons.find(i => i.sizes === '512x512' && (i.purpose === undefined || i.purpose === 'any'))
    expect(icon512Any).toBeDefined()
    expect(icon512Any?.src).toMatch(/^\/presizion\/icons\//)
    expect(icon512Any?.type).toBe('image/png')
  })
})

// ---------------------------------------------------------------------------
// MANIFEST-03: Maskable icon for Android adaptive launchers
// ---------------------------------------------------------------------------
describe('MANIFEST-03: maskable icon PNG exists and manifest has maskable entry', () => {
  it('public/icons/maskable-512x512.png exists', () => {
    expect(fs.existsSync(path.join(iconsDir, 'maskable-512x512.png'))).toBe(true)
  })

  it('manifest icons array has entry with purpose "maskable"', () => {
    const raw = fs.readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw) as { icons: Array<{ src: string; sizes: string; type: string; purpose?: string }> }
    const maskableIcon = manifest.icons.find(i => i.purpose === 'maskable')
    expect(maskableIcon).toBeDefined()
    expect(maskableIcon?.sizes).toBe('512x512')
    expect(maskableIcon?.src).toMatch(/^\/presizion\/icons\//)
  })
})

// ---------------------------------------------------------------------------
// MANIFEST-04: iOS apple-touch-icon in index.html
// ---------------------------------------------------------------------------
describe('MANIFEST-04: index.html contains apple-touch-icon link', () => {
  let htmlContent: string

  it('apple-touch-icon-180x180.png exists in public/icons/', () => {
    expect(fs.existsSync(path.join(iconsDir, 'apple-touch-icon-180x180.png'))).toBe(true)
  })

  it('index.html contains link rel="manifest" pointing to /presizion/manifest.webmanifest', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/rel="manifest"/)
    expect(htmlContent).toMatch(/href="\/presizion\/manifest\.webmanifest"/)
  })

  it('index.html contains link rel="apple-touch-icon" with sizes="180x180"', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/rel="apple-touch-icon"/)
    expect(htmlContent).toMatch(/sizes="180x180"/)
  })

  it('apple-touch-icon href points to /presizion/icons/apple-touch-icon-180x180.png', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/href="\/presizion\/icons\/apple-touch-icon-180x180\.png"/)
  })

  it('index.html contains meta apple-mobile-web-app-capable', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="apple-mobile-web-app-capable"/)
    expect(htmlContent).toMatch(/content="yes"/)
  })

  it('index.html contains meta apple-mobile-web-app-status-bar-style with content="default"', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="apple-mobile-web-app-status-bar-style"/)
    // Must NOT use black-translucent (causes notch issues)
    expect(htmlContent).toMatch(/name="apple-mobile-web-app-status-bar-style"[^>]*content="default"/)
  })

  it('index.html contains meta apple-mobile-web-app-title with content="Presizion"', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="apple-mobile-web-app-title"/)
    expect(htmlContent).toMatch(/content="Presizion"/)
  })
})

// ---------------------------------------------------------------------------
// MANIFEST-05: theme-color meta tags with media queries
// ---------------------------------------------------------------------------
describe('MANIFEST-05: index.html has dual theme-color meta tags', () => {
  let htmlContent: string

  it('index.html has theme-color meta for light mode (#ffffff)', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="theme-color"[^>]*content="#ffffff"[^>]*media="\(prefers-color-scheme: light\)"/)
  })

  it('index.html has theme-color meta for dark mode (#0a0a0a)', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="theme-color"[^>]*content="#0a0a0a"[^>]*media="\(prefers-color-scheme: dark\)"/)
  })

  it('index.html has exactly two theme-color meta tags', () => {
    htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    const matches = htmlContent.match(/name="theme-color"/g)
    expect(matches).not.toBeNull()
    expect(matches?.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// MANIFEST-06: viewport-fit=cover in viewport meta
// ---------------------------------------------------------------------------
describe('MANIFEST-06: index.html viewport meta includes viewport-fit=cover', () => {
  it('viewport meta contains viewport-fit=cover', () => {
    const htmlContent = fs.readFileSync(indexHtmlPath, 'utf-8')
    expect(htmlContent).toMatch(/name="viewport"/)
    expect(htmlContent).toMatch(/viewport-fit=cover/)
  })
})
