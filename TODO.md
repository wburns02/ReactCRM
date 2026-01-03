# ReactCRM Autonomous Task Queue

This file drives overnight autonomous loops. Tasks are processed sequentially.

## Format
- `[ ]` Pending task
- `[~]` In-progress task
- `[x]` Completed task
- `PRIORITY:HIGH` - Urgent (processed first)
- `BLOCKED: reason` - Skipped until unblocked

---

## Current Sprint Tasks

### Testing & Quality
- [ ] PRIORITY:HIGH - Run Playwright E2E tests and fix any failures
- [ ] Review and fix TypeScript errors from `npm run build`
- [ ] Ensure all components have proper accessibility attributes (aria-labels)

### Performance
- [ ] Audit bundle size and identify optimization opportunities
- [ ] Review React component re-renders with React DevTools profiler
- [ ] Optimize image loading with lazy loading where appropriate

### Features
- [ ] Review drag-and-drop scheduling for edge cases
- [ ] Verify GPS fleet tracking displays correctly on mobile
- [ ] Test offline PWA functionality with service workers

### Code Quality
- [ ] Remove unused imports and dead code
- [ ] Add missing error boundaries to key components
- [ ] Review and update outdated dependencies

---

## Completed Tasks

<!-- Move completed tasks here -->

---

## Notes

- Always run `npm run build` before committing to catch TypeScript errors
- Run Playwright tests with `npx playwright test`
- Check existing claude.md for project-specific rules

---

*Processed by: autonomous-claude*
