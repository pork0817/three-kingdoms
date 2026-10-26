// 遊戲資料：勢力、武將、城池、兵法、兵器、陣型、兵種

export const FACTIONS = {
  wei: { id: 'wei', name: '魏', full: '曹魏', color: 0x3b6fd6, css: '#4a7fe6', leader: 'caocao', capital: 'luoyang', major: true,
    desc: '曹操挾天子以令諸侯，已平定北方。今率大軍南下荊州，欲一舉蕩平江南。', difficulty: '易' },
  shu: { id: 'shu', name: '蜀', full: '蜀漢', color: 0x3c9a4a, css: '#4cb85c', leader: 'liubei', capital: 'chengdu', major: true,
    desc: '劉備新得臥龍，卻於當陽長坂大敗，僅餘江夏一隅。聯吳抗曹、借荊取益，從零開始的霸業。', difficulty: '難' },
  wu: { id: 'wu', name: '吳', full: '東吳', color: 0xcf3a2c, css: '#e2533f', leader: 'sunquan', capital: 'jianye', major: true,
    desc: '孫權承父兄基業，坐擁江東六郡。曹操八十萬大軍壓境，戰與降，在此一念。', difficulty: '中' },
  liuzhang: { id: 'liuzhang', name: '璋', full: '益州劉璋', color: 0x2a9a96, css: '#3ab8b0', leader: 'liuzhang', capital: 'chengdu' },
  zhanglu: { id: 'zhanglu', name: '魯', full: '漢中張魯', color: 0x8a5ab0, css: '#a678cc', leader: 'zhanglu', capital: 'hanzhong' },
  xiliang: { id: 'xiliang', name: '涼', full: '西涼', color: 0xd08a2a, css: '#e8a040', leader: 'hansui', capital: 'tianshui' },
  jingnan: { id: 'jingnan', name: '荊', full: '荊南四郡', color: 0x6a8aa0, css: '#86a6bc', leader: 'hanxuan', capital: 'changsha' },
  shixie: { id: 'shixie', name: '交', full: '交州士燮', color: 0xb06a7a, css: '#c88898', leader: 'shixie', capital: 'panyu' },
  nanman: { id: 'nanman', name: '蠻', full: '南蠻', color: 0x9a6a2a, css: '#b98a3c', leader: 'menghuo', capital: 'jianning' },
  yizhou: { id: 'yizhou', name: '夷', full: '夷州', color: 0x9ab040, css: '#b0c860', leader: 'yizhouwang', capital: 'yizhou' },
};

