# Fleet Analysis — Phase 02 (Access control via localStorage)

Run the TypeScript check after completing edits:
`export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`

 - [x] `src/app/fleet/create/page.tsx` — persist created session UUID to localStorage
  - Action: In `handleSubmit`, after the call to `setCreatedSession(data)`, insert:

```ts
      // Persist session UUID locally so this browser can see the fleet
      try {
        const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
        if (!stored.includes(data.id)) {
          localStorage.setItem("fleet:session-ids", JSON.stringify([...stored, data.id]));
        }
      } catch { /* localStorage unavailable */ }
```
  - Verification: file compiles.

 - [x] `src/app/fleet/join/page.tsx` — persist joined session UUID to localStorage
  - Action: In `handleSubmit`, after the `if (!response.ok || !data.success)` guard and before `router.push(...)`, insert:

```ts
      // Persist session UUID locally
      try {
        const stored = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
        if (!stored.includes(data.session.id)) {
          localStorage.setItem("fleet:session-ids", JSON.stringify([...stored, data.session.id]));
        }
      } catch { /* localStorage unavailable */ }
```
  - Verification: file compiles.

 - [x] `src/app/fleet/page.tsx` — only fetch sessions listed in localStorage
  - Action: Replace the existing `useEffect` fetch block with logic that reads `fleet:session-ids` from localStorage and, if present, fetches `/api/fleet-sessions?ids=...`.
  - Implementation snippet (replace useEffect block):

```ts
  useEffect(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(localStorage.getItem("fleet:session-ids") ?? "[]") as string[];
    } catch { /* ignore */ }

    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    const query = new URLSearchParams({ ids: ids.join(",") });
    fetch(`/api/fleet-sessions?${query}`)
      .then((r) => r.json())
      .then((data: SessionRow[]) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);
```
  - Verification: file compiles.

 - [x] `src/app/api/fleet-sessions/route.ts` — accept `?ids=` query param and filter
  - Action: Change GET signature to `GET(request: NextRequest)` and add parsing of `ids` from `searchParams`. Filter `listUserSessions()` by those ids when provided.
  - Implementation snippet:

```ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawIds = searchParams.get("ids");
    const ids = rawIds ? rawIds.split(",").filter(Boolean) : [];

    const allSessions = listUserSessions();
    const filtered = ids.length > 0 ? allSessions.filter((s) => ids.includes(s.id)) : allSessions;

    const userSessions = filtered.map((session) => ({
      ...session,
      participantCount: session.participants.length,
      logCount: session.logs.length,
    }));

    return NextResponse.json(userSessions);
```
  - Verification: endpoint compiles; unit tests (if any) pass.

 - [x] `src/app/fleet/[sessionId]/page.tsx` — gate access by localStorage and persist UUID on load
  - Action: After `sessionId` is resolved, add `const [accessDenied, setAccessDenied] = useState(false);` and, inside `fetchSession` before fetching, check localStorage for the id and early-return with `setAccessDenied(true)` if not present. Also, after successful `setData(sessionData)`, persist the id to localStorage.
  - Insert access-denied render when `accessDenied` is true (render a small message and a back link to `/fleet`).
  - Verification: file compiles.

 - [x] Phase 02 verification — run TypeScript check
   - Action: Run `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH" && node node_modules/.bin/tsc --noEmit`
   - Success criteria: `tsc` exits with status 0.
   - Verification: TypeScript compiler completed successfully (exit code 0) when run in the repository root on 2026-02-25.

- Note (manual): After deployment, the following manual browser checks are recommended (do not mark as completed here):
  - Create fleet in a browser; confirm UUID is written to `localStorage['fleet:session-ids']`.
  - Open the fleet index in a fresh private window — it should show "No fleets yet".
