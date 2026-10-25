// 主程式：畫面流程、地圖介面、劇情執行、內政外交、天下征戰
import * as THREE from 'three';
import { WorldMap, heightAtXZ, toXZ } from './worldmap.js';
import { Battle, showResults } from './battle.js';
import { GameState, DIFF } from './state.js';
import { STORY, nextChapter } from './story.js';
import { FACTIONS, GENERALS, CITIES, TACTICS, WEAPONS, SEASONS, neighbors, gname } from './data.js';
import { el, root, say, choose, modal, toast, titleCard, learnCard, noteCard, hideDialog, portrait, clearUI, DLG } from './ui.js';
import { fmt, sleep, pick, rand, clamp } from './util.js';
import * as SFX from './audio.js';
import { renderAllPortraits, openViewer, HERO } from './figures.js';
import { Stage } from './stage.js';
import { pendingWorld, evaluateEnding } from './world.js';
import { SETTINGS, saveSettings, QUALITY, Q } from './settings.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !SETTINGS.mobile });
renderer.setPixelRatio(Math.min(devicePixelRatio, Q().pixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const state = new GameState();
const app = { renderer, state, view: null, setView(v) { this.view = v; } };
let map, stage;
const pendingLearn = [];
state.on((type, d) => {
  if (type === 'toast') toast(d.text, d.kind);
  if (type === 'learn') { pendingLearn.push(d); toast(`習得兵法【${d.name}】`, 'item'); }
  if (type === 'hud') updateHUD();
});

// —— 主迴圈 ——
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.1);
  if (app.view) { app.view.update(dt); app.view.render(renderer); }
}
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  map?.resize(innerWidth, innerHeight);
  stage?.resize(innerWidth, innerHeight);
  if (app.view && app.view !== map && app.view !== stage) app.view.resize(innerWidth, innerHeight);
});
canvas.addEventListener('pointermove', e => app.view?.onPointer?.(e, 'move'));
canvas.addEventListener('pointerdown', e => { SFX.unlock(); app.view?.onPointer?.(e, 'down'); });
canvas.addEventListener('pointerup', e => app.view?.onPointer?.(e, 'up'));
canvas.addEventListener('click', e => app.view?.onPointer?.(e, 'click'));
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => app.view?.onKey?.(e, true));
addEventListener('keyup', e => app.view?.onKey?.(e, false));
document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });

async function flushLearn() { while (pendingLearn.length) await learnCard(pendingLearn.shift()); }

// —— 啟動 ——
async function boot() {
  try { await Promise.race([document.fonts.load('700 64px "LXGW WenKai TC"'), sleep(2500)]); } catch (e) { }
  await sleep(50);
  const lt = document.querySelector('.loading-text');
  await renderAllPortraits(p => { lt.textContent = `繪製人物 ${Math.round(p * 100)}%`; });
  lt.textContent = '生成天下地形…';
  await sleep(30);
  map = new WorldMap(app);
  stage = new Stage(app);
  app.setView(map);
  map.setActive(true);
  map.lock(true);
  map.onSelect = (id) => updateCityPanel(id);
  loop();
  document.getElementById('loading').classList.add('done');
  titleScreen();
}

// —— 標題 ——
let titleOrbit = true;
function orbitTitle() {
  let a = 0;
  const tick = () => {
    if (!titleOrbit) return;
    a += 0.0016;
    map.camera.position.set(Math.sin(a) * 150, 120, Math.cos(a) * 150);
    map.controls.target.set(0, 0, 0);
    map.camera.lookAt(0, 0, 0);
    requestAnimationFrame(tick);
  };
  tick();
}
function titleScreen() {
  clearUI();
  if (app.view !== map) app.setView(map);
  map.setActive(true);
  titleOrbit = true; orbitTitle();
  map.lock(true);
  SFX.music('map');
  const t = el('div', 'title-screen', `<div class="title-main">三國鼎立</div><div class="title-sub">魏 · 蜀 · 吳　　天下三分</div><div class="title-btns"></div>
    <div class="title-foot">大部分劇情依據《三國志》史實　·　你的每個抉擇都將改變歷史</div>`, root());
  const b = t.querySelector('.title-btns');
  el('button', 'btn primary', '新的征途', b).onclick = () => { SFX.unlock(); SFX.drum(); t.remove(); factionSelect(); };
  const cont = el('button', 'btn', '繼續遊戲', b);
  cont.disabled = !GameState.hasSave();
  cont.onclick = () => { SFX.unlock(); if (state.load()) { t.remove(); titleOrbit = false; startMap(); } };
  el('button', 'btn', '人物圖鑑', b).onclick = () => gallery();
  el('button', 'btn', '設定', b).onclick = () => settingsModal();
  el('button', 'btn', '遊戲說明', b).onclick = () => helpModal();
}

function helpModal() {
  return modal(`<h2>遊戲說明</h2><div class="help">
  <b>主線劇情</b>：選擇魏、蜀、吳其一，從西元208年赤壁之戰開始。劇情依據史實，標「史實」的選項為歷史上的真實決定、「演義」為《三國演義》的情節。每個抉擇都會改變兵力、兵法、兵器、援軍乃至歷史走向；你沒參與的史實事件也會依年份發生，除非局勢已被你改變。<br>
  <b>天下地圖</b>：點選自己的城池可以開墾（糧）、興商（金）、修築城牆、徵兵、搜索人才、任命太守。點選相鄰敵城可出兵，或先「圍城」斷其糧道。<b>外交</b>可修好、結盟、停戰、離間、贖回被俘武將。<br>
  <b>糧草</b>：每季軍隊會消耗糧草，斷糧會使士卒逃亡、戰鬥士氣下降。<b>忠誠</b>：武將忠誠過低可能叛逃，可在軍營賞賜提升。武將也會依史實年歲老去、病逝。<br>
  <b>作戰</b>：左鍵（觸控：點一下）選取部隊，再點地面移動、點敵軍攻擊。右側為兵法；左下控制速度與波次。拖曳旋轉視角、滾輪／雙指縮放、WASD 平移。<br>
  <b>地形天氣</b>：渡河時移動緩慢且防禦下降；居高臨下攻擊加成；雨天無法有效火攻、弓兵減弱；夜晚與大霧視野受限；水戰中騎兵無法上陣，可用火船順風攻擊。<br>
  <b>兵種相剋</b>：槍兵剋騎兵、騎兵剋弓兵、弓兵剋步兵、步兵剋槍兵。
  </div>`, [{ text: '明白了', primary: true }]);
}

