// 遊戲資料：勢力、武將、城池、兵法、兵器、陣型、兵種

export const FACTIONS = {
  wei: { id: 'wei', name: '魏', full: '曹魏', color: 0x3b6fd6, css: '#4a7fe6', leader: 'caopi', capital: 'luoyang',
    desc: '據有中原九州，兵多將廣，虎豹騎天下無雙。曹丕受漢禪，國號大魏。', difficulty: '易' },
  shu: { id: 'shu', name: '蜀', full: '蜀漢', color: 0x3c9a4a, css: '#4cb85c', leader: 'liubei', capital: 'chengdu',
    desc: '劉備承漢室正統，據益州天險。關羽新亡，荊州已失，興復漢室之路艱難。', difficulty: '難' },
  wu: { id: 'wu', name: '吳', full: '東吳', color: 0xcf3a2c, css: '#e2533f', leader: 'sunquan', capital: 'jianye',
    desc: '孫權坐擁江東六郡，新取荊州。長江天塹，水軍精銳，然須兩面受敵。', difficulty: '中' },
  nanman: { id: 'nanman', name: '蠻', full: '南蠻', color: 0x9a6a2a, css: '#b98a3c', leader: 'menghuo', capital: 'jianning',
    desc: '南中諸部，孟獲為首。', difficulty: '' },
};

