// 主程式：畫面流程、地圖介面、劇情執行、天下征戰
import * as THREE from 'three';
import { WorldMap, heightAtXZ, toXZ } from './worldmap.js';
import { Battle, showResults } from './battle.js';
import { GameState } from './state.js';
import { STORY, nextChapter } from './story.js';
import { FACTIONS, GENERALS, CITIES, TACTICS, WEAPONS, SEASONS, neighbors, gname } from './data.js';
import { el, root, say, choose, modal, toast, titleCard, learnCard, noteCard, hideDialog, portrait, clearUI } from './ui.js';
import { fmt, sleep, pick, rand, clamp } from './util.js';
import * as SFX from './audio.js';
import { renderAllPortraits, openViewer, HERO } from './figures.js';

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const state = new GameState();
const app = { renderer, state, view: null, setView(v) { this.view = v; } };
let map;
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
  if (app.view && app.view !== map) app.view.resize(innerWidth, innerHeight);
});
canvas.addEventListener('pointermove', e => app.view?.onPointer?.(e, 'move'));
canvas.addEventListener('pointerdown', e => { SFX.unlock(); app.view?.onPointer?.(e, 'down'); });
canvas.addEventListener('pointerup', e => app.view?.onPointer?.(e, 'up'));
canvas.addEventListener('click', e => app.view?.onPointer?.(e, 'click'));
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => app.view?.onKey?.(e, true));
addEventListener('keyup', e => app.view?.onKey?.(e, false));

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
  titleOrbit = true; orbitTitle();
  map.lock(true);
  const t = el('div', 'title-screen', `<div class="title-main">三國鼎立</div><div class="title-sub">魏 · 蜀 · 吳　　天下三分</div><div class="title-btns"></div>
    <div class="title-foot">大部分劇情依據《三國志》史實　·　你的每個抉擇都將改變歷史</div>`, root());
  const b = t.querySelector('.title-btns');
  el('button', 'btn primary', '新的征途', b).onclick = () => { SFX.unlock(); SFX.drum(); t.remove(); factionSelect(); };
  const cont = el('button', 'btn', '繼續遊戲', b);
  cont.disabled = !GameState.hasSave();
  cont.onclick = () => { SFX.unlock(); if (state.load()) { t.remove(); titleOrbit = false; startMap(); } };
  el('button', 'btn', '遊戲說明', b).onclick = () => helpModal();
  el('button', 'btn', '人物圖鑑', b).onclick = () => gallery();
}

function helpModal() {
  return modal(`<h2>遊戲說明</h2><div class="help">
  <b>主線劇情</b>：選擇魏、蜀、吳其一，從三國鼎立之初開始。劇情依據史實，但每個抉擇都會改變後續的兵力、兵法、兵器、援軍乃至歷史走向。標有「史實」的選項為歷史上的真實決定。<br>
  <b>天下地圖</b>：立體地圖顯示三國疆域，戰後即時更新。點選與我方相鄰的敵城（虛線框）可出兵攻打。「結束本季」可徵兵收稅，敵國也可能來犯。<br>
  <b>對陣</b>：開戰前可選擇陣前會談（勸降、激將、鼓舞、單挑）或遠處叫陣。<br>
  <b>布陣</b>：選擇陣型、分配各部隊兵種／武將／兵力、出擊波次；習得【伏兵】後可在山林地形埋伏部隊。<br>
  <b>作戰</b>：左鍵點選部隊，再點地面移動或點敵軍攻擊；右側為兵法按鈕；左下可控制速度、派出第二／三波、全軍突擊、鳴金收兵。右鍵拖曳旋轉視角、滾輪縮放、WASD 平移。<br>
  <b>兵種相剋</b>：槍兵剋騎兵、騎兵剋弓兵、弓兵剋步兵、步兵剋槍兵。居高臨下有攻擊加成。<br>
  <b>勝敗</b>：敵軍潰逃時可選擇乘勝追擊或收兵；我軍不利時可撤退、求和或背水一戰。戰後可收編降卒、招降敵將。
  </div>`, [{ text: '明白了', primary: true }]);
}

