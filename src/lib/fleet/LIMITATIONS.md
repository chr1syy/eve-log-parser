---
type: reference
title: Fleet Feature Limitations
created: 2026-02-24
tags:
  - fleet
  - limitations
  - documentation
related:
  - "[[Fleet-Feature-Module-Overview]]"
---

# Fleet Feature Limitations

## Current MVP Constraints

- No real-time session updates; the page requires manual refresh to see new uploads.
- Session data is stored in-memory only; no database persistence in the MVP.
- No deduplication of identical events from different log perspectives.
- One pilot equals one log upload; multiple logs per pilot are not supported.

## Future Improvements

- Add WebSocket support for real-time multi-user session updates.
- Add database persistence with session archival and retrieval.
- Add advanced filtering (time ranges, specific pilots, enemy corps).
- Add side-by-side pilot log comparison views.
- Add session timeout policies and cleanup routines.
