---
type: note
title: Phase 4 Fleet Sharing and Export Roadmap
created: 2026-02-24
tags:
  - fleet
  - roadmap
  - phase-4
  - sharing
  - export
  - documentation
related:
  - "[[PHASE_2_ROADMAP]]"
  - "[[PHASE_3_ROADMAP]]"
---

# Phase 4 Fleet Sharing and Export Roadmap

## Goal

Enable fleet analysis sharing and export workflows so commanders can distribute results and reuse data outside the app.

## Feature Plans

### Public/Private Session Sharing

- Implementation approach:
  - Add a visibility flag to each session (`private` by default) and allow owners to generate a shareable link or code.
  - Use a signed, short-lived token for public links to avoid leaking internal session IDs.
  - Surface share status in the UI and allow revocation (invalidate tokens).
- New API endpoints:
  - `POST /api/fleet-sessions/:sessionId/share` (create share token, return link/code).
  - `DELETE /api/fleet-sessions/:sessionId/share` (revoke token).
  - `GET /api/fleet-sessions/shared/:shareCode` (fetch read-only session data by code).
- Frontend components:
  - `FleetSessionSharePanel.tsx` (toggle visibility, generate link, copy button).
  - `FleetSharedSessionView.tsx` (read-only analysis view with banner).

### Export to PDF

- Implementation approach:
  - Render a dedicated print layout that uses existing summary cards and tables.
  - Use a server-side export route that renders the page with headless Chromium, or use a client-side export for small reports.
  - Include metadata: session code, time range, participants count.
- New API endpoints:
  - `POST /api/fleet-sessions/:sessionId/export/pdf` (returns PDF blob or signed URL).
- Frontend components:
  - `FleetReportLayout.tsx` (print-friendly layout).
  - `FleetExportMenu.tsx` (export actions for PDF/CSV).
- External dependencies:
  - `playwright` or `puppeteer` for server-side PDF generation, or `react-to-print` for client-side.

### Export to CSV

- Implementation approach:
  - Export key tables (participants, damage dealt/taken, enemies) with stable headers.
  - Use backend aggregation to avoid duplicating formatting logic in the UI.
  - Include a `generatedAt` timestamp in file metadata.
- New API endpoints:
  - `POST /api/fleet-sessions/:sessionId/export/csv` (accepts `table` selector, returns CSV).
- Frontend components:
  - `FleetExportMenu.tsx` (CSV download options by table).
- External dependencies:
  - `papaparse` or `fast-csv` for CSV serialization.

### Embed Support

- Implementation approach:
  - Provide a lightweight public embed view with read-only charts, gated by share token.
  - Offer both an iframe URL and a JSON data endpoint for custom embeds.
  - Allow embed size presets and theming options (compact vs full).
- New API endpoints:
  - `GET /api/fleet-sessions/:sessionId/embed` (returns embed metadata and signed URL).
  - `GET /api/fleet-sessions/:sessionId/embed/data` (returns sanitized JSON for charts).
- Frontend components:
  - `FleetEmbedPreview.tsx` (iframe preview with size toggles).
  - `FleetEmbedCodeBlock.tsx` (copyable iframe/JSON snippets).
- External dependencies:
  - None required; optionally `react-use-measure` for responsive sizing.

## Implementation Notes

- Ensure shared sessions enforce read-only permissions and hide private metadata.
- Use the session code format (`FLEET-XXXXXX`) for user-facing share identifiers, but store internal IDs separately.
- Add audit logging for share creation and revocation for future admin tooling.
