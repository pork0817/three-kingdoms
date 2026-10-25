// 遊戲狀態
import { CITIES, FACTIONS, GENERALS, TACTICS, WEAPONS, neighbors } from './data.js';

const START = {
  wei: { gold: 3000, troops: 60000, year: 220,
    generals: ['caopi', 'caoren', 'caoxiu', 'caozhen', 'zhangliao', 'zhanghe', 'xuhuang', 'simayi', 'xiahoushang', 'guohuai', 'manchong', 'jiakui', 'changdiao', 'caotai'],
    tactics: ['charge', 'volley'], weapons: ['armor'] },
  shu: { gold: 2000, troops: 45000, year: 221,
    generals: ['liubei', 'zhugeliang', 'zhaoyun', 'machao', 'zhangfei', 'weiyan', 'huangquan', 'masu', 'wangping', 'wuban', 'guanxing', 'zhangbao', 'maliang'],
    tactics: ['charge', 'drum'], weapons: ['spear'] },
  wu: { gold: 2500, troops: 50000, year: 221,
    generals: ['sunquan', 'luxun', 'zhoutai', 'zhuhuan', 'zhuran', 'handang', 'xusheng', 'dingfeng', 'panzhang', 'zhugejin', 'zhoufang', 'lvfan', 'quancong', 'sunhuan'],
    tactics: ['volley', 'shield'], weapons: ['warship'] },
};

export class GameState {
  constructor() { this.listeners = []; }

  newGame(faction) {
    const s = START[faction];
    Object.assign(this, {
      faction, year: s.year, season: 0, gold: s.gold, troops: s.troops,
      generals: [...s.generals], prisoners: [], dead: [], tactics: [...s.tactics], weapons: [...s.weapons],
      flags: {}, chapter: 0, renown: 50, storyDone: false,
      owners: Object.fromEntries(Object.entries(CITIES).map(([id, c]) => [id, c.owner])),
      garrison: Object.fromEntries(Object.entries(CITIES).map(([id, c]) => [id, c.size * 9000 + 4000])),
      log: [],
    });
  }

  on(fn) { this.listeners.push(fn); }
  emit(type, data) { for (const fn of this.listeners) fn(type, data); }

  toJSON() {
    const { listeners, ...rest } = this;
    return rest;
  }
  save() { try { localStorage.setItem('sgz-save', JSON.stringify(this)); } catch (e) { } }
  static hasSave() { try { return !!localStorage.getItem('sgz-save'); } catch (e) { return false; } }
  load() {
    try {
      const d = JSON.parse(localStorage.getItem('sgz-save'));
      if (!d) return false;
      Object.assign(this, d);
      return true;
    } catch (e) { return false; }
  }

  get F() { return FACTIONS[this.faction]; }
  owns(city) { return this.owners[city] === this.faction; }
  myCities() { return Object.keys(this.owners).filter(c => this.owners[c] === this.faction); }
  canAttack(city) {
    if (this.owners[city] === this.faction) return false;
    return neighbors(city).some(n => this.owners[n] === this.faction);
  }
  has(g) { return this.generals.includes(g); }
  hasTactic(t) { return this.tactics.includes(t); }
  hasWeapon(w) { return this.weapons.includes(w); }

  // —— 效果 ——
  addGold(n) { this.gold = Math.max(0, this.gold + n); this.emit('toast', { text: `${n >= 0 ? '+' : ''}${n} 金`, kind: n >= 0 ? 'gold' : 'bad' }); this.emit('hud'); }
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
  recruit(g) {
    if (this.generals.includes(g)) return;
    this.generals.push(g);
    this.prisoners = this.prisoners.filter(x => x !== g);
    this.emit('toast', { text: `武將【${GENERALS[g].name}】加入麾下`, kind: 'good' }); this.emit('hud');
  }
  lose(g, why = '') {
    if (!this.generals.includes(g)) return;
    this.generals = this.generals.filter(x => x !== g);
    this.dead.push(g);
    this.emit('toast', { text: `【${GENERALS[g].name}】${why || '離世'}`, kind: 'bad' }); this.emit('hud');
  }
  kill(g) { if (!this.dead.includes(g)) this.dead.push(g); this.generals = this.generals.filter(x => x !== g); this.prisoners = this.prisoners.filter(x => x !== g); }
  flag(k, v = true) { this.flags[k] = v; }
  setOwner(city, f) { this.owners[city] = f; this.emit('owner', { city, f }); }
  addRenown(n) { this.renown += n; this.emit('toast', { text: `名望 ${n >= 0 ? '+' : ''}${n}`, kind: n >= 0 ? 'good' : 'bad' }); }

  // 某勢力可用的將領（未死、未被俘）
  availableGenerals(f) {
    const captured = new Set([...(this.prisoners || []), ...(this.dead || []), ...(this.generals || [])]);
    return Object.keys(GENERALS).filter(id => GENERALS[id].f === f && !captured.has(id) && !GENERALS[id].lateJoin);
  }

  advanceSeason() {
    this.season++;
    if (this.season > 3) { this.season = 0; this.year++; }
    const cities = this.myCities();
    const income = cities.reduce((s, c) => s + CITIES[c].size * 120, 0);
    const levy = cities.length * 600;
    this.gold += income; this.troops += levy;
    for (const c of Object.keys(this.garrison)) if (!this.owns(c)) this.garrison[c] = Math.min(this.garrison[c] + 1500, CITIES[c].size * 12000 + 6000);
    this.emit('toast', { text: `季度收入：金 +${income}，徵兵 +${levy}`, kind: 'gold' });
    this.emit('hud');
  }
}
