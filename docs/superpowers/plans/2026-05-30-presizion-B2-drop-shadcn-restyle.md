# Presizion B2 — Drop shadcn, Restyle to Plain Tailwind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the shadcn/ui styling layer with plain Tailwind in vatlas's idiom — Midnight Executive tokens, `.panel`/`.label` classes — while **keeping `@base-ui/react`** for focus-trap/ARIA/keyboard behavior. Auto dark mode stays.

**Architecture:** The 15 primitives in `src/components/ui/` keep their public API (component names, `data-slot`, exports, base-ui imports) so the ~40 consumer files don't change shape — only their internal `className` strings are rewritten via a fixed token-mapping table. After the primitives no longer reference shadcn semantic tokens, a consumer sweep rewrites the remaining raw shadcn utility classes in feature components, and finally the shadcn token block + `@import "shadcn/tailwind.css"` are removed from `index.css`. Accessibility of interactive primitives is locked with new React Testing Library smoke tests (the test anchor for an otherwise visual change).

**Tech Stack:** React 19, Tailwind v4, `@base-ui/react`, `class-variance-authority`, Vitest + React Testing Library.

**Depends on:** B1 (Midnight `@theme` tokens + `.panel`/`.label` must exist).

---

## Spec coverage

Covers the "Web restyle (drop shadcn)" section of the B design spec:
- Replace the 15 `src/components/ui/` primitives with plain-Tailwind equivalents → Tasks 2–4
- "drop shadcn wrappers, keep headless behavior" (locked decision: keep base-ui) → Tasks 3, 5
- One token source via `@theme`; remove the parallel shadcn theming system → Task 6
- `Form*` wrappers reduced to thin label/error markup → Task 4

Out of scope: PPTX/PDF (B3), Recharts→ECharts (C).

---

## The token-mapping table (apply everywhere)

Every shadcn semantic utility is replaced by an explicit light/dark Midnight pair. This table is the single source for Tasks 2–5; apply it mechanically.

| shadcn class | Midnight replacement |
|---|---|
| `bg-background` | `bg-white dark:bg-surface-900` |
| `text-foreground` | `text-slate-900 dark:text-slate-100` |
| `bg-card` | `bg-white dark:bg-surface-800` |
| `text-card-foreground` | `text-slate-900 dark:text-slate-100` |
| `bg-popover` | `bg-white dark:bg-surface-800` |
| `text-popover-foreground` | `text-slate-900 dark:text-slate-100` |
| `bg-muted` | `bg-slate-100 dark:bg-surface-700` |
| `bg-muted/50` | `bg-slate-100/50 dark:bg-surface-700/50` |
| `text-muted-foreground` | `text-slate-500 dark:text-slate-400` |
| `bg-accent` / `bg-secondary` | `bg-slate-100 dark:bg-surface-700` |
| `text-accent-foreground` / `text-secondary-foreground` | `text-slate-900 dark:text-slate-100` |
| `bg-primary` | `bg-primary-600 dark:bg-primary-500` |
| `hover:bg-primary/80` | `hover:bg-primary-700 dark:hover:bg-primary-400` |
| `text-primary` | `text-primary-600 dark:text-primary-300` |
| `text-primary-foreground` | `text-white` |
| `border` / `border-border` | `border border-slate-200 dark:border-surface-700` |
| `border-input` | `border-slate-300 dark:border-surface-700` |
| `ring-ring` / `ring-ring/50` | `ring-primary-500/50` |
| `border-ring` / `focus-visible:border-ring` | `focus-visible:border-primary-500` |
| `outline-ring/50` | `outline-primary-500/50` |
| `bg-destructive` | `bg-util-high` |
| `bg-destructive/10` | `bg-util-high/10` |
| `text-destructive` | `text-util-high` |
| `ring-destructive/20` | `ring-util-high/20` |

When a class already encodes a dark variant (e.g. `dark:bg-input/30`), drop the stale shadcn dark half and use the table's dark token instead.