function settingsModal() {
  const bg = el('div', 'modal-bg', '', root());
  const m = el('div', 'modal settings', '', bg);
  const draw = () => {
    m.innerHTML = `<h2>設定</h2>
      <div class="set-row"><span>音樂音量</span><input type="range" min="0" max="1" step="0.05" value="${SETTINGS.music}" data-k="music"></div>
      <div class="set-row"><span>音效音量</span><input type="range" min="0" max="1" step="0.05" value="${SETTINGS.sfx}" data-k="sfx"></div>
      <div class="set-row"><span>畫質</span><div class="seg">${Object.entries(QUALITY).map(([k, q]) => `<button class="btn small ${SETTINGS.quality === k ? 'active' : ''}" data-q="${k}">${q.name}</button>`).join('')}</div></div>
      <div class="set-row"><span>文字速度</span><div class="seg">${[['slow', '慢'], ['normal', '中'], ['fast', '快'], ['instant', '瞬間']].map(([k, n]) => `<button class="btn small ${SETTINGS.textSpeed === k ? 'active' : ''}" data-t="${k}">${n}</button>`).join('')}</div></div>
      <div class="set-row"><span>自動播放對話</span><button class="btn small ${SETTINGS.autoPlay ? 'active' : ''}" data-b="autoPlay">${SETTINGS.autoPlay ? '開' : '關'}</button></div>
      <div class="set-row"><span>已讀劇情快轉</span><button class="btn small ${SETTINGS.skipSeen ? 'active' : ''}" data-b="skipSeen">${SETTINGS.skipSeen ? '開' : '關'}</button></div>
      ${state.faction ? `<div class="set-row"><span>難度</span><div class="seg">${Object.entries(DIFF).map(([k, d]) => `<button class="btn small ${state.difficulty === k ? 'active' : ''}" data-d="${k}">${d.name}</button>`).join('')}</div></div>` : ''}
      <p class="set-note">畫質變更在下一場戰鬥或重新整理後完全生效。</p>
      <div class="modal-btns"><button class="btn primary close">完成</button></div>`;
    m.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { SETTINGS[r.dataset.k] = +r.value; SFX.applyVolume(); saveSettings(); });
    m.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { SETTINGS.quality = b.dataset.q; renderer.setPixelRatio(Math.min(devicePixelRatio, Q().pixelRatio)); saveSettings(); draw(); });
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SETTINGS.textSpeed = b.dataset.t; saveSettings(); draw(); });
    m.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { SETTINGS[b.dataset.b] = !SETTINGS[b.dataset.b]; saveSettings(); draw(); });
    m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { state.difficulty = b.dataset.d; state.save(); draw(); });
    m.querySelector('.close').onclick = () => bg.remove();
  };
  draw();
}

function factionSelect() {
  const w = el('div', 'faction-select', `<div class="fs-title">選擇你的陣營</div><div class="fs-cards"></div>
    <div class="fs-diff">難度：${Object.entries(DIFF).map(([k, d]) => `<button class="btn small ${k === 'normal' ? 'active' : ''}" data-d="${k}">${d.name}</button>`).join('')}</div>`, root());
  let diff = 'normal';
  w.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { diff = b.dataset.d; w.querySelectorAll('[data-d]').forEach(x => x.classList.toggle('active', x === b)); });
  const cards = w.querySelector('.fs-cards');
  for (const f of ['wei', 'shu', 'wu']) {
    const F = FACTIONS[f];
    const c = el('div', 'fs-card', `<div class="fs-por">${portrait(F.leader, 84)}</div><div class="big">${F.name}</div><div class="nm">${F.full}・${GENERALS[F.leader].name}</div>
      <div class="desc">${F.desc}</div><div class="meta"><span>起始：西元208年</span><span>難度：${F.difficulty}</span></div>`, cards);
    c.style.setProperty('--fc', F.css);
    c.onmouseenter = () => { titleOrbit = false; map.flyTo(f === 'shu' ? 'wuchang' : F.capital, 80, 1200); };
    c.onclick = async () => {
      SFX.drumRoll(4, 0.25);
      w.remove();
      state.newGame(f, diff);
      titleOrbit = false;
      map.recolor(); map.refreshCityColors();
      startMap();
      await sleep(300);
      playChapter();
    };
  }
  const back = el('button', 'btn small', '← 返回', w); back.style.marginTop = '16px';
  back.onclick = () => { w.remove(); titleScreen(); };
}