// 武將：war 武力 / lead 統率 / int 智力 / life [生, 卒, n 病逝 | v 戰死或遇害] / fy 隨年份改變的所屬（'free' 為在野）
const G = (name, f, war, lead, int, title, life, o = {}) => ({ name, f, war, lead, int, title, life, ...o });
export const GENERALS = {
  // 魏
  caocao: G('曹操', 'wei', 72, 96, 91, '魏武帝', [155, 220, 'n'], { ruler: true }),
  caopi: G('曹丕', 'wei', 68, 76, 82, '魏文帝', [187, 226, 'n']),
  caorui: G('曹叡', 'wei', 55, 72, 85, '魏明帝', [205, 239, 'n']),
  caozhi: G('曹植', 'wei', 40, 45, 88, '陳思王', [192, 232, 'n']),
  caoren: G('曹仁', 'wei', 86, 89, 62, '大司馬', [168, 223, 'n']),
  caohong: G('曹洪', 'wei', 78, 72, 45, '驃騎將軍', [169, 232, 'n']),
  xiahoudun: G('夏侯惇', 'wei', 88, 84, 60, '大將軍', [160, 220, 'n'], { banner: '夏侯' , loyal: true }),
  xiahouyuan: G('夏侯淵', 'wei', 90, 86, 55, '征西將軍', [165, 219, 'v'], { banner: '夏侯' }),
  xuchu: G('許褚', 'wei', 96, 65, 36, '武衛將軍', [170, 230, 'n'], { loyal: true }),
  yujin: G('于禁', 'wei', 80, 86, 65, '左將軍', [162, 221, 'n']),
  lejin: G('樂進', 'wei', 84, 78, 52, '右將軍', [165, 218, 'n']),
  xunyu: G('荀彧', 'wei', 20, 60, 96, '尚書令', [163, 212, 'n'], { loyal: true }),
  jiaxu: G('賈詡', 'wei', 30, 70, 97, '太尉', [147, 223, 'n']),
  caoxiu: G('曹休', 'wei', 77, 80, 58, '大司馬', [180, 228, 'n']),
  caozhen: G('曹真', 'wei', 79, 85, 66, '大將軍', [185, 231, 'n']),
  zhangliao: G('張遼', 'wei', 92, 93, 78, '前將軍', [169, 222, 'n']),
  zhanghe: G('張郃', 'wei', 89, 88, 70, '左將軍', [167, 231, 'v']),
  xuhuang: G('徐晃', 'wei', 88, 86, 70, '右將軍', [169, 227, 'n']),
  simayi: G('司馬懿', 'wei', 63, 96, 98, '太尉', [179, 251, 'n'], { banner: '司馬' }),
  xiahoushang: G('夏侯尚', 'wei', 74, 78, 66, '征南大將軍', [180, 226, 'n'], { banner: '夏侯' }),
  xiahoumao: G('夏侯楙', 'wei', 40, 38, 42, '安西將軍', [185, 250, 'n'], { banner: '夏侯' }),
  guohuai: G('郭淮', 'wei', 74, 83, 78, '雍州刺史', [187, 255, 'n']),
  haozhao: G('郝昭', 'wei', 76, 86, 72, '雜號將軍', [190, 230, 'n']),
  manchong: G('滿寵', 'wei', 70, 86, 86, '征東將軍', [170, 242, 'n']),
  jiakui: G('賈逵', 'wei', 58, 72, 82, '豫州刺史', [174, 228, 'n']),
  changdiao: G('常雕', 'wei', 62, 55, 40, '將軍', [180, 222, 'v']),
  caotai: G('曹泰', 'wei', 70, 66, 50, '將軍', [195, 250, 'n']),
  pangde: G('龐德', 'wei', 90, 78, 55, '立義將軍', [170, 219, 'v'], { fy: [[0, 'xiliang'], [213, 'zhanglu'], [215, 'wei']] , loyal: true }),
  dengai: G('鄧艾', 'wei', 82, 92, 88, '征西將軍', [197, 264, 'n'], { fy: [[0, 'free'], [235, 'wei']] }),
  // 蜀
  liubei: G('劉備', 'shu', 75, 80, 76, '昭烈帝', [161, 223, 'n'], { ruler: true }),
  guanyu: G('關羽', 'shu', 97, 95, 75, '前將軍', [160, 219, 'v'], { loyal: true }),
  zhangfei: G('張飛', 'shu', 98, 85, 32, '車騎將軍', [165, 221, 'v'], { loyal: true }),
  zhaoyun: G('趙雲', 'shu', 96, 90, 76, '翊軍將軍', [168, 229, 'n'], { loyal: true }),
  zhugeliang: G('諸葛亮', 'shu', 38, 97, 100, '丞相', [181, 234, 'n'], { banner: '諸葛' , loyal: true }),
  pangtong: G('龐統', 'shu', 34, 84, 97, '軍師中郎將', [179, 214, 'v'], { fy: [[0, 'free'], [210, 'shu']] }),
  guanping: G('關平', 'shu', 80, 70, 60, '將軍', [178, 219, 'v']),
  liaohua: G('廖化', 'shu', 74, 70, 60, '右車騎將軍', [180, 264, 'n']),
  machao: G('馬超', 'shu', 97, 88, 45, '驃騎將軍', [176, 222, 'n'], { fy: [[0, 'xiliang'], [213, 'zhanglu'], [214, 'shu']] }),
  huangzhong: G('黃忠', 'shu', 93, 84, 60, '後將軍', [148, 220, 'n'], { fy: [[0, 'jingnan'], [209, 'shu']] , loyal: true }),
  weiyan: G('魏延', 'shu', 92, 84, 68, '鎮北將軍', [175, 234, 'v'], { fy: [[0, 'jingnan'], [209, 'shu']] }),
  fazheng: G('法正', 'shu', 45, 76, 94, '尚書令', [176, 220, 'n'], { fy: [[0, 'liuzhang'], [214, 'shu']] }),
  huangquan: G('黃權', 'shu', 60, 78, 82, '鎮北將軍', [180, 240, 'n'], { fy: [[0, 'liuzhang'], [214, 'shu']] }),
  yanyan: G('嚴顏', 'shu', 82, 78, 65, '巴郡太守', [150, 222, 'n'], { fy: [[0, 'liuzhang'], [214, 'shu']] }),
  masu: G('馬謖', 'shu', 60, 66, 86, '參軍', [190, 228, 'n'], { fy: [[0, 'jingnan'], [209, 'shu']] }),
  maliang: G('馬良', 'shu', 30, 60, 86, '侍中', [187, 222, 'v'], { fy: [[0, 'jingnan'], [209, 'shu']] }),
  wangping: G('王平', 'shu', 76, 82, 70, '鎮北將軍', [190, 248, 'n'], { fy: [[0, 'wei'], [219, 'shu']] }),
  jiangwei: G('姜維', 'shu', 90, 91, 90, '征西將軍', [202, 264, 'n'], { fy: [[0, 'wei'], [228, 'shu']] , loyal: true }),
  wuban: G('吳班', 'shu', 72, 70, 55, '將軍', [180, 240, 'n'], { fy: [[0, 'liuzhang'], [214, 'shu']] }),
  guanxing: G('關興', 'shu', 85, 72, 60, '侍中', [200, 234, 'n']),
  zhangbao: G('張苞', 'shu', 85, 70, 48, '將軍', [200, 229, 'n']),
  mengda: G('孟達', 'shu', 74, 72, 68, '新城太守', [180, 228, 'v'], { fy: [[0, 'liuzhang'], [214, 'shu'], [220, 'wei'], [227, 'shu']] }),
  mifang: G('糜芳', 'shu', 55, 55, 40, '南郡太守', [170, 240, 'n'], { fy: [[0, 'shu'], [219, 'wu']] }),
  // 吳
  sunquan: G('孫權', 'wu', 67, 80, 85, '吳大帝', [182, 252, 'n'], { ruler: true }),
  zhouyu: G('周瑜', 'wu', 72, 97, 96, '大都督', [175, 210, 'n'], { loyal: true }),
  lusu: G('魯肅', 'wu', 55, 82, 92, '橫江將軍', [172, 217, 'n'], { loyal: true }),
  lvmeng: G('呂蒙', 'wu', 82, 91, 89, '南郡太守', [178, 220, 'n']),
  luxun: G('陸遜', 'wu', 69, 95, 96, '大都督', [183, 245, 'n']),
  huanggai: G('黃蓋', 'wu', 80, 78, 70, '偏將軍', [155, 215, 'n']),
  chengpu: G('程普', 'wu', 80, 84, 70, '江夏太守', [150, 215, 'n']),
  ganning: G('甘寧', 'wu', 93, 86, 60, '折衝將軍', [175, 220, 'n']),
  lingtong: G('凌統', 'wu', 87, 75, 55, '偏將軍', [189, 217, 'n']),
  zhoutai: G('周泰', 'wu', 92, 78, 50, '奮威將軍', [170, 225, 'n']),
  zhuhuan: G('朱桓', 'wu', 82, 85, 72, '濡須督', [177, 238, 'n']),
  zhuran: G('朱然', 'wu', 78, 82, 70, '昭武將軍', [182, 249, 'n']),
  handang: G('韓當', 'wu', 82, 78, 55, '威烈將軍', [160, 227, 'n']),
  xusheng: G('徐盛', 'wu', 84, 82, 72, '安東將軍', [177, 228, 'n']),
  dingfeng: G('丁奉', 'wu', 85, 78, 65, '偏將軍', [190, 271, 'n']),
  panzhang: G('潘璋', 'wu', 82, 70, 50, '平北將軍', [180, 234, 'n']),
  zhugejin: G('諸葛瑾', 'wu', 40, 70, 85, '左將軍', [174, 241, 'n'], { banner: '諸葛' }),
  zhoufang: G('周魴', 'wu', 55, 65, 88, '鄱陽太守', [185, 240, 'n']),
  lvfan: G('呂範', 'wu', 60, 75, 72, '前將軍', [165, 228, 'n']),
  quancong: G('全琮', 'wu', 72, 78, 70, '綏南將軍', [198, 249, 'n']),
  sunhuan: G('孫桓', 'wu', 75, 72, 60, '安東中郎將', [198, 223, 'n']),
  sunshangxiang: G('孫尚香', 'wu', 78, 62, 66, '孫夫人', [190, 250, 'n'], { female: true }),
  weiwen: G('衛溫', 'wu', 68, 70, 55, '將軍', [190, 231, 'n']),
  // 益州
  liuzhang: G('劉璋', 'liuzhang', 30, 45, 55, '益州牧', [162, 220, 'n'], { ruler: true }),
  zhangren: G('張任', 'liuzhang', 86, 84, 70, '從事', [170, 214, 'v'], { loyal: true }),
  liyan: G('李嚴', 'liuzhang', 80, 82, 78, '護軍', [180, 234, 'n'], { fy: [[0, 'liuzhang'], [214, 'shu']] }),
  // 漢中
  zhanglu: G('張魯', 'zhanglu', 30, 60, 75, '師君', [170, 216, 'n'], { ruler: true }),
  zhangwei: G('張衛', 'zhanglu', 72, 66, 40, '將軍', [175, 215, 'v']),
  yangren: G('楊任', 'zhanglu', 75, 68, 50, '將軍', [175, 215, 'v']),
  // 西涼
  hansui: G('韓遂', 'xiliang', 70, 80, 72, '鎮西將軍', [140, 215, 'n'], { ruler: true }),
  madai: G('馬岱', 'xiliang', 82, 74, 62, '平北將軍', [180, 240, 'n'], { fy: [[0, 'xiliang'], [214, 'shu']] }),
  chenggongying: G('成公英', 'xiliang', 50, 66, 80, '軍師', [175, 230, 'n']),
  // 荊南
  hanxuan: G('韓玄', 'jingnan', 40, 45, 40, '長沙太守', [160, 209, 'v'], { ruler: true }),
  jinxuan: G('金旋', 'jingnan', 50, 50, 40, '武陵太守', [160, 209, 'v']),
  liudu: G('劉度', 'jingnan', 40, 46, 42, '零陵太守', [160, 230, 'n']),
  // 交州
  shixie: G('士燮', 'shixie', 40, 66, 78, '交趾太守', [137, 226, 'n'], { ruler: true }),
  // 南蠻
  menghuo: G('孟獲', 'nanman', 87, 70, 40, '南蠻王', [180, 250, 'n'], { ruler: true }),
  zhurong: G('祝融', 'nanman', 85, 65, 45, '南蠻王妃', [185, 250, 'n'], { female: true }),
  mengyou: G('孟優', 'nanman', 75, 55, 35, '蠻將', [185, 250, 'n']),
  yonggai: G('雍闓', 'nanman', 65, 62, 50, '益州豪強', [175, 225, 'v']),
  wutugu: G('兀突骨', 'nanman', 90, 60, 20, '烏戈國主', [180, 225, 'v']),
  // 夷州
  yizhouwang: G('夷州酋長', 'yizhou', 70, 55, 45, '夷州酋長', [180, 260, 'n'], { ruler: true }),
  // 在野
  xushu: G('徐庶', 'wei', 70, 78, 90, '御史中丞', [170, 234, 'n'], { fy: [[0, 'free']] }),
};
for (const [id, g] of Object.entries(GENERALS)) g.id = id;
export const gname = (id) => GENERALS[id]?.name || id;
export function factionAt(id, year) {
  const g = GENERALS[id]; if (!g) return null;
  if (!g.fy) return g.f;
  let f = g.f;
  for (const [y, ff] of g.fy) if (year >= y) f = ff;
  return f;
}

