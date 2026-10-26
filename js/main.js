// 主程式：畫面流程、地圖介面、劇情執行、內政外交、天下征戰
import * as THREE from 'three';
import { WorldMap, heightAtXZ, toXZ } from './worldmap.js';
import { Battle, showResults, autoBattle } from './battle.js';
import { GameState, DIFF } from './state.js';
import { STORY, nextChapter } from './story.js';
import { FACTIONS, GENERALS, CITIES, TACTICS, WEAPONS, SEASONS, MODERN, RARITY, neighbors, gname, factionAt } from './data.js';
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

// 手機版面：觸控且短邊小於 600px（以 iPhone 15 Pro 393×852 為基準）
const PHONE = () => { const s = Math.min(innerWidth, innerHeight), l = Math.max(innerWidth, innerHeight); return (SETTINGS.mobile && s < 600) || (s < 500 && l < 1000); };
function applyLayoutClass() {
  document.body.classList.toggle('phone', PHONE());
  document.body.classList.toggle('touch', !!SETTINGS.mobile);
  document.body.classList.toggle('portrait', innerHeight > innerWidth);
  document.body.classList.toggle('landscape', innerHeight <= innerWidth);
}
applyLayoutClass();

const state = new GameState();
const app = { renderer, state, view: null, setView(v) { this.view = v; }, openShop: (t, cb) => shopModal(t, cb) };
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
  const was = document.body.classList.contains('phone');
  applyLayoutClass();
  if (was !== PHONE() && hud && hud.top?.isConnected) buildHUD();
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
  <b>兵種相剋</b>：槍兵剋騎兵、騎兵剋弓兵、弓兵剋步兵、步兵剋槍兵。<br>
  <b>攻守城</b>：攻城時兵力最多的兩隊步兵、槍兵撞門（有【衝車】推衝車，否則扛撞木），其餘部隊同時架雲梯攀城；人人都有雲梯可攀城（基本軍備），【井闌】讓弓兵壓制城頭、【霹靂車】投石。守城時城門未破，守軍只能留在城內或城頭；可對部隊下令「出城突擊」，城門會打開（敵軍也可趁機衝入）。<br>
  <b>伏兵</b>：山地、林地或劇情允許時，布陣表中可勾選「設為伏兵」，部隊會藏於兩側山林，敵軍接近或按【伏】時殺出。<br>
  <b>市集</b>：可用金錢購買兵書（學習兵法）、兵器，以及糧草、僱傭兵、戰馬。
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
    <div class="fs-diff">難度：${Object.entries(DIFF).map(([k, d]) => `<button class="btn small ${k === 'normal' ? 'active' : ''}" data-d="${k}">${d.name}</button>`).join('')}
    <button class="btn small fs-tt" title="自帶「穿越系統」：轉轉盤獲得現代武器與裝備">⚡ 穿越模式：關</button></div>`, root());
  let diff = 'normal', tt = false;
  const ttb = w.querySelector('.fs-tt');
  ttb.onclick = () => { tt = !tt; ttb.classList.toggle('active', tt); ttb.textContent = `⚡ 穿越模式：${tt ? '開' : '關'}`; };
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
      state.newGame(f, diff, tt);
      titleOrbit = false;
      map.recolor(); map.refreshCityColors();
      startMap();
      await sleep(300);
      if (tt) {
        await modal(`<h2>⚡ 穿越系統啟動</h2><p>一陣白光過後，你睜開雙眼——竟已身在東漢末年的${F.full}軍中。</p>
          <p>腦中響起冰冷的聲音：「<b>穿越系統</b>綁定成功。宿主每季可獲得一次轉盤機會，戰勝亦可獲得；轉盤可抽出現代武器與裝備。新手禮包：轉盤 ×3。」</p>
          <p class="hint-txt">地圖介面的「系統」按鈕可隨時開啟轉盤。</p>`, [{ text: '開啟系統', primary: true, value: 1 }, { text: '稍後再說', value: 0 }]) && await systemModal();
      }
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
  if (PHONE()) return buildPhoneHUD();
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
  el('button', 'btn', '市集', r1).onclick = () => shopModal();
  if (state.timeTravel) el('button', 'btn tt-btn', '⚡ 系統', r1).onclick = () => systemModal();
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
// 手機：上方精簡資訊列、下方工具列、點城池才出現的小卡片
function buildPhoneHUD() {
  hud.phone = true;
  hud.top = el('div', 'hud-top', '', root());
  hud.right = el('div', 'm-hud', '', root());
  hud.story = el('div', 'm-chap', '', hud.right);
  hud.city = el('div', 'm-city', '', hud.right);
  hud.actions = el('div', 'm-dock', '', hud.right);
  hud.bl = el('div', 'hidden-el', '', root()); hud.toggle = el('div', 'hidden-el', '', root());
  const dock = [['營', '軍營', campModal], ['交', '外交', diplomacyModal], ['市', '市集', () => shopModal()], ['季', '下一季', () => endSeason()], ['⋯', '更多', () => moreMenu()]];
  if (state.timeTravel) dock.splice(3, 0, ['⚡', '系統', () => systemModal()]);
  for (const [ic, name, fn] of dock) { const b = el('button', 'm-btn', `<span class="m-ic">${ic}</span><span>${name}</span>`, hud.actions); b.onclick = fn; }
  updateHUD();
  updateCityPanel(map.selected);
}
function moreMenu() {
  const items = [['存檔', () => { state.save(); toast('已存檔', 'good'); }], ['設定', settingsModal], ['說明', helpModal],
    [SFX.isMuted() ? '開啟聲音' : '靜音', () => SFX.setMuted(!SFX.isMuted())],
    ['回到標題', async () => { if (await modal('<p>回到標題畫面？（未存檔的進度將會遺失）</p>', [{ text: '確定', primary: true, value: 1 }, { text: '取消', value: 0 }])) { hud = null; titleScreen(); } }]];
  modal(`<div class="m-more">${items.map((x, i) => `<button class="btn" data-i="${i}">${x[0]}</button>`).join('')}</div>`, [{ text: '關閉' }], 'm-more-modal');
  document.querySelectorAll('.m-more [data-i]').forEach(b => b.onclick = () => { document.querySelector('.m-more-modal')?.parentElement.remove(); items[+b.dataset.i][1](); });
}

function updateHUD() {
  if (!hud || !state.faction || !hud.top.isConnected) return;
  if (hud.phone) {
    const F = state.F;
    hud.top.style.setProperty('--fc', F.css);
    hud.top.innerHTML = `<div class="emblem">${F.name}</div><div class="item"><b>${state.year}${SEASONS[state.season]}</b></div>
      <div class="item"><span class="k">金</span><b>${fmt(state.gold)}</b></div><div class="item"><span class="k">糧</span><b style="color:${state.food < state.troops * 0.15 ? '#ff8a7a' : ''}">${fmt(state.food)}</b></div>
      <div class="item"><span class="k">兵</span><b>${fmt(state.troops)}</b></div><div class="item"><span class="k">城</span><b>${state.myCities().length}</b></div>`;
    const nx = nextChapter(state);
    hud.story.innerHTML = nx ? `<button class="btn primary m-play">▶ 劇情：${nx.ch.title}</button>` : '';
    hud.story.querySelector('.m-play')?.addEventListener('click', playChapter);
    map.refreshCityColors();
    updateCityPanel(map.selected);
    return;
  }
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
  if (hud.phone) return updatePhoneCity(id);
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
function updatePhoneCity(id) {
  const p = hud.city;
  p.classList.toggle('show', !!id);
  if (!id) { p.innerHTML = ''; return; }
  const c = CITIES[id], owner = state.owners[id], F = FACTIONS[owner], mine = owner === state.faction;
  let html = `<div class="mc-head"><b>${c.name}</b><span class="owner" style="--fc:${F.css}">${F.full}</span><span class="mc-sz">${['', '小城', '大城', '都城'][c.size]}</span><button class="mc-x">✕</button></div>`;
  if (mine) {
    const d = state.dev[id], acted = state.acted[id] === state.stamp();
    html += `<div class="mc-info">農${d.agri}・商${d.comm}・城${d.wall}　太守：${state.gov[id] ? gname(state.gov[id]) : '無'}${acted ? '　<span class="adv-no">本季已下令</span>' : ''}</div>
      <div class="mc-btns">
        <button class="btn small" data-a="agri" ${d.agri >= 5 || acted ? 'disabled' : ''}>開墾<small>${devCost(d.agri)}</small></button>
        <button class="btn small" data-a="comm" ${d.comm >= 5 || acted ? 'disabled' : ''}>興商<small>${devCost(d.comm)}</small></button>
        <button class="btn small" data-a="wall" ${d.wall >= 5 || acted ? 'disabled' : ''}>築城<small>${devCost(d.wall)}</small></button>
        <button class="btn small" data-a="levy" ${acted ? 'disabled' : ''}>徵兵<small>800</small></button>
        <button class="btn small" data-a="search" ${acted ? 'disabled' : ''}>搜才</button>
        <button class="btn small" data-a="gov">太守</button>
      </div>`;
  } else {
    const gens = (state.cityGenerals()[id] || []).map(gname).join('、');
    html += `<div class="mc-info">守軍約 ${fmt(state.garrison[id])}${state.siege[id] ? `（被圍${state.siege[id]}季）` : ''}${gens ? `　守將：${gens}` : ''}${FACTIONS[owner].major ? `　${relText(state.getRel(state.faction, owner))}` : ''}</div>`;
    if (state.canAttack(id)) html += `<div class="mc-btns one"><button class="btn primary mc-atk">⚔ 出兵攻打</button></div>`;
  }
  p.innerHTML = html;
  p.querySelector('.mc-x').onclick = () => map.select(null);
  if (mine) p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => cityAction(id, b.dataset.a));
  p.querySelector('.mc-atk')?.addEventListener('click', () => attackCity(id));
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
    ${state.prisoners.length ? `<div class="sec-title">獄中俘虜（${state.prisoners.length}）　每季可勸降一次</div><div class="prison">${state.prisoners.filter(g => GENERALS[g]).map(g => { const G = GENERALS[g], f = factionAt(g, state.year), alive = f && FACTIONS[f] && state.alive(f) && f !== state.faction, tried = state.flags['pers_' + g] === state.stamp(); return `<div class="pcard" data-g="${g}">${portrait(g, 40)}<div class="pinfo"><b>${G.name}</b> <small>${alive ? FACTIONS[f].name : '無主'}・武${G.war} 智${G.int}</small></div>
      <div class="pbtns"><button class="btn small" data-a="pers" ${tried ? 'disabled' : ''}>${tried ? '已勸' : '勸降'}</button><button class="btn small" data-a="free">釋放</button>${alive ? `<button class="btn small" data-a="ransom">贖金${ransomOf(g)}</button>` : ''}<button class="btn small danger" data-a="kill">斬首</button></div></div>`; }).join('')}</div>` : ''}`,
    [{ text: '關閉', primary: true }]);
  const tr = document.querySelector('.modal .train');
  if (tr) tr.onclick = () => { const c = 800 * (state.training + 1); if (state.gold < c) return toast('金錢不足', 'bad'); state.gold -= c; state.training++; toast(`訓練等級提升至 ${state.training}`, 'good'); document.querySelector('.modal-bg').remove(); campModal(); updateHUD(); };
  document.querySelectorAll('.roster .gift').forEach(b => b.onclick = (e) => { e.stopPropagation(); if (state.gold < 300) return toast('金錢不足', 'bad'); state.gold -= 300; state.addLoyalty(b.dataset.g, 15); toast(`賞賜${gname(b.dataset.g)}，忠誠 +15`, 'good'); document.querySelector('.modal-bg').remove(); campModal(); updateHUD(); });
  document.querySelectorAll('.roster .gcard').forEach(c => { c.style.cursor = 'pointer'; c.onclick = () => heroViewer(c.dataset.g); });
  document.querySelectorAll('.prison [data-a]').forEach(b => b.onclick = async () => {
    const g = b.closest('.pcard').dataset.g;
    document.querySelector('.modal-bg').remove();
    await prisonerAction(g, b.dataset.a);
    updateHUD(); state.save(); campModal();
  });
}
const ransomOf = (g) => { const G = GENERALS[g]; return Math.round((400 + (G.war + G.lead + G.int) * 6) / 100) * 100; };
async function prisonerAction(g, a) {
  const G = GENERALS[g], f = factionAt(g, state.year);
  if (a === 'pers') {
    state.flags['pers_' + g] = state.stamp();
    const held = state.flags['held_' + g] ? state.stamp() - state.flags['held_' + g] : 0;
    const ch = G.ruler ? 0 : G.loyal ? 0.04 + held * 0.01 : clamp(0.22 + (state.renown - 50) / 150 + (90 - G.int) / 300 + held * 0.06 + (f && !state.alive(f) ? 0.25 : 0), 0.08, 0.9);
    if (Math.random() < ch) { await say(g, pick(['久困囹圄，深感明公仁德，願降！', '良禽擇木而棲，某願歸順。', '敗軍之將，承蒙不棄，願效犬馬之勞！'])); hideDialog(); state.recruit(g, 45); toast(`${G.name}歸降！`, 'good'); }
    else { await say(g, pick(['休要多言！', '吾寧死不降！', '……（閉目不語）'])); hideDialog(); toast(`${G.name}拒絕歸降，下季可再勸`, 'bad'); }
  } else if (a === 'free') {
    state.prisoners = state.prisoners.filter(x => x !== g); state.renown += 3;
    if (f && FACTIONS[f]?.major && f !== state.faction) state.addRel(state.faction, f, 8);
    toast(`釋放${G.name}，名望 +3${f && FACTIONS[f]?.major ? '、關係改善' : ''}`, 'good');
  } else if (a === 'ransom') {
    const n = ransomOf(g);
    state.prisoners = state.prisoners.filter(x => x !== g); state.gold += n;
    toast(`${FACTIONS[f].full}以 ${n} 金贖回${G.name}`, 'gold');
  } else if (a === 'kill') {
    if (!await modal(`<p>確定斬首<b>${G.name}</b>？（名望 -5，同鄉將領忠誠下降）</p>`, [{ text: '斬首', danger: true, value: 1 }, { text: '取消', value: 0 }])) return;
    state.kill(g); state.renown -= 5; for (const x of state.generals) if (GENERALS[x]?.f === G.f) state.addLoyalty(x, -6);
    toast(`${G.name}被斬首`, 'bad');
  }
}