// —— 地圖 HUD ——
let hud = null;
function startMap() {
  titleOrbit = false;
  clearUI();
  map.recolor(); map.refreshCityColors();
  app.setView(map); map.setActive(true); map.lock(false);
  SFX.music('map');
  buildHUD();
  map.overview(1500);
}
function buildHUD() {
  hud?.top?.remove(); hud?.right?.remove(); hud?.bl?.remove(); hud?.toggle?.remove();
  hud = {};
  hud.top = el('div', 'hud-top', '', root());
  hud.right = el('div', 'hud-right', '', root());
  hud.story = el('div', 'panel story-btn', '', hud.right);
  hud.city = el('div', 'panel city-panel', '', hud.right);
  hud.actions = el('div', 'panel', '', hud.right);
  hud.bl = el('div', 'hud-bottom-left', '拖曳旋轉　右鍵／雙指平移　滾輪縮放　點選城池查看', root());
  const tg = el('button', 'btn small hud-toggle', '☰', root()); hud.toggle = tg;
  tg.onclick = () => hud.right.classList.toggle('open');
  hud.actions.innerHTML = `<h3>軍務</h3>`;
  const r1 = el('div', 'btn-row', '', hud.actions);
  el('button', 'btn', '軍營', r1).onclick = campModal;
  el('button', 'btn', '外交', r1).onclick = diplomacyModal;
  el('button', 'btn', '結束本季', hud.actions).onclick = () => endSeason();
  const row = el('div', 'btn-row', '', hud.actions);
  el('button', 'btn small', '存檔', row).onclick = () => { state.save(); toast('已存檔', 'good'); };
  el('button', 'btn small', '設定', row).onclick = settingsModal;
  el('button', 'btn small', '說明', row).onclick = helpModal;
  const mu = el('button', 'btn small', SFX.isMuted() ? '🔇' : '🔊', row); mu.onclick = () => { SFX.setMuted(!SFX.isMuted()); mu.textContent = SFX.isMuted() ? '🔇' : '🔊'; };
  el('button', 'btn small', '標題', row).onclick = async () => { if (await modal('<p>回到標題畫面？（未存檔的進度將會遺失）</p>', [{ text: '確定', primary: true, value: 1 }, { text: '取消', value: 0 }])) { hud = null; titleScreen(); } };
  updateHUD();
  updateCityPanel(map.selected);
}
function updateHUD() {
  if (!hud || !state.faction || !hud.top.isConnected) return;
  const F = state.F;
  hud.top.style.setProperty('--fc', F.css);
  hud.top.innerHTML = `<div class="emblem">${F.name}</div><div class="item fname">${F.full}</div>
    <div class="item"><span class="k">年</span><b>${state.year} ${SEASONS[state.season]}</b></div>
    <div class="item"><span class="k">金</span><b>${fmt(state.gold)}</b></div>
    <div class="item"><span class="k">糧</span><b style="color:${state.food < state.troops * 0.15 ? '#ff8a7a' : ''}">${fmt(state.food)}</b></div>
    <div class="item"><span class="k">兵</span><b>${fmt(state.troops)}</b></div>
    <div class="item"><span class="k">將</span><b>${state.generals.length}</b></div>
    <div class="item"><span class="k">城</span><b>${state.myCities().length}</b></div>
    <div class="item"><span class="k">望</span><b>${state.renown}</b></div>
    <div class="spacer"></div>
    <div class="item counts">${Object.keys(FACTIONS).filter(f => state.alive(f)).map(f => `<span style="color:${FACTIONS[f].css}">${FACTIONS[f].name}${state.citiesOf(f).length}</span>`).join(' ')}</div>`;
  const nx = nextChapter(state);
  hud.story.innerHTML = nx ? `<h3>主線劇情</h3><div class="chap">下一章：${nx.ch.title}（${nx.ch.year}年）</div>` : `<h3>天下征戰</h3><div class="chap">主線已完結。攻佔所有城池以一統天下！</div>`;
  if (nx) { const b = el('button', 'btn primary', '▶ 開始劇情', hud.story); b.onclick = playChapter; }
  map.refreshCityColors();
  updateCityPanel(map.selected);
}

function devCost(lv) { return 300 + lv * 250; }
function updateCityPanel(id) {
  if (!hud || !hud.city.isConnected) return;
  const p = hud.city;
  if (!id) { p.innerHTML = '<h3>城池</h3><div class="hint-txt">點選地圖上的城池查看詳情。<br>自己的城池可以開發內政；虛線框帶 ⚔ 者可以攻打。</div>'; return; }
  const c = CITIES[id], owner = state.owners[id], F = FACTIONS[owner];
  const mine = owner === state.faction;
  const nb = neighbors(id).map(n => `<span style="color:${FACTIONS[state.owners[n]].css}">${CITIES[n].name}</span>`).join('、');
  let html = `<h3>${c.name}　<span class="owner" style="--fc:${F.css}">${F.full}</span></h3>
    <div class="row"><span>規模</span><span>${['', '小城', '大城', '都城'][c.size]}</span></div>`;
  if (mine) {
    const d = state.dev[id];
    const acted = state.acted[id] === state.stamp();
    html += `<div class="row"><span>農業／商業／城牆</span><span>${d.agri}／${d.comm}／${d.wall}</span></div>
      <div class="row"><span>太守</span><span>${state.gov[id] ? gname(state.gov[id]) : '（無）'}</span></div>
      <div class="gens">相鄰：${nb}</div>
      <div class="dev-btns">${acted ? '<div class="hint-txt">本季政令已下達</div>' : ''}
        <button class="btn small" data-a="agri" ${d.agri >= 5 || acted ? 'disabled' : ''}>開墾 ${devCost(d.agri)}金</button>
        <button class="btn small" data-a="comm" ${d.comm >= 5 || acted ? 'disabled' : ''}>興商 ${devCost(d.comm)}金</button>
        <button class="btn small" data-a="wall" ${d.wall >= 5 || acted ? 'disabled' : ''}>築城 ${devCost(d.wall)}金</button>
        <button class="btn small" data-a="levy" ${acted ? 'disabled' : ''}>徵兵 800金</button>
        <button class="btn small" data-a="search" ${acted ? 'disabled' : ''}>搜索人才</button>
        <button class="btn small" data-a="gov">任命太守</button>
      </div>`;
  } else {
    const gens = (state.cityGenerals()[id] || []).map(gname).join('、');
    html += `<div class="row"><span>守軍</span><span>約 ${fmt(state.garrison[id])}${state.siege[id] ? `（被圍 ${state.siege[id]} 季）` : ''}</span></div>${gens ? `<div class="gens">守將：${gens}</div>` : ''}
      <div class="row"><span>關係</span><span>${FACTIONS[owner].major ? relText(state.getRel(state.faction, owner)) : '—'}${state.ally[owner] ? '・同盟' : ''}${(state.truce[owner] || 0) > state.stamp() ? '・停戰' : ''}</span></div>
      <div class="gens">相鄰：${nb}</div>`;
  }
  p.innerHTML = html;
  if (mine) p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => cityAction(id, b.dataset.a));
  if (state.canAttack(id)) { const b = el('button', 'btn primary', '⚔ 出兵攻打', p); b.onclick = () => attackCity(id); }
}
function relText(v) { return v >= 60 ? `親密 ${v}` : v >= 20 ? `友好 ${v}` : v > -20 ? `普通 ${v}` : v > -60 ? `敵視 ${v}` : `仇恨 ${v}`; }

