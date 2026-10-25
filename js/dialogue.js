// 戰場對話產生器：依武將個性、招牌台詞、戰場情勢組合，並避免重複
import { GENERALS, FACTIONS, CITIES } from './data.js';

const recent = new Map();
function pick(cat, arr) {
  if (!arr || !arr.length) return '';
  const used = recent.get(cat) || [];
  let pool = arr.filter(x => !used.includes(x));
  if (!pool.length) { pool = arr; used.length = 0; }
  const s = pool[Math.floor(Math.random() * pool.length)];
  used.push(s); if (used.length > Math.max(2, Math.floor(arr.length * 0.7))) used.shift();
  recent.set(cat, used);
  return s;
}
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// 個性
export function persona(id, year) {
  const g = GENERALS[id];
  if (!g) return 'plain';
  const age = year - g.life[0];
  if (g.ruler) return 'ruler';
  if (age >= 58) return 'old';
  if (g.int >= 88 && g.war < 75) return 'wise';
  if (g.war >= 88 && g.int < 70) return 'fierce';
  if (g.int > g.war + 12) return 'scholar';
  if (age <= 24) return 'young';
  return 'plain';
}

// 招牌台詞
const SIG = {
  zhangfei: { open: ['燕人張翼德在此！誰敢與我決一死戰？', '吾乃燕人張翼德也！聲若巨雷，誰敢上前？', '環眼一瞪，鼠輩安敢近前！'], charge: ['燕人張翼德在此！', '哇呀呀——殺！'], taunt: ['汝等鼠輩，張爺爺的蛇矛早已饑渴難耐！'] },
  guanyu: { open: ['吾觀汝等，如插標賣首耳！', '關某在此，來將通名受死！', '青龍偃月刀下，不斬無名之將。'], charge: ['看刀！', '關某來也！'], taunt: ['插標賣首之輩，也敢與關某爭鋒？'] },
  zhaoyun: { open: ['吾乃常山趙子龍也！', '常山趙子龍在此，誰敢擋我？', '一身是膽，何懼千軍萬馬！'], charge: ['常山趙子龍來也！', '隨我衝殺！'] },
  machao: { open: ['西涼馬孟起在此！', '錦馬超在此，誰敢與我一戰？'], charge: ['西涼鐵騎，衝！'] },
  huangzhong: { open: ['老將黃忠在此！莫欺老夫年邁！', '老夫寶刀未老，弓開如滿月！'], charge: ['老當益壯，看我這一刀！'] },
  weiyan: { open: ['誰敢殺我？誰敢殺我？', '魏文長在此，鼠輩速退！'] },
  xuchu: { open: ['虎癡許褚在此！誰來與我角力？'], charge: ['殺啊——！'] },
  zhangliao: { open: ['張文遠在此！江東小兒，可識得我？', '八百虎士在此，十萬之眾又何懼哉！'], charge: ['張遼來也！'] },
  xiahoudun: { open: ['父精母血，不可棄也！今日便取爾首級！', '盲夏侯在此，來將受死！'] },
  caocao: { open: ['寧教我負天下人，休教天下人負我！', '天下英雄，唯使君與操耳……今日卻要分個高下。', '吾奉天子以令不臣，汝等還不束手？'], rally: ['將士們，建功立業，正在今日！'] },
  liubei: { open: ['吾乃中山靖王之後，漢景帝閣下玄孫！', '漢賊不兩立，王業不偏安！'], rally: ['兄弟們，為興復漢室，隨我殺敵！'] },
  sunquan: { open: ['生子當如孫仲謀！江東基業，豈容爾等染指！', '吾坐斷東南，戰未休！'], rally: ['江東子弟，隨我破敵！'] },
  zhugeliang: { open: ['吾觀汝陣，破綻百出，不過土雞瓦犬耳。', '鞠躬盡瘁，死而後已。今日便教你知道我軍之威。'], taunt: ['皓首匹夫，蒼髯老賊！汝即日將歸於九泉之下！'] },
  simayi: { open: ['孔明之計雖多，終不出我所料。', '彼利在速戰，我但堅守不出，又能奈我何？'], tauntWise: ['（司馬懿撫鬚微笑，不為所動）', '此乃激將之計，吾不中也。'] },
  zhouyu: { open: ['羽扇綸巾，談笑間，便叫爾檣櫓灰飛煙滅！', '大江天險，江東周郎在此！'] },
  ganning: { open: ['聽見這銅鈴聲了嗎？錦帆甘興霸來也！', '百騎劫營，不折一人！今日亦是如此！'], charge: ['銅鈴響處，敵軍膽寒！'] },
  luxun: { open: ['書生拜將，亦能破敵。', '陸伯言在此，靜候多時了。'], tauntWise: ['（陸遜神色自若，按兵不動）'] },
  lvmeng: { open: ['士別三日，當刮目相待！', '吳下阿蒙已非昔日。'] },
  menghuo: { open: ['此乃我南中之地！你們漢人來此何干？', '我不服！再戰！'], charge: ['兒郎們，殺！'] },
  zhurong: { open: ['看我的飛刀！'], charge: ['飛刀在此，誰敢近前！'] },
  jiangwei: { open: ['天水姜伯約在此！', '丞相遺志，維當繼之！'] },
  dianwei: {},
  pangde: { open: ['我受國恩，義在效死！今日抬櫬而來，不勝不歸！'] },
  dengai: { open: ['艾……艾在此，汝等休走！'] },
  zhanghe: { open: ['河北張儁乂在此！'] },
  caoren: { open: ['大司馬曹仁在此，城池固若金湯！'] },
  taishici: {},
};