// war 武力 / lead 統率 / int 智力
export const GENERALS = {
  // 魏
  caopi: { name: '曹丕', f: 'wei', war: 68, lead: 76, int: 82, title: '魏文帝', ruler: true },
  caorui: { name: '曹叡', f: 'wei', war: 55, lead: 72, int: 85, title: '魏明帝' },
  caoren: { name: '曹仁', f: 'wei', war: 86, lead: 89, int: 62, title: '大司馬' },
  caoxiu: { name: '曹休', f: 'wei', war: 77, lead: 80, int: 58, title: '大司馬' },
  caozhen: { name: '曹真', f: 'wei', war: 79, lead: 85, int: 66, title: '大將軍' },
  zhangliao: { name: '張遼', f: 'wei', war: 92, lead: 93, int: 78, title: '前將軍' },
  zhanghe: { name: '張郃', f: 'wei', war: 89, lead: 88, int: 70, title: '左將軍' },
  xuhuang: { name: '徐晃', f: 'wei', war: 88, lead: 86, int: 70, title: '右將軍' },
  simayi: { name: '司馬懿', f: 'wei', war: 63, lead: 96, int: 98, title: '太尉', banner: '司馬' },
  xiahoushang: { name: '夏侯尚', f: 'wei', war: 74, lead: 78, int: 66, title: '征南大將軍', banner: '夏侯' },
  xiahoumao: { name: '夏侯楙', f: 'wei', war: 40, lead: 38, int: 42, title: '安西將軍', banner: '夏侯' },
  guohuai: { name: '郭淮', f: 'wei', war: 74, lead: 83, int: 78, title: '雍州刺史' },
  haozhao: { name: '郝昭', f: 'wei', war: 76, lead: 86, int: 72, title: '雜號將軍' },
  manchong: { name: '滿寵', f: 'wei', war: 70, lead: 86, int: 86, title: '征東將軍' },
  jiakui: { name: '賈逵', f: 'wei', war: 58, lead: 72, int: 82, title: '豫州刺史' },
  changdiao: { name: '常雕', f: 'wei', war: 62, lead: 55, int: 40, title: '將軍' },
  caotai: { name: '曹泰', f: 'wei', war: 70, lead: 66, int: 50, title: '將軍' },
  // 蜀
  liubei: { name: '劉備', f: 'shu', war: 75, lead: 80, int: 76, title: '昭烈帝', ruler: true },
  zhugeliang: { name: '諸葛亮', f: 'shu', war: 38, lead: 97, int: 100, title: '丞相', banner: '諸葛' },
  zhaoyun: { name: '趙雲', f: 'shu', war: 96, lead: 90, int: 76, title: '翊軍將軍' },
  machao: { name: '馬超', f: 'shu', war: 97, lead: 88, int: 45, title: '驃騎將軍' },
  zhangfei: { name: '張飛', f: 'shu', war: 98, lead: 85, int: 32, title: '車騎將軍' },
  weiyan: { name: '魏延', f: 'shu', war: 92, lead: 84, int: 68, title: '鎮北將軍' },
  huangquan: { name: '黃權', f: 'shu', war: 60, lead: 78, int: 82, title: '鎮北將軍' },
  masu: { name: '馬謖', f: 'shu', war: 60, lead: 66, int: 86, title: '參軍' },
  wangping: { name: '王平', f: 'shu', war: 76, lead: 82, int: 70, title: '牙門將' },
  jiangwei: { name: '姜維', f: 'shu', war: 90, lead: 91, int: 90, title: '征西將軍' },
  wuban: { name: '吳班', f: 'shu', war: 72, lead: 70, int: 55, title: '將軍' },
  guanxing: { name: '關興', f: 'shu', war: 85, lead: 72, int: 60, title: '侍中' },
  zhangbao: { name: '張苞', f: 'shu', war: 85, lead: 70, int: 48, title: '將軍' },
  maliang: { name: '馬良', f: 'shu', war: 30, lead: 60, int: 86, title: '侍中' },
  // 吳
  sunquan: { name: '孫權', f: 'wu', war: 67, lead: 80, int: 85, title: '吳大帝', ruler: true },
  luxun: { name: '陸遜', f: 'wu', war: 69, lead: 95, int: 96, title: '大都督' },
  zhoutai: { name: '周泰', f: 'wu', war: 92, lead: 78, int: 50, title: '奮威將軍' },
  zhuhuan: { name: '朱桓', f: 'wu', war: 82, lead: 85, int: 72, title: '濡須督' },
  zhuran: { name: '朱然', f: 'wu', war: 78, lead: 82, int: 70, title: '昭武將軍' },
  handang: { name: '韓當', f: 'wu', war: 82, lead: 78, int: 55, title: '威烈將軍' },
  xusheng: { name: '徐盛', f: 'wu', war: 84, lead: 82, int: 72, title: '安東將軍' },
  dingfeng: { name: '丁奉', f: 'wu', war: 85, lead: 78, int: 65, title: '偏將軍' },
  panzhang: { name: '潘璋', f: 'wu', war: 82, lead: 70, int: 50, title: '平北將軍' },
  zhugejin: { name: '諸葛瑾', f: 'wu', war: 40, lead: 70, int: 85, title: '左將軍', banner: '諸葛' },
  zhoufang: { name: '周魴', f: 'wu', war: 55, lead: 65, int: 88, title: '鄱陽太守' },
  lvfan: { name: '呂範', f: 'wu', war: 60, lead: 75, int: 72, title: '前將軍' },
  quancong: { name: '全琮', f: 'wu', war: 72, lead: 78, int: 70, title: '綏南將軍' },
  sunhuan: { name: '孫桓', f: 'wu', war: 75, lead: 72, int: 60, title: '安東中郎將' },
  // 南蠻
  menghuo: { name: '孟獲', f: 'nanman', war: 87, lead: 70, int: 40, title: '南蠻王', ruler: true },
  zhurong: { name: '祝融', f: 'nanman', war: 85, lead: 65, int: 45, title: '南蠻王妃' },
  mengyou: { name: '孟優', f: 'nanman', war: 75, lead: 55, int: 35, title: '蠻將' },
  yonggai: { name: '雍闓', f: 'nanman', war: 65, lead: 62, int: 50, title: '益州豪強' },
};
for (const [id, g] of Object.entries(GENERALS)) g.id = id;
export const gname = (id) => GENERALS[id]?.name || id;

