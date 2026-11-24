# Moja Biblioteka website and Safari release

## Verified hosting

Both `mojabiblioteka.app` and `mojabiblioteka.kamilpietka.dev` resolved to Cloudflare and returned HTTPS 200 for the marketing page and all three legal pages. Neither redirected, and both returned 404 for `/app/`. Cloudflare presented Let's Encrypt certificates covering the requested hostnames (the second uses the `*.kamilpietka.dev` SAN). Public edge data does not expose the VPS IP or the origin certificate.

The infrastructure repository's [Caddyfile](https://github.com/kamilloo/kamilpietka-devops/blob/main/Caddyfile) selects one shared file-server vhost for those names and `www.mojabiblioteka.app`. [Compose](https://github.com/kamilloo/kamilpietka-devops/blob/main/compose.yml) mounts `/opt/portfolio/mojabiblioteka` at `/srv/mojabiblioteka`, separately from `/opt/portfolio/site` at `/srv/portfolio`. The Compose mount paths take precedence over the older examples in its deployment document. A live VPS mount inspection and the history of the current manual uploads were outside the public audit. The website build and portfolio deploy script only use `public/`. The GitHub deployment workflow is disabled. The existing marketing and legal pages are separately served from the Moja Biblioteka root.

Use `https://mojabiblioteka.app/` as the canonical marketing origin. Its relative product link opens `/app/` on the current origin. Legal pages remain at `/privacy/`, `/terms/` and `/returns/`. The packaging needs no DNS, reverse proxy, SPA fallback or portfolio route changes. Confirm the running Caddy mounts before activating a release.

## Branding and platform guidance

The PNGs derive from `kamilloo/my-library-app:assets/icon/my_library_icon_1024.png`. They are proportionally downsampled with metadata stripped. The marketing site uses 80 px for the header, 32 px for the favicon, 180 px for Apple touch and 512 px for Open Graph. The Flutter manifest uses 192 px and 512 px.

The palette comes from Flutter Material. Primary orange is `#a34200`, primary container is `#ffddbb`, on-primary-container is `#542000`, secondary blue is `#20548b`, secondary container is `#d8e9ff`, on-secondary is `#ffffff`, and on-secondary-container is `#12375d`. The surface shades are `#f5f9ff`, `#fcfdff` and `#eef5ff`.

iPhone visitors use Safari. Android visitors see Google Play first. The package is `com.kamilloo.mylibrary`. Its listing returned HTTP 404 for a signed-out request. Verify access using an opted-in tester account before publication. Desktop visitors get the marketing site, with `/app/?app=1` available for technical QA.