---

### Task 1: Inventory the exact consumer surface (read-only)

**Files:** none modified.

- [ ] **Step 1: List every file using a shadcn semantic class**

Run:
```bash
grep -rln "bg-background\|text-foreground\|bg-card\|text-card-foreground\|bg-popover\|text-muted-foreground\|bg-muted\|bg-accent\|bg-secondary\|text-secondary-foreground\|bg-primary\b\|text-primary\b\|text-primary-foreground\|border-input\|ring-ring\|border-ring\|outline-ring\|bg-destructive\|text-destructive" src --include="*.tsx" --include="*.ts" | sort
```
Expected: ~40 files. Split into `src/components/ui/**` (Tasks 2–4) and everything else (Task 5 consumer sweep). Record the two lists in the task tracker — these are the worklists for Tasks 4–5.

---

### Task 2: Restyle the keystone static primitives (button, card, input, label)

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/card.tsx`
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/label.tsx`

- [ ] **Step 1: Rewrite `button.tsx` variants to Midnight tokens**

Replace the `buttonVariants` base + `variant` block in `src/components/ui/button.tsx` (keep `cva`, the `Button` function, `data-slot`, and base-ui import unchanged):

```tsx
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-primary-500 focus-visible:ring-3 focus-visible:ring-primary-500/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-util-high aria-invalid:ring-3 aria-invalid:ring-util-high/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400',
        outline:
          'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-surface-700 dark:bg-surface-800 dark:text-slate-100 dark:hover:bg-surface-700',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-surface-700 dark:text-slate-100 dark:hover:bg-surface-600',
        ghost:
          'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-surface-700',
        destructive:
          'bg-util-high/10 text-util-high hover:bg-util-high/20 focus-visible:border-util-high/40 focus-visible:ring-util-high/20',
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-300',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
```

- [ ] **Step 2: Rewrite `card.tsx` to the `.panel` idiom**

In `src/components/ui/card.tsx`, the root `Card` wrapper should use the `.panel` class and the inner pieces should use Midnight text tokens. Set the `Card` root className to:

```tsx
'panel flex flex-col gap-4'
```

and replace any `text-muted-foreground` in `CardDescription` with `text-slate-500 dark:text-slate-400`, and any `bg-card`/`text-card-foreground` per the mapping table. Keep all component names and `data-slot` values.

- [ ] **Step 3: Rewrite `input.tsx`**

Set the `Input` className to the Midnight field style:

```tsx
'flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-slate-100 dark:placeholder:text-slate-500'
```

- [ ] **Step 4: Rewrite `label.tsx` to the `.label` class**

Set the `Label` className to reuse the shared component class plus interaction states:

```tsx
'label peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
```

(`.label` from B1 already supplies `block text-sm font-medium text-slate-700` + dark variant.)

- [ ] **Step 5: Verify build + render**

Run: `npm run build`
Expected: success — no unresolved utilities.

Run: `npm run test -- step1`
Expected: existing Step 1 component tests (which render `Button`/`Input`/`Label`) stay green.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx src/components/ui/card.tsx src/components/ui/input.tsx src/components/ui/label.tsx
git commit -m "refactor(ui): restyle button/card/input/label to Midnight tokens"
```

---

### Task 3: Restyle the remaining static primitives (badge, separator, textarea, table)

**Files:**
- Modify: `src/components/ui/badge.tsx`, `src/components/ui/separator.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/table.tsx`

- [ ] **Step 1: Apply the mapping to each file**

For each of the four files, apply the token-mapping table to every `className`. Concretely:

- `badge.tsx` — default variant → `bg-primary-600 text-white dark:bg-primary-500`; secondary → `bg-slate-100 text-slate-900 dark:bg-surface-700 dark:text-slate-100`; outline → `border border-slate-300 text-slate-900 dark:border-surface-700 dark:text-slate-100`; destructive → `bg-util-high/10 text-util-high`.
- `separator.tsx` — `bg-border` → `bg-slate-200 dark:bg-surface-700`.
- `textarea.tsx` — same field style string as `input.tsx` Task 2 Step 3 (minus the fixed height; keep `min-h-16`).
- `table.tsx` — header `text-muted-foreground` → `text-slate-500 dark:text-slate-400`; row hover `hover:bg-muted/50` → `hover:bg-slate-100/50 dark:hover:bg-surface-700/50`; border classes → `border-slate-200 dark:border-surface-700`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/badge.tsx src/components/ui/separator.tsx src/components/ui/textarea.tsx src/components/ui/table.tsx
git commit -m "refactor(ui): restyle badge/separator/textarea/table to Midnight tokens"
```

