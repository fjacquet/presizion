/**
 * Step3ReviewExport — Integration tests
 * Requirements: EXPO-01, EXPO-02
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Step3ReviewExport } from '../Step3ReviewExport'
import { useClusterStore } from '@/store/useClusterStore'
import { useScenariosStore } from '@/store/useScenariosStore'

beforeEach(() => {
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
        haReserveEnabled: false,
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
})