function factionSelect() {
  const w = el('div', 'faction-select', `<div class="fs-title">選擇你的陣營</div><div class="fs-cards"></div>`, root());
  const cards = w.querySelector('.fs-cards');
  for (const f of ['wei', 'shu', 'wu']) {
    const F = FACTIONS[f];
    const c = el('div', 'fs-card', `<div class="big">${F.name}</div><div class="nm">${F.full}・${GENERALS[F.leader].name}</div>
      <div class="desc">${F.desc}</div><div class="meta"><span>起始：${f === 'wei' ? '西元220年' : '西元221年'}</span><span>難度：${F.difficulty}</span></div>`, cards);
    c.style.setProperty('--fc', F.css);
    c.onmouseenter = () => { titleOrbit = false; map.flyTo(F.capital, 80, 1200); };
    c.onclick = async () => {
      SFX.drumRoll(4, 0.25);
      w.remove();
      state.newGame(f);
      titleOrbit = false;
      map.recolor(); map.refreshCityColors();
      startMap();
      await sleep(300);
      playChapter();
    };
  }
  const back = el('button', 'btn small', '← 返回', w); back.style.marginTop = '20px';
  back.onclick = () => { w.remove(); titleScreen(); };
}

// —— 地圖 HUD ——
let hud = null;
function startMap() {
  titleOrbit = false;
  clearUI();
  map.recolor(); map.refreshCityColors();
  app.setView(map); map.setActive(true); map.lock(false);
  buildHUD();
  map.overview(1500);
}
function buildHUD() {
  hud?.top?.remove(); hud?.right?.remove(); hud?.bl?.remove();
  hud = {};
  hud.top = el('div', 'hud-top', '', root());
  hud.right = el('div', 'hud-right', '', root());
  hud.story = el('div', 'panel story-btn', '', hud.right);
  hud.city = el('div', 'panel city-panel', '', hud.right);
  hud.actions = el('div', 'panel', '', hud.right);
  hud.bl = el('div', 'hud-bottom-left', '滑鼠左鍵拖曳旋轉　右鍵拖曳平移　滾輪縮放　點選城池查看', root());
  hud.actions.innerHTML = `<h3>軍務</h3>`;
  el('button', 'btn', '軍營（武將・兵法・兵器）', hud.actions).onclick = campModal;
  el('button', 'btn', '結束本季', hud.actions).onclick = endSeason;
  const row = el('div', '', '', hud.actions); row.style.cssText = 'display:flex;gap:6px';
  const sv = el('button', 'btn small', '存檔', row); sv.onclick = () => { state.save(); toast('已存檔', 'good'); };
  el('button', 'btn small', '說明', row).onclick = helpModal;
  const mu = el('button', 'btn small', SFX.isMuted() ? '🔇' : '🔊', row); mu.onclick = () => { SFX.setMuted(!SFX.isMuted()); mu.textContent = SFX.isMuted() ? '🔇' : '🔊'; };
  el('button', 'btn small', '標題', row).onclick = async () => { if (await modal('<p>回到標題畫面？（未存檔的進度將會遺失）</p>', [{ text: '確定', primary: true, value: 1 }, { text: '取消', value: 0 }])) { hud = null; titleScreen(); } };
  for (const b of row.children) b.style.flex = '1';
  updateHUD();
  updateCityPanel(map.selected);
}
function updateHUD() {
  if (!hud || !state.faction) return;
  const F = state.F;
  hud.top.style.setProperty('--fc', F.css);
  hud.top.innerHTML = `<div class="emblem">${F.name}</div><div class="item" style="font-size:20px">${F.full}</div>
    <div class="item"><span class="k">年份</span><b>${state.year}年 ${SEASONS[state.season]}</b></div>
    <div class="item"><span class="k">金</span><b>${fmt(state.gold)}</b></div>
    <div class="item"><span class="k">兵力</span><b>${fmt(state.troops)}</b></div>
    <div class="item"><span class="k">武將</span><b>${state.generals.length}</b></div>
    <div class="item"><span class="k">城池</span><b>${state.myCities().length}</b></div>
    <div class="item"><span class="k">名望</span><b>${state.renown}</b></div>
    <div class="spacer"></div>
    <div class="item" style="font-size:13px">${['wei', 'shu', 'wu'].map(f => `<span style="color:${FACTIONS[f].css}">${FACTIONS[f].name} ${Object.values(state.owners).filter(o => o === f).length}城</span>`).join('　')}</div>`;
  const nx = nextChapter(state);
  hud.story.innerHTML = nx ? `<h3>主線劇情</h3><div class="chap">下一章：${nx.ch.title}（${nx.ch.year}年）</div>` : `<h3>天下征戰</h3><div class="chap">主線已完結。攻佔所有城池以一統天下！</div>`;
  if (nx) { const b = el('button', 'btn primary', '▶ 開始劇情', hud.story); b.onclick = playChapter; }
  map.refreshCityColors();
  updateCityPanel(map.selected);
}
function updateCityPanel(id) {
  if (!hud) return;
  const p = hud.city;
  if (!id) { p.innerHTML = '<h3>城池</h3><div style="font-size:14px;color:#cdb88a">點選地圖上的城池查看詳情。<br>虛線框且帶 ⚔ 者為可攻打的城池。</div>'; return; }
  const c = CITIES[id], owner = state.owners[id], F = FACTIONS[owner];
  const mine = owner === state.faction;
  const nb = neighbors(id).map(n => `<span style="color:${FACTIONS[state.owners[n]].css}">${CITIES[n].name}</span>`).join('、');
  const gens = !mine ? state.availableGenerals(owner).sort((a, b) => GENERALS[b].lead - GENERALS[a].lead).slice(0, 3).map(gname).join('、') : '';
  p.innerHTML = `<h3>${c.name}　<span class="owner" style="--fc:${F.css}">${F.full}</span></h3>
    <div class="row"><span>規模</span><span>${['', '小城', '大城', '都城'][c.size]}</span></div>
    ${!mine ? `<div class="row"><span>守軍</span><span>約 ${fmt(state.garrison[id])}</span></div><div class="gens">守將：${gens || '無名之將'}</div>` : `<div class="row"><span>稅收</span><span>每季 ${c.size * 120} 金</span></div>`}
    <div class="gens">相鄰：${nb}</div>`;
  if (state.canAttack(id)) {
    const b = el('button', 'btn primary', '⚔ 出兵攻打', p);
    b.onclick = () => attackCity(id);
  }
}