async function cityAction(id, a) {
  const d = state.dev[id];
  const gv = GENERALS[state.gov[id]];
  const disc = gv ? 1 - gv.int / 400 : 1;
  const pay = (n) => { n = Math.round(n * disc); if (state.gold < n) { toast('金錢不足', 'bad'); return false; } state.gold -= n; return true; };
  if (a === 'gov') {
    const used = new Set(Object.values(state.gov));
    const cands = state.generals.filter(g => !GENERALS[g].ruler && (!used.has(g) || state.gov[id] === g)).sort((x, y) => GENERALS[y].int + GENERALS[y].lead - GENERALS[x].int - GENERALS[x].lead).slice(0, 8);
    if (!cands.length) { toast('沒有可任命的武將', 'bad'); return; }
    const i = await choose(`任命${CITIES[id].name}太守（太守智力越高，內政越便宜、收入越多）`, [...cands.map(g => ({ text: `${gname(g)}　智${GENERALS[g].int} 統${GENERALS[g].lead}　忠${Math.round(state.loy[g] ?? 70)}` })), { text: '取消' }]);
    if (i < cands.length) { for (const c in state.gov) if (state.gov[c] === cands[i]) delete state.gov[c]; state.gov[id] = cands[i]; state.addLoyalty(cands[i], 5); toast(`${gname(cands[i])}出任${CITIES[id].name}太守`, 'good'); }
  } else if (a === 'agri' || a === 'comm' || a === 'wall') {
    if (!pay(devCost(d[a]))) return;
    d[a]++; state.acted[id] = state.stamp();
    toast(`${CITIES[id].name}${{ agri: '農業', comm: '商業', wall: '城牆' }[a]}提升至 ${d[a]}`, 'good');
  } else if (a === 'levy') {
    if (!pay(800)) return;
    const n = 3000 + CITIES[id].size * 1500;
    state.troops += n; state.acted[id] = state.stamp(); state.renown -= 1;
    toast(`徵兵 +${n}（名望 -1）`, 'good');
  } else if (a === 'search') {
    state.acted[id] = state.stamp();
    const free = state.freeGenerals();
    const r = Math.random();
    if (free.length && r < 0.35 + state.renown / 400) {
      const g = pick(free);
      await say(g, `久聞${GENERALS[state.ruler(state.faction)]?.name || '主公'}之名，願效犬馬之勞。`);
      hideDialog();
      state.recruit(g, 70);
    } else if (r < 0.6) {
      const ws = Object.keys(WEAPONS).filter(w => !state.hasWeapon(w) && !['warship', 'muniu'].includes(w));
      if (ws.length && Math.random() < 0.5) state.gainWeapon(pick(ws)); else state.addGold(400 + Math.round(Math.random() * 600));
    } else toast('搜索一無所獲', '');
  }
  updateHUD();
}

function campModal() {
  const gens = state.generals.filter(g => GENERALS[g]).sort((a, b) => (GENERALS[b].war + GENERALS[b].lead + GENERALS[b].int) - (GENERALS[a].war + GENERALS[a].lead + GENERALS[a].int));
  modal(`<h2>軍營</h2>
    <div class="row-flex"><span>訓練等級 <b>${state.training}</b>（全軍攻擊 +${state.training * 5}%）</span><button class="btn small train" ${state.training >= 5 ? 'disabled' : ''}>操練士卒 ${800 * (state.training + 1)}金</button></div>
    <div class="sec-title">兵法（${state.tactics.length}）</div><div class="chips">${Object.entries(TACTICS).map(([k, t]) => `<span class="chip ${state.hasTactic(k) ? '' : 'off'}" title="${t.desc}">${t.name}</span>`).join('')}</div>
    <div class="sec-title">兵器（${state.weapons.length}）</div><div class="chips">${Object.entries(WEAPONS).map(([k, w]) => `<span class="chip ${state.hasWeapon(k) ? '' : 'off'}" title="${w.desc}">${w.name}</span>`).join('')}</div>
    <div class="sec-title">武將（${gens.length}）　點擊查看 3D 模型；忠誠低於 30 可能叛逃</div>
    <div class="roster">${gens.map(g => { const G = GENERALS[g]; const loy = Math.round(state.loy[g] ?? 70); return `<div class="gcard" data-g="${g}">${portrait(g, 52)}<div style="flex:1"><div class="gn">${G.name} <small>${state.year - G.life[0]}歲</small></div><div class="st">武${G.war} 統${G.lead} 智${G.int}</div><div class="st">忠誠 <b style="color:${loy < 40 ? '#ff8a7a' : '#cfe'}">${G.ruler ? '—' : loy}</b>${G.ruler ? '' : ` <button class="btn small gift" data-g="${g}">賞賜</button>`}</div></div></div>`; }).join('')}</div>
    ${state.prisoners.length ? `<div class="sec-title">獄中俘虜</div><div class="chips">${state.prisoners.map(g => `<span class="chip">${gname(g)}</span>`).join('')}</div>` : ''}`,
    [{ text: '關閉', primary: true }]);
  const tr = document.querySelector('.modal .train');
  if (tr) tr.onclick = () => { const c = 800 * (state.training + 1); if (state.gold < c) return toast('金錢不足', 'bad'); state.gold -= c; state.training++; toast(`訓練等級提升至 ${state.training}`, 'good'); document.querySelector('.modal-bg').remove(); campModal(); updateHUD(); };
  document.querySelectorAll('.roster .gift').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (state.gold < 300) return toast('金錢不足', 'bad'); state.gold -= 300; state.addLoyalty(b.dataset.g, 15); toast(`賞賜${gname(b.dataset.g)}，忠誠 +15`, 'good'); document.querySelector('.modal-bg').remove(); campModal(); updateHUD(); });
  document.querySelectorAll('.roster .gcard').forEach(c => { c.style.cursor = 'pointer'; c.onclick = () => heroViewer(c.dataset.g); });
}

