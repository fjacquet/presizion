/**
 * Downloads a chart rendered inside a container as a 2x-resolution PNG.
 * Finds the first <svg> child, serializes it, draws on a canvas, and triggers download.
 */
export function downloadChartPng(
  ref: React.RefObject<HTMLDivElement | null>,
  filename: string,
): void {
  const svg = ref.current?.querySelector('svg')
  if (!svg) return
  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = svg.clientWidth * 2
    canvas.height = svg.clientHeight * 2
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }
    ctx.scale(2, 2)
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    canvas.toBlob((b) => {
      if (!b) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(b)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    }, 'image/png')
  }
  img.src = url
}
