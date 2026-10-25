// 簡易合成音效（WebAudio，無外部檔案）
let ctx = null, master = null, muted = false;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }
export function isMuted() { return muted; }

function noiseBuf(dur) {
  const c = ac(); const b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
export function drum(vol = 1, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.35);
  g.gain.setValueAtTime(0.9 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.55);
}
export function drumRoll(n = 6, gap = 0.28) { for (let i = 0; i < n; i++) drum(i % 2 ? 0.6 : 1, i * gap); }
export function clash(vol = 0.25) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuf(0.15);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500 + Math.random() * 2500; f.Q.value = 6;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export function whoosh(vol = 0.15) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuf(0.6);
  const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2400, t + 0.5); f.Q.value = 2;
  const g = c.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(vol, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export function fireSound(vol = 0.3) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  const s = c.createBufferSource(); s.buffer = noiseBuf(1.5);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export function horn() {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime;
  for (const fr of [146.8, 220]) {
    const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = fr; f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.3); g.gain.setValueAtTime(0.12, t + 1.4); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
    o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 2.3);
  }
}
export function unlock() { ac(); }