// —— 外交 ——
function diplomacyModal() {
  const majors = ['wei', 'shu', 'wu'].filter(f => f !== state.faction && state.alive(f));
  const minors = Object.keys(FACTIONS).filter(f => !FACTIONS[f].major && state.alive(f));
  const bestInt = Math.max(...state.generals.map(g => GENERALS[g].int));
  const bg = el('div', 'modal-bg', '', root());
  const m = el('div', 'modal diplo', '', bg);
  const draw = () => {
    const capt = Object.entries(state.gfac).filter(([g, v]) => typeof v === 'string' && v.startsWith('captive:') && !state.dead.includes(g));
    m.innerHTML = `<h2>外交</h2><p class="hint-txt">使者智力：${bestInt}（越高成功率越高）　持有金 ${fmt(state.gold)}</p>
      ${[...majors, ...minors].map(f => {
        const rel = state.getRel(state.faction, f), F = FACTIONS[f];
        const tr = (state.truce[f] || 0) > state.stamp();
        return `<div class="dip-row" style="--fc:${F.css}"><div class="dip-f">${portrait(state.ruler(f), 46)}<div><b style="color:${F.css}">${F.full}</b><div class="hint-txt">${state.citiesOf(f).length}城・${relText(rel)}${state.ally[f] ? '・<b>同盟</b>' : ''}${tr ? '・停戰中' : ''}</div></div></div>
        <div class="dip-a">
          <button class="btn small" data-f="${f}" data-a="gift">遣使修好 500金</button>
          ${state.ally[f] ? `<button class="btn small" data-f="${f}" data-a="break">解除同盟</button>` : `<button class="btn small" data-f="${f}" data-a="ally" ${rel < 50 ? 'disabled' : ''}>締結同盟</button>`}
          <button class="btn small" data-f="${f}" data-a="truce" ${tr || state.ally[f] ? 'disabled' : ''}>請求停戰 1000金</button>
          ${F.major ? `<button class="btn small" data-f="${f}" data-a="split">離間 800金</button>` : `<button class="btn small" data-f="${f}" data-a="annex" ${state.citiesOf(f).length > 2 ? 'disabled' : ''}>勸降</button>`}
        </div></div>`;
      }).join('')}
      ${capt.length ? `<div class="sec-title">被俘武將</div>${capt.map(([g, v]) => `<div class="dip-row"><span>${gname(g)}（${FACTIONS[v.split(':')[1]]?.full || ''}）</span><button class="btn small" data-g="${g}">贖回 1500金</button></div>`).join('')}` : ''}
      <div class="modal-btns"><button class="btn primary close">關閉</button></div>`;
    m.querySelector('.close').onclick = () => bg.remove();
    m.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { diplo(b.dataset.f, b.dataset.a, bestInt); draw(); updateHUD(); });
    m.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      if (state.gold < 1500) return toast('金錢不足', 'bad');
      const g = b.dataset.g, f = state.gfac[g].split(':')[1];
      if (Math.random() < 0.4 + (state.getRel(state.faction, f) + 100) / 400) { state.gold -= 1500; delete state.gfac[g]; state.recruit(g, 75); }
      else { state.gold -= 500; toast('對方拒絕放人（使者旅費 500 金）', 'bad'); }
      draw(); updateHUD();
    });
  };
  draw();
}
function diplo(f, a, int) {
  const me = state.faction, rel = state.getRel(me, f);
  const succ = (base) => Math.random() < clamp(base + (int - 70) / 120 + rel / 300 + (state.renown - 50) / 300, 0.05, 0.95);
  const pay = (n) => { if (state.gold < n) { toast('金錢不足', 'bad'); return false; } state.gold -= n; return true; };
  if (a === 'gift') { if (!pay(500)) return; const n = 8 + Math.round(Math.random() * 10); state.addRel(me, f, n); toast(`與${FACTIONS[f].full}關係 +${n}`, 'good'); }
  if (a === 'ally') { if (succ(0.5)) { state.ally[f] = true; state.addRel(me, f, 10); toast(`與${FACTIONS[f].full}締結同盟！`, 'good'); } else { state.addRel(me, f, -5); toast('對方拒絕結盟', 'bad'); } }
  if (a === 'break') { delete state.ally[f]; state.addRel(me, f, -40); state.renown -= 10; toast('解除同盟（名望 -10）', 'bad'); }
  if (a === 'truce') { if (!pay(1000)) return; if (succ(0.45)) { state.truce[f] = state.stamp() + 4; toast(`與${FACTIONS[f].full}停戰一年`, 'good'); } else toast('對方拒絕停戰', 'bad'); }
  if (a === 'split') {
    if (!pay(800)) return;
    const others = ['wei', 'shu', 'wu'].filter(x => x !== me && x !== f && state.alive(x));
    if (!others.length) return toast('沒有可離間的對象', '');
    const o = others[0];
    if (succ(0.4)) { state.addRel(f, o, -35); toast(`離間成功：${FACTIONS[f].full}與${FACTIONS[o].full}關係惡化`, 'good'); }
    else { state.addRel(me, f, -10); toast('離間之計被識破！', 'bad'); }
  }
  if (a === 'annex') {
    const myPow = state.troops, theirs = state.citiesOf(f).reduce((s, c) => s + state.garrison[c], 0);
    if (Math.random() < clamp(0.2 + (myPow / Math.max(1, theirs) - 2) * 0.1 + (state.renown - 50) / 200, 0.05, 0.8)) {
      for (const c of state.citiesOf(f)) { state.owners[c] = me; state.garrison[c] = 3000; }
      for (const g of state.availableGenerals(f)) state.recruit(g, 55);
      map.recolor(); map.refreshCityColors();
      toast(`${FACTIONS[f].full}舉眾來降！`, 'good');
    } else toast('對方拒絕歸降', 'bad');
  }
}