// 城池：lon / lat 為大約的真實經緯度；size 1 小城 2 大城 3 都城
export const CITIES = {
  // 魏
  luoyang: { name: '洛陽', lon: 112.45, lat: 34.62, size: 3, owner: 'wei' },
  xuchang: { name: '許昌', lon: 113.8, lat: 34.03, size: 2, owner: 'wei' },
  ye: { name: '鄴', lon: 114.35, lat: 36.3, size: 2, owner: 'wei' },
  changan: { name: '長安', lon: 108.94, lat: 34.3, size: 2, owner: 'wei' },
  chencang: { name: '陳倉', lon: 107.14, lat: 34.36, size: 1, owner: 'wei' },
  tianshui: { name: '天水', lon: 105.7, lat: 34.58, size: 1, owner: 'wei' },
  wuwei: { name: '武威', lon: 102.64, lat: 37.93, size: 1, owner: 'wei' },
  wan: { name: '宛', lon: 112.53, lat: 33.0, size: 1, owner: 'wei' },
  xiangyang: { name: '襄陽', lon: 112.14, lat: 32.04, size: 2, owner: 'wei' },
  runan: { name: '汝南', lon: 114.6, lat: 33.0, size: 1, owner: 'wei' },
  hefei: { name: '合肥', lon: 117.28, lat: 31.86, size: 2, owner: 'wei' },
  shouchun: { name: '壽春', lon: 116.8, lat: 32.58, size: 2, owner: 'wei' },
  xiapi: { name: '下邳', lon: 117.95, lat: 34.32, size: 1, owner: 'wei' },
  linzi: { name: '臨淄', lon: 118.3, lat: 36.8, size: 1, owner: 'wei' },
  jinyang: { name: '晉陽', lon: 112.55, lat: 37.87, size: 1, owner: 'wei' },
  ji: { name: '薊', lon: 116.4, lat: 39.9, size: 1, owner: 'wei' },
  // 蜀
  chengdu: { name: '成都', lon: 104.06, lat: 30.67, size: 3, owner: 'shu' },
  hanzhong: { name: '漢中', lon: 107.03, lat: 33.07, size: 2, owner: 'shu' },
  zitong: { name: '梓潼', lon: 105.16, lat: 31.64, size: 1, owner: 'shu' },
  jiangzhou: { name: '江州', lon: 106.55, lat: 29.56, size: 1, owner: 'shu' },
  yongan: { name: '永安', lon: 109.48, lat: 31.05, size: 1, owner: 'shu' },
  yuexi: { name: '越巂', lon: 102.27, lat: 27.9, size: 1, owner: 'shu' },
  // 南蠻
  jianning: { name: '建寧', lon: 103.8, lat: 25.5, size: 1, owner: 'nanman' },
  yunnan: { name: '雲南', lon: 100.25, lat: 25.6, size: 1, owner: 'nanman' },
  // 吳
  jianye: { name: '建業', lon: 118.78, lat: 32.05, size: 3, owner: 'wu' },
  wujun: { name: '吳郡', lon: 120.6, lat: 31.3, size: 2, owner: 'wu' },
  kuaiji: { name: '會稽', lon: 120.58, lat: 30.0, size: 1, owner: 'wu' },
  ruxu: { name: '濡須', lon: 117.85, lat: 31.6, size: 1, owner: 'wu' },
  wan2: { name: '皖', lon: 116.6, lat: 30.55, size: 1, owner: 'wu' },
  chaisang: { name: '柴桑', lon: 115.98, lat: 29.7, size: 1, owner: 'wu' },
  wuchang: { name: '武昌', lon: 114.9, lat: 30.4, size: 2, owner: 'wu' },
  jiangling: { name: '江陵', lon: 112.2, lat: 30.35, size: 2, owner: 'wu' },
  yiling: { name: '夷陵', lon: 111.29, lat: 30.7, size: 1, owner: 'wu' },
  wuling: { name: '武陵', lon: 111.69, lat: 29.03, size: 1, owner: 'wu' },
  changsha: { name: '長沙', lon: 112.94, lat: 28.23, size: 2, owner: 'wu' },
  lingling: { name: '零陵', lon: 111.6, lat: 26.42, size: 1, owner: 'wu' },
  luling: { name: '廬陵', lon: 115.0, lat: 27.1, size: 1, owner: 'wu' },
  jianan: { name: '建安', lon: 118.3, lat: 27.05, size: 1, owner: 'wu' },
  panyu: { name: '番禺', lon: 113.26, lat: 23.13, size: 1, owner: 'wu' },
};
for (const [id, c] of Object.entries(CITIES)) c.id = id;