const OPEN = {
  ruler: ['朕親臨陣前，爾等還不下馬受降？', '天命在我，爾等螳臂當車！', '寡人在此，誰敢放肆！'],
  old: ['老夫征戰數十年，何曾怕過誰？', '後生小輩，也敢在老夫面前逞強？', '老夫雖鬚髮皆白，手中兵刃卻未曾鈍！'],
  wise: ['汝之陣勢，早在我算中。', '兵者，詭道也。今日便教你見識。', '觀汝排兵布陣，破綻甚多。'],
  fierce: ['哪個不怕死的，上來吃我一刀！', '休走！今日定取汝首級！', '來來來，與我大戰三百回合！'],
  scholar: ['兩軍交鋒，勝負在謀而不在勇。', '汝若識時務，何必血流成河？'],
  young: ['後生可畏，今日便讓你們見識我的厲害！', '我初出茅廬，正要拿你立功！'],
  plain: ['來將何人？報上名來！', '今日便是爾等葬身之日！', '{EF}的將士們，殺光他們！', '敵將聽著，速速退兵，可免一死！'],
};
const SITU = {
  defendCity: ['{city}城高池深，你縱有十萬之眾，又能奈我何？', '城中糧草足支三年，看你能圍到幾時！', '想破{city}？先問問城頭的弓弩答不答應！'],
  attackCity: ['速速開城投降，可保城中百姓！', '城破之日，玉石俱焚！', '{city}已是孤城，還不投降？'],
  naval: ['大江之上，便是你葬身魚腹之處！', '我水軍縱橫江上，你那些旱鴨子也敢來？'],
  night: ['夜色正濃，正好取你首級！', '黑夜之中，你看得清我的刀嗎？'],
  rain: ['大雨滂沱，你的火攻也無用武之地了！'],
  snow: ['風雪漫天，看你們還撐得了多久！'],
  many: ['我軍數倍於你，識相的快快投降！', '看看我身後的大軍，你還有勝算嗎？'],
  few: ['兵在精而不在多，我以一當十！', '以寡擊眾，正是揚名之時！'],
  hate: ['{PF}與我不共戴天，今日便做個了斷！', '新仇舊恨，今日一併清算！'],
};
const PERSUADE = ['{E}將軍，大勢已去，何不倒戈卸甲，以禮來降？', '識時務者為俊傑。將軍若降，不失封侯之位。', '將軍何苦為{EF}賣命？我主求賢若渴，必當重用。', '兩軍相爭，徒傷百姓。將軍若肯歸順，萬民之幸。'];
const SURRENDER = ['……將軍所言甚是。罷了，願降！', '大勢已去，某願歸順。', '（長嘆一聲）也罷，請善待我部下兵士。'];
const REFUSE = {
  default: ['住口！吾頭可斷，豈能降汝！', '大丈夫寧死不辱！休要多言！', '要戰便戰，何必廢話！', '忠臣不事二主，汝且退下！'],
  fierce: ['再囉嗦，先斬了你！', '投降？哈哈哈，先問我手中兵刃！'],
  wise: ['此等說辭，三歲小兒亦不信。', '將軍莫非以為我會中此計？'],
  ruler: ['朕豈能向爾等低頭！', '放肆！'],
};
const TAUNT_BY = {
  old: ['老匹夫！黃土都埋到脖子了，還敢出來丟人現眼？', '白髮老賊，回家抱孫子去吧！'],
  young: ['乳臭未乾的小兒，也敢領兵？', '黃口孺子，速回家去！'],
  scholar: ['腐儒一個，只會紙上談兵！', '書生也敢上戰場？'],
  fierce: ['有勇無謀的匹夫，不過一介莽夫！', '只會逞匹夫之勇，何足道哉！'],
  wise: ['自以為算無遺策，今日便叫你機關算盡！', '縮頭烏龜，有本事出來一戰！'],
  ruler: ['竊國之賊，也配稱孤道寡？', '逆賊！天下人人得而誅之！'],
  plain: ['{E}！汝不過一介庸才，也敢在此耀武揚威？', '無名鼠輩，也敢擋我去路？', '{EF}無人了嗎？派你這等貨色出來？'],
};
const ANGRY = ['豎子安敢辱我！全軍給我殺！', '氣煞我也！今日不殺你誓不為人！', '哇呀呀！拿命來！', '狂徒！看我先斬你首級！'];
const WISE_IGNORE = ['（冷笑不語，按兵不動）', '激將之法，對我無用。', '（不為所動）匹夫之言，何足掛齒。'];
const RALLY = {
  ruler: ['將士們！今日之戰，朕與你們同生共死！', '建功立業，在此一戰！破敵者，重重有賞！'],
  old: ['老夫尚且不怕，你們怕什麼！隨我殺！', '想當年老夫以少勝多，今日亦然！'],
  wise: ['敵軍虛實，我已盡知。依計而行，必勝無疑！', '將士們，此戰天時地利皆在我方！'],
  fierce: ['兒郎們，跟我殺個痛快！', '怕死的往後站，不怕死的隨我衝！'],
  plain: ['將士們！今日之戰，關乎社稷存亡！隨我殺敵報國！', '父老鄉親在後方看著我們，絕不能退！', '擂鼓！讓敵人聽聽我軍的聲威！'],
};
const BARK = {
  charge: ['殺！', '隨我衝鋒！', '衝啊——！', '破敵就在此時！', '一個不留！'],
  rout: ['撤！快撤！', '頂不住了……退！', '保護將軍，後撤！'],
  rally: ['頂住！不許退！', '後退者斬！', '穩住陣腳！'],
  win: ['敵軍已潰，追！', '哈哈哈，不堪一擊！', '敵將已被擊退！'],
  ambush: ['伏兵在此！殺！', '中計了吧！', '等你們很久了！'],
  fire: ['放火！', '燒！一個也別放過！'],
  hit: ['將軍小心！', '擋住他們！'],
};