---

### Task 4: Restyle the interactive primitives (keep base-ui behavior)

These keep every `@base-ui/react` import, `data-slot`, Portal/Backdrop/Popup structure, and animation `data-*` classes. **Only color/border/background classes change**, per the mapping table. Behavior (focus-trap, escape, ARIA) is unchanged because base-ui is retained.

**Files:**
- Modify: `src/components/ui/dialog.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/tabs.tsx`, `src/components/ui/checkbox.tsx`, `src/components/ui/switch.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/form.tsx`

- [ ] **Step 1: `dialog.tsx` — restyle Popup + footer**

In `DialogContent`, the Popup className `bg-background … ring-1 ring-foreground/10` becomes:

```tsx
'fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-white p-4 text-sm text-slate-900 ring-1 ring-slate-900/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:bg-surface-800 dark:text-slate-100 dark:ring-white/10'
```

In `DialogFooter`, `border-t bg-muted/50` → `border-t border-slate-200 bg-slate-100/50 dark:border-surface-700 dark:bg-surface-700/50`. In `DialogDescription`, `text-muted-foreground` → `text-slate-500 dark:text-slate-400`. The `DialogOverlay` `bg-black/10` is theme-agnostic — leave it.

- [ ] **Step 2: `tooltip.tsx`, `tabs.tsx`, `checkbox.tsx`, `switch.tsx`, `drawer.tsx` — apply the mapping**

For each, replace shadcn semantic classes per the table. Key spots:
- `tooltip.tsx` — popup `bg-primary text-primary-foreground` → `bg-surface-800 text-slate-100 dark:bg-surface-700` (dark tooltip on both themes reads best); arrow fill matches.
- `tabs.tsx` — list `bg-muted` → `bg-slate-100 dark:bg-surface-700`; active trigger `bg-background text-foreground` → `bg-white text-slate-900 dark:bg-surface-900 dark:text-slate-100`; inactive `text-muted-foreground` → `text-slate-500 dark:text-slate-400`.
- `checkbox.tsx` — checked `bg-primary text-primary-foreground` → `bg-primary-600 text-white dark:bg-primary-500`; border `border-input` → `border-slate-300 dark:border-surface-700`; focus ring → `ring-primary-500/50`.
- `switch.tsx` — checked track `bg-primary` → `bg-primary-600 dark:bg-primary-500`; unchecked `bg-input` → `bg-slate-300 dark:bg-surface-700`; thumb `bg-background` → `bg-white`.
- `drawer.tsx` — content `bg-background` → `bg-white dark:bg-surface-900`; handle/`border` → `border-slate-200 dark:border-surface-700`; `text-muted-foreground` → `text-slate-500 dark:text-slate-400`.

- [ ] **Step 3: `form.tsx` — reduce to thin label/error markup**

`form.tsx` is react-hook-form glue. Keep the `FormField`/`useFormField`/context wiring, but the `FormLabel` should render the `.label` class (error state adds `text-util-high`), and `FormMessage`/error text uses `text-util-high text-sm`. Replace `text-destructive`/`text-muted-foreground` with `text-util-high` / `text-slate-500 dark:text-slate-400`.

