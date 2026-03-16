/**
 * Step3ReviewExport — Integration tests
 * Requirements: EXPO-01, EXPO-02, REVIEW-03, REVIEW-04, REVIEW-05
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Step3ReviewExport } from '../Step3ReviewExport'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'

// Mock exportPdf and exportPptx for iOS tests
vi.mock('@/lib/utils/exportPdf', () => ({
  exportPdf: vi.fn().mockResolvedValue({ openedInNewTab: false }),
}))
vi.mock('@/lib/utils/exportPptx', () => ({
  exportPptx: vi.fn().mockResolvedValue(undefined),
}))

// Mock sonner toast for iOS PPTX guard test
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  Object.assign(navigator, {
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn().mockReturnValue('blob:mock'),
    revokeObjectURL: vi.fn(),
  })

  useClusterStore.setState({
    currentCluster: { totalVcpus: 2000, totalPcores: 500, totalVms: 300 },
  })
  useScenariosStore.setState({
    scenarios: [
      {
        id: 'a',
        name: 'Test Scenario',
        socketsPerServer: 2,
        coresPerSocket: 24,
        ramPerServerGb: 512,
        diskPerServerGb: 20000,
        targetVcpuToPCoreRatio: 4,
        ramPerVmGb: 16,
        diskPerVmGb: 100,
        headroomPercent: 20,
        haReserveCount: 0 as const,
      },
    ],
  })
})

describe('Step3ReviewExport', () => {
  describe('EXPO-01: copy plain-text summary to clipboard', () => {
    it('renders a "Copy Summary" button', () => {
      render(<Step3ReviewExport />)
      expect(screen.getByRole('button', { name: /copy summary/i })).toBeTruthy()
    })

    it('calls navigator.clipboard.writeText with non-empty string when Copy Summary clicked', async () => {
      render(<Step3ReviewExport />)
      const btn = screen.getByRole('button', { name: /copy summary/i })
      fireEvent.click(btn)
      // Allow the async handler to run
      await vi.waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringMatching(/.+/)
        )
      })
    })

    it('clipboard text includes current cluster data', async () => {
      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /copy summary/i }))
      await vi.waitFor(() => {
        const callArg = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
        expect(callArg).toContain('2000')
      })
    })

    it('clipboard text includes scenario names and results', async () => {
      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /copy summary/i }))
      await vi.waitFor(() => {
        const callArg = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as string
        expect(callArg).toContain('Test Scenario')
      })
    })
  })

  describe('UX-06: clipboard visual feedback', () => {
    it('button label changes to "Copied!" immediately after successful copy', async () => {
      render(<Step3ReviewExport />)
      const btn = screen.getByRole('button', { name: /copy summary/i })
      fireEvent.click(btn)
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /copied!/i })).toBeTruthy()
      })
    })

    it('button label reverts to "Copy Summary" after timeout', async () => {
      vi.useFakeTimers()
      render(<Step3ReviewExport />)
      const btn = screen.getByRole('button', { name: /copy summary/i })
      fireEvent.click(btn)
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /copied!/i })).toBeTruthy()
      })
      vi.advanceTimersByTime(2000)
      await vi.waitFor(() => {
        expect(screen.getByRole('button', { name: /copy summary/i })).toBeTruthy()
      })
      vi.useRealTimers()
    })
  })

  describe('EXPO-02: download CSV file', () => {
    it('renders a "Download CSV" button', () => {
      render(<Step3ReviewExport />)
      expect(screen.getByRole('button', { name: /download csv/i })).toBeTruthy()
    })

    it('calls URL.createObjectURL with a Blob when Download CSV clicked', () => {
      // Mock anchor so jsdom can handle it
      const link = document.createElement('a')
      vi.spyOn(link, 'click').mockImplementation(() => {})
      vi.spyOn(document, 'createElement').mockReturnValueOnce(link)

      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /download csv/i }))

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    })

    it('triggers anchor download on Download CSV click', () => {
      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /download csv/i }))

      // URL.revokeObjectURL is called AFTER anchor.click() in downloadCsv —
      // its presence confirms the full download flow executed (create → click → revoke)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })
  })

  describe('REVIEW-03: mobile Drawer vs desktop button row', () => {
    it('renders flat button row on desktop (matchMedia matches: false)', () => {
      // matchMedia defaults to matches: false (desktop) in beforeEach
      render(<Step3ReviewExport />)
      expect(screen.getByRole('button', { name: /copy summary/i })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /export \/ share/i })).toBeNull()
    })

    it('renders "Export / Share" Drawer trigger on mobile (matchMedia matches: true)', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })
      render(<Step3ReviewExport />)
      expect(screen.getByRole('button', { name: /export \/ share/i })).toBeTruthy()
      expect(screen.queryByRole('button', { name: /^copy summary$/i })).toBeNull()
    })
  })

  describe('REVIEW-04: iOS Safari PDF/PPTX guards', () => {
    it('pre-opens window.open on iOS before calling exportPdf', async () => {
      const { exportPdf } = await import('@/lib/utils/exportPdf')
      vi.mocked(exportPdf).mockResolvedValue({ openedInNewTab: true })

      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      })

      const mockWin = { location: { href: '' } } as unknown as Window
      const windowOpenSpy = vi.spyOn(window, 'open').mockReturnValue(mockWin)

      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /export pdf/i }))

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledWith('about:blank', '_blank')
      })

      // Reset userAgent
      Object.defineProperty(navigator, 'userAgent', { writable: true, value: '' })
      windowOpenSpy.mockRestore()
    })

    it('shows toast instead of calling exportPptx on iOS', async () => {
      const { exportPptx } = await import('@/lib/utils/exportPptx')
      const { toast } = await import('sonner')

      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      })

      render(<Step3ReviewExport />)
      fireEvent.click(screen.getByRole('button', { name: /export pptx/i }))

      await waitFor(() => {
        expect(toast.info).toHaveBeenCalledWith(
          expect.stringMatching(/not supported in safari/i)
        )
      })

      expect(exportPptx).not.toHaveBeenCalled()

      // Reset userAgent
      Object.defineProperty(navigator, 'userAgent', { writable: true, value: '' })
    })
  })
})
