import { expect, it, vi } from 'vitest';
import { downloadChartSvg, type EChartsLike, instanceToPng } from '../chartImage';

const svg =
  'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22100%22%20height%3D%2250%22%3E%3C%2Fsvg%3E';

const fakeInstance = (): EChartsLike => ({
  getDataURL: vi.fn(() => svg),
  getWidth: () => 100,
  getHeight: () => 50,
});

it('downloadChartSvg requests an svg data URL and triggers a download', () => {
  const inst = fakeInstance();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  downloadChartSvg(inst, 'chart.svg');
  expect(inst.getDataURL).toHaveBeenCalledWith({ type: 'svg' });
  expect(click).toHaveBeenCalled();
  click.mockRestore();
});

it('instanceToPng returns logical width/height from the instance', async () => {
  // jsdom can't rasterize an SVG data URL — stub Image to fire onerror so
  // instanceToPng resolves null instead of hanging. Assert it resolves (no throw).
  class StubImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onerror?.());
    }
  }
  const original = globalThis.Image;
  vi.stubGlobal('Image', StubImage);
  try {
    await expect(instanceToPng(fakeInstance())).resolves.toBeNull();
  } finally {
    vi.stubGlobal('Image', original);
  }
});
