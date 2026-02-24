---
type: reference
title: Fleet Feature Deployment Guide
created: 2026-02-24
tags:
  - fleet
  - deployment
  - documentation
related:
  - "[[Fleet-Feature-Module-Overview]]"
  - "[[Fleet-Feature-Limitations]]"
---

# Fleet Feature Deployment Guide

## NPM Dependencies

- No fleet-specific packages are required for the MVP. The feature relies on existing application dependencies.

## Environment Variables

- No fleet-specific environment variables are required in the MVP.
- Future persistence or auth work may introduce variables for database connections and user identity.

## Database Migrations

- None for the MVP. Fleet sessions are stored in-memory via `src/lib/fleet/sessionStore.ts`.
- If adding persistence, plan migrations for session storage, participant data, and uploaded log metadata.

## Backwards Compatibility

- Preserve the existing fleet API route paths and response shapes to avoid breaking clients.
- Maintain the session code format (`FLEET-XXXXXX`) when migrating storage layers.
- Expect in-memory sessions to reset on deploy until persistence is added.

## Rollback Procedure

1. Redeploy the previous build artifact or git revision.
2. Restart the application server.
3. Confirm API health and fleet session creation.
4. No database rollback is required for MVP; in-memory sessions will be reset on restart.
