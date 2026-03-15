/**
 * Downloads a chart rendered inside a container as a 2x-resolution PNG.
 *
 * Strategy: wraps the entire container div (including HTML legends) into
 * an SVG foreignObject, then renders to canvas. This captures both the
 * Recharts SVG and any HTML legend elements below it.
 */
export function downloadChartPng(
  ref: React.RefObject<HTMLDivElement | null>,
  filename: string,
): void {
  const container = ref.current
  if (!container) return

  const width = container.offsetWidth
  const height = container.offsetHeight

  // Clone the container to inline computed styles
  const clone = container.cloneNode(true) as HTMLElement
  inlineComputedStyles(container, clone)

  const svgNs = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNs, 'svg')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('xmlns', svgNs)

  const fo = document.createElementNS(svgNs, 'foreignObject')
  fo.setAttribute('width', '100%')
  fo.setAttribute('height', '100%')
  fo.appendChild(clone)
  svg.appendChild(fo)

  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
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

/** Recursively inline computed styles so foreignObject renders correctly */
function inlineComputedStyles(source: Element, target: Element): void {
  const computed = window.getComputedStyle(source)
  const el = target as HTMLElement
  if (el.style) {
    el.style.cssText = computed.cssText
  }
  for (let i = 0; i < source.children.length; i++) {
    const srcChild = source.children[i]
    const tgtChild = target.children[i]
    if (srcChild && tgtChild) {
      inlineComputedStyles(srcChild, tgtChild)
    }
  }
}
