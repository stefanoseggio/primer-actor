# Changelog

## 1.1.0 - 2026-09-08

### Added

- Cross-run change detection, keyed by URL. Every scraped page now carries
  `eventType` (`NEW_URL` / `CONTENT_CHANGED` / `UNCHANGED`), `contentHash`
  and `previousScrapedAt` in the dataset. State (a content fingerprint per
  URL) persists in the default key-value store across runs.
- New optional input `onlyChanged` (default `false`, fully backward
  compatible). When enabled, a page is still crawled and its links still
  followed, but it is only delivered to the dataset - and charged - when
  it's new or its content differs from the last scrape of that same URL.
  Unchanged pages are skipped, so a scheduled re-run only pays for what
  actually changed.
- New "Change detection" dataset view surfacing `url`/`eventType`/
  `previousScrapedAt`/`scrapedAt`/`contentHash`.
- `test/fingerprint.test.ts`, `test/delta.test.ts`, `test/state.test.ts`:
  unit coverage for the new pure fingerprint/classification functions and
  state persistence. `test/main.test.ts` extended with two live-router
  scenarios: a repeat crawl of an unchanged page, and the same with
  `onlyChanged=true`.
- `npm run lint` added to CI (`.github/workflows/test.yaml`), matching the
  local validation loop already documented in this repo's `AGENTS.md`.

### Changed

- None to the existing extraction logic, output fields, monetization
  event (`result`, unchanged), or pricing - this is a purely additive
  release. `contentHash`/`eventType`/`previousScrapedAt` are new fields
  appended to every existing output record, not a replacement for any of
  them.

### Not added (and why)

- **No STATUS_CHANGE or CLOSED event.** Unlike the fleet's
  registry-monitoring actors, this Actor crawls whatever URLs the caller
  supplies each run rather than discovering listings from an enumerable
  source. There is no register to walk completely, so there is no
  trustworthy way to say a URL is "gone" - and no lifecycle/status field
  on a scraped page to change in the first place. See `src/delta.ts` and
  the "Delta / change-detection mode" section of `AGENTS.md`.
- **No new paid event or price change.** `onlyChanged` reduces how many
  results are delivered (and therefore charged) using the *existing*
  `result` event - it does not add a second pricing tier or touch
  `pricingInfos` in Console. Apify allows only one "significant pricing
  change" per Actor per month with a 14-day notice period, and this
  Actor already has a live, differently-priced model from the rest of
  this developer's fleet - a new tier here is a deliberate future
  decision, not bundled into this release.
- **Version bumped to 1.1, not 2.0.** The rest of this developer's fleet
  uses "2.0" to mark a full delta-engine rewrite of previously
  stateless/parser-only actors. This release is strictly additive to an
  already-live, already-monetized Actor - no output field was removed or
  reshaped, no existing input field changed meaning - so a minor version
  is the honest label.
