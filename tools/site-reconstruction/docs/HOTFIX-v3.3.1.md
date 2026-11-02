# v3.3.1 — Deep section capture and missing-evidence diagnostics

## Fixed

- The deep DOM analyzer no longer returns zero sections for visible pages that omit semantic `main`, `section`, `article`, or other landmarks. It falls back to visible direct body elements and marks those observations `inferredLayoutBlock: true` and `sectionExtractionMode: inferred-visible-body-blocks`. The fallback is an observation heuristic, not proof of original component boundaries.
- The optional browser E2E fixture now checks both a page without semantic landmarks and a page with semantic landmarks.
- The `analyze` command reports an actionable message when the selected reference directory lacks `evidence.json`. No automatic guessing or destructive rescan.
- Server health version, extension manifest/UI, and unit test expectations match 3.3.1.

## Windows PowerShell upgrade

1. Stop the previous local server with Ctrl+C.
2. Put the ZIP in `M:\Linkedin jobs\Cources` and run:

```powershell
cd "M:\Linkedin jobs\Cources"
Expand-Archive -Path ".\site-reconstruction-toolkit-v3.3.1-section-hotfix.zip" -DestinationPath "." -Force
cd ".\site-reconstruction-toolkit-v3"
node -p "require('./package.json').version"
npm install
$env:SRT_E2E = '1'
npm test
Remove-Item Env:SRT_E2E
npm run check
npm audit
```

3. To locate existing captures (no rescan required):

```powershell
Get-ChildItem -Path "M:\Linkedin jobs\Cources" -Filter evidence.json -File -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName
```

4. Run `npm run analyze -- --reference "<folder-containing-evidence.json>"` using an existing folder.

## Verification

- Node test suite: 30 passed, 0 failed, 1 optional browser E2E skipped in this build environment.
- JavaScript and extension manifest checks pass.
- The actual deep-evidence extraction callback was executed against two local HTML fixtures in Chromium through Python Playwright, covering both semantic and nonsemantic layouts.
- Full Node/Playwright CLI E2E still needs to run on the target Windows installation.

## Boundaries

The patch does not restore missing files, make hidden server logic accessible, or grant permission to crawl/replicate third-party sites.
