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

## Current State

- Sessions are persisted to disk via `.fleet-sessions.json` and survive server restarts.
- Real-time session updates are available via SSE endpoints; manual refresh is not required.
- Identical events from multiple log perspectives are deduplicated in `mergeFleetLogs`.
- One log upload per pilot per session. Multiple logs for the same pilot are not supported.
- `shipType` provided at join time is used as a placeholder until the pilot's log is uploaded; the uploaded log's parsed ship type takes precedence.
- `analysisReady` requires at least two uploaded logs with overlapping timestamps (within 5-minute tolerance). A single upload will not trigger analysis.

## Known Limitations

- No user authentication; session creator and pilot identity are not verified.
- No session timeout or automatic cleanup; stale sessions accumulate in `.fleet-sessions.json`.
- Pod destruction / kill detection is not implemented; all participants are assumed to have survived.
- Multiple logs per pilot are not supported; only the most recent upload is retained.

## Future Improvements

- Add database persistence with session archival and retrieval.
- Add advanced filtering (time ranges, specific pilots, enemy corps).
- Add side-by-side pilot log comparison views.
- Add session timeout policies and cleanup routines.
- Add kill/pod detection from log event patterns.
