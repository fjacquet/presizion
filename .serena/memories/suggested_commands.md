# Suggested Commands

## Development
```bash
npm run dev          # Start Vite dev server (hot reload)
npm run build        # Production build: tsc -b && vite build
npm run test         # Run Vitest tests
npm run lint         # ESLint check
```

## Testing
```bash
npx vitest run                    # Run all 596 tests
npx vitest run src/lib/sizing/    # Run sizing formula tests only
npx vitest run --reporter=verbose # Verbose output
npx tsc -b                        # TypeScript check (CI-matching, stricter than tsc --noEmit)
```

## Important: Always use `npx tsc -b` (not `tsc --noEmit`)
`tsc -b` uses project references mode and catches errors that `--noEmit` misses. CI runs `tsc -b`.

## RTK (Token-Optimized CLI)
Always prefix commands with `rtk` for token savings:
```bash
rtk git status       # Compact git status
rtk git log          # Compact git log
rtk git diff         # Compact diff
rtk vitest run       # Failures-only test output
rtk gh run list      # Compact CI run list
```

## Git
```bash
rtk git push origin main              # Push to main
rtk git push origin refs/tags/vX.Y    # Push specific tag (avoid ambiguous refs)
```

## Deployment
- Auto-deploys to GitHub Pages on push to `main` via `.github/workflows/deploy.yml`
- Build: `tsc -b && vite build` -> `dist/` directory
- Base path: `/presizion/`
