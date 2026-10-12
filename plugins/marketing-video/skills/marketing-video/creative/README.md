<!-- Creative layer adapted from saas-motion-kit (https://github.com/tugrawork-creator/saas-motion-kit), MIT License, © 2026 saas-motion-kit contributors. -->
# Creative layer — no two films should feel like the same film

Sameness (one transition, one ease, one entrance, the same card) is what makes motion read as "AI-made".
Before and during every storyboard, ask:

| # | Question | Good answer |
|---|---|---|
| 1 | What exactly do I want to say, in what tone? | `brief.message / tone / feel`: "I want to say ___ in a ___ tone, so the viewer feels ___." Check every choice against [tone-matrix.md](tone-matrix.md). |
| 2 | Is anything repeating? | Read the ledger column by column (transition, cam, entrance). Same thing twice in a row = laziness. |
| 3 | What does each transition *mean*? | Each cut says something: continuity, contrast, cause → effect, zoom into detail. Pick from [transitions.md](transitions.md); write it in `ledger.why`. |
| 4 | What are the colours doing over time? | One colour event per act (the first accent flood should *mean* something). |
| 5 | Which component have I never made before? | ≥ 1 `ledger.new_component` per film — see [component-forge.md](component-forge.md). |
| 6 | Where is the surprise? | One pattern break every 10–15 s: `wall`, `hold`, `push`, `carry`, a scale jump, silence. |
| 7 | Did this repeat my last film? | `validate.mjs` compares with `~/.promo-ledger.json` (look, transitions, components). |

**Motif vs repetition:** a motif is chosen, rare (2–3×), meaningful and evolving — mark it `ledger.motif`. A repetition is the default.

**Words:** fewer. If the frame needs reading, redesign the frame. Audit flags > 1.6 on-screen words/s.

**Rules kept from the kit:** official logos only (never redraw a mark) · write locale-specific uppercase yourself (e.g. Turkish dotted/dotless I), never CSS `text-transform` · no bounce/elastic on UI elements · clean real UI → animate the real thing; messy UI → an *imaginary component* that shows what the product really does (never a capability it doesn't have).
