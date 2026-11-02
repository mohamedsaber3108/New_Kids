# Security boundaries and limitations

- API binds to `127.0.0.1` and uses a per-startup random token. It restricts browser-origin requests to Chrome extensions (which still require that token).
- `/scan` rejects direct private/loopback/link-local IPs, IPv4-mapped IPv6, and DNS hostnames resolving to any non-public result. Browser network requests are also intercepted and revalidated. Redirect destinations are therefore subject to the request guard.
- **Residual risk**: Chromium resolves the destination separately from Node's DNS check, which creates a potential DNS-rebinding/time-of-check/time-of-use gap. This is not production-grade SSRF isolation; run scans behind network egress rules prohibiting access to private, loopback and metadata IPs. `--allow-local` is for explicitly opted-in offline testing only and cannot be enabled through the extension API.
- HTML/JS returned by a scanned site executes within the browser context; Playwright browser sandbox behavior depends on the host runtime. Scan untrusted sites in an isolated container/VM with controlled egress.
- The API permits only one active scan and three active/queued scans, with explicit cancellation and bounded body sizes.
- `--download-assets` only fetches images and font-like same-origin URLs and caps size, count, redirects and total bytes. It never establishes reuse rights.
- Manual tab captures may include user-visible private data. Inspect generated artifacts before uploading or sharing them.
- `robots.txt` lookup failures stop the crawl by default rather than silently bypassing site policy.