export function battleLines(ctx) {
  const { P, E, pf, ef, year, cfg, pT, eT, rel } = ctx;
  const ep = persona(E, year), pp = persona(P, year);
  const v = { E: GENERALS[E]?.name || '敵將', P: GENERALS[P]?.name || '將軍', EF: FACTIONS[ef]?.full || '', PF: FACTIONS[pf]?.full || '', city: cfg.cityName || '此地' };
  const sigE = SIG[E] || {}, sigP = SIG[P] || {};
  const open = [];
  const r = Math.random();
  if (sigE.open && r < 0.55) open.push(pick('sig' + E, sigE.open));
  else {
    let pool = [...(OPEN[ep] || OPEN.plain)];
    const sit = [];
    if (cfg.terrain === 'siege') sit.push(...(cfg.attacker === 'enemy' ? SITU.attackCity : SITU.defendCity));
    if (cfg.terrain === 'naval') sit.push(...SITU.naval);
    if (cfg.time === 'night') sit.push(...SITU.night);
    if (cfg.weather === 'rain') sit.push(...SITU.rain);
    if (cfg.weather === 'snow') sit.push(...SITU.snow);
    if (eT > pT * 1.5) sit.push(...SITU.many);
    if (eT < pT * 0.7) sit.push(...SITU.few);
    if (rel <= -50) sit.push(...SITU.hate);
    if (sit.length && Math.random() < 0.6) pool = sit;
    open.push(fill(pick('open', pool), v));
  }
  return {
    enemyOpen: open,
    persuade: fill(pick('persuade', PERSUADE), v),
    surrender: pick('surrender', SURRENDER),
    refuse: pick('refuse', REFUSE[ep] || REFUSE.default),
    taunt: sigP.taunt && Math.random() < 0.5 ? pick('sigt' + P, sigP.taunt) : fill(pick('taunt' + ep, TAUNT_BY[ep] || TAUNT_BY.plain), v),
    tauntAngry: pick('angry', ANGRY),
    tauntWise: sigE.tauntWise ? pick('sigw' + E, sigE.tauntWise) : pick('wise', WISE_IGNORE),
    rally: sigP.rally && Math.random() < 0.5 ? pick('sigr' + P, sigP.rally) : pick('rally' + pp, RALLY[pp] || RALLY.plain),
    duelCall: `吾乃${v.P}！${v.E}，可敢與我一戰！`,
  };
}

export function bark(kind, gid) {
  const sig = SIG[gid];
  if (kind === 'charge' && sig?.charge && Math.random() < 0.6) return pick('bc' + gid, sig.charge);
  return pick('bark' + kind, BARK[kind] || BARK.charge);
}

const LOG = {
  rout: ['{n}潰散奔逃！', '{n}陣腳大亂，四散而逃！', '{n}丟盔棄甲，狼狽潰退！', '{n}軍心崩潰，紛紛逃竄！'],
  wipe: ['{n}全軍覆沒！', '{n}已被殲滅！', '{n}死傷殆盡！'],
  capture: ['生擒{n}！', '{n}被擒！', '{n}力盡被俘！'],
  attack: ['{n}奉命攻擊{t}', '{n}直取{t}！', '{n}殺向{t}！'],
};
export function logLine(kind, n, t = '') { return fill(pick('log' + kind, LOG[kind]), { n, t }); }