// —— 武將 3D 檢視 ——
function heroViewer(id, list = null) {
  const bg = el('div', 'modal-bg', '', root());
  bg.style.zIndex = 70;
  const m = el('div', 'modal hero-view', '', bg);
  let v = null, idx = list ? list.indexOf(id) : -1;
  const draw = () => {
    v?.dispose();
    const G = GENERALS[id], F = FACTIONS[G.f], spec = HERO[id];
    m.innerHTML = `<div class="hv-stage"></div><div class="hv-info">${portrait(id, 110)}
      <div class="hv-name" style="color:${F.css}">${G.name}</div><div class="hv-title">${F.full}・${G.title || ''}　（${G.life[0]}－${G.life[1]}）</div>
      <div class="hv-stats"><div>武力<b>${G.war}</b></div><div>統率<b>${G.lead}</b></div><div>智力<b>${G.int}</b></div></div>
      <div class="hv-bio">${spec?.bio || '　'}</div>
      <div class="hv-btns"><button class="btn small tg">騎乘 / 步行</button>${list ? '<button class="btn small pv">◀</button><button class="btn small nx">▶</button>' : ''}<button class="btn small primary cl">關閉</button></div>
      <div class="hv-tip">拖曳旋轉模型${list ? `　${idx + 1} / ${list.length}` : ''}</div></div>`;
    v = openViewer(m.querySelector('.hv-stage'), id, F.color);
    m.querySelector('.tg').onclick = () => v.toggleMount();
    m.querySelector('.cl').onclick = () => { v.dispose(); bg.remove(); };
    if (list) {
      m.querySelector('.pv').onclick = () => { idx = (idx - 1 + list.length) % list.length; id = list[idx]; draw(); };
      m.querySelector('.nx').onclick = () => { idx = (idx + 1) % list.length; id = list[idx]; draw(); };
    }
  };
  draw();
}
function gallery() {
  const ids = Object.keys(HERO).filter(k => GENERALS[k]);
  heroViewer(ids[0], ids);
}

// —— 戰鬥 ——
async function fade(on) {
  let f = document.querySelector('.fade-black');
  if (!f) f = el('div', 'fade-black', '', root());
  await sleep(20);
  f.classList.toggle('on', on);
  await sleep(650);
}
function showHUD(on) { if (hud && hud.top.isConnected) for (const k of ['top', 'right', 'bl', 'toggle']) hud[k].style.display = on ? '' : 'none'; }
async function doBattle(cfg) {
  if (state.troops < 1000) {
    await modal('<h2>兵力不足</h2><p>可用兵力不足一千，只得緊急徵召鄉勇五千人。</p>');
    state.troops += 5000;
  }
  cfg.runSteps = runSteps;
  await fade(true);
  map.setActive(false);
  showHUD(false);
  const b = new Battle(app, state, cfg);
  const runP = b.run();
  await sleep(100);
  fade(false);
  let res;
  try { res = await runP; }
  catch (e) { console.error(e); res = { result: 'lose', pLost: 0, eLost: 0, captives: 0, gold: 0, capturedGenerals: [], lostGenerals: [], participants: [] }; }
  hideDialog();
  b.paused = true;
  await sleep(600);
  SFX.music(res.result === 'win' ? 'story' : 'tense');
  await showResults(state, res, cfg);
  if (FACTIONS[b.ef]?.major) state.addRel(state.faction, b.ef, -6);
  await fade(true);
  b.dispose();
  app.setView(map); map.setActive(true);
  showHUD(true);
  updateHUD();
  fade(false);
  SFX.music(playing ? 'story' : 'map');
  state.save();
  return res;
}

// —— 劇情執行 ——
let inStage = false;
async function enterStage(kind, fac, actors) {
  if (!inStage) await fade(true);
  stage.set(kind, { faction: fac || state.faction });
  for (const [id, x, z, yaw, y] of actors || []) stage.addActor(id, x, z, (yaw || 0) + Math.PI, { y: y || 0 });
  app.setView(stage); map.setActive(false);
  showHUD(false);
  DLG.hook = (sp) => { if (inStage) { stage.talking = sp; if (sp && sp !== 'narr') { stage.ensure(sp); stage.shot(sp); } else stage.wide(); } };
  stage.wide(10);
  if (!inStage) fade(false);
  inStage = true;
}
async function leaveStage() {
  if (!inStage) return;
  await fade(true);
  inStage = false; DLG.hook = null;
  app.setView(map); map.setActive(true); map.lock(true);
  showHUD(true); if (hud) hud.right.style.visibility = 'hidden';
  fade(false);
}
const NUM = '零一二三四五六七八九十';
const zh = (n) => n <= 10 ? NUM[n] : n < 20 ? '十' + NUM[n - 10] : NUM[Math.floor(n / 10)] + '十' + (n % 10 ? NUM[n % 10] : '');
async function runSteps(steps) {
  for (const st of steps || []) {
    const [k, a, b, c] = st;
    if (inStage && ['cam', 'overview', 'owner', 'march'].includes(k)) await leaveStage();
    switch (k) {
      case 'title': hideDialog(); await titleCard(a.replace(/^第.+?章/, `第${zh(chapterNo)}章`), b); break;
      case 'stage': hideDialog(); await enterStage(a, b, c); break;
      case 'act': if (inStage) await stage.act(a, b, c); break;
      case 'effect': if (inStage) await stage.effect(a, b); break;
      case 'cam': await map.flyTo(a, b || 55, 1600); break;
      case 'overview': hideDialog(); await map.overview(1600); break;
      case 'narr': await say('narr', a); break;
      case 'say': await say(a, b); break;
      case 'choice': {
        if (DLG.fast) { DLG.fast = false; document.querySelector('.dlg-ff')?.classList.remove('on'); }
        const i = await choose(a, b.map(o => ({ text: o.t, hint: o.hint, hist: o.hist, yy: o.yy })));
        const o = b[i];
        state.choices++; if (o.hist) state.hist++;
        if (o.fx) await o.fx(state);
        await flushLearn();
        if (o.then) await runSteps(o.then);
        break;
      }
      case 'fx': await a(state); break;
      case 'march': hideDialog(); await map.march(a, b, c); break;
      case 'owner': hideDialog(); state.owners[a] = b; await map.changeOwner(a, b, true); updateHUD(); break;
      case 'note': hideDialog(); await noteCard(a); break;
      case 'battle': {
        hideDialog();
        const wasStage = inStage; if (inStage) { inStage = false; DLG.hook = null; }
        const cfg = typeof a === 'function' ? a(state) : a;
        const res = await doBattle(cfg);
        if (wasStage) { map.lock(true); if (hud) hud.right.style.visibility = 'hidden'; }
        await runSteps(res.result === 'win' ? b : c);
        break;
      }
      case 'if': await runSteps(a(state) ? b : c); break;
      case 'ending': hideDialog(); if (inStage) await leaveStage(); await showEnding(false); break;
    }
    await flushLearn();
  }
}

