<!-- Narrative transitions adapted from the saas-motion-kit transition atlas (MIT, © 2026 saas-motion-kit contributors), mapped to this engine. -->
# Transitions in this engine

Set on the **entering** section: `"transition": "<kind>"`. The previous section adapts its exit automatically.
Keep a quiet base (`cut`), spend narrative ones where the story turns. Never the same twice in a row; ≥ 3 families; `push`/`hold` once per film; `statement` max 2 (it is the house motif).

| Kind | Family | Meaning / when | Avoid | Extra fields |
|---|---|---|---|---|
| `statement` | mask | Opening claim of a chapter: blob floods, big line + ring, collapses into the chip. Best on the first drop. | More than twice; right after a wall. | first `titles[0]` is the statement |
| `iris` | mask | Drilling into a detail — opens from where the viewer just tapped (previous section's last tap). | Busy frames with two subjects; twice per film. | — |
| `split` | mask | Topic change / list beat; three brand strips close and open. Editorial, structured. | Calm films; next to other stripe effects. | — |
| `carry` | carry | One object travels: the tapped card lifts off A and becomes B's chip (a product card → the cart, an alert → its ticket). The strongest storytelling cut. | Carry twice in a row; objects with no obvious destination. | `carry: {sx, sy, sw, sh}` crop of A's last frame (screen px) |
| `whip` | camera | "Meanwhile / and also": continuous pan, phones side by side, streaks. Adds energy without changing subject. | Back-and-forth whips; more than twice. | — |
| `push` | camera | Going deeper: dive into A's last tap, B pulls back out. Hero reveal feel. | More than once; right after a zoom. | — |
| `hold` | cut | "Wait for it": A freezes on the downbeat, flash, hard cut. Music-led films. | Off the beat grid (reads as a glitch); frames still being read. | section must start on a downbeat |
| `flip` | camera | 3D card flip: A turns edge-on, B turns in from the other side. Chapter change with continuity (same product, new face). | Twice in a row; busy frames. | — |
| `drop` | material | A falls out with motion blur, B drops in from above and settles with a small spring bounce. Playful energy after a calm section. | Calm/premium tone overuse. | — |
| `flood` | mask | "It happened": A's last tap (e.g. Apply) grows into a brand-dark shape that floods the frame (overscaled, 9 f), holds a beat, then contracts into B's phone screen. Made-out-of-the-previous-scene, no fade. | Twice per film; when the last tap is off-screen. | — |
| `cut` | cut | Quiet base between busy beats; B already in place. | — | — |
| `wall` section | material | Rhythm break with 2–4 words; curtain rises from below, exits up. Put it on a music break. | — | — |
| outro | mask | Circle reveal into the logo. | — | — |

**No crossfades, ever** (a scene is made out of the previous one, or it cuts). The camera is a sum of closed-form springs (zoom in log space): moves overlap and retarget without velocity jumps, shots enter already moving, exits accelerate out (ease-in) and finish inside the section, so two phones never share the frame. Final renders are 240 fps subframes blended to 60 fps → every move gets real, direction-correct motion blur (drafts fake it on fast moves).
Inside a clip, app page changes get an automatic smear + camera punch (taps with `nav`). Inside a montage, parts switch with a smear.
Title entrances rotate automatically (`pop`, `rise`, `mask`, `type`); override per title with `"entrance"`.
