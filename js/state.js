// 遊戲狀態：資源、城池開發、武將忠誠與壽命、外交關係
import { CITIES, FACTIONS, GENERALS, TACTICS, WEAPONS, neighbors, factionAt } from './data.js';

const START = {
  wei: { gold: 4000, food: 90000, troops: 110000,
    generals: ['caocao', 'caopi', 'caoren', 'caohong', 'xiahoudun', 'xiahouyuan', 'xuchu', 'yujin', 'lejin', 'xunyu', 'jiaxu', 'caoxiu', 'caozhen', 'zhangliao', 'zhanghe', 'xuhuang', 'simayi', 'manchong', 'caozhi', 'jiakui', 'changdiao'],
    tactics: ['charge', 'volley'], weapons: ['armor'] },
  shu: { gold: 1200, food: 25000, troops: 22000,
    generals: ['liubei', 'guanyu', 'zhangfei', 'zhaoyun', 'zhugeliang', 'guanping', 'liaohua'],
    tactics: ['charge', 'drum'], weapons: ['spear'] },
  wu: { gold: 3000, food: 60000, troops: 50000,
    generals: ['sunquan', 'zhouyu', 'lusu', 'lvmeng', 'luxun', 'huanggai', 'chengpu', 'ganning', 'lingtong', 'zhoutai', 'handang', 'xusheng', 'dingfeng', 'panzhang', 'zhugejin', 'zhuran', 'zhuhuan', 'lvfan', 'sunshangxiang'],
    tactics: ['volley', 'shield'], weapons: ['warship'] },
};
// 到了年齡自動投效玩家的本勢力武將（其餘需靠劇情或搜索人才）
const AUTO_JOIN = {
  wei: ['caotai', 'guohuai', 'xiahoushang', 'xiahoumao', 'haozhao', 'caorui'],
  shu: ['guanxing', 'zhangbao'],
  wu: ['zhoufang', 'quancong', 'sunhuan', 'weiwen'],
};
export const DIFF = {
  easy: { name: '易', enemy: 0.8, atk: 0.9, ai: 0.6, income: 1.25 },
  normal: { name: '中', enemy: 1, atk: 1, ai: 1, income: 1 },
  hard: { name: '難', enemy: 1.2, atk: 1.1, ai: 1.4, income: 0.85 },
};
const REL0 = { 'shu|wei': -60, 'wei|wu': -40, 'shu|wu': 10 };
export const relKey = (a, b) => [a, b].sort().join('|');

export class GameState {
  constructor() { this.listeners = []; }

  newGame(faction, difficulty = 'normal') {
    const s = START[faction];
    Object.assign(this, {
      faction, difficulty, year: 208, season: 2, gold: s.gold, food: s.food, troops: s.troops, training: 0,
      generals: [...s.generals], prisoners: [], dead: [], tactics: [...s.tactics], weapons: [...s.weapons],
      flags: {}, chapter: 0, renown: 50, storyDone: false, hist: 0, choices: 0, worldDone: [],
      owners: Object.fromEntries(Object.entries(CITIES).map(([id, c]) => [id, c.owner])),
      garrison: Object.fromEntries(Object.entries(CITIES).map(([id, c]) => [id, c.size * 9000 + 4000])),
      dev: Object.fromEntries(Object.keys(CITIES).map(id => [id, { agri: 1, comm: 1, wall: 1 }])),
      gov: {}, acted: {}, loy: {}, gfac: {}, rel: {}, ally: {}, truce: {}, siege: {}, seenCh: {},
      log: [],
    });
    for (const g of this.generals) this.loy[g] = GENERALS[g].ruler ? 100 : 75;
    for (const [k, v] of Object.entries(REL0)) this.rel[k] = v;
    if (faction !== 'wu' && faction !== 'shu') this.rel['shu|wu'] = 30;
  }

