/**
 * Unit tests for FileDropzone — drag-and-drop + native click-to-browse import.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ImportError } from '@/lib/utils/import';
import { FileDropzone } from '../FileDropzone';

// Mock the import pipeline so we control success/failure without real parsing.
const importFileMock = vi.fn();
vi.mock('@/lib/utils/import', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/import')>('@/lib/utils/import');
  return {
    ...actual,
    importFile: (file: File) => importFileMock(file),
  };
});

// Stores used by the child ImportPreviewModal.
vi.mock('@/store/useClusterStore', () => ({ useClusterStore: vi.fn(() => ({})) }));
vi.mock('@/store/useScenariosStore', () => ({ useScenariosStore: vi.fn(() => ({})) }));
vi.mock('@/store/useImportStore', () => ({
  useImportStore: vi.fn(() => ({
    scopeOptions: [],
    activeScope: [],
    scopeLabels: {},
    rawByScope: null,
    setActiveScope: vi.fn(),
    setImportResult: vi.fn(),
  })),
}));

const fakeResult = {
  totalVcpus: 100,
  totalVms: 10,
  totalDiskGb: 0,
  avgRamPerVmGb: 8,
  sourceFormat: 'liveoptics-csv' as const,
  vmCount: 10,
  warnings: [],
};

function makeFile(name = 'export.csv') {
  return new File(['data'], name, { type: 'text/csv' });
}

afterEach(() => {
  importFileMock.mockReset();
});

describe('FileDropzone', () => {
  it('renders a file input accepting the supported extensions, visually hidden', () => {
    render(<FileDropzone />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('accept', '.xlsx,.csv,.zip,.json');
    expect(input).toHaveClass('sr-only');
  });

  it('shows the drag-and-drop instruction and hint', () => {
    render(<FileDropzone />);
    expect(screen.getByText(/drag/i)).toBeInTheDocument();
    expect(screen.getByText(/browse/i)).toBeInTheDocument();
  });

  it('imports a file chosen via the input (success path, no error)', async () => {
    importFileMock.mockResolvedValue(fakeResult);
    render(<FileDropzone />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    await waitFor(() => expect(importFileMock).toHaveBeenCalledTimes(1));
    expect(importFileMock.mock.calls[0]?.[0]).toBeInstanceOf(File);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('imports a dropped file (no file dialog) via the drop handler', async () => {
    importFileMock.mockResolvedValue(fakeResult);
    const { container } = render(<FileDropzone />);
    const zone = container.querySelector('label') as HTMLLabelElement;
    fireEvent.drop(zone, { dataTransfer: { files: [makeFile('rvtools.xlsx')] } });
    await waitFor(() => expect(importFileMock).toHaveBeenCalledTimes(1));
    expect(importFileMock.mock.calls[0]?.[0]).toBeInstanceOf(File);
  });

  it('surfaces an ImportError message in an alert', async () => {
    importFileMock.mockRejectedValue(new ImportError('Unrecognised CSV format.'));
    render(<FileDropzone />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile()] } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unrecognised CSV format.');
  });
});