export const ROADS = [
  ['ji', 'ye'], ['ji', 'jinyang'], ['jinyang', 'ye'], ['jinyang', 'luoyang'], ['ye', 'linzi'], ['ye', 'luoyang'],
  ['ye', 'xuchang'], ['linzi', 'xiapi'], ['xiapi', 'xuchang'], ['xiapi', 'shouchun'], ['xiapi', 'jianye'],
  ['luoyang', 'xuchang'], ['luoyang', 'changan'], ['luoyang', 'wan'], ['xuchang', 'runan'], ['xuchang', 'wan'],
  ['runan', 'shouchun'], ['shouchun', 'hefei'], ['hefei', 'ruxu'], ['ruxu', 'jianye'], ['hefei', 'wan2'],
  ['wan2', 'chaisang'], ['changan', 'chencang'], ['chencang', 'tianshui'], ['tianshui', 'wuwei'],
  ['chencang', 'hanzhong'], ['changan', 'hanzhong'], ['tianshui', 'hanzhong'], ['hanzhong', 'zitong'],
  ['zitong', 'chengdu'], ['chengdu', 'jiangzhou'], ['jiangzhou', 'yongan'], ['chengdu', 'yuexi'],
  ['yuexi', 'yunnan'], ['yuexi', 'jianning'], ['jiangzhou', 'jianning'], ['jianning', 'yunnan'],
  ['yongan', 'yiling'], ['yiling', 'jiangling'], ['jiangling', 'xiangyang'], ['xiangyang', 'wan'],
  ['jiangling', 'wuling'], ['jiangling', 'wuchang'], ['wuling', 'changsha'], ['wuling', 'lingling'],
  ['lingling', 'changsha'], ['lingling', 'panyu'], ['changsha', 'wuchang'], ['changsha', 'luling'],
  ['wuchang', 'chaisang'], ['chaisang', 'luling'], ['luling', 'jianan'], ['luling', 'panyu'],
  ['jianan', 'kuaiji'], ['kuaiji', 'wujun'], ['wujun', 'jianye'], ['wuchang', 'runan'],
];

export function neighbors(cityId) {
  const out = [];
  for (const [a, b] of ROADS) { if (a === cityId) out.push(b); else if (b === cityId) out.push(a); }
  return out;
}

// 兵法（戰術）
export const TACTICS = {
  charge: { name: '鐵騎衝鋒', icon: '騎', cd: 35, desc: '全軍騎兵速度、攻擊大增 8 秒。',
    quote: '「激水之疾，至於漂石者，勢也。」——《孫子·兵勢》' },
  volley: { name: '萬箭齊發', icon: '箭', cd: 30, desc: '弓兵齊射，立即造成大量傷亡並打擊士氣。',
    quote: '「善戰者，其勢險，其節短。」——《孫子·兵勢》' },
  fire: { name: '火攻', icon: '火', cd: 60, desc: '對指定敵軍縱火，在林地、營寨中威力倍增並會蔓延。',
    quote: '「發火有時，起火有日。……火發於內，則早應之於外。」——《孫子·火攻》' },
  ambush: { name: '伏兵', icon: '伏', cd: 0, desc: '布陣時可將部隊藏於山林，開戰後伺機殺出，敵軍大亂。',
    quote: '「攻其無備，出其不意。」——《孫子·始計》' },
  feint: { name: '誘敵深入', icon: '誘', cd: 50, desc: '佯敗誘敵冒進：敵軍防禦下降，我軍對其攻擊提高 12 秒。',
    quote: '「利而誘之，亂而取之。」——《孫子·始計》' },
  drum: { name: '擂鼓助威', icon: '鼓', cd: 40, desc: '全軍士氣大幅回升。',
    quote: '「夫戰，勇氣也。一鼓作氣，再而衰，三而竭。」——《左傳·曹劌論戰》' },
  shield: { name: '堅壁陣', icon: '盾', cd: 40, desc: '全軍防禦大增 10 秒。',
    quote: '「昔之善戰者，先為不可勝，以待敵之可勝。」——《孫子·軍形》' },
  rockfall: { name: '滾木礌石', icon: '石', cd: 35, desc: '自高處（城牆、山頂）推落木石，重創下方敵軍。',
    quote: '「居高臨下，勢如破竹。」' },
};

