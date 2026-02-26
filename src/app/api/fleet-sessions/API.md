---
type: reference
title: Fleet Sessions API
created: 2026-02-24
tags:
  - api
  - fleet
  - documentation
related:
  - "[[Fleet-Feature-Overview]]"
---

# Fleet Sessions API

## Session Code Format

Session codes follow the format `FLEET-XXXXXX`, where `X` is an uppercase letter (A-Z) or digit (0-9). Example: `FLEET-1A2B3C`.

## Error Codes

- `400` — Invalid or missing input (for example, missing `file` or `pilotName`).
- `404` — Session not found.
- `500` — Server error while creating, listing, or parsing session data.

## Endpoints

### POST `/api/fleet-sessions`

Create a new fleet session.

Request (JSON):

```json
{
  "fightName": "Amarr Gate Skirmish",
  "tags": ["lowsec", "armor"]
}
```

Response (200 JSON):

```json
{
  "id": "7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a",
  "code": "FLEET-1A2B3C",
  "createdAt": "2026-02-24T12:00:00.000Z",
  "creator": "anonymous"
}
```

Errors:

- `500` → `{ "error": "Failed to create session" }`

Example:

```bash
curl -X POST "http://localhost:3000/api/fleet-sessions" \
  -H "Content-Type: application/json" \
  -d '{"fightName":"Amarr Gate Skirmish","tags":["lowsec","armor"]}'
```

### GET `/api/fleet-sessions`

List all sessions for the current user (in-memory for MVP).

Request: none.

Response (200 JSON):

```json
[
  {
    "id": "7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a",
    "code": "FLEET-1A2B3C",
    "creator": "anonymous",
    "createdAt": "2026-02-24T12:00:00.000Z",
    "participants": [],
    "logs": [],
    "fightName": "Amarr Gate Skirmish",
    "tags": ["lowsec", "armor"],
    "status": "PENDING",
    "participantCount": 0,
    "logCount": 0
  }
]
```

Errors:

- `500` → `{ "error": "Failed to list sessions" }`

Example:

```bash
curl "http://localhost:3000/api/fleet-sessions"
```

### GET `/api/fleet-sessions/{id}`

Fetch a single session plus participants and logs. The response also includes `analysisReady`, which is true when at least two log time ranges overlap within a 5-minute tolerance.

Request: none.

Response (200 JSON):

```json
{
  "session": {
    "id": "7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a",
    "code": "FLEET-1A2B3C",
    "creator": "anonymous",
    "createdAt": "2026-02-24T12:00:00.000Z",
    "participants": [],
    "logs": [],
    "fightName": "Amarr Gate Skirmish",
    "tags": ["lowsec", "armor"],
    "status": "PENDING"
  },
  "participants": [],
  "logs": [],
  "analysisReady": false
}
```

Errors:

- `404` → `{ "error": "Session not found" }`
- `500` → `{ "error": "Failed to retrieve session" }`

Example:

```bash
curl "http://localhost:3000/api/fleet-sessions/7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a"
```

### POST `/api/fleet-sessions/{id}/join`

Join an existing session by code and register a pilot. The pilot is added to the session's participant list immediately; `shipType` is a hint that can be left blank and overridden once the combat log is uploaded.

Request (JSON):

- `code` (required) — fleet session code, e.g. `"FLEET-1A2B3C"`
- `pilotName` (required) — character name joining the session
- `shipType` (optional) — ship name; stored as a placeholder until log upload

```json
{
  "code": "FLEET-1A2B3C",
  "pilotName": "Diana Wanda",
  "shipType": "Typhoon"
}
```

Response (200 JSON):

```json
{
  "success": true,
  "message": "Joined session successfully",
  "session": { "id": "7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a" }
}
```

Errors:

- `400` → `{ "success": false, "message": "Pilot name is required", "session": null }`
- `400` → `{ "success": false, "message": "Invalid code or session not found", "session": null }`
- `404` → `{ "success": false, "message": "Invalid code or session not found", "session": null }`
- `500` → `{ "success": false, "message": "Internal server error", "session": null }`

Example:

```bash
curl -X POST "http://localhost:3000/api/fleet-sessions/7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a/join" \
  -H "Content-Type: application/json" \
  -d '{"code":"FLEET-1A2B3C","pilotName":"Diana Wanda","shipType":"Typhoon"}'
```

### POST `/api/fleet-sessions/{id}/upload`

Upload a parsed log file for a pilot. This endpoint expects multipart form data.

Request (multipart form-data):

- `file` (required) — log file contents
- `pilotName` (required) — pilot submitting the log
- `shipType` (optional) — ship name

Response (200 JSON):

```json
{
  "success": true,
  "fleetLog": {
    "id": "a77a63c5-7f7b-4e0c-9a4b-2b83a8c2b7ee",
    "sessionId": "7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a",
    "pilotName": "Diana Wanda",
    "shipType": "Typhoon",
    "logData": "{...}",
    "uploadedAt": "2026-02-24T12:10:00.000Z",
    "pilotId": "Diana Wanda"
  }
}
```

Errors:

- `400` → `{ "success": false, "message": "Missing file or pilotName" }`
- `404` → `{ "success": false, "message": "Session not found" }`
- `500` → `{ "success": false, "message": "Failed to update session" }`
- `500` → `{ "success": false, "message": "Failed to upload log" }`

Example:

```bash
curl -X POST "http://localhost:3000/api/fleet-sessions/7b2d7fd2-ecaf-4f3b-bdb7-1c6f1e4d2b5a/upload" \
  -F "file=@/path/to/log.txt" \
  -F "pilotName=Diana Wanda" \
  -F "shipType=Typhoon"
```

## Related Notes

- The `DELETE /api/fleet-sessions/{id}` method exists to remove a session and returns `{ "success": true }` on success or `404` if missing.
