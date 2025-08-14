# LSEED API — Backend Package Maintenance Runbook

## Monthly
1. Create branch: `maint/monthly-updates`
2. `npm run deps:update`
3. Test locally/staging
4. Merge & deploy

## Quarterly (or when needed)
1. Branch: `maint/major-bumps`
2. `npm run deps:bump`
3. Fix breaking changes, test on staging
4. Deploy with rollback plan

## Safe update workflow
git checkout -b maint/monthly-updates
npm run deps:check
npm run deps:update
npm run audit:prod
# add your test command here:
npm test
npm start   # local smoke test
git add -A && git commit -m "Monthly dependency updates"
git push -u origin maint/monthly-updates