  on(fn) { this.listeners.push(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }
  toJSON() { const { listeners, ...rest } = this; return rest; }
  save() { try { localStorage.setItem('sgz-save2', JSON.stringify(this)); } catch (e) { } }
  static hasSave() { try { return !!localStorage.getItem('sgz-save2'); } catch (e) { return false; } }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('sgz-save2'));
      if (!d) return false;
      Object.assign(this, d);
      return true;
    } catch (e) { return false; }
  }

  get F() { return FACTIONS[this.faction]; }
  get D() { return DIFF[this.difficulty] || DIFF.normal; }
  stamp() { return this.year * 4 + this.season; }
  owns(city) { return this.owners[city] === this.faction; }
  myCities() { return Object.keys(this.owners).filter(c => this.owners[c] === this.faction); }
  citiesOf(f) { return Object.keys(this.owners).filter(c => this.owners[c] === f); }
  alive(f) { return this.citiesOf(f).length > 0; }
  canAttack(city) {
    if (this.owners[city] === this.faction) return false;
    const o = this.owners[city];
    if (this.ally[o] || (this.truce[o] || 0) > this.stamp()) return false;
    return neighbors(city).some(n => this.owners[n] === this.faction);
  }
  has(g) { return this.generals.includes(g); }
  hasTactic(t) { return this.tactics.includes(t); }
  hasWeapon(w) { return this.weapons.includes(w); }
  getRel(a, b) { return this.rel[relKey(a, b)] ?? -10; }
  addRel(a, b, n) { const k = relKey(a, b); this.rel[k] = Math.max(-100, Math.min(100, (this.rel[k] ?? -10) + n)); }
  genFaction(g) {
    if (this.generals.includes(g)) return this.faction;
    if (this.dead.includes(g) || this.prisoners.includes(g)) return null;
    return this.gfac[g] ?? factionAt(g, this.year);
  }
  isAlive(g) { return !this.dead.includes(g); }
  ruler(f) {
    const order = { wei: ['caocao', 'caopi', 'caorui'], shu: ['liubei', 'zhugeliang', 'jiangwei'], wu: ['sunquan'] }[f];
    if (order) return order.find(g => this.isAlive(g) && (GENERALS[g].life[0] + 16 <= this.year)) || order[order.length - 1];
    return FACTIONS[f]?.leader;
  }

  // —— 效果 ——
  addGold(n) { this.gold = Math.max(0, this.gold + n); this.emit('toast', { text: `${n >= 0 ? '+' : ''}${n} 金`, kind: n >= 0 ? 'gold' : 'bad' }); this.emit('hud'); }
  addFood(n) { this.food = Math.max(0, this.food + n); this.emit('toast', { text: `糧草 ${n >= 0 ? '+' : ''}${n}`, kind: n >= 0 ? 'gold' : 'bad' }); this.emit('hud'); }
  addTroops(n, why = '') { this.troops = Math.max(0, this.troops + n); this.emit('toast', { text: `${why}${n >= 0 ? '援軍 +' : '兵力 '}${n}`, kind: n >= 0 ? 'good' : 'bad' }); this.emit('hud'); }
  learn(t) {
    if (this.tactics.includes(t)) return;
    this.tactics.push(t);
    this.emit('learn', { id: t, ...TACTICS[t] }); this.emit('hud');
  }
  gainWeapon(w) {
    if (this.weapons.includes(w)) return;
    this.weapons.push(w);
    this.emit('toast', { text: `獲得兵器【${WEAPONS[w].name}】：${WEAPONS[w].desc}`, kind: 'item' }); this.emit('hud');
  }
  recruit(g, loyalty = 70) {
    if (this.generals.includes(g) || this.dead.includes(g)) return;
    this.generals.push(g);
    this.prisoners = this.prisoners.filter(x => x !== g);
    delete this.gfac[g];
    this.loy[g] = loyalty;
    this.emit('toast', { text: `武將【${GENERALS[g].name}】加入麾下`, kind: 'good' }); this.emit('hud');
  }
  lose(g, why = '') {
    const had = this.generals.includes(g);
    this.generals = this.generals.filter(x => x !== g);
    if (!this.dead.includes(g)) this.dead.push(g);
    for (const c in this.gov) if (this.gov[c] === g) delete this.gov[c];
    if (had) { this.emit('toast', { text: `【${GENERALS[g].name}】${why || '離世'}`, kind: 'bad' }); this.emit('hud'); }
  }
  captured(g, byF) {
    this.generals = this.generals.filter(x => x !== g);
    this.gfac[g] = 'captive:' + byF;
    for (const c in this.gov) if (this.gov[c] === g) delete this.gov[c];
    this.emit('toast', { text: `【${GENERALS[g].name}】被${FACTIONS[byF]?.full || '敵軍'}俘虜`, kind: 'bad' }); this.emit('hud');
  }
  kill(g) { if (!this.dead.includes(g)) this.dead.push(g); this.generals = this.generals.filter(x => x !== g); this.prisoners = this.prisoners.filter(x => x !== g); }
  flag(k, v = true) { this.flags[k] = v; }
  setOwner(city, f) { this.owners[city] = f; this.emit('owner', { city, f }); }
  addRenown(n) { this.renown += n; this.emit('toast', { text: `名望 ${n >= 0 ? '+' : ''}${n}`, kind: n >= 0 ? 'good' : 'bad' }); }
  addLoyalty(g, n) { if (this.loy[g] != null) this.loy[g] = Math.max(0, Math.min(100, this.loy[g] + n)); }

  availableGenerals(f) {
    const taken = new Set([...this.prisoners, ...this.dead, ...this.generals]);
    return Object.keys(GENERALS).filter(id => !taken.has(id) && (this.gfac[id] ?? factionAt(id, this.year)) === f && GENERALS[id].life[0] + 16 <= this.year);
  }
  // 各城守將：每位武將只守一座城（都城、大城優先分配強將）
  cityGenerals() {
    const out = {};
    for (const f of Object.keys(FACTIONS)) {
      if (f === this.faction) continue;
      const cities = this.citiesOf(f).sort((a, b) => (b === FACTIONS[f].capital) - (a === FACTIONS[f].capital) || CITIES[b].size - CITIES[a].size);
      if (!cities.length) continue;
      const gens = this.availableGenerals(f).sort((a, b) => (GENERALS[b].war + GENERALS[b].lead + GENERALS[b].int) - (GENERALS[a].war + GENERALS[a].lead + GENERALS[a].int));
      for (const c of cities) out[c] = [];
      let i = 0;
      for (let round = 0; round < 3 && i < gens.length; round++) for (const c of cities) { if (i >= gens.length) break; if (round < CITIES[c].size + 1) out[c].push(gens[i++]); }
    }
    return out;
  }
  freeGenerals() {
    const taken = new Set([...this.prisoners, ...this.dead, ...this.generals]);
    return Object.keys(GENERALS).filter(id => !taken.has(id) && (this.gfac[id] ?? factionAt(id, this.year)) === 'free' && GENERALS[id].life[0] + 16 <= this.year);
  }

  // 自然壽終、成年投效
  lifeEvents() {
    const out = [];
    for (const [id, g] of Object.entries(GENERALS)) {
      if (this.dead.includes(id)) continue;
      const [born, die, kind] = g.life;
      const natural = kind === 'n' ? die : die + 8;
      if (this.year > natural || (this.year === natural && this.season >= 2)) {
        if (this.generals.includes(id) && g.ruler && id === this.ruler(this.faction) && this.faction === g.f && !this.storyDone && this.year < natural + 1) continue;
        const mine = this.generals.includes(id);
        this.lose(id, '病逝');
        if (!mine && g.name && FACTIONS[g.f]?.major && (g.war > 85 || g.int > 90 || g.ruler)) out.push(`${FACTIONS[this.genFaction(id) || g.f]?.full || ''}${g.name}病逝`);
      }
    }
    for (const id of AUTO_JOIN[this.faction] || []) {
      const g = GENERALS[id];
      if (!this.generals.includes(id) && !this.dead.includes(id) && !this.gfac[id] && born16(g) <= this.year && factionAt(id, this.year) === this.faction) {
        this.recruit(id, 80); out.push(`${g.name}前來投效`);
      }
    }
    return out;
  }

  advanceSeason() {
    this.season++;
    if (this.season > 3) { this.season = 0; this.year++; }
    const cities = this.myCities();
    const D = this.D;
    let gold = 0, food = 0;
    for (const c of cities) {
      const d = this.dev[c], sz = CITIES[c].size, gv = GENERALS[this.gov[c]];
      const bonus = gv ? 1 + gv.int / 300 : 1;
      gold += sz * (60 + d.comm * 50) * bonus * D.income;
      food += sz * (1200 + d.agri * 900) * bonus * D.income;
    }
    gold = Math.round(gold); food = Math.round(food);
    const eat = Math.round(this.troops * 0.12);
    const levy = cities.length * 500;
    this.gold += gold; this.food += food - eat; this.troops += levy;
    let msg = `季度收入：金 +${gold}，糧 +${food}（軍糧 -${eat}），徵兵 +${levy}`;
    if (this.food < 0) {
      const lost = Math.round(this.troops * 0.08);
      this.troops -= lost; this.food = 0; this.renown -= 2;
      msg += `；糧草不足，士卒逃亡 ${lost}`;
    }
    this.emit('toast', { text: msg, kind: this.food > 0 ? 'gold' : 'bad' });
    for (const c of Object.keys(this.garrison)) if (!this.owns(c)) {
      if (this.siege[c]) continue;
      this.garrison[c] = Math.min(this.garrison[c] + 1500, CITIES[c].size * 12000 + 6000 + (this.year - 208) * 300);
    }
    // 忠誠
    const defect = [];
    for (const g of [...this.generals]) {
      const G = GENERALS[g];
      if (G.ruler || this.loy[g] == null) continue;
      this.loy[g] += (this.renown - 50) / 40 + (this.gov && Object.values(this.gov).includes(g) ? 0.5 : 0) - 0.3;
      this.loy[g] = Math.max(0, Math.min(100, this.loy[g]));
      if (this.loy[g] < 30 && Math.random() < 0.25) {
        const fs = ['wei', 'shu', 'wu'].filter(f => f !== this.faction && this.alive(f));
        if (fs.length) { const to = fs[Math.floor(Math.random() * fs.length)]; this.generals = this.generals.filter(x => x !== g); this.gfac[g] = to; defect.push(`${G.name}投奔${FACTIONS[to].full}`); }
      }
    }
    for (const t of defect) this.emit('toast', { text: `【叛離】${t}`, kind: 'bad' });
    for (const t of this.lifeEvents()) this.emit('toast', { text: t, kind: '' });
    this.emit('hud');
  }
}
function born16(g) { return g.life[0] + 17; }
