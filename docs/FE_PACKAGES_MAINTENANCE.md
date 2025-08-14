# Frontend Package Maintenance (Client)

## Monthly
1. Branch: `maint/client-monthly-updates`
2. `npm ci`
3. `npm run deps:check`
4. `npm run deps:update`
5. `npm run audit:prod`
6. `npm run build` && `npm run preview`
7. PR, review, merge

## Quarterly (major bumps)
1. Branch: `maint/client-major-bumps`
2. `npm run deps:bump`
3. Fix breaking changes (MUI, Vite, etc.)
4. Build & preview
5. PR, review, merge