let playing = false, chapterNo = 1;
async function playChapter() {
  if (playing) return;
  await applyWorld();
  const nx = nextChapter(state);
  if (!nx) return;
  playing = true;
  map.lock(true);
  if (hud) hud.right.style.visibility = 'hidden';
  state.year = Math.max(state.year, nx.ch.year);
  if (state.year === nx.ch.year) state.season = Math.min(state.season, 1);
  const key = state.faction + nx.idx;
  chapterNo = Object.keys(state.seenCh).length + 1;
  const seen = (() => { try { return JSON.parse(localStorage.getItem('sgz-seen') || '{}'); } catch (e) { return {}; } })();
  DLG.fast = SETTINGS.skipSeen && !!seen[key];
  document.querySelector('.dlg-ff')?.classList.toggle('on', DLG.fast);
  for (const t of state.lifeEvents()) toast(t);
  await applyWorld();
  updateHUD();
  SFX.music('story');
  try { await runSteps(nx.ch.steps); }
  catch (e) { console.error(e); toast('劇情執行發生錯誤：' + e.message, 'bad'); }
  hideDialog();
  if (inStage) await leaveStage();
  DLG.fast = false;
  seen[key] = 1; try { localStorage.setItem('sgz-seen', JSON.stringify(seen)); } catch (e) { }
  state.seenCh[key] = 1;
  state.chapter = nx.idx + 1;
  if (!nextChapter(state)) state.storyDone = true;
  await applyWorld();
  state.save();
  playing = false;
  map.lock(false);
  if (hud) hud.right.style.visibility = '';
  SFX.music('map');
  updateHUD();
  map.overview(1500);
  checkGameEnd();
}

// 史實事件
async function applyWorld() {
  const evs = pendingWorld(state);
  for (const e of evs) {
    await titleCard(`${e.y}年`, e.text, 1600);
    for (const g of e.kills) state.kill(g);
    for (const c of e.cities) { state.owners[c] = e.to; state.garrison[c] = Math.max(state.garrison[c], 8000); await map.changeOwner(c, e.to, true); }
    toast(`【天下大勢】${e.text}`, '');
  }
  if (evs.length) { updateHUD(); await map.overview(1000); }
}

// —— 結局 ——
async function showEnding(unified) {
  const E = evaluateEnding(state, unified);
  await titleCard(E.title, `${state.year}年　${state.F.full}`, 3200);
  const stars = Math.min(5, 1 + Math.floor(E.cities / E.total * 5) + (E.renown >= 70 ? 1 : 0));
  await modal(`<div class="result-big win">${unified ? '統' : '終'}</div><h2>${E.title}</h2>
    <p style="text-align:center;max-width:560px;margin:0 auto">${E.text}</p>
    <div class="res-grid"><div><span class="k">城池</span>　${E.cities} / ${E.total}</div><div><span class="k">名望</span>　${E.renown}${E.virtue ? `（${E.virtue}）` : ''}</div>
    <div><span class="k">遵循史實</span>　${E.histRate}%</div><div><span class="k">評價</span>　${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}</div></div>
    <p class="hint-txt" style="text-align:center">${unified ? '' : '主線劇情已完結，你可以繼續在地圖上征戰，一統天下。'}</p>`,
    [{ text: unified ? '回到標題' : '繼續征戰', primary: true }]);
}

// —— 天下征戰 ——
const FWEAP = { wei: ['armor'], shu: ['crossbow', 'spear'], wu: ['warship'] };
function campaignBattle(target, attackerF, defenderF, playerAttacks, opts = {}) {
  const c = CITIES[target];
  const [x, z] = toXZ(c.lon, c.lat);
  const elev = heightAtXZ(x, z);
  const terrain = opts.field ? (elev > 3.5 ? 'mountain' : 'plains') : (c.size >= 2 ? 'siege' : (elev > 3.5 ? 'mountain' : 'plains'));
  const enemyF = playerAttacks ? defenderF : attackerF;
  let top;
  if (playerAttacks) top = state.cityGenerals()[target] || [];
  else {
    // 來犯敵軍：由出發城的守將率領
    const cg = state.cityGenerals();
    const src = neighbors(target).filter(n => state.owners[n] === enemyF).sort((a, b) => (cg[b]?.length || 0) - (cg[a]?.length || 0))[0];
    top = (cg[src] || []).slice(0, 3);
  }
  const allT = Object.keys(TACTICS).filter(t => !['ambush', 'fireship', 'raid'].includes(t));
  const tactics = [...new Set([pick(allT), pick(allT), 'drum', 'volley'])];
  const troops = playerAttacks ? state.garrison[target] : Math.round((18000 + Math.random() * 14000 + (state.year - 208) * 500) * state.D.ai);
  const weather = Math.random() < 0.18 ? (state.season === 3 && c.lat > 30 ? 'snow' : 'rain') : Math.random() < 0.08 ? 'fog' : null;
  return {
    name: `${c.name}之戰`, sub: `${FACTIONS[attackerF].full}進攻${FACTIONS[defenderF].full}`,
    terrain, attacker: playerAttacks ? 'player' : 'enemy', cityName: c.name, time: opts.night ? 'night' : pick(['day', 'day', 'dusk', 'dawn']), weather,
    forest: terrain === 'mountain' ? 'sides' : (Math.random() < 0.3 ? 'sides' : null), river: Math.random() < 0.2, riverMid: terrain === 'plains' && Math.random() < 0.2,
    enemy: { faction: enemyF, leader: top[0], generals: top, troops, tactics, weapons: [...(FWEAP[enemyF] || []), ...(!playerAttacks ? ['ladder', 'ram'] : [])], formation: pick(['yulin', 'fengshi', 'heyi', 'fangyuan', 'yanxing']) },
    gateHP: 3000 + c.size * 1500, seed: Math.floor(Math.random() * 1000),
    wallLevel: playerAttacks ? 1 : state.dev[target]?.wall || 1,
    enemyMorale: playerAttacks && state.siege[target] ? Math.max(45, 100 - state.siege[target] * 18) : undefined,
    nightRaid: opts.night ? 'p' : null,
  };
}

