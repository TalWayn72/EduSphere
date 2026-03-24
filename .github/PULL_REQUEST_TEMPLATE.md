## Summary

<!-- What changed and why? Link related issues. -->

## Type of Change

- [ ] Feature (new functionality)
- [ ] Bug fix (non-breaking fix for an issue)
- [ ] Refactor (code improvement, no behavior change)
- [ ] Documentation
- [ ] Test (adding or updating tests)
- [ ] CI/CD (workflow or pipeline changes)

## Testing

<!-- What tests were added or modified? -->

## Checklist

- [ ] `pnpm turbo test` — all tests pass
- [ ] `pnpm turbo typecheck` — zero TypeScript errors
- [ ] `pnpm turbo lint` — zero lint warnings/errors
- [ ] `pnpm test:security` — security invariant tests pass
- [ ] No `console.log` in production code (use Pino logger)
- [ ] Documentation updated (if applicable)
- [ ] RLS policies validated (if database changes)
- [ ] E2E Playwright test added (if UI changes)
- [ ] Federation composition succeeds (if GraphQL schema changes)
