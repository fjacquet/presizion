/**
 * Presizion logo as a base64-encoded PNG data URL.
 *
 * Generated from public/logo.svg at 320x80 (2x for retina).
 * Used in PDF and PPTX exports where SVG text rendering is unreliable.
 *
 * To regenerate: open logo.svg in browser, screenshot at 2x, base64-encode.
 * This is a static asset — no runtime SVG rendering needed.
 */

// Blue "P" mark + "Presizion" wordmark as a simple canvas-rendered fallback.
// Returns a Promise<string> with a data:image/png;base64 URL.
export async function getLogoDataUrl(): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 80
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  const scale = 2
  ctx.scale(scale, scale)

  // Blue P mark
  const blue = '#3B82F6'
  ctx.fillStyle = blue

  // Vertical stem
  roundRect(ctx, 4, 6, 6, 28, 2)
  ctx.fill()

  // Top horizontal bar
  roundRect(ctx, 4, 6, 20, 6, 2)
  ctx.fill()

  // Right side vertical of bowl
  roundRect(ctx, 18, 6, 6, 14, 2)
  ctx.fill()

  // Middle horizontal bar
  roundRect(ctx, 4, 18, 20, 6, 2)
  ctx.fill()

  // Wordmark text
  ctx.fillStyle = '#475569'
  ctx.font = '600 22px system-ui, -apple-system, sans-serif'
  ctx.fillText('Presizion', 46, 28)

  return canvas.toDataURL('image/png')
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
