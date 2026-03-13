import { describe, it } from 'vitest';

describe('useScenariosResults — sizingMode integration (PERF-04, PERF-05)', () => {
  it.todo('returns SPECint-limited result when sizingMode is specint and specint constraint drives count');
  it.todo('returns cpu-limited result unchanged when sizingMode is vcpu (regression)');
  it.todo('limitingResource is specint when specint mode and specint count is highest');
});
