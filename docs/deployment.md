# Build & Deployment

## Build Configuration

Presizion is built with **Vite 8.x** and **React 19.x** with TypeScript.

### Vite Config (`vite.config.ts`)

```ts
export default defineConfig({
  base: '/presizion/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
```

Key settings:

- **`base: '/presizion/'`** -- all asset paths are prefixed with `/presizion/`. This is required for GitHub Pages deployment under a subpath (e.g., `https://<user>.github.io/presizion/`).
- **Path alias**: `@` resolves to `./src`, matching the `tsconfig.json` paths configuration.
- **CSS**: Tailwind CSS v4 via PostCSS plugin.

### TypeScript Config (`tsconfig.json`)

Uses project references with two sub-configs:

- `tsconfig.app.json` -- application source
- `tsconfig.node.json` -- Vite config and build scripts

Path alias `@/*` maps to `./src/*`.

## Build Commands

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check with `tsc -b`, then bundle with `vite build` |
| `npm run preview` | Serve the production build locally for verification |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest test suite |

### Build Output

Running `npm run build` produces static files in the `dist/` directory. The build pipeline:

1. `tsc -b` -- TypeScript type checking (project references mode)
2. `vite build` -- bundle, minify, and output to `dist/`

The output is a fully static site with no server-side requirements. All calculations run in the browser.

## GitHub Pages Deployment

### CI/CD Pipeline

Deployment is automated via GitHub Actions. The workflow file is `.github/workflows/deploy.yml`.

**Trigger**: Push to `main` branch or manual `workflow_dispatch`.

**Pipeline stages**:

1. **Build job** (`ubuntu-latest`):
   - Checkout repository
   - Setup Node.js 22 with npm cache
   - `npm ci` -- install dependencies
   - `npm run build` -- type-check and bundle
   - Configure GitHub Pages
   - Upload `dist/` as a Pages artifact

2. **Deploy job** (depends on build):
   - Deploy the artifact to GitHub Pages

**Concurrency**: The `pages` group with `cancel-in-progress: false` ensures only one deployment runs at a time without canceling in-progress deploys.

**Permissions**:

- `contents: read` -- checkout access
- `pages: write` -- deploy to Pages
- `id-token: write` -- OIDC token for Pages authentication

### GitHub Pages Setup

To enable deployment:

1. In the repository settings, go to **Pages**.
2. Set **Source** to **GitHub Actions**.
3. The workflow handles the rest on push to `main`.

The site will be available at `https://<username>.github.io/presizion/`.

## Static Hosting Alternatives

Since the build output is a plain static site (`dist/` directory), it can be hosted on any static file server.

### Nginx

```nginx
server {
    listen 80;
    root /var/www/presizion;
    location /presizion/ {
        try_files $uri $uri/ /presizion/index.html;
    }
}
```

The `try_files` fallback to `index.html` is needed because the app uses client-side routing (hash-based).

### Apache

```apache
<Directory "/var/www/presizion">
    FallbackResource /presizion/index.html
</Directory>
```

### Different Base Path

If hosting at a different subpath (or at the root), update `base` in `vite.config.ts`:

```ts
// Root path
base: '/'

// Custom subpath
base: '/my-custom-path/'
```

Then rebuild with `npm run build`.

### Netlify / Vercel / Cloudflare Pages

Copy the `dist/` directory as the publish directory. No server-side configuration is needed beyond a rewrite rule for SPA fallback.

## Environment Requirements

- **Node.js**: 22.x (as specified in the CI workflow)
- **npm**: ships with Node.js 22
- **No runtime environment variables**: the app is fully client-side with no API keys or backend configuration

### Dependencies

Production dependencies (bundled into the client):

| Package | Purpose |
|---|---|
| `react` / `react-dom` | UI framework |
| `zustand` | State management |
| `zod` | Schema validation |
| `react-hook-form` / `@hookform/resolvers` | Form handling |
| `recharts` | Charts in Step 3 |
| `@e965/xlsx` | XLSX parsing for file import |
| `jszip` | ZIP file support for LiveOptics imports |
| `lucide-react` | Icon set |
| `shadcn` / `class-variance-authority` / `clsx` / `tailwind-merge` | UI component styling |

Dev dependencies include Vite, TypeScript, ESLint, Vitest, React Testing Library, Tailwind CSS, and PostCSS.

## CI/CD Pipeline Details

The current pipeline deploys on every push to `main`. There is no separate test step in the CI workflow -- tests are expected to pass locally before merging. To add CI testing, add a step before the build:

```yaml
- name: Run tests
  run: npm run test
```

The workflow does not run on pull requests by default. To add PR checks, extend the `on` trigger:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
```
