// Injected into the page: virtual clock for deterministic frame-by-frame capture.
// rAF, setTimeout/setInterval, performance.now, Date.now and all CSS/WAAPI animations follow window.__vt.
(() => {
  if (window.__vt) return;
  const rPerf = performance.now.bind(performance), rDate = Date.now, rST = window.setTimeout.bind(window), rCT = window.clearTimeout.bind(window);
  let on = false, now = 0, dateBase = 0, id = 1;
  // optional fixed wall clock (capture.json "clock") so dates / "2 min ago" labels are identical on every take
  const fixed = typeof window.__vtClock === 'number' ? window.__vtClock - rPerf() : null;
  if (fixed !== null) {
    const RD = Date;
    const nowMs = () => (on ? Math.round(dateBase + now) : Math.round(fixed + rPerf()));
    function FDate(...a) { if (!(this instanceof FDate)) return new RD(nowMs()).toString(); return a.length ? new RD(...a) : new RD(nowMs()); }
    FDate.prototype = RD.prototype; FDate.UTC = RD.UTC; FDate.parse = RD.parse; FDate.now = nowMs;
    window.Date = FDate;
  }
  const timers = new Map();
  let raf = [], rafId = 1;
  const anims = new WeakMap();
  const oRAF = window.requestAnimationFrame.bind(window), oCAF = window.cancelAnimationFrame.bind(window);
  const oSI = window.setInterval.bind(window), oCI = window.clearInterval.bind(window);

  performance.now = () => (on ? now : rPerf());
  if (fixed === null) Date.now = () => (on ? Math.round(dateBase + now) : rDate());
  window.requestAnimationFrame = (cb) => { if (!on) return oRAF(cb); const i = rafId++; raf.push([i, cb]); return -i; };
  window.cancelAnimationFrame = (i) => { if (i < 0) raf = raf.filter(([k]) => k !== -i); else oCAF(i); };
  const sched = (cb, ms, args, every) => { const i = id++; timers.set(i, { at: now + Math.max(0, ms || 0), cb, args, every }); return i; };
  window.setTimeout = (cb, ms, ...a) => (on && typeof cb === 'function' ? -sched(cb, ms, a, 0) : rST(cb, ms, ...a));
  window.setInterval = (cb, ms, ...a) => (on && typeof cb === 'function' ? -sched(cb, ms, a, Math.max(1, ms || 0)) : oSI(cb, ms, ...a));
  window.clearTimeout = (i) => { if (i < 0) timers.delete(-i); else rCT(i); };
  window.clearInterval = (i) => { if (i < 0) timers.delete(-i); else oCI(i); };

  const syncAnims = () => {
    for (const a of document.getAnimations()) {
      let st = anims.get(a);
      if (!st) {
        st = { t0: now, c0: a.currentTime ?? 0 };
        anims.set(a, st);
        if (a.playState === 'running') a.pause(); else if (a.playState !== 'paused') continue;
      }
      if (st.done) continue;
      const t = st.c0 + (now - st.t0) * (a.playbackRate || 1);
      const end = a.effect?.getComputedTiming?.().endTime;
      if (typeof end === 'number' && isFinite(end) && t >= end) { st.done = true; try { a.finish(); } catch {} }
      else { try { a.currentTime = t; } catch {} }
    }
  };

  const noSmooth = () => { const st = document.createElement('style'); st.textContent = '*,html,body{scroll-behavior:auto!important}'; (document.head || document.documentElement).appendChild(st); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', noSmooth); else noSmooth();
  window.__vt = {
    enable() { if (on) return; const t = rPerf(); dateBase = (fixed !== null ? fixed + t : rDate()) - t; now = t; on = true; for (const a of document.getAnimations()) if (a.playState === 'running') { anims.set(a, { t0: now, c0: a.currentTime ?? 0 }); a.pause(); } },
    get on() { return on; },
    advance(ms) {
      const target = now + ms;
      for (let guard = 0; guard < 500; guard++) {
        let next = null;
        for (const [k, tm] of timers) if (tm.at <= target && (!next || tm.at < next[1].at)) next = [k, tm];
        if (!next) break;
        const [k, tm] = next;
        now = Math.max(now, tm.at);
        if (tm.every) tm.at += tm.every; else timers.delete(k);
        try { tm.cb(...(tm.args || [])); } catch (e) { console.error(e); }
      }
      now = target;
      const q = raf; raf = [];
      for (const [, cb] of q) { try { cb(now); } catch (e) { console.error(e); } }
      syncAnims();
    },
  };
})();
