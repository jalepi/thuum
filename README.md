# thuum

## Monorepo setup

Initialize package

```
pnpm init
```

Create `pnpm-workspace.yaml` file, containing:

```yaml
packages:
  - packages/*
```

### ESLint+Prettier

Install packages into workspace:

```
pnpm install -w -D @eslint/js eslint eslint-config-prettier eslint-plugin-prettier globals prettier typescript-eslint
```

Create `eslint.config.mjs` and `prettier.config.mjs` files  
Add scripts in `package.json`:

```json
"scripts": {
  "lint": "eslint . --cache --report-unused-disable-directives --max-warnings 0",
  "format": "prettier --check --cache '**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx,json}'",
  "format:fix": "prettier --write '**/*.{cjs,mjs,js,jsx,cts,mts,ts,tsx,json}'"
}
```

Catalog `lint` packages

```
pnpx codemod pnpm/catalog
```

### Typescript

Install `typescript` and `tslib`

```
pnpm install -w -D typescript tslib
```

Create `tsconfig.base.json`

### Vitest

Install packages into workspace

```
pnpm install -w -D vitest @vitest/coverage-v8 happy-dom
```

Add `vitest.workspace.mjs` and `vitest.config.mjs` files to workspace

Add scripts in `package.json`

```json
"scripts": {
  "test": "vitest",
  "test:ci": "vitest run --mode=ci"
}
```
