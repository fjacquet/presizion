/**
 * Shared chart-capture utility: SVG -> Canvas -> data URL.
 *
 * Used by PDF and PPTX export functions to embed chart images in documents.
 * Reuses the same XMLSerializer pipeline as downloadChartPng.ts but returns
 * a data URL instead of triggering a download.
 */

export interface ChartCapture {
  /** PNG data URL (base64-encoded) */
  readonly dataUrl: string
  /** Logical width in CSS pixels (NOT the 2x canvas width) */
  readonly width: number
  /** Logical height in CSS pixels (NOT the 2x canvas height) */
  readonly height: number
}

/**
 * Captures the first SVG element inside `container` as a 2x-resolution PNG data URL.
 *
 * @param container - The HTMLDivElement wrapping a Recharts chart, or null.
 * @returns A promise resolving to the capture result, or null if the container
 *          is null or contains no SVG child.
 */
export function chartRefToDataUrl(
  container: HTMLDivElement | null,
): Promise<ChartCapture | null> {
  if (!container) return Promise.resolve(null)

  const svg = container.querySelector('svg')
  if (!svg) return Promise.resolve(null)

  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  return new Promise<ChartCapture | null>((resolve) => {
    const img = new Image()

    img.onload = () => {
      const width = svg.clientWidth
      const height = svg.clientHeight
      const scale = 2

      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }

      ctx.scale(scale, scale)

      // White background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)

      // Draw SVG chart
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)

      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
      })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    img.src = url
  })
}
