// DOM 介面：對話、選擇、彈窗、提示
import { FACTIONS, GENERALS } from './data.js';
import { sleep } from './util.js';
import { renderPortrait, NPC } from './figures.js';
import { SETTINGS, TEXT_SPEED } from './settings.js';
export const DLG = { fast: false, hook: null };

export const root = () => document.getElementById('ui');

export function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function portrait(id, size = 96) {
  const g = GENERALS[id];
  const color = g ? FACTIONS[g.f].css : NPC[id] ? FACTIONS[NPC[id].f].css : '#8a7a5a';
  if (g || NPC[id]) {
    const url = renderPortrait(id);
    if (url) return `<div class="portrait3d" style="width:${size}px;height:${size}px;--fc:${color}"><img src="${url}" alt=""></div>`;
  }
  const name = g ? g.name : (id || '旁白');
  const ch = g ? (name.length === 3 && g.banner ? name.slice(2) : name.slice(-1)) : name.slice(0, 1);
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs><radialGradient id="pg${size}${ch}" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${color}" stop-opacity="0.9"/><stop offset="1" stop-color="#140d08"/></radialGradient></defs>
    <circle cx="50" cy="50" r="47" fill="url(#pg${size}${ch})" stroke="#d8b46a" stroke-width="3"/>
    <circle cx="50" cy="50" r="40" fill="none" stroke="#d8b46a" stroke-opacity="0.35" stroke-width="1"/>
    <text x="50" y="66" text-anchor="middle" font-size="46" fill="#f4e6c4" font-family="LXGW WenKai TC, Noto Serif TC, serif" font-weight="700">${ch}</text>
  </svg>`;
}

// —— 對話 ——
let dlg = null;
function ensureDialog() {
  if (dlg && dlg.isConnected) return dlg;
  dlg = el('div', 'dialog hidden', `<div class="dlg-portrait"></div><div class="dlg-body"><div class="dlg-name"></div><div class="dlg-text"></div><div class="dlg-next">▼</div></div><div class="dlg-ctl"><button class="dlg-auto" title="自動播放">自動</button><button class="dlg-ff" title="快轉">▶▶</button></div>`, root());
  const au = dlg.querySelector('.dlg-auto'), ff = dlg.querySelector('.dlg-ff');
  au.classList.toggle('on', SETTINGS.autoPlay);
  au.onclick = (e) => { e.stopPropagation(); SETTINGS.autoPlay = !SETTINGS.autoPlay; au.classList.toggle('on', SETTINGS.autoPlay); };
  ff.onclick = (e) => { e.stopPropagation(); DLG.fast = !DLG.fast; ff.classList.toggle('on', DLG.fast); };
  return dlg;
}
export function hideDialog() { if (dlg) dlg.classList.add('hidden'); }

let skipAll = false;
export function say(speaker, text) {
  const d = ensureDialog();
  d.classList.remove('hidden');
  const g = GENERALS[speaker];
  const isNarr = !speaker || speaker === 'narr';
  d.classList.toggle('narr', isNarr);
  d.querySelector('.dlg-portrait').innerHTML = isNarr ? '' : portrait(speaker, 128);
  d.querySelector('.dlg-name').innerHTML = isNarr ? '' : (g ? `${g.name}<span class="dlg-title">${g.title || ''}</span>` : speaker);
  const tx = d.querySelector('.dlg-text');
  const nxt = d.querySelector('.dlg-next');
  nxt.style.visibility = 'hidden';
  DLG.hook && DLG.hook(speaker);
  return new Promise(resolve => {
    let i = 0, done = false, timer, autoT;
    const full = text;
    const speed = DLG.fast ? 0 : TEXT_SPEED[SETTINGS.textSpeed] ?? 28;
    const finish = () => {
      done = true; clearInterval(timer); tx.innerHTML = full; nxt.style.visibility = 'visible';
      if (DLG.fast) autoT = setTimeout(() => { cleanup(); resolve(); }, 120);
      else if (SETTINGS.autoPlay) autoT = setTimeout(() => { cleanup(); resolve(); }, 900 + full.length * 70);
    };
    if (!speed) setTimeout(finish, 0);
    else timer = setInterval(() => {
      i += 1; tx.innerHTML = full.slice(0, i);
      if (i >= full.length) finish();
    }, speed);
    const onClick = (e) => {
      e.stopPropagation();
      if (!done) { finish(); return; }
      cleanup(); resolve();
    };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') onClick(e); };
    function cleanup() { clearTimeout(autoT); d.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey); }
    d.addEventListener('click', onClick);
    window.addEventListener('keydown', onKey);
  });
}

// —— 選擇 ——
export function choose(prompt, options) {
  if (document.body.classList.contains('phone')) hideDialog();
  return new Promise(resolve => {
    const wrap = el('div', 'choice-wrap', '', root());
    if (prompt) el('div', 'choice-prompt', prompt, wrap);
    options.forEach((o, i) => {
      const b = el('button', 'choice' + (o.disabled ? ' disabled' : ''),
        `<span class="choice-text">${o.text}</span>${o.hist ? '<span class="tag hist">史實</span>' : ''}${o.yy ? '<span class="tag yy">演義</span>' : ''}${o.hint ? `<span class="choice-hint">${o.hint}</span>` : ''}`, wrap);
      if (!o.disabled) b.onclick = (e) => { e.stopPropagation(); wrap.remove(); resolve(i); };
    });
  });
}

// —— 彈窗 ——
export function modal(html, buttons = [{ text: '確定' }], cls = '') {
  return new Promise(resolve => {
    const bg = el('div', 'modal-bg', '', root());
    const m = el('div', 'modal ' + cls, html, bg);
    const bar = el('div', 'modal-btns', '', m);
    buttons.forEach((b, i) => {
      const btn = el('button', 'btn' + (b.primary ? ' primary' : '') + (b.danger ? ' danger' : ''), b.text, bar);
      if (b.disabled) btn.disabled = true;
      btn.onclick = () => { bg.remove(); resolve(b.value ?? i); };
    });
  });
}

// —— 提示 ——
let toastBox = null;
export function toast(text, kind = '') {
  if (!toastBox || !toastBox.isConnected) toastBox = el('div', 'toasts', '', root());
  const t = el('div', 'toast ' + kind, text, toastBox);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3800);
}

// —— 標題卡 ——
export async function titleCard(text, sub = '', ms = 2600) {
  const c = el('div', 'title-card', `<div class="tc-line"></div><div class="tc-text">${text}</div><div class="tc-sub">${sub}</div><div class="tc-line"></div>`, root());
  await sleep(30);
  c.classList.add('show');
  await sleep(ms);
  c.classList.remove('show');
  await sleep(700);
  c.remove();
}

// —— 兵法習得卡 ——
export function learnCard(t) {
  return modal(`<div class="learn"><div class="learn-seal">${t.icon}</div><div class="learn-head">習得兵法</div>
    <div class="learn-name">【${t.name}】</div><div class="learn-quote">${t.quote}</div><div class="learn-desc">${t.desc}</div></div>`,
    [{ text: '謹記於心', primary: true }], 'learn-modal');
}

export function noteCard(text) {
  return modal(`<div class="note"><div class="note-head">史 · 註</div><div class="note-text">${text}</div></div>`, [{ text: '繼續', primary: true }], 'note-modal');
}

export function clearUI(keep = []) {
  for (const c of [...root().children]) if (!keep.some(k => c.classList.contains(k))) c.remove();
}