// 城池：lon / lat 為大約的真實經緯度；size 1 小城 2 大城 3 都城；owner 為 208 年歸屬
export const CITIES = {
  luoyang: { name: '洛陽', lon: 112.45, lat: 34.62, size: 3, owner: 'wei' },
  xuchang: { name: '許昌', lon: 113.8, lat: 34.03, size: 2, owner: 'wei' },
  ye: { name: '鄴', lon: 114.35, lat: 36.3, size: 2, owner: 'wei' },
  changan: { name: '長安', lon: 108.94, lat: 34.3, size: 2, owner: 'wei' },
  chencang: { name: '陳倉', lon: 107.14, lat: 34.36, size: 1, owner: 'wei' },
  tianshui: { name: '天水', lon: 105.7, lat: 34.58, size: 1, owner: 'xiliang' },
  wuwei: { name: '武威', lon: 102.64, lat: 37.93, size: 1, owner: 'xiliang' },
  wan: { name: '宛', lon: 112.53, lat: 33.0, size: 1, owner: 'wei' },
  xiangyang: { name: '襄陽', lon: 112.14, lat: 32.04, size: 2, owner: 'wei' },
  runan: { name: '汝南', lon: 114.6, lat: 33.0, size: 1, owner: 'wei' },
  hefei: { name: '合肥', lon: 117.28, lat: 31.86, size: 2, owner: 'wei' },
  shouchun: { name: '壽春', lon: 116.8, lat: 32.58, size: 2, owner: 'wei' },
  xiapi: { name: '下邳', lon: 117.95, lat: 34.32, size: 1, owner: 'wei' },
  linzi: { name: '臨淄', lon: 118.3, lat: 36.8, size: 1, owner: 'wei' },
  jinyang: { name: '晉陽', lon: 112.55, lat: 37.87, size: 1, owner: 'wei' },
  ji: { name: '薊', lon: 116.4, lat: 39.9, size: 1, owner: 'wei' },
  chengdu: { name: '成都', lon: 104.06, lat: 30.67, size: 3, owner: 'liuzhang' },
  hanzhong: { name: '漢中', lon: 107.03, lat: 33.07, size: 2, owner: 'zhanglu' },
  zitong: { name: '梓潼', lon: 105.16, lat: 31.64, size: 1, owner: 'liuzhang' },
  jiangzhou: { name: '江州', lon: 106.55, lat: 29.56, size: 1, owner: 'liuzhang' },
  yongan: { name: '永安', lon: 109.48, lat: 31.05, size: 1, owner: 'liuzhang' },
  yuexi: { name: '越巂', lon: 102.27, lat: 27.9, size: 1, owner: 'liuzhang' },
  jianning: { name: '建寧', lon: 103.8, lat: 25.5, size: 1, owner: 'nanman' },
  yunnan: { name: '雲南', lon: 100.25, lat: 25.6, size: 1, owner: 'nanman' },
  jianye: { name: '建業', lon: 118.78, lat: 32.05, size: 3, owner: 'wu' },
  wujun: { name: '吳郡', lon: 120.6, lat: 31.3, size: 2, owner: 'wu' },
  kuaiji: { name: '會稽', lon: 120.58, lat: 30.0, size: 1, owner: 'wu' },
  ruxu: { name: '濡須', lon: 117.85, lat: 31.6, size: 1, owner: 'wu' },
  wan2: { name: '皖', lon: 116.6, lat: 30.55, size: 1, owner: 'wei' },
  chaisang: { name: '柴桑', lon: 115.98, lat: 29.7, size: 1, owner: 'wu' },
  wuchang: { name: '江夏', lon: 114.9, lat: 30.4, size: 2, owner: 'shu' },
  jiangling: { name: '江陵', lon: 112.2, lat: 30.35, size: 2, owner: 'wei' },
  yiling: { name: '夷陵', lon: 111.29, lat: 30.7, size: 1, owner: 'wei' },
  wuling: { name: '武陵', lon: 111.69, lat: 29.03, size: 1, owner: 'jingnan' },
  changsha: { name: '長沙', lon: 112.94, lat: 28.23, size: 2, owner: 'jingnan' },
  lingling: { name: '零陵', lon: 111.6, lat: 26.42, size: 1, owner: 'jingnan' },
  luling: { name: '廬陵', lon: 115.0, lat: 27.1, size: 1, owner: 'wu' },
  jianan: { name: '建安', lon: 118.3, lat: 27.05, size: 1, owner: 'wu' },
  panyu: { name: '番禺', lon: 113.26, lat: 23.13, size: 1, owner: 'shixie' },
  yizhou: { name: '夷州', lon: 121.2, lat: 24.6, size: 1, owner: 'yizhou' },
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
  ['jianan', 'kuaiji'], ['kuaiji', 'wujun'], ['wujun', 'jianye'], ['wuchang', 'runan'], ['jianan', 'yizhou'],
];
export const SEA_ROUTES = [['jianan', 'yizhou']];

