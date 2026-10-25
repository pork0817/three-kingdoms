// 簡易合成音效（WebAudio，無外部檔案）
import { SETTINGS } from './settings.js';
let ctx = null, master = null, musicBus = null, muted = false;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = SETTINGS.sfx; master.connect(ctx.destination); musicBus = ctx.createGain(); musicBus.gain.value = SETTINGS.music * 0.6; musicBus.connect(ctx.destination); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setMuted(m) { muted = m; applyVolume(); }
export function applyVolume() { if (master) master.gain.value = muted ? 0 : SETTINGS.sfx; if (musicBus) musicBus.gain.value = muted ? 0 : SETTINGS.music * 0.6; }
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

// —— 背景音樂：五聲音階程序生成 ——
const PENTA = [0, 2, 4, 7, 9];
let musicMode = null, musicTimer = null, nextT = 0, step = 0;
function note(freq, t, dur, vol, type = 'triangle', bus = musicBus) {
  const c = ctx;
  const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = type; o.frequency.value = freq; o2.type = 'sine'; o2.frequency.value = freq * 2.01;
  f.type = 'lowpass'; f.frequency.setValueAtTime(freq * 6, t); f.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const g2 = c.createGain(); g2.gain.value = 0.25;
  o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(bus);
  o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
}
function drumAt(t, vol, freq = 90) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + 0.3);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.5);
}
function flute(freq, t, dur, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
  o.type = 'sine'; o.frequency.value = freq; lfo.frequency.value = 5; lg.gain.value = freq * 0.008;
  lfo.connect(lg); lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * 0.25); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicBus); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
}
const ROOT = 146.83; // D3
const fr = (deg, oct = 0) => ROOT * Math.pow(2, (PENTA[((deg % 5) + 5) % 5] + 12 * (oct + Math.floor(deg / 5))) / 12);
let melody = 4;
function schedule() {
  if (!ctx || !musicMode) return;
  while (nextT < ctx.currentTime + 0.6) {
    const t = nextT;
    if (musicMode === 'map' || musicMode === 'story') {
      const beat = musicMode === 'map' ? 0.42 : 0.55;
      if (step % 8 === 0) note(fr(0, -1), t, 3.5, 0.12);
      if (step % 8 === 4) note(fr(musicMode === 'map' ? 3 : 2, -1), t, 3, 0.09);
      if (Math.random() < (musicMode === 'map' ? 0.62 : 0.4)) {
        melody = Math.max(0, Math.min(11, melody + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        note(fr(melody), t, 1.6, 0.07 + Math.random() * 0.04);
        if (Math.random() < 0.2) note(fr(melody + 2), t + beat * 0.5, 1.2, 0.05);
      }
      nextT += beat;
    } else if (musicMode === 'battle') {
      const beat = 0.3;
      const p = step % 16;
      if ([0, 3, 6, 8, 11, 14].includes(p)) drumAt(t, p % 8 === 0 ? 0.5 : 0.3, p % 8 === 0 ? 80 : 110);
      if (p === 12 || p === 13) drumAt(t, 0.22, 140);
      if (step % 32 === 0) flute(fr(Math.random() < 0.5 ? 5 : 7), t, beat * 7, 0.05);
      if (step % 32 === 16) flute(fr(Math.random() < 0.5 ? 6 : 4), t, beat * 7, 0.05);
      if (step % 4 === 0) note(fr(0, -1), t, 0.5, 0.06, 'sawtooth');
      nextT += beat;
    } else if (musicMode === 'tense') {
      if (step % 4 === 0) drumAt(t, 0.25, 60);
      if (step % 16 === 8) flute(fr(1), t, 2.5, 0.035);
      nextT += 0.5;
    }
    step++;
  }
}
export function music(mode) {
  if (musicMode === mode) return;
  musicMode = mode;
  const c = ac(); if (!c) return;
  nextT = c.currentTime + 0.1; step = 0;
  if (!musicTimer) musicTimer = setInterval(schedule, 200);
}
