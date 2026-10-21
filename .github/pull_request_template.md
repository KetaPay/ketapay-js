## Summary

<!-- What changed, in a few bullets. -->

## Why

<!-- The problem this solves. -->

## Test plan

- [ ] Unit tests added or updated, tagged with their catalogue IDs
- [ ] `npm run lint && npm run typecheck && npm test`
- [ ] `npm run build && npm run smoke:pack`

## Checklist

- [ ] PR title is a conventional commit (`feat:`, `fix:`, `chore:` ...). Release notes are built from it
- [ ] New behaviour? The scenario was added to `SDK_BROWSER_TEST_CATALOGUE.md` in the documentation repo first, then `npm run sync-catalogue` here
- [ ] No breaking change to `open`, its options or the events, or the title says `feat!:` and explains it
- [ ] README updated if usage changed