function campModal() {
  const gens = state.generals.filter(g => GENERALS[g]).sort((a, b) => (GENERALS[b].war + GENERALS[b].lead + GENERALS[b].int) - (GENERALS[a].war + GENERALS[a].lead + GENERALS[a].int));
  modal(`<h2>軍營</h2>
    <div class="sec-title">兵法（${state.tactics.length}）</div><div class="chips">${Object.entries(TACTICS).map(([k, t]) => `<span class="chip ${state.hasTactic(k) ? '' : 'off'}" title="${t.desc}">${t.name}</span>`).join('')}</div>
    <div class="sec-title">兵器（${state.weapons.length}）</div><div class="chips">${Object.entries(WEAPONS).map(([k, w]) => `<span class="chip ${state.hasWeapon(k) ? '' : 'off'}" title="${w.desc}">${w.name}</span>`).join('')}</div>
    <div class="sec-title">武將（${gens.length}）　俘虜 ${state.prisoners.length}</div>
    <div class="roster">${gens.map(g => { const G = GENERALS[g]; return `<div class="gcard" data-g="${g}">${portrait(g, 52)}<div><div class="gn">${G.name}</div><div class="st">武${G.war} 統${G.lead} 智${G.int}</div><div class="st">${G.title}</div></div></div>`; }).join('')}</div>
    ${state.prisoners.length ? `<div class="sec-title">獄中俘虜</div><div class="chips">${state.prisoners.map(g => `<span class="chip">${gname(g)}</span>`).join('')}</div>` : ''}`,
    [{ text: '關閉', primary: true }]);
  document.querySelectorAll('.roster .gcard').forEach(c => { c.style.cursor = 'pointer'; c.title = '點擊查看 3D 模型'; c.onclick = () => heroViewer(c.dataset.g); });
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
      <div class="hv-name" style="color:${F.css}">${G.name}</div><div class="hv-title">${F.full}・${G.title || ''}</div>
      <div class="hv-stats"><div>武力<b>${G.war}</b></div><div>統率<b>${G.lead}</b></div><div>智力<b>${G.int}</b></div></div>
      <div class="hv-bio">${spec?.bio || '　'}</div>
      <div class="hv-btns"><button class="btn small tg">騎乘 / 步行</button>${list ? '<button class="btn small pv">◀</button><button class="btn small nx">▶</button>' : ''}<button class="btn small primary cl">關閉</button></div>
      <div class="hv-tip">拖曳旋轉模型</div></div>`;
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
async function doBattle(cfg) {
  if (state.troops < 1000) {
    await modal('<h2>兵力不足</h2><p>可用兵力不足一千，只得緊急徵召鄉勇五千人。</p>');
    state.troops += 5000;
  }
  await fade(true);
  map.setActive(false);
  if (hud) { hud.top.style.display = 'none'; hud.right.style.display = 'none'; hud.bl.style.display = 'none'; }
  const b = new Battle(app, state, cfg);
  const runP = b.run();
  await sleep(100);
  fade(false);
  let res;
  try { res = await runP; }
  catch (e) { console.error(e); res = { result: 'lose', pLost: 0, eLost: 0, captives: 0, gold: 0, capturedGenerals: [], lostGenerals: [] }; }
  hideDialog();
  b.paused = true;
  await sleep(600);
  await showResults(state, res, cfg);
  await fade(true);
  b.dispose();
  app.setView(map); map.setActive(true);
  if (hud) { hud.top.style.display = ''; hud.right.style.display = ''; hud.bl.style.display = ''; }
  updateHUD();
  fade(false);
  state.save();
  return res;
}

// —— 劇情執行 ——
async function runSteps(steps) {
  for (const st of steps || []) {
    const [k, a, b, c] = st;
    switch (k) {
      case 'title': hideDialog(); await titleCard(a, b); break;
      case 'cam': await map.flyTo(a, b || 55, 1600); break;
      case 'overview': hideDialog(); await map.overview(1600); break;
      case 'narr': await say('narr', a); break;
      case 'say': await say(a, b); break;
      case 'choice': {
        const i = await choose(a, b.map(o => ({ text: o.t, hint: o.hint, hist: o.hist })));
        const o = b[i];
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
        const cfg = typeof a === 'function' ? a(state) : a;
        const res = await doBattle(cfg);
        await runSteps(res.result === 'win' ? b : c);
        break;
      }
      case 'if': await runSteps(a(state) ? b : c); break;
    }
    await flushLearn();
  }
}

let playing = false;
async function playChapter() {
  if (playing) return;
  const nx = nextChapter(state);
  if (!nx) return;
  playing = true;
  map.lock(true);
  if (hud) hud.right.style.visibility = 'hidden';
  state.year = Math.max(state.year, nx.ch.year);
  if (state.year === nx.ch.year) state.season = 0;
  updateHUD();
  try { await runSteps(nx.ch.steps); }
  catch (e) { console.error(e); toast('劇情執行發生錯誤：' + e.message, 'bad'); }
  hideDialog();
  state.chapter = nx.idx + 1;
  if (!nextChapter(state)) state.storyDone = true;
  state.save();
  playing = false;
  map.lock(false);
  if (hud) hud.right.style.visibility = '';
  updateHUD();
  map.overview(1500);
  checkGameEnd();
}

// —— 天下征戰 ——
const FWEAP = { wei: ['armor'], shu: ['crossbow', 'spear'], wu: ['warship'], nanman: [] };
function campaignBattle(target, attackerF, defenderF, playerAttacks) {
  const c = CITIES[target];
  const [x, z] = toXZ(c.lon, c.lat);
  const elev = heightAtXZ(x, z);
  let terrain = c.size >= 2 ? 'siege' : (elev > 3.5 ? 'mountain' : 'plains');
  const enemyF = playerAttacks ? defenderF : attackerF;
  const gens = state.availableGenerals(enemyF).sort((a, b) => (GENERALS[b].war + GENERALS[b].lead + GENERALS[b].int) - (GENERALS[a].war + GENERALS[a].lead + GENERALS[a].int));
  const top = gens.slice(0, 6);
  const leader = top[0];
  const allT = Object.keys(TACTICS).filter(t => t !== 'ambush');
  const tactics = [...new Set([pick(allT), pick(allT), 'drum', 'volley'])];
  const troops = playerAttacks ? state.garrison[target] : Math.round(18000 + Math.random() * 14000 + (state.year - 220) * 600);
  const cfg = {
    name: `${c.name}之戰`, sub: `${FACTIONS[attackerF].full}進攻${FACTIONS[defenderF].full}`,
    terrain, attacker: playerAttacks ? 'player' : 'enemy', cityName: c.name, time: pick(['day', 'day', 'dusk', 'dawn']),
    forest: terrain === 'mountain' ? 'sides' : (Math.random() < 0.3 ? 'sides' : null), river: Math.random() < 0.25,
    enemy: { faction: enemyF, leader, generals: top, troops, tactics, weapons: [...FWEAP[enemyF], ...(!playerAttacks ? ['ladder', 'ram'] : [])], formation: pick(['yulin', 'fengshi', 'heyi', 'fangyuan', 'yanxing']) },
    gateHP: 3000 + c.size * 1500, seed: Math.floor(Math.random() * 1000),
  };
  if (terrain !== 'siege' && !playerAttacks) cfg.attacker = 'enemy';
  return cfg;
}

async function attackCity(id) {
  if (playing) return;
  const c = CITIES[id], owner = state.owners[id];
  const from = neighbors(id).find(n => state.owns(n));
  const ok = await modal(`<h2>出兵　${c.name}</h2><p>目標：${FACTIONS[owner].full}・${c.name}（${['', '小城', '大城', '都城'][c.size]}）<br>守軍約 <b>${fmt(state.garrison[id])}</b>　我軍可用兵力 <b>${fmt(state.troops)}</b></p><p style="color:#cdb88a">出兵將耗費一季。</p>`,
    [{ text: '擂鼓出征', primary: true, value: 1 }, { text: '暫緩', value: 0 }]);
  if (!ok) return;
  playing = true; map.lock(true);
  if (hud) hud.right.style.visibility = 'hidden';
  await map.march(from, id, state.faction);
  const res = await doBattle(campaignBattle(id, state.faction, owner, true));
  if (res.result === 'win') {
    state.owners[id] = state.faction;
    state.garrison[id] = 3000;
    await map.changeOwner(id, state.faction, true);
    toast(`攻佔${c.name}！`, 'good');
  } else {
    state.garrison[id] = Math.max(3000, state.garrison[id] - res.eLost);
  }
  playing = false; map.lock(false);
  if (hud) hud.right.style.visibility = '';
  await endSeason(true);
}

async function endSeason(fromBattle = false) {
  if (playing && !fromBattle) return;
  state.advanceSeason();
  updateHUD();
  // 敵國行動
  const aggressive = state.storyDone ? 0.55 : 0.18;
  const ai = ['wei', 'shu', 'wu'].filter(f => f !== state.faction && Object.values(state.owners).includes(f));
  for (const f of ai) {
    if (Math.random() > aggressive) continue;
    const fronts = [];
    for (const [city, o] of Object.entries(state.owners)) {
      if (o !== f) continue;
      for (const n of neighbors(city)) if (state.owners[n] !== f && (state.storyDone || state.owners[n] === state.faction)) fronts.push([city, n]);
    }
    if (!fronts.length) continue;
    const [src, tgt] = pick(fronts);
    const tOwner = state.owners[tgt];
    if (tOwner === state.faction) {
      playing = true; map.lock(true);
      await map.march(src, tgt, f);
      const k = await modal(`<h2>急報！</h2><p>${FACTIONS[f].full}大軍來犯<b>${CITIES[tgt].name}</b>！</p>`, [{ text: '迎戰', primary: true, value: 1 }, { text: '棄城撤退', value: 0 }]);
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
    await titleCard('天下一統', `${state.year}年　${state.F.full}統一天下`, 4000);
    await modal(`<div class="result-big win">統</div><h2>天下一統</h2><p style="text-align:center">歷經 ${state.year - 220} 年征戰，${state.F.full}終於結束了三國鼎立的亂世。</p>`, [{ text: '回到標題', primary: true }]);
    titleScreen();
  } else if (mine === 0) {
    await modal(`<div class="result-big lose">亡</div><h2>國破家亡</h2><p style="text-align:center">${state.F.full}已失去所有城池……</p>`, [{ text: '回到標題', primary: true }]);
    titleScreen();
  }
}

window.SGZ = { state, app, doBattle, runSteps, playChapter, startMap, STORY, get map() { return map; } };
boot();
