# Deferred Items - Phase 22

## Pre-existing test failures

- `src/lib/utils/__tests__/exportPdf.test.ts` -- 6 tests fail with "is not a constructor" error.
  This file is untracked (from Plan 22-02 which is not yet executed). The mock pattern uses
  `vi.fn().mockImplementation()` instead of a class mock. Same issue was fixed in `exportPptx.test.ts`
  using a proper `class MockPptxGenJS` pattern. The PDF test mock should use a similar class-based
  approach when Plan 22-02 is executed.
