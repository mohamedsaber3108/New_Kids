# SRT v3.0.1 — Chrome Extension connection and validation hotfix

## What was wrong in v3.0.0

- The Chrome popup still displayed **v2** although the manifest and Node server were v3.
- The server returns `Invalid token` when the supplied session token is missing, stale or mistyped. The extension gave no clear instructions or health check to recover.
- A website URL placeholder looked like a pre-filled URL. Submitting a blank or malformed URL yielded an unhelpful generic error.
- The popup could restore an old token from session storage even after restarting the server, with no visual indication that the token was unverified.
- Starting another old server on port 4319 produced no friendly recovery guidance.

## Fixed

- Popup and manifest now both state **v3.0.1**.
- Added explicit **Test Connection / Token** (authenticated `/health`); major-version checks detect an old server.
- Clear actionable instructions for a missing token, stale token, unreachable server, missing/invalid URL, and out-of-range limits.
- **Use Current Website Tab** button, and conservative scan defaults (5 pages, 1 depth) so the initial test is lightweight.
- Updated session token on input and prevented late session restore from overwriting newly typed data.
- Server returns machine-readable `AUTH_INVALID`, `ORIGIN_BLOCKED`, `URL_INVALID` codes without revealing the session token.
- Friendlier EADDRINUSE message if another server is already running.
- Added client regression tests and API regression tests.

## How to upgrade on Windows PowerShell

1. In the existing server terminal, press Ctrl+C.
2. Place `site-reconstruction-toolkit-v3.0.1-fixed.zip` next to the original project folder, e.g. `M:\Linkedin jobs\Cources`.
3. Run:

```powershell
cd "M:\Linkedin jobs\Cources"
Expand-Archive -Path ".\site-reconstruction-toolkit-v3.0.1-fixed.zip" -DestinationPath "." -Force
cd ".\site-reconstruction-toolkit-v3"
npm install
npm test
npm run check
npm run server
```

4. In `chrome://extensions` click **Reload** on the SRT v3 extension. If it still shows v2, remove the old SRT extension and use **Load unpacked** on `M:\Linkedin jobs\Cources\site-reconstruction-toolkit-v3\extension`.
5. Open a permitted site, fill URL, **copy the fresh token into the popup**, press **Test Connection / Token**, then use **Start Website Scan**.
6. If the error persists, record the *full status message* and the local terminal's error text, without sharing tokens.

Output data under `output/` is not removed by this archive extraction. The hotfix does not claim the remote website was successfully scanned on every machine; browser end-to-end checks remain opt-in.
