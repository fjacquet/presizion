import { describe, it, expect } from 'vitest'
import { chartRefToDataUrl } from '../chartCapture'

describe('chartRefToDataUrl', () => {
  it('returns null when container is null', async () => {
    const result = await chartRefToDataUrl(null)
    expect(result).toBeNull()
  })

  it('returns null when container has no SVG child', async () => {
    const div = document.createElement('div')
    div.innerHTML = '<p>No chart here</p>'
    const result = await chartRefToDataUrl(div)
    expect(result).toBeNull()
  })

  // Note: Full SVG -> canvas -> data URL rendering cannot be tested in jsdom
  // because jsdom does not implement XMLSerializer, Image loading, or canvas
  // drawing. This path is exercised via the browser export flow (PDF/PPTX).
})