async function attackCity(id) {
  if (playing) return;
  const c = CITIES[id], owner = state.owners[id];
  const from = neighbors(id).find(n => state.owns(n));
  const cost = Math.round(state.troops * 0.06);
  const opts = [
    { text: '擂鼓出征', primary: true, value: 'go' },
    ...(c.size >= 2 ? [{ text: '野戰誘敵', value: 'field' }] : []),
    ...(state.hasTactic('raid') ? [{ text: '夜襲劫營', value: 'night' }] : []),
    { text: '圍城斷糧', value: 'siege' },
    { text: '暫緩', value: 0 },
  ];
  const k = await modal(`<h2>出兵　${c.name}</h2><p>目標：${FACTIONS[owner].full}・${c.name}（${['', '小城', '大城', '都城'][c.size]}）<br>守軍約 <b>${fmt(state.garrison[id])}</b>　我軍可用兵力 <b>${fmt(state.troops)}</b><br>軍糧消耗約 <b>${fmt(cost)}</b>（持有 ${fmt(state.food)}）</p>
    <p class="hint-txt">出兵耗費一季。野戰誘敵：在城外野戰，獲勝可大幅削弱守軍。圍城：不戰而使守軍每季減少三成、士氣下降，久圍可能開城投降。</p>`, opts);
  if (!k) return;
  if (state.food < cost) { toast('糧草不足以支撐出征！', 'bad'); return; }
  state.food -= cost;
  if (k === 'siege') {
    state.siege[id] = (state.siege[id] || 0) + 1;
    state.garrison[id] = Math.round(state.garrison[id] * 0.7);
    toast(`圍困${c.name}（第 ${state.siege[id]} 季），守軍減至 ${fmt(state.garrison[id])}`, 'good');
    if (state.siege[id] >= 3 && Math.random() < 0.4) { toast(`${c.name}糧盡，開城投降！`, 'good'); state.owners[id] = state.faction; state.garrison[id] = 3000; delete state.siege[id]; await map.changeOwner(id, state.faction, true); }
    await endSeason(true);
    return;
  }
  playing = true; map.lock(true);
  if (hud) hud.right.style.visibility = 'hidden';
  await map.march(from, id, state.faction);
  const res = await doBattle(campaignBattle(id, state.faction, owner, true, { field: k === 'field', night: k === 'night' }));
  delete state.siege[id];
  if (res.result === 'win') {
    if (k === 'field') {
      state.garrison[id] = Math.max(2000, Math.round(state.garrison[id] * 0.3));
      toast(`野戰告捷！${c.name}守軍僅剩 ${fmt(state.garrison[id])}`, 'good');
    } else {
      state.owners[id] = state.faction;
      state.garrison[id] = 3000;
      await map.changeOwner(id, state.faction, true);
      toast(`攻佔${c.name}！`, 'good');
    }
  } else {
    state.garrison[id] = Math.max(3000, state.garrison[id] - res.eLost);
  }
  playing = false; map.lock(false);
  if (hud) hud.right.style.visibility = '';
  await endSeason(true);
}

async function endSeason(fromBattle = false) {
  if (playing && !fromBattle) return;
  for (const c in state.siege) state.food -= 2000;
  state.advanceSeason();
  updateHUD();
  await applyWorld();
  // 敵國行動（依關係、同盟、停戰、難度決定）
  const D = state.D;
  const ai = ['wei', 'shu', 'wu'].filter(f => f !== state.faction && state.alive(f));
  for (const f of ai) {
    const fronts = [];
    for (const [city, o] of Object.entries(state.owners)) {
      if (o !== f) continue;
      for (const n of neighbors(city)) {
        const t = state.owners[n];
        if (t === f) continue;
        if (t === state.faction && (state.ally[f] || (state.truce[f] || 0) > state.stamp())) continue;
        if (!state.storyDone && t !== state.faction) continue;
        const rel = FACTIONS[t].major ? state.getRel(f, t) : -50;
        fronts.push([city, n, rel]);
      }
    }
    if (!fronts.length) continue;
    fronts.sort((a, b) => a[2] - b[2]);
    const [src, tgt, rel] = fronts[Math.floor(Math.random() * Math.min(3, fronts.length))];
    const chance = (state.storyDone ? 0.45 : 0.15) * D.ai * (1 + Math.max(0, -rel) / 100) * (rel > 30 ? 0.3 : 1);
    if (Math.random() > chance) continue;
    const tOwner = state.owners[tgt];
    if (tOwner === state.faction) {
      playing = true; map.lock(true);
      await map.march(src, tgt, f);
      const k = await modal(`<h2>急報！</h2><p>${FACTIONS[f].full}大軍來犯<b>${CITIES[tgt].name}</b>！（城牆等級 ${state.dev[tgt].wall}）</p>`, [{ text: '迎戰', primary: true, value: 1 }, { text: '棄城撤退', value: 0 }]);
      if (k) {
        const res = await doBattle(campaignBattle(tgt, f, state.faction, false));
        if (res.result === 'lose') { state.owners[tgt] = f; await map.changeOwner(tgt, f, true); }
      } else { state.owners[tgt] = f; await map.changeOwner(tgt, f, true); }
      playing = false; map.lock(false);
    } else if (state.storyDone) {
      const win = Math.random() < 0.4;
      await map.march(src, tgt, f, 1600);
      if (win) { state.owners[tgt] = f; await map.changeOwner(tgt, f, true); toast(`${FACTIONS[f].full}攻佔了${CITIES[tgt].name}`, ''); }
      else toast(`${FACTIONS[f].full}進攻${CITIES[tgt].name}失利`, '');
    }
  }
  updateHUD();
  state.save();
  checkGameEnd();
}

async function checkGameEnd() {
  const mine = state.myCities().length;
  const total = Object.keys(CITIES).length;
  if (mine === total) {
    await showEnding(true);
    titleScreen();
  } else if (mine === 0) {
    await modal(`<div class="result-big lose">亡</div><h2>國破家亡</h2><p style="text-align:center">${state.F.full}已失去所有城池……</p>`, [{ text: '回到標題', primary: true }]);
    titleScreen();
  }
}

window.SGZ = { state, app, doBattle, runSteps, playChapter, startMap, STORY, get map() { return map; }, get stage() { return stage; }, enterStage, leaveStage, applyWorld };
boot();