// —— 穿越系統：轉盤 ——
const WHEEL = Object.keys(MODERN);
function drawModern() {
  let r = Math.random() * Object.values(RARITY).reduce((a, x) => a + x.weight, 0), rar = 'N';
  for (const [k, x] of Object.entries(RARITY)) { if ((r -= x.weight) < 0) { rar = k; break; } }
  return pick(WHEEL.filter(k => MODERN[k].r === rar));
}
function grantModern(k) {
  const M = MODERN[k];
  if (k === 'ration') { state.food += 30000; return '糧草 +30000'; }
  if (k === 'gold') { state.gold += 3000; return '金 +3000'; }
  if (k === 'tank') { state.tanks = (state.tanks || 0) + 1; if (!state.modern.includes('tank')) state.modern.push('tank'); return `坦克 ×${state.tanks}（每輛編成 500 人的坦克部隊，出陣時自動編入）`; }
  if (state.modern.includes(k)) { const n = { N: 600, R: 1200, SR: 2000 }[M.r] || 2000; state.gold += n; return `重複獲得，系統兌換為 ${n} 金`; }
  state.modern.push(k); return M.desc;
}
async function systemModal() {
  state.modern ||= []; state.spins ||= 0;
  const seg = 360 / WHEEL.length;
  const grad = WHEEL.map((k, i) => `${RARITY[MODERN[k].r].color}${i % 2 ? 'cc' : 'ff'} ${i * seg}deg ${(i + 1) * seg}deg`).join(',');
  const bg = el('div', 'modal-bg', '', root());
  const m = el('div', 'modal tt-modal', '', bg);
  let rot = 0, busy = false;
  const draw = (msg = '') => {
    m.innerHTML = `<h2>⚡ 穿越系統</h2>
      <div class="tt-wrap"><div class="tt-ptr">▼</div><div class="tt-wheel" style="background:conic-gradient(${grad});transform:rotate(${rot}deg)">
        ${WHEEL.map((k, i) => `<span style="transform:rotate(${(i + 0.5) * seg}deg)"><i>${MODERN[k].icon}</i></span>`).join('')}<b class="tt-hub">轉</b></div></div>
      <div class="tt-msg">${msg || `剩餘轉盤次數 <b>${state.spins}</b>　金 ${fmt(state.gold)}`}</div>
      <div class="tt-rar">${Object.entries(RARITY).map(([k, r]) => `<span style="color:${r.color}">■ ${r.name} ${r.weight}%</span>`).join('')}</div>
      <div class="sec-title">已持有裝備${state.modern.length ? '' : '（尚無）'}</div>
      <div class="chips">${WHEEL.filter(k => !MODERN[k].instant).map(k => { const own = state.modern.includes(k); return `<span class="chip ${own ? '' : 'off'}" style="${own ? `border-color:${RARITY[MODERN[k].r].color}` : ''}" title="${MODERN[k].desc}">${MODERN[k].name}${k === 'tank' && state.tanks ? '×' + state.tanks : ''}</span>`; }).join('')}</div>
      <p class="hint-txt">每季 +1 次、每場勝仗 +1 次。裝備效果只對我軍生效；點住裝備可看說明。</p>
      <div class="modal-btns"><button class="btn primary spin" ${state.spins > 0 ? '' : 'disabled'}>轉動（${state.spins}）</button><button class="btn buy">購買一次 2000金</button><button class="btn close">關閉</button></div>`;
    m.querySelector('.close').onclick = () => { if (!busy) { bg.remove(); updateHUD(); state.save(); done(); } };
    m.querySelector('.buy').onclick = () => { if (busy) return; if (state.gold < 2000) return toast('金錢不足', 'bad'); state.gold -= 2000; state.spins++; draw(); };
    m.querySelector('.spin').onclick = async () => {
      if (busy || state.spins <= 0) return;
      busy = true; state.spins--;
      const k = drawModern(), i = WHEEL.indexOf(k);
      rot += 360 * 5 + (360 - ((i + 0.5) * seg + rot % 360) % 360) + rand(-seg * 0.3, seg * 0.3);
      const w = m.querySelector('.tt-wheel'); w.style.transition = 'transform 3.6s cubic-bezier(.15,.85,.2,1)'; w.style.transform = `rotate(${rot}deg)`;
      SFX.drumRoll(10, 0.3);
      await sleep(3700);
      const M = MODERN[k], R = RARITY[M.r], got = grantModern(k);
      M.r === 'SSR' || M.r === 'SR' ? SFX.horn?.() : SFX.drum(0.6);
      busy = false;
      draw(`<span class="tt-get" style="color:${R.color}">【${R.name}】${M.name}</span><br><small>${got}</small>`);
      state.save(); updateHUD();
    };
  };
  let done; const p = new Promise(r => done = r);
  draw();
  return p;
}