The [BuyCoffee profile](https://buycoffee.to/moja-biblioteka) returned HTTP 200 with the project description and no recurring payment option in the public profile data. Confirm account control and the absence of rewards or premium benefits with the owner before publishing. The marketing link only opens on activation and sends no referring URL. Android app code was untouched.

## Build and stage

The website baseline was `83b8516393492f933b11dee01a434eacd50599cc`. The Flutter baseline was the verified merged `main` commit `f7c205e3ac885dd83f263522811c71a340148a1e`, including Tasks 33 and 34. The locally verified release was built from Flutter commit `20baa6d048fb11dc57ca1075a638f2154ea5c670` in [Flutter PR #32](https://github.com/kamilloo/my-library-app/pull/32). Rebuild against the exact reviewed or merged commit for subsequent releases.

From a clean Flutter checkout with Flutter 3.47.5 and Node.js 22 or newer:

```sh
flutter pub get
flutter analyze
flutter test
dart run sqflite_common_ffi_web:setup
flutter build web --release --no-web-resources-cdn --base-href /app/
node tool/prepare_web.mjs
git diff --check
```

The Flutter CI job uploads the prepared build as `my-library-iphone-web`. Use the artifact run's checkout SHA if staging a CI build. From the website checkout:

```sh
python3 scripts/package_mojabiblioteka.py \
  --web-build /path/to/flutter/build/web \
  --flutter-commit "$(git -C /path/to/flutter rev-parse HEAD)" \
  --output /path/to/staging/mojabiblioteka-new
```

The target directory must be new. It contains the complete document root and `release.json` with Flutter source and offline revisions. The packager checks the base path and the complete worker inventory against the build bytes. The artifact contains SQLite WASM and its worker, the local pinned ZXing decoder, CanvasKit, Flutter fonts and assets, the web manifest, icons and support config. ZXing is fetched at build time. Serve JavaScript and WASM with their correct MIME types and allow HTTP revalidation for resources at stable URLs, especially `/app/offline-worker.js`. Bypass any Cloudflare cache rule that forces stale copies of those URLs. Direct paths and missing-resource 404s should work through Caddy's file server.

## Authorized activation and rollback

Portfolio publication remains independent. `deploy.sh` clears the contents of `/opt/portfolio/site/` and uploads the rebuilt portfolio with SCP. Moja Biblioteka uses the separate `/opt/portfolio/mojabiblioteka/` document root. Use the following procedure for the Moja Biblioteka vhost after the owner authorizes staging or production work.

1. Build and verify the full release locally. In the approved HTTPS staging vhost, verify MIME types, camera permissions, scope, cache update and the physical-device gate before selecting a production release.
2. On the VPS, run `docker compose config` and inspect the Caddy container mounts. Confirm `/opt/portfolio/mojabiblioteka` is the live source. Coordinate a single deployment and create a candidate directory next to it on the same filesystem. Copy the current site's contents into the candidate first so server-managed files survive. Upload the new release into the candidate, with the old candidate `app/` moved outside the candidate before copying the new complete `app/`. Verify the candidate against the release, including `release.json`, file counts, paths and checksums. Keep incomplete uploads outside the live document root.
3. Rename `/opt/portfolio/mojabiblioteka` to a versioned rollback directory and move the verified candidate to `/opt/portfolio/mojabiblioteka`. The running container continues serving the currently bound directory, so recreate Caddy from the existing Compose project with `docker compose up -d --no-deps --force-recreate caddy` to mount the new tree. This can briefly interrupt shared HTTPS service. If the second rename fails, restore the original name before recreating Caddy. Inspect the new mount and verify all site routes plus the portfolio home and projects.
4. For rollback, move the failed release to another versioned directory, restore the saved directory at `/opt/portfolio/mojabiblioteka`, and recreate Caddy again. Verify the public routes and release metadata. Keep the prior app release available, especially if any visitors have started using Safari. The service worker may continue serving its active release until old app tabs close and the rollback worker can activate. Rollback does not restore browser database contents.

## Browser data and offline validation

The offline worker is served from and controls `/app/`. It precaches one complete revision and activates an update after the prior app tabs close. SQLite runs in WASM and stores data in IndexedDB. Use the same scheme, hostname, port, Safari profile and app entry on updates. Data on an alias, staging domain, or prior origin does not follow users automatically. Scope and cache keys are path-specific even when browser storage shares an origin.

If a previous origin has library data, keep it reachable. Open it in the original Safari profile, export a `.mlbak` backup to Files and verify it exists. Open the new app and restore the backup after safeguarding any existing data there. Verify books, genres, loans, history and cover images before switching bookmarks. Protect the unencrypted backup from unauthorized access. Test the same export and restore flow when moving between Safari and Android.

Local Chromium smoke testing on the assembled loopback site passed at `/app/` with an iPhone Safari user-agent string. It covered Flutter startup, legal routes, WASM MIME types, scanner and compiled asset availability, service-worker scope, startup without CDN requests, BuyCoffee opening without a referrer after activation, and a saved book surviving a closed-tab offline reopen. A staged second revision activated after the old tab closed, retired the old app cache and kept the book. The Android action was first at 320 px with no horizontal overflow. Camera operation and backup exchange remain in the physical Safari gate.

Local marketing screenshots: [1440 px desktop](screenshots/task35-desktop.jpeg) and [390 px mobile](screenshots/task35-mobile.jpeg).

**Physical iPhone Safari and real HTTPS staging: BLOCKED.** An approved staging deployment and a physical iPhone are needed. Record model, iOS version, origin, release and evidence for each item in the [Task 33 checklist](https://github.com/kamilloo/my-library-app/blob/main/docs/task33_iphone_safari.md), plus marketing branding, support popup on tap, QR and ISBN scanning offline, Safari and Android `.mlbak` exchange, and persistence of local photos. No production infrastructure was changed.
