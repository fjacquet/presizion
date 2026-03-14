import { describe, it, expect, beforeEach, vi } from 'vitest';

// Set up localStorage mock BEFORE importing the module under test.
const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  }),
  get length() {
    return Object.keys(localStorageStore).length;
  },
  key: vi.fn((index: number) => Object.keys(localStorageStore)[index] ?? null),
};

vi.stubGlobal('localStorage', localStorageMock);

// Import module AFTER globals are set up.
import {
  serializeSession,
  deserializeSession,
  saveToLocalStorage,
  loadFromLocalStorage,
} from '../persistence';
import type { SessionData } from '../persistence';

const STORAGE_KEY = 'presizion-session';

const validSession: SessionData = {
  cluster: {
    totalVcpus: 100,
    totalPcores: 50,
    totalVms: 40,
  },
  scenarios: [
    {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Scenario A',
      socketsPerServer: 2,
      coresPerSocket: 16,
      ramPerServerGb: 512,
      diskPerServerGb: 10000,
      targetVcpuToPCoreRatio: 4,
      ramPerVmGb: 8,
      diskPerVmGb: 50,
      headroomPercent: 20,
      haReserveCount: 1,
      targetCpuUtilizationPercent: 70,
      targetRamUtilizationPercent: 80,
    },
  ],
  sizingMode: 'vcpu',
  layoutMode: 'hci',
};

describe('serializeSession', () => {
  it('returns a JSON string containing all four top-level keys', () => {
    const json = serializeSession(validSession);
    const parsed = JSON.parse(json) as unknown;
    expect(typeof json).toBe('string');
    expect(parsed).toMatchObject({
      cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 40 },
      scenarios: expect.any(Array),
      sizingMode: 'vcpu',
      layoutMode: 'hci',
    });
  });

  it('round-trips scenarios array correctly', () => {
    const json = serializeSession(validSession);
    const parsed = JSON.parse(json) as { scenarios: unknown[] };
    expect(parsed.scenarios).toHaveLength(1);
  });
});

describe('deserializeSession', () => {
  it('returns SessionData for a valid JSON string', () => {
    const json = serializeSession(validSession);
    const result = deserializeSession(json);
    expect(result).not.toBeNull();
    expect(result!.cluster.totalVcpus).toBe(100);
    expect(result!.sizingMode).toBe('vcpu');
    expect(result!.layoutMode).toBe('hci');
  });

  it('returns null for malformed JSON', () => {
    expect(deserializeSession('not valid json {{')).toBeNull();
  });

  it('returns null when required cluster fields are missing', () => {
    const bad = JSON.stringify({
      cluster: { totalVcpus: 100 }, // missing totalPcores, totalVms
      scenarios: [],
      sizingMode: 'vcpu',
      layoutMode: 'hci',
    });
    expect(deserializeSession(bad)).toBeNull();
  });

  it('returns null when required cluster fields have wrong type', () => {
    const bad = JSON.stringify({
      cluster: { totalVcpus: 'not-a-number', totalPcores: 50, totalVms: 40 },
      scenarios: [],
      sizingMode: 'vcpu',
      layoutMode: 'hci',
    });
    expect(deserializeSession(bad)).toBeNull();
  });

  it('returns null when scenarios array is missing', () => {
    const bad = JSON.stringify({
      cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 40 },
      sizingMode: 'vcpu',
      layoutMode: 'hci',
    });
    expect(deserializeSession(bad)).toBeNull();
  });

  it('strips unknown fields from cluster rather than rejecting', () => {
    const withExtra = JSON.stringify({
      cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 40, unknownField: 'foo' },
      scenarios: [],
      sizingMode: 'vcpu',
      layoutMode: 'hci',
    });
    const result = deserializeSession(withExtra);
    expect(result).not.toBeNull();
    expect((result!.cluster as Record<string, unknown>)['unknownField']).toBeUndefined();
  });

  it('defaults sizingMode to "vcpu" when absent', () => {
    const withoutMode = JSON.stringify({
      cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 40 },
      scenarios: [],
      layoutMode: 'hci',
    });
    const result = deserializeSession(withoutMode);
    expect(result).not.toBeNull();
    expect(result!.sizingMode).toBe('vcpu');
  });

  it('defaults layoutMode to "hci" when absent', () => {
    const withoutLayout = JSON.stringify({
      cluster: { totalVcpus: 100, totalPcores: 50, totalVms: 40 },
      scenarios: [],
      sizingMode: 'specint',
    });
    const result = deserializeSession(withoutLayout);
    expect(result).not.toBeNull();
    expect(result!.layoutMode).toBe('hci');
  });
});

describe('saveToLocalStorage', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    vi.clearAllMocks();
  });

  it('calls localStorage.setItem with the correct STORAGE_KEY', () => {
    saveToLocalStorage(validSession);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.any(String),
    );
  });

  it('stores a JSON string that round-trips back to the session data', () => {
    saveToLocalStorage(validSession);
    const stored = localStorageStore[STORAGE_KEY];
    expect(stored).toBeDefined();
    const restored = deserializeSession(stored);
    expect(restored).not.toBeNull();
    expect(restored!.cluster.totalVcpus).toBe(validSession.cluster.totalVcpus);
  });
});

describe('loadFromLocalStorage', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    vi.clearAllMocks();
  });

  it('returns null when localStorage has no entry for the key', () => {
    expect(loadFromLocalStorage()).toBeNull();
  });

  it('returns the saved session when a valid entry exists', () => {
    saveToLocalStorage(validSession);
    vi.clearAllMocks(); // reset call counts, but store remains
    const result = loadFromLocalStorage();
    expect(result).not.toBeNull();
    expect(result!.cluster.totalVcpus).toBe(100);
    expect(result!.sizingMode).toBe('vcpu');
  });

  it('returns null when the stored value is invalid JSON', () => {
    localStorageStore[STORAGE_KEY] = '{ invalid json !!';
    const result = loadFromLocalStorage();
    expect(result).toBeNull();
  });

  it('catches and swallows SecurityError from localStorage.getItem, returns null', () => {
    localStorageMock.getItem.mockImplementationOnce(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    expect(loadFromLocalStorage()).toBeNull();
  });
});