// —— 市集：兵書、兵器、物資 ——
function shopModal(tab = 'tactic', onClose = null) {
  if (tab === 'auto') tab = 'weapon';
  const bg = el('div', 'modal-bg', '', root());
  bg.style.zIndex = 75;
  const m = el('div', 'modal shop', '', bg);
  const draw = () => {
    const tabs = [['tactic', '兵書'], ['weapon', '兵器'], ['goods', '物資']];
    let body = '';
    if (tab === 'tactic') body = Object.entries(TACTICS).map(([k, t]) => {
      const owned = state.hasTactic(k);
      return `<div class="shop-row ${owned ? 'owned' : ''}"><div class="shop-ic">${t.icon}</div><div class="shop-info"><b>${t.name}</b><div class="hint-txt">${t.desc}</div><div class="shop-q">${t.quote}</div></div>
        ${owned ? '<span class="shop-own">已習得</span>' : `<button class="btn small" data-t="${k}" ${state.gold < t.price ? 'disabled' : ''}>${t.price} 金</button>`}</div>`;
    }).join('');
    if (tab === 'weapon') body = Object.entries(WEAPONS).filter(([k, w]) => !w.basic).map(([k, w]) => {
      const owned = state.hasWeapon(k);
      return `<div class="shop-row ${owned ? 'owned' : ''}"><div class="shop-ic">器</div><div class="shop-info"><b>${w.name}</b><div class="hint-txt">${w.desc}</div></div>
        ${owned ? '<span class="shop-own">已擁有</span>' : `<button class="btn small" data-w="${k}" ${state.gold < (w.price || 1500) ? 'disabled' : ''}>${w.price || 1500} 金</button>`}</div>`;
    }).join('');
    if (tab === 'goods') {
      const goods = [
        ['buyfood', '購買糧草', '1000 金 → 糧 8000', state.gold >= 1000],
        ['sellfood', '出售糧草', '糧 10000 → 700 金', state.food >= 10000],
        ['merc', '招募僱傭兵', '1500 金 → 兵 5000（名望 -2）', state.gold >= 1500],
        ['horses', '購買戰馬', '1200 金 → 全軍騎兵補充，兵 +2000', state.gold >= 1200],
        ['gift', '犒賞三軍', '1000 金 → 全體武將忠誠 +6', state.gold >= 1000],
      ];
      body = goods.map(([k, n, d, ok]) => `<div class="shop-row"><div class="shop-ic">貨</div><div class="shop-info"><b>${n}</b><div class="hint-txt">${d}</div></div><button class="btn small" data-g="${k}" ${ok ? '' : 'disabled'}>購買</button></div>`).join('');
    }
    m.innerHTML = `<h2>市集</h2><div class="shop-tabs">${tabs.map(([k, n]) => `<button class="btn small ${tab === k ? 'active' : ''}" data-tab="${k}">${n}</button>`).join('')}<span class="shop-gold">持有 ${fmt(state.gold)} 金・糧 ${fmt(state.food)}</span></div>
      <div class="shop-list">${body}</div><div class="modal-btns"><button class="btn primary close">關閉</button></div>`;
    m.querySelector('.close').onclick = () => { bg.remove(); updateHUD(); onClose && onClose(); };
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });
    m.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { const t = TACTICS[b.dataset.t]; state.gold -= t.price; state.learn(b.dataset.t); draw(); flushLearn(); });
    m.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { const w = WEAPONS[b.dataset.w]; state.gold -= w.price || 1500; state.gainWeapon(b.dataset.w); draw(); });
    m.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {
      const k = b.dataset.g;
      if (k === 'buyfood') { state.gold -= 1000; state.food += 8000; toast('購得糧草 8000', 'good'); }
      if (k === 'sellfood') { state.food -= 10000; state.gold += 700; toast('出售糧草，得金 700', 'gold'); }
      if (k === 'merc') { state.gold -= 1500; state.troops += 5000; state.renown -= 2; toast('招募僱傭兵 5000', 'good'); }
      if (k === 'horses') { state.gold -= 1200; state.troops += 2000; toast('購得戰馬，兵力 +2000', 'good'); }
      if (k === 'gift') { state.gold -= 1000; for (const g of state.generals) state.addLoyalty(g, 6); toast('犒賞三軍，全體武將忠誠 +6', 'good'); }
      draw();
    });
  };
  draw();
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
async function doBattle(cfg, auto = false) {
  if (state.troops < 1000) {
    await modal('<h2>兵力不足</h2><p>可用兵力不足一千，只得緊急徵召鄉勇五千人。</p>');
    state.troops += 5000;
  }
  if (auto) {
    const wait = el('div', 'modal-bg', `<div class="modal"><h2>${cfg.name}</h2><p style="text-align:center">將領領兵出戰，等候戰報……</p></div>`, root());
    SFX.drumRoll(6, 0.25);
    await sleep(500);
    let res;
    try { res = autoBattle(app, state, cfg); }
    catch (e) { console.error(e); res = { result: 'lose', pLost: 0, eLost: 0, captives: 0, gold: 0, capturedGenerals: [], lostGenerals: [], participants: [] }; }
    await sleep(400);
    wait.remove();
    res.msg = (res.msg ? res.msg + '<br>' : '') + '（自動作戰）';
    await showResults(state, res, cfg);
    if (res.result === 'win' && state.timeTravel) { state.spins = (state.spins || 0) + 1; toast('穿越系統：勝利獎勵，轉盤 +1', 'gold'); }
    if (FACTIONS[res.enemyFaction]?.major) state.addRel(state.faction, res.enemyFaction, -6);
    updateHUD(); state.save();
    return res;
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
  if (res.result === 'win' && state.timeTravel) { state.spins = (state.spins || 0) + 1; toast('穿越系統：勝利獎勵，轉盤 +1', 'gold'); }
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
    { text: '🤖 自動作戰', value: 'auto' },
    ...(c.size >= 2 ? [{ text: '野戰誘敵', value: 'field' }] : []),
    ...(state.hasTactic('raid') ? [{ text: '夜襲劫營', value: 'night' }] : []),
    { text: '圍城斷糧', value: 'siege' },
    { text: '暫緩', value: 0 },
  ];
  const k = await modal(`<h2>出兵　${c.name}</h2><p>目標：${FACTIONS[owner].full}・${c.name}（${['', '小城', '大城', '都城'][c.size]}）<br>守軍約 <b>${fmt(state.garrison[id])}</b>　我軍可用兵力 <b>${fmt(state.troops)}</b><br>軍糧消耗約 <b>${fmt(cost)}</b>（持有 ${fmt(state.food)}）</p>
    <p class="hint-txt">自動作戰：交由將領指揮，直接得出戰果（兵力懸殊時適用）。出兵耗費一季。野戰誘敵：在城外野戰，獲勝可大幅削弱守軍。圍城：不戰而使守軍每季減少三成、士氣下降，久圍可能開城投降。</p>`, opts);
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
  const res = await doBattle(campaignBattle(id, state.faction, owner, true, { field: k === 'field', night: k === 'night' }), k === 'auto');
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
  for (const g of [...state.prisoners]) {
    state.flags['held_' + g] ??= state.stamp();
    if (Math.random() < 0.04) { state.prisoners = state.prisoners.filter(x => x !== g); toast(`${gname(g)}越獄逃走了！`, 'bad'); }
  }
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
      const k = await modal(`<h2>急報！</h2><p>${FACTIONS[f].full}大軍來犯<b>${CITIES[tgt].name}</b>！（城牆等級 ${state.dev[tgt].wall}）</p>`, [{ text: '迎戰', primary: true, value: 1 }, { text: '🤖 自動防守', value: 2 }, { text: '棄城撤退', value: 0 }]);
      if (k) {
        const res = await doBattle(campaignBattle(tgt, f, state.faction, false), k === 2);
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
