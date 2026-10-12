#!/usr/bin/env python3
"""simclip.py <jobDir> <clipName> <flow.yaml> [--udid UDID] [--pre 0.6] [--post 0.8]
Real-motion iOS-simulator clip: starts `simctl io recordVideo`, runs a Maestro flow, stops, converts to 60 fps
1206-wide H.264 in <job>/clips/<clip>.mp4 and writes taps (time in clip, x/y in 402-pt screen space, label) into
<job>/clips/manifest.json — the same format the web recorder produces, so the engine draws the touch indicator.

Flow tips: use point taps (`- tapOn: {point: "73%,44%", label: "120 dk"}`) — text taps spend ~2.5 s scanning the
hierarchy and leave dead air. `label` becomes the on-screen tap label. Use `- swipe: {start: "50%,75%", end: "50%,35%", duration: 900}`
for smooth scrolls and `- waitForAnimationToEnd` / `- extendedWaitUntil` sparingly.
"""
import json, os, re, signal, subprocess, sys, time, glob, shutil

args = sys.argv[1:]
job, name, flow = os.path.abspath(args[0]), args[1], os.path.abspath(args[2])
opt = lambda k, d: args[args.index(k) + 1] if k in args else d
udid = opt('--udid', 'booted'); pre = float(opt('--pre', 0.6)); post = float(opt('--post', 0.8))
clips = os.path.join(job, 'clips'); os.makedirs(clips, exist_ok=True)
raw = os.path.join(job, 'raw'); os.makedirs(raw, exist_ok=True)
rawmp4 = os.path.join(raw, f'{name}.mov'); dbg = os.path.join(raw, f'{name}_dbg')
shutil.rmtree(dbg, ignore_errors=True)
env = dict(os.environ, JAVA_HOME=os.environ.get('JAVA_HOME', '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home'))
maestro = os.path.expanduser('~/.maestro/bin/maestro')

rec = subprocess.Popen(['xcrun', 'simctl', 'io', udid, 'recordVideo', '--codec=h264', '--force', rawmp4], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
# recordVideo prints "Recording started" on stderr once frames flow
t0 = None
for line in iter(rec.stderr.readline, b''):
    if b'started' in line.lower(): t0 = time.time(); break
if t0 is None: sys.exit('recordVideo did not start')
time.sleep(0.4)
dev = [] if udid == 'booted' else ['--device', udid]
r = subprocess.run([maestro, *dev, 'test', flow, '--debug-output', dbg], env=env, capture_output=True, text=True)
time.sleep(post)
rec.send_signal(signal.SIGINT); rec.wait(timeout=30)
print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr[-400:])
if r.returncode: sys.exit('maestro failed:\n' + r.stdout[-1500:])

cf = [os.path.join(d, f) for d, _, fs in os.walk(dbg) for f in fs if f.startswith('commands') and f.endswith('.json')]
if not cf: sys.exit('no maestro commands.json in ' + dbg)
cmds = json.load(open(cf[0]))
taps, first = [], None
for c in cmds:
    m, cmd = c.get('metadata', {}), c.get('command', {})
    k = next(iter(cmd)); ts = m.get('timestamp', 0) / 1000; du = (m.get('duration') or 0) / 1000
    if k in ('defineVariablesCommand', 'applyConfigurationCommand'): continue
    first = first or ts
    if k == 'tapOnPointV2Command' or (k == 'tapOnElement' and 'point' in json.dumps(cmd)):
        body = cmd[k]; pt = body.get('point') or body.get('selector', {}).get('point')
        mx = re.match(r'\s*([\d.]+)%\s*,\s*([\d.]+)%', str(pt))
        if mx: taps.append({'t': ts + min(du, 0.35) * 0.5, 'x': round(float(mx.group(1)) * 4.02, 1), 'y': round(float(mx.group(2)) * 8.74, 1), 'label': body.get('label', '') or ''})
start = max(0.0, (first or t0) - t0 - pre)
for t in taps: t['t'] = round(t['t'] - t0 - start, 3)
out = os.path.join(clips, f'{name}.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start:.3f}', '-i', rawmp4, '-vf', 'fps=60,scale=1206:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '14', '-preset', 'slow', '-an', out], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout)
mp = os.path.join(clips, 'manifest.json'); man = json.load(open(mp)) if os.path.exists(mp) else {}
man[name] = {'dur': round(dur, 3), 'taps': taps, 'source': 'simulator'}
json.dump(man, open(mp, 'w'), ensure_ascii=False, indent=1)
print(f'{name}: {dur:.2f}s, {len(taps)} taps → {out}')
