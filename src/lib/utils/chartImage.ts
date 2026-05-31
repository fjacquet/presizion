/**
 * ECharts image helpers (sub-project C) — replace the retired DOM-capture
 * utilities. `downloadChartSvg` exports the instance's scalable SVG;
 * `instanceToPng` rasterizes that SVG to a 2x PNG for the PPTX deck (pptxgenjs
 * embeds raster reliably; SVG poorly). The `ChartCapture` shape matches what
 * `pptx/slides/scenarioChartSlide.ts` consumes.
 */
export interface ChartCapture {
  readonly dataUrl: string;
  readonly width: number;
  readonly height: number;
}

/** Minimal ECharts surface used here (keeps the util test-friendly). */
export interface EChartsLike {
  getDataURL(opts: { type: 'svg' | 'png'; pixelRatio?: number; backgroundColor?: string }): string;
  getWidth(): number;
  getHeight(): number;
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Download the chart as a scalable .svg file. */
export function downloadChartSvg(instance: EChartsLike, filename: string): void {
  const url = instance.getDataURL({ type: 'svg' });
  triggerDownload(url, filename);
}

/** Rasterize the instance's SVG to a white-background 2x PNG (PPTX embed). */
export function instanceToPng(instance: EChartsLike, scale = 2): Promise<ChartCapture | null> {
  const width = instance.getWidth();
  const height = instance.getHeight();
  const svgUrl = instance.getDataURL({ type: 'svg' });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve({ dataUrl: canvas.toDataURL('image/png'), width, height });
    };
    img.onerror = () => resolve(null);
    img.src = svgUrl;
  });
}