// 兵器
export const WEAPONS = {
  armor: { name: '虎豹騎鐵甲', desc: '騎兵防禦 +30%' },
  crossbow: { name: '諸葛連弩', desc: '弓兵攻擊 +40%，一弩十矢' },
  spear: { name: '丈八長槍', desc: '槍兵攻擊 +25%' },
  ladder: { name: '雲梯', desc: '攻城時步兵、槍兵可攀牆作戰' },
  ram: { name: '衝車', desc: '攻城時破門速度 ×3' },
  catapult: { name: '霹靂車', desc: '攻城時投石轟擊城牆守軍' },
  muniu: { name: '木牛流馬', desc: '糧道無憂：全軍士氣下降減緩' },
  warship: { name: '樓船艨艟', desc: '水畔作戰時全軍攻擊 +15%' },
};

// 兵種
export const UNIT_TYPES = {
  inf: { name: '步兵', icon: '步', atk: 1.0, def: 1.1, speed: 7, range: 2.5, color: '#c9b37e' },
  spear: { name: '槍兵', icon: '槍', atk: 0.95, def: 1.2, speed: 6.5, range: 3.5, color: '#9fb6c9' },
  cav: { name: '騎兵', icon: '騎', atk: 1.25, def: 0.95, speed: 14, range: 3, color: '#d68b5a' },
  archer: { name: '弓兵', icon: '弓', atk: 0.7, def: 0.7, speed: 6.5, range: 48, color: '#8fc08a' },
};
// 相剋：COUNTER[攻][守]
export const COUNTER = {
  inf: { inf: 1, spear: 1.3, cav: 0.9, archer: 1.25 },
  spear: { inf: 0.85, spear: 1, cav: 1.7, archer: 1.1 },
  cav: { inf: 1.1, spear: 0.6, cav: 1, archer: 1.7 },
  archer: { inf: 1.2, spear: 1.1, cav: 0.85, archer: 1 },
};

// 陣型：slots 為相對位置（x 橫向、z 縱深，負值朝敵），mods 為修正
export const FORMATIONS = {
  fengshi: { name: '鋒矢陣', desc: '尖銳突破：攻擊 +15%、速度 +10%，防禦 -10%',
    slots: [[0, -2], [-1, -1], [1, -1], [-2, 0], [2, 0], [0, 0.6]], mods: { atk: 1.15, def: 0.9, spd: 1.1 } },
  heyi: { name: '鶴翼陣', desc: '兩翼包抄：側翼攻擊 +20%，中軍防禦 +10%',
    slots: [[0, 0], [-1.3, -0.8], [1.3, -0.8], [-2.6, -1.8], [2.6, -1.8], [0, 1]], mods: { atk: 1.08, def: 1.05, spd: 1, flank: 1.2 } },
  yulin: { name: '魚鱗陣', desc: '層層推進：攻擊 +10%、防禦 +5%',
    slots: [[0, -1.6], [-0.8, -0.8], [0.8, -0.8], [-1.6, 0], [0, 0], [1.6, 0]], mods: { atk: 1.1, def: 1.05, spd: 1 } },
  fangyuan: { name: '方圓陣', desc: '固守如山：防禦 +25%，攻擊 -10%、速度 -15%',
    slots: [[0, -1.2], [-1.2, 0], [1.2, 0], [0, 1.2], [-1.2, -1.2], [1.2, 1.2]], mods: { atk: 0.9, def: 1.25, spd: 0.85 } },
  yanxing: { name: '雁行陣', desc: '斜行展開：弓兵攻擊 +25%、射程 +20%',
    slots: [[-2.2, -1.1], [-1.1, -0.55], [0, 0], [1.1, 0.55], [2.2, 1.1], [0, 1.4]], mods: { atk: 1, def: 1, spd: 1, archer: 1.25, range: 1.2 } },
  changshe: { name: '長蛇陣', desc: '首尾相應：速度 +25%，防禦 -5%',
    slots: [[0, -2.5], [0, -1.5], [0, -0.5], [0, 0.5], [0, 1.5], [0, 2.5]], mods: { atk: 1, def: 0.95, spd: 1.25 } },
};

export const SEASONS = ['春', '夏', '秋', '冬'];
