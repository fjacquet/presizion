import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VirtualizedVmList } from '../VirtualizedVmList'
import type { VmRow } from '@/lib/utils/import'

const rows: VmRow[] = Array.from({ length: 2000 }, (_, i) => ({
  name: `vm-${i}`,
  scopeKey: 's1',
  vcpus: 2,
  ramMib: 4096,
  diskMib: 40960,
}))

describe('VirtualizedVmList', () => {
  it('renders fewer DOM rows than input', () => {
    render(
      <VirtualizedVmList
        rows={rows}
        excludedKeys={new Set()}
        onToggle={() => {}}
        height={400}
        rowHeight={32}
      />
    )
    const rendered = screen.getAllByRole('checkbox')
    expect(rendered.length).toBeLessThan(100) // ~12 visible + overscan
    expect(rendered.length).toBeGreaterThan(0)
  })

  it('marks row as excluded when its composite key is in excludedKeys', () => {
    render(
      <VirtualizedVmList
        rows={rows.slice(0, 10)}
        excludedKeys={new Set(['s1::vm-3'])}
        onToggle={() => {}}
        height={400}
        rowHeight={32}
      />
    )
    const cb = screen.getByRole('checkbox', { name: /vm-3/ }) as HTMLInputElement
    // base-ui primitive uses data-checked attribute / aria-checked instead of native checked
    expect(cb.getAttribute('aria-checked')).toBe('true')
  })

  it('calls onToggle with the composite scopeKey::name when a checkbox is clicked', () => {
    const onToggle = vi.fn()
    render(
      <VirtualizedVmList
        rows={rows.slice(0, 5)}
        excludedKeys={new Set()}
        onToggle={onToggle}
        height={400}
        rowHeight={32}
      />
    )
    const cb = screen.getByRole('checkbox', { name: /vm-2/ })
    fireEvent.click(cb)
    expect(onToggle).toHaveBeenCalledWith('s1::vm-2')
  })

  it('updates the visible window when the container is scrolled', () => {
    const { container } = render(
      <VirtualizedVmList
        rows={rows}
        excludedKeys={new Set()}
        onToggle={() => {}}
        height={400}
        rowHeight={32}
      />
    )
    // Before scrolling, a row near the top is rendered; a far-away row is not.
    expect(screen.queryByText('vm-0')).toBeInTheDocument()
    expect(screen.queryByText('vm-500')).not.toBeInTheDocument()

    const scroller = container.firstChild as HTMLDivElement
    // Scroll to row 500 (500 * 32 = 16000)
    Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 16000 })
    fireEvent.scroll(scroller)

    expect(screen.queryByText('vm-500')).toBeInTheDocument()
    expect(screen.queryByText('vm-0')).not.toBeInTheDocument()
  })
})