export function neighbors(cityId) {
  const out = [];
  for (const [a, b] of ROADS) { if (a === cityId) out.push(b); else if (b === cityId) out.push(a); }
  return out;
}

// 兵法（戰術）
export const TACTICS = {
  charge: { name: '鐵騎衝鋒', icon: '騎', cd: 35, price: 1200, desc: '全軍騎兵速度、攻擊大增 8 秒。',
    quote: '「激水之疾，至於漂石者，勢也。」——《孫子·兵勢》' },
  volley: { name: '萬箭齊發', icon: '箭', cd: 30, price: 1200, desc: '弓兵齊射，立即造成大量傷亡並打擊士氣。',
    quote: '「善戰者，其勢險，其節短。」——《孫子·兵勢》' },
  fire: { name: '火攻', icon: '火', cd: 60, price: 2500, desc: '對指定敵軍縱火，在林地、營寨中威力倍增並會蔓延。',
    quote: '「發火有時，起火有日。……火發於內，則早應之於外。」——《孫子·火攻》' },
  ambush: { name: '伏兵', icon: '伏', cd: 0, price: 1500, desc: '布陣時可將部隊藏於山林，開戰後伺機殺出，敵軍大亂。',
    quote: '「攻其無備，出其不意。」——《孫子·始計》' },
  feint: { name: '誘敵深入', icon: '誘', cd: 50, price: 1600, desc: '佯敗誘敵冒進：敵軍防禦下降，我軍對其攻擊提高 12 秒。',
    quote: '「利而誘之，亂而取之。」——《孫子·始計》' },
  drum: { name: '擂鼓助威', icon: '鼓', cd: 40, price: 1000, desc: '全軍士氣大幅回升。',
    quote: '「夫戰，勇氣也。一鼓作氣，再而衰，三而竭。」——《左傳·曹劌論戰》' },
  shield: { name: '堅壁陣', icon: '盾', cd: 40, price: 1200, desc: '全軍防禦大增 10 秒。',
    quote: '「昔之善戰者，先為不可勝，以待敵之可勝。」——《孫子·軍形》' },
  fireship: { name: '火船', icon: '船', cd: 70, price: 2800, desc: '水戰專用：放出滿載柴草的火船順風衝向敵艦，敵艦若以鐵索相連則火勢延燒全軍。',
    quote: '「今寇眾我寡，難與持久。然觀操軍船艦首尾相接，可燒而走也。」——黃蓋（《三國志·周瑜傳》）' },
  raid: { name: '夜襲劫營', icon: '襲', cd: 0, price: 1800, desc: '夜戰時趁敵熟睡突入營寨：敵軍開戰初期士氣與防禦大減。',
    quote: '「朝氣銳，晝氣惰，暮氣歸。善用兵者，避其銳氣，擊其惰歸。」——《孫子·軍爭》' },
  firearrow: { name: '火箭', icon: '焰', cd: 45, price: 1800, desc: '弓兵射出火箭，傷敵並在敵陣點起小火。',
    quote: '「以火佐攻者明，以水佐攻者強。」——《孫子·火攻》' },
  trap: { name: '絆馬索', icon: '索', cd: 50, price: 1500, desc: '暗設絆馬索與陷坑：敵軍騎兵受創，速度與防禦大減 15 秒。',
    quote: '「凡地有絕澗、天井、天牢、天羅、天陷、天隙，必亟去之。」——《孫子·行軍》' },
  decoy: { name: '疑兵', icon: '疑', cd: 60, price: 1600, desc: '多張旗幟、虛張聲勢：敵軍士氣大減、攻擊下降 12 秒。',
    quote: '「能而示之不能，用而示之不用，近而示之遠，遠而示之近。」——《孫子·始計》' },
  water: { name: '水攻', icon: '水', cd: 0, price: 2200, desc: '戰場有河流時決堤放水，一次重創敵軍（每戰限一次）。',
    quote: '「以水佐攻者強。水可以絕，不可以奪。」——《孫子·火攻》' },
  confuse: { name: '擾亂', icon: '亂', cd: 45, price: 2000, desc: '派細作散布謠言，使一支敵軍陷入混亂、停止行動 8 秒（智力越高越久）。',
    quote: '「亂而取之。」——《孫子·始計》' },
  encircle: { name: '包圍', icon: '圍', cd: 50, price: 1600, desc: '分兵包抄：我軍攻擊 +25%、敵軍士氣下降。',
    quote: '「十則圍之，五則攻之，倍則分之。」——《孫子·謀攻》' },
  medic: { name: '急救', icon: '醫', cd: 70, price: 1400, desc: '軍醫救治傷兵：各部隊恢復部分兵力與士氣。',
    quote: '「視卒如嬰兒，故可與之赴深谿；視卒如愛子，故可與之俱死。」——《孫子·地形》' },
  rockfall: { name: '滾木礌石', icon: '石', cd: 35, price: 1300, desc: '自高處（城牆、山頂）推落木石，重創下方敵軍。',
    quote: '「居高臨下，勢如破竹。」' },
};

