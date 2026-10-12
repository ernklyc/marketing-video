# Demo data — making a product look lived-in, honestly

Most products look empty or private on a test account. The film needs believable content (names, venues, prices,
dates) without lying about what the product does and without touching real servers. Ask the user in the interview
(Q-set B) which of these fits, recommend one, and write the decision into the job's `capture.json` notes.

## Rules (non-negotiable)
- **Invented data is fine; invented capabilities, metrics, customers or testimonials are not.** If a number could be
  read as a claim ("12,000 players"), either use a real one or add a small "Demo data" super on screen.
- Invented names must be obviously fictional (no real people, no real competitors). Placeholder phones/emails only
  (`+00 000 000 00 00`, `demo@example.com`). Don't reuse photos of a real place for an invented business.
- **Never write to production.** Every write call during capture is answered locally (fixtured) or goes to a
  disposable staging/test environment the user approved.
- Never perform real payments, bookings, messages or uploads while filming. Never use the user's real credentials in
  a form — the user signs in themselves on the capture device.
- Leave the user's repos clean: temporary files (e.g. a capture entry point) are deleted, `git status` is checked.

## Options, from least to most effort

| # | Method | Works for | How |
|---|---|---|---|
| 1 | **Real content** | products with a populated test account | film as is; still fixture writes if anything could be submitted |
| 2 | **Web injection** | websites | `capture.json` → `inject`: regex-replace text in JS/JSON responses inside the recording browser only; `capture/web/mockgen.mjs` fills templates with faker values (`{{person.fullName}}`, `{{pick:A|B|C}}`) |
| 3 | **Capture proxy** | apps (iOS Simulator) and web apps with an API | `node capture/flutter/proxy.cjs <job>/proxy --upstream https://api.staging.example.com`, then point the app's API base URL at `http://127.0.0.1:8099`. `rules.js` → `patch()` rewrites real responses into demo data, `fixture()` answers every write call locally. If the base URL is hard-coded, add a temporary capture entry point that routes the HTTP client through the proxy (`zz_video_main.dart` shows the pattern for Flutter) and delete it after the build |
| 4 | **Seeded test environment** | teams with staging + seed scripts | the user (or their seed script) creates demo records on staging; never on production |
| 5 | **Static screens** | features that can't be filmed (external app, hardware, future screen) | screenshots with `screens[]` + scroll keys, or a truthful motion graphic (route card, notification) — never a fake UI that pretends to be the product |
| 6 | **Imported recordings** | any device, any platform | the user records on their phone; `tools/import-clip.py` brings it in with tap marks |

## Making it believable
- Consistent world: one city, one price range, dates relative to "today" in the film (weekend evenings for leisure
  apps, weekday mornings for work tools), names that fit the audience's locale.
- Fill every list the camera shows (at least 6–8 rows), with variety (different avatars, states, badges).
- When stacked filters would legitimately return nothing on a thin test server, the proxy may return a fixed demo
  list for filtered searches — the items must match the filters shown (dates in the chosen range, chosen city, etc.).
- Keep a `proxy/fixtures/` folder for hand-written responses and log every request (`proxy/log/`) to see what the
  app actually calls.
