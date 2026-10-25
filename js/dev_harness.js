// 開發用：在瀏覽器主控台執行 `(await import('./js/dev_harness.js')).runAll()`，自動模擬所有劇情戰（不使用兵法）以檢查錯誤與平衡
import { Battle } from './battle.js';
import { GameState } from './state.js';
import { STORY } from './story.js';
import { GENERALS, factionAt } from './data.js';

export function simBattle(app, S, cfg) {
  const b = new Battle(app, S, cfg);
  b.capturedE = []; b.capturedP = [];
  b.setupSides(); b.build();
  b.squads.push(...b.createEnemySquads()); b.layoutSide('e');
  b.playerRows = b.defaultPlayerRows(); b.playerLeader = b.playerRows[0].general; b.applyPlayerRows(b.playerRows);
  for (const s of b.squads) if (s.side === 'p') { s.released = !s.hidden && s.wave === 1; if (b.siege && b.defSide === 'p' && !s.wallSquad) s.order = 'hold'; }
  b.sides.p.init = b.squads.filter(s => s.side === 'p').reduce((a, s) => a + s.troops, 0);
  b.sides.e.init = b.squads.filter(s => s.side === 'e').reduce((a, s) => a + s.troops, 0);
  if (cfg.flood) b.doFlood(cfg.flood);
  b.phase = 'fight';
  let res = null; b.resolveFight = r => res = r;
  b.enemyBroken = function () { this.finish('win'); }; b.playerBroken = function () { this.finish('lose'); };
  for (let i = 0; i < 8000 && !res; i++) {
    b.sim(0.05);
    if (i === 300) for (const s of b.squads) if (s.side === 'p' && !s.hidden) s.released = true;
    if (i === 400) b.triggerAmbush('p');
    if (i % 20 === 0) b.updateVisuals(0.05, 0.05);
  }
  const out = { r: res?.result || 'timeout', t: Math.round(b.simT), p: Math.round(b.sideTroops('p')), pi: b.sides.p.init, e: Math.round(b.sideTroops('e')), ei: b.sides.e.init };
  b.controls.dispose(); b.labelRoot.innerHTML = ''; b.scene.traverse(o => o.geometry && o.geometry.dispose());
  return out;
}

function collect(steps, acc) {
  for (const st of steps || []) {
    if (st[0] === 'battle') { acc.push(st[1]); collect(st[2], acc); collect(st[3], acc); }
    if (st[0] === 'if') { collect(st[2], acc); collect(st[3], acc); }
    if (st[0] === 'choice') st[2].forEach(o => collect(o.then, acc));
  }
}

export function runAll(from = 0, to = 99) {
  const app = window.SGZ.app;
  const list = [];
  for (const f of ['wei', 'shu', 'wu']) for (const ch of STORY[f]) { const acc = []; collect(ch.steps, acc); acc.forEach(c => list.push([f, ch, c])); }
  const out = [];
  for (const [f, ch, c0] of list.slice(from, to)) {
    const S = new GameState(); S.newGame(f);
    S.year = ch.year; S.troops = 200000;
    for (const g of Object.keys(GENERALS)) if (factionAt(g, ch.year) === f && !S.generals.includes(g) && GENERALS[g].life[0] + 16 <= ch.year) S.generals.push(g);
    for (const w of ['ladder', 'ram']) S.weapons.push(w);
    let cfg;
    try { cfg = typeof c0 === 'function' ? c0(S) : { ...c0, enemy: { ...c0.enemy } }; } catch (e) { out.push(`${f} ${ch.title}: cfg error ${e.message}`); continue; }
    try { const r = simBattle(app, S, cfg); out.push(`${f} ${cfg.name}: ${r.r} t${r.t} 我${r.p}/${r.pi} 敵${r.e}/${r.ei}`); }
    catch (e) { out.push(`${f} ${cfg.name}: ERROR ${e.message} @ ${e.stack.split('\n')[1]}`); }
  }
  return out.join('\n');
}