// 兵器
export const WEAPONS = {
  armor: { name: '虎豹騎鐵甲', desc: '騎兵防禦 +30%', price: 2000 },
  crossbow: { name: '諸葛連弩', desc: '弓兵攻擊 +40%，一弩十矢', price: 2400 },
  spear: { name: '丈八長槍', desc: '槍兵攻擊 +25%', price: 1200 },
  ladder: { name: '雲梯', desc: '基本軍備：攻城時步兵、槍兵可架梯攀城', price: 0, basic: true },
  ram: { name: '衝車', desc: '攻城時以有頂棚的衝車撞門：破門速度為撞木的兩倍多，頂棚可擋大半箭矢', price: 1000 },
  catapult: { name: '霹靂車', desc: '攻城時投石轟擊城牆守軍', price: 1800 },
  muniu: { name: '木牛流馬', desc: '糧道無憂：全軍士氣下降減緩', price: 1500 },
  warship: { name: '樓船艨艟', desc: '水畔作戰時全軍攻擊 +15%', price: 2200 },
  tower: { name: '井闌', desc: '攻城時弓兵登上箭樓：對城頭守軍傷害 +60%', price: 1800 },
  caltrop: { name: '鐵蒺藜', desc: '布於陣前：敵軍騎兵速度 -30%', price: 1000 },
  horse: { name: '西涼良馬', desc: '騎兵速度 +20%、攻擊 +10%', price: 2000 },
  rattan: { name: '藤甲', desc: '步兵防禦 +25%，但怕火（受火傷害 +50%）', price: 1400 },
  oil: { name: '火油', desc: '守城時滾木礌石威力 ×1.6，並能焚毀敵軍衝車', price: 1200 },
};