- [ ] **Step 4: Verify build + existing tests**

Run: `npm run build && npm run test`
Expected: green. Component tests that render dialogs/tabs/checkboxes (step2/step3) still pass — behavior is unchanged, only classes differ.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/tooltip.tsx src/components/ui/tabs.tsx src/components/ui/checkbox.tsx src/components/ui/switch.tsx src/components/ui/drawer.tsx src/components/ui/form.tsx
git commit -m "refactor(ui): restyle interactive primitives to Midnight tokens (base-ui kept)"
```

---

### Task 5: Sweep the feature-component consumers

Apply the same mapping table to the non-`ui/` files from Task 1 (Step1/Step2/Step3/wizard components and any lib that emits classnames). Do it directory-by-directory to keep commits reviewable.

**Files:** every non-`ui/` file listed in Task 1 Step 1.

- [ ] **Step 1: Sweep `src/components/step1/**` and `src/components/step2/**`**

Apply the mapping table to each file's `className` strings. Re-run the Task 1 grep scoped to these dirs to confirm zero shadcn semantic classes remain:
```bash
grep -rln "text-muted-foreground\|bg-muted\|bg-background\|text-foreground\|bg-primary\b\|text-primary-foreground\|border-input\|bg-destructive\|text-destructive" src/components/step1 src/components/step2 --include="*.tsx"
```
Expected: no output.

- [ ] **Step 2: Verify + commit step1/step2**

Run: `npm run build && npm run test -- step1 step2`
Expected: green.
```bash
git add src/components/step1 src/components/step2
git commit -m "refactor(ui): sweep step1/step2 consumers to Midnight tokens"
```

- [ ] **Step 3: Sweep `src/components/step3/**` and `src/components/wizard/**` (+ any remaining)**

Same procedure. Then run the full Task 1 grep across all of `src` excluding `src/components/ui`:
```bash
grep -rln "text-muted-foreground\|bg-muted\|bg-background\|text-foreground\|bg-primary\b\|text-primary-foreground\|border-input\|bg-destructive\|text-destructive" src --include="*.tsx" --include="*.ts" | grep -v "src/components/ui/"
```
Expected: no output (all consumers migrated).

- [ ] **Step 4: Verify + commit**

Run: `npm run build && npm run test`
Expected: green.
```bash
git add src/components/step3 src/components/wizard
git commit -m "refactor(ui): sweep step3/wizard consumers to Midnight tokens"
```

---

### Task 6: Remove the shadcn token system from `index.css`

Now nothing references the shadcn semantic tokens, remove the parallel theming system so `@theme` is the single source.

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Confirm no remaining references to shadcn tokens**

Run:
```bash
grep -rln "bg-background\|text-foreground\|bg-card\|text-muted-foreground\|bg-muted\|bg-primary\b\|text-primary-foreground\|border-input\|ring-ring\|bg-destructive\|text-destructive\|bg-sidebar\|text-sidebar" src --include="*.tsx" --include="*.ts"
```
Expected: no output. If any remain, fix them before proceeding (do not delete the tokens out from under a live consumer).

- [ ] **Step 2: Remove the shadcn import and token blocks**

In `src/index.css`:
- Delete the `@import "shadcn/tailwind.css";` line (line 3).
- Delete the shadcn semantic token declarations in `:root` (the `--background` … `--sidebar-ring` block, currently lines 38–96) and the entire `.dark { … }` shadcn block (currently lines 192–224).
- Delete the `@theme inline { … }` block that maps `--color-*` to those tokens (currently lines 226–266) **except** keep the `--font-sans` and the `--radius-*` lines (the `rounded-[min(var(--radius-md),…)]` button sizes still use them). Move those survivors into the B1 `@theme` block.
- In `@layer base`, replace `@apply bg-background text-foreground;` on `body` with `@apply bg-white text-slate-900 dark:bg-surface-900 dark:text-slate-100;` and replace `@apply border-border outline-ring/50;` on `*` with `@apply border-slate-200 outline-primary-500/50 dark:border-surface-700;`.

- [ ] **Step 3: Verify build is clean and visually correct**

Run: `npm run build`
Expected: success with no "unknown utility" errors (which would mean a missed consumer).

Run: `npm run dev` — spot-check all 3 wizard steps in light and dark. Panels, buttons, inputs, dialogs, tabs render in Midnight Executive; nothing falls back to unstyled/black.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "refactor(theme): remove shadcn token system — @theme is the single source"
```

---

### Task 7: Lock interactive-primitive accessibility with smoke tests

The restyle's risk is silently regressing a11y. These RTL tests assert base-ui's behavior survives. They are the test anchor for B2.

**Files:**
- Test: `src/components/ui/__tests__/dialog.a11y.test.tsx` (create)
- Test: `src/components/ui/__tests__/tooltip.a11y.test.tsx` (create)

- [ ] **Step 1: Write the dialog a11y smoke test**

Create `src/components/ui/__tests__/dialog.a11y.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
        <button type="button">Inside</button>
      </DialogContent>
    </Dialog>
  );
}

it('opens on trigger and exposes a dialog role with an accessible name', async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByText('Open'));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAccessibleName('Title');
});

it('closes on Escape (base-ui keyboard handling retained)', async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByText('Open'));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run it (red→green confirms behavior, not just styling)**

Run: `npm run test -- dialog.a11y`
Expected: PASS. If Escape/role fails, base-ui wiring was broken during restyle — fix `dialog.tsx` before continuing.

- [ ] **Step 3: Write the tooltip a11y smoke test**

Create `src/components/ui/__tests__/tooltip.a11y.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

it('shows tooltip content on focus (keyboard accessible)', async () => {
  const user = userEvent.setup();
  render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent>Explanatory text</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
  await user.tab();
  expect(await screen.findByText('Explanatory text')).toBeInTheDocument();
});
```

(Adjust the imported names to match `tooltip.tsx`'s actual exports if they differ.)

- [ ] **Step 4: Run + full suite**

Run: `npm run test -- tooltip.a11y` then `npm run test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/__tests__/dialog.a11y.test.tsx src/components/ui/__tests__/tooltip.a11y.test.tsx
git commit -m "test(ui): a11y smoke tests for dialog + tooltip (base-ui retained)"
```

---

### Task 8: Final verification

- [ ] **Step 1: Lint + build + test green**

Run:
```bash
npx biome check .
npm run build
npm run test
```
Expected: Biome no new errors; build succeeds; full suite green.

- [ ] **Step 2: Visual acceptance (manual)**

`npm run dev` — verify on all 3 wizard steps, light + dark, auto-mode following OS:
- panels use `.panel`, labels use `.label`
- primary buttons are brand navy (`primary-600`), not near-black
- dialog/tabs/checkbox/switch/drawer/tooltip render and behave (open/close/keyboard)
- no element falls back to unstyled defaults

---

## Self-review

- **Spec coverage:** 15 primitives restyled (T2–T4); base-ui kept per locked decision (T4); Form reduced to thin markup (T4 S3); consumers swept (T5); shadcn token system removed → single `@theme` source (T6); a11y preserved + asserted (T7). All "Web restyle" spec bullets covered.
- **Placeholder scan:** the mapping table provides concrete target classes; keystone primitives have full code; remaining primitives/consumers have explicit per-element class targets — no "handle styling appropriately" placeholders.
- **Type consistency:** no type/signature changes — primitives keep names, `data-slot`, exports, and base-ui imports, so consumers compile unchanged. Only `className` strings and `index.css` change.
- **Ordering safety:** tokens removed (T6) only **after** every consumer is migrated (T1 grep gate in T6 S1), so no live consumer loses its tokens mid-flight.
