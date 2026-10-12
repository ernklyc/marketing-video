# Orbit — the showcase film

Orbit is a fictional habit-tracker made only for this demo (`app.html`, a single self-contained page). This folder
reproduces the showcase video in the repository README end to end:

```bash
JOB=~/promo-videos/orbit && mkdir -p $JOB && cp -R "$SK/examples/orbit/"* $JOB/
(cd $JOB && mkdir -p site && mv app.html site/index.html && cd site && python3 -m http.server 8811 &)   # serve the app
(cd "$SK/capture/web" && node record.mjs $JOB)            # film it: clips today, add, stats (60 fps, frame-perfect)
node "$SK/music/synth.mjs" $JOB && node "$SK/music/sfx.mjs" $JOB
bash "$SK/tools/render.sh" $JOB --draft                   # quick look; drop --draft for the 60 fps master
```

`$SK` is the skill folder (e.g. `~/.claude/skills/marketing-video`). The music is the studio's generated bed; with a
Suno or licensed track the film gets your own sound (`tools/suno.mjs`, `music/bed.mjs`).
