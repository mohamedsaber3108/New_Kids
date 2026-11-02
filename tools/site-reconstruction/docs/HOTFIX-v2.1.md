# Version 2.1.0 — Fix Windows Node.js `Invalid IP address: undefined`

**Root cause:** The custom `lookup` function used by `http.get()` and `https.get()` always invoked `callback(null, address, family)`. Node.js 22/24 may pass `options.all: true` when using its address-family autoselection; it requires `callback(null, [{address, family}])` in that case. Node was dereferencing `.address` on a string, resulting in `Invalid IP address: undefined`. This was being reported as a failure to load robots.txt.

**Fix:** `createPinnedLookup()` validates the pinned address and adapts the response format without issuing a second DNS lookup. `safeGet` uses this adapter for every hop. The HTTP client now supports optional resolver injection for loopback fixture testing; ordinary production calls use `dns.lookup`.

**Security behavior preserved:** reject non-public targets, pin HTTP socket destination, revalidate each redirect, preserve conservative robots.txt failure policy and browser resource guard. Public DNS-to-browser socket TOCTOU risk remains; run unfamiliar scans in an isolated environment.

**Testing:** `test/network.test.js` includes regression coverage for Node's `all` callback signature and an HTTP request to an isolated loopback fixture under a fake hostname. Running the full browser test remains opt-in (`$env:SRT_E2E="1"; npm test` in PowerShell after Playwright Chromium is available).

**Dependency:** the package minimum is updated to Playwright `^1.64.1` to avoid the vulnerability in old pinned v2 packages. On Windows run `npm install` and `npx playwright install chromium` from the v2.1 folder.
