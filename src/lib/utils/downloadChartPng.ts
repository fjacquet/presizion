/**
 * Downloads a chart rendered inside a container as a 2x-resolution PNG.
 *
 * Strategy: captures the SVG chart, then appends a legend and optional
 * data table below it on the canvas.
 */

interface TableRow {
  readonly label: string
  readonly values: readonly string[]
}

interface DownloadOptions {
  /** Column headers for the data table (e.g., ["Required", "Spare", "Excess", "Total"]) */
  tableHeaders?: readonly string[]
  /** Data rows for the table */
  tableRows?: readonly TableRow[]
  /** Legend items: [{ label, color }] */
  legend?: readonly { label: string; color: string }[]
}

export function downloadChartPng(
  ref: React.RefObject<HTMLDivElement | null>,
  filename: string,
  options?: DownloadOptions,
): void {
  const svg = ref.current?.querySelector('svg')
  if (!svg) return

  const xml = new XMLSerializer().serializeToString(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const img = new Image()

  img.onload = () => {
    const chartW = svg.clientWidth
    const chartH = svg.clientHeight
    const scale = 2

    // Calculate extra height for legend + table
    const legendH = options?.legend ? 30 : 0
    const headerH = options?.tableHeaders ? 24 : 0
    const rowH = 20
    const tableH = options?.tableRows ? headerH + options.tableRows.length * rowH + 16 : 0
    const totalH = chartH + legendH + tableH

    const canvas = document.createElement('canvas')
    canvas.width = chartW * scale
    canvas.height = totalH * scale
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      URL.revokeObjectURL(url)
      return
    }

    ctx.scale(scale, scale)

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, chartW, totalH)

    // Draw SVG chart
    ctx.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)

    let yOffset = chartH

    // Draw legend
    if (options?.legend) {
      const legendY = yOffset + 16
      const itemWidth = 100
      const startX = (chartW - options.legend.length * itemWidth) / 2
      ctx.font = '11px system-ui, sans-serif'
      options.legend.forEach((item, i) => {
        const x = startX + i * itemWidth
        ctx.fillStyle = item.color
        ctx.fillRect(x, legendY - 8, 12, 12)
        ctx.fillStyle = '#374151'
        ctx.fillText(item.label, x + 16, legendY + 2)
      })
      yOffset += legendH
    }

    // Draw table
    if (options?.tableHeaders && options?.tableRows) {
      const tableY = yOffset + 8
      const colCount = options.tableHeaders.length + 1 // +1 for label column
      const colW = (chartW - 40) / colCount
      const startX = 20

      // Header row
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.fillStyle = '#6b7280'
      ctx.fillText('', startX, tableY + 14)
      options.tableHeaders.forEach((h, i) => {
        ctx.fillText(h, startX + (i + 1) * colW, tableY + 14)
      })

      // Header underline
      ctx.strokeStyle = '#e5e7eb'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(startX, tableY + headerH - 2)
      ctx.lineTo(chartW - 20, tableY + headerH - 2)
      ctx.stroke()

      // Data rows
      ctx.font = '11px system-ui, sans-serif'
      options.tableRows.forEach((row, ri) => {
        const ry = tableY + headerH + ri * rowH + 14
        ctx.fillStyle = '#374151'
        ctx.fillText(row.label, startX, ry)
        ctx.fillStyle = '#111827'
        row.values.forEach((v, vi) => {
          ctx.fillText(v, startX + (vi + 1) * colW, ry)
        })
      })
    }

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