// 兵種
export const UNIT_TYPES = {
  inf: { name: '步兵', icon: '步', atk: 1.0, def: 1.1, speed: 7, range: 2.5, color: '#c9b37e' },
  spear: { name: '槍兵', icon: '槍', atk: 0.95, def: 1.2, speed: 6.5, range: 3.5, color: '#9fb6c9' },
  cav: { name: '騎兵', icon: '騎', atk: 1.25, def: 0.95, speed: 14, range: 3, color: '#d68b5a' },
  archer: { name: '弓兵', icon: '弓', atk: 0.7, def: 0.7, speed: 6.5, range: 48, color: '#8fc08a' },
  tank: { name: '坦克', icon: '戰', atk: 3.2, def: 4.5, speed: 10, range: 120, color: '#8a9a7a', modern: true },
};
// 相剋：COUNTER[攻][守]
export const COUNTER = {
  inf: { inf: 1, spear: 1.3, cav: 0.9, archer: 1.25 },
  spear: { inf: 0.85, spear: 1, cav: 1.7, archer: 1.1 },
  cav: { inf: 1.1, spear: 0.6, cav: 1, archer: 1.7 },
  archer: { inf: 1.2, spear: 1.1, cav: 0.85, archer: 1, tank: 0.3 },
  tank: { inf: 1.6, spear: 1.6, cav: 1.8, archer: 1.8, tank: 1 },
};
for (const k of ['inf', 'spear', 'cav']) COUNTER[k].tank = 0.35;

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

// —— 穿越模式：現代裝備（轉盤獎勵） ——
export const RARITY = {
  N: { name: '普通', color: '#9aa4b0', weight: 52 },
  R: { name: '稀有', color: '#4aa8ff', weight: 30 },
  SR: { name: '史詩', color: '#c070ff', weight: 14 },
  SSR: { name: '傳說', color: '#ffb020', weight: 4 },
};
export const MODERN = {
  ration: { name: '軍用口糧', r: 'N', icon: '糧', desc: '立即獲得糧草 30000', instant: true },
  gold: { name: '金條', r: 'N', icon: '金', desc: '立即獲得 3000 金', instant: true },
  medkit: { name: '急救包', r: 'N', icon: '醫', desc: '戰鬥中未交戰的部隊會緩慢恢復兵力' },
  radio: { name: '無線電', r: 'N', icon: '訊', desc: '指揮如臂使指：我軍兵法冷卻時間減半' },
  vest: { name: '防彈衣', r: 'R', icon: '甲', desc: '我軍全體防禦 +50%' },
  nvg: { name: '夜視鏡', r: 'R', icon: '視', desc: '夜戰、大霧中我軍視野不受限制' },
  jeep: { name: '越野車', r: 'R', icon: '車', desc: '騎兵改乘越野車：速度 +50%' },
  c4: { name: '塑膠炸藥', r: 'R', icon: '爆', desc: '攻城時工兵炸開城門（開戰約 15 秒後城門直接被炸毀）' },
  rifle: { name: '自動步槍', r: 'SR', icon: '槍', desc: '弓兵改持步槍：攻擊 ×2.2、射程 +30%' },
  mortar: { name: '迫擊砲', r: 'SR', icon: '砲', desc: '每隔數秒砲擊敵軍，傷亡與士氣打擊驚人' },
  drone: { name: '偵察無人機', r: 'SR', icon: '機', desc: '空中偵察：看穿所有伏兵與迷霧，並對敵陣投彈' },
  rpg: { name: '火箭筒', r: 'SR', icon: '箭', desc: '步兵、槍兵攻擊 +40%，對騎兵與城門傷害加倍' },
  mg: { name: '重機槍', r: 'SSR', icon: '掃', desc: '弓兵火力再 ×1.8，萬箭齊發變成掃射' },
  tank: { name: '主戰坦克', r: 'SSR', icon: '戰', desc: '每輛坦克可編成一支坦克部隊（重複獲得可增加數量）' },
};
