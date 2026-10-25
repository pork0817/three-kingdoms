// 天下大勢：玩家未參與的史實事件會依年份自動發生（若局勢已被玩家改變則不發生）；以及多重結局
import { CITIES, FACTIONS, GENERALS } from './data.js';

// actors：與事件相關的勢力，玩家為其中之一時由劇情處理（always 例外）
export const WORLD_EVENTS = [
  { id: 'jingnan', y: 209, s: 1, actors: ['shu'], text: '劉備南征，荊南四郡（長沙、武陵、零陵）望風歸降', to: 'shu', cond: S => S.alive('shu') || S.owners.wuchang === 'shu', apply: S => ['changsha', 'wuling', 'lingling'].filter(c => S.owners[c] === 'jingnan') },
  { id: 'jiangling', y: 209, s: 3, actors: ['wu', 'wei'], text: '周瑜鏖戰經年，攻取江陵，曹仁北撤', to: 'wu', apply: S => ['jiangling', 'yiling'].filter(c => S.owners[c] === 'wei') },
  { id: 'jiaozhou', y: 210, s: 2, actors: [], text: '孫權遣步騭為交州刺史，士燮率兄弟歸附東吳', to: 'wu', cond: S => S.alive('wu'), apply: S => S.owners.panyu === 'shixie' ? ['panyu'] : [] },
  { id: 'borrow', y: 210, s: 3, actors: ['shu', 'wu'], text: '劉備向孫權「借荊州」，進駐江陵', to: 'shu', cond: S => S.alive('shu') && S.getRel('shu', 'wu') > -20, apply: S => S.owners.jiangling === 'wu' ? ['jiangling'] : [] },
  { id: 'xiliang', y: 213, s: 0, actors: ['wei'], text: '曹操破馬超、韓遂於潼關，平定涼州', to: 'wei', apply: S => ['tianshui', 'wuwei'].filter(c => S.owners[c] === 'xiliang') },
  { id: 'yizhou', y: 214, s: 2, actors: ['shu'], text: '劉備圍成都，劉璋開城出降，益州易主', to: 'shu', cond: S => S.alive('shu'), apply: S => ['chengdu', 'zitong', 'jiangzhou', 'yongan', 'yuexi'].filter(c => S.owners[c] === 'liuzhang') },
  { id: 'zhanglu', y: 215, s: 2, actors: [], text: '曹操西征，張魯封倉庫而降，漢中歸曹', to: 'wei', cond: S => S.alive('wei'), apply: S => S.owners.hanzhong === 'zhanglu' ? ['hanzhong'] : [] },
  { id: 'xiangshui', y: 215, s: 1, actors: [], text: '孫劉湘水劃界：長沙歸吳', to: 'wu', cond: S => S.getRel('shu', 'wu') > -40 && !S.flags.noPartition, apply: S => S.owners.changsha === 'shu' ? ['changsha'] : [] },
  { id: 'dingjun', y: 219, s: 0, actors: ['shu', 'wei'], text: '劉備奪取漢中，黃忠於定軍山斬夏侯淵', to: 'shu', cond: S => S.owners.chengdu === 'shu', apply: S => S.owners.hanzhong === 'wei' ? ['hanzhong'] : [], kill: ['xiahouyuan'] },
  { id: 'baiyi', y: 219, s: 3, actors: ['shu', 'wu'], text: '呂蒙白衣渡江襲取荊州，關羽敗走麥城被擒，遇害', to: 'wu', apply: S => ['jiangling', 'yiling', 'wuling', 'lingling', 'changsha'].filter(c => S.owners[c] === 'shu'), kill: ['guanyu', 'guanping'] },
  { id: 'zhangfei', y: 221, s: 1, actors: ['shu'], text: '張飛於閬中被部將范彊、張達所殺', kill: ['zhangfei'], apply: () => [] },
  { id: 'yiling', y: 222, s: 2, actors: ['shu', 'wu'], text: '夷陵之戰：陸遜火燒連營，劉備敗退白帝城', apply: () => [] },
  { id: 'nanzhong', y: 225, s: 1, actors: ['shu'], text: '諸葛亮南征，七擒孟獲，南中平定', to: 'shu', cond: S => S.owners.chengdu === 'shu', apply: S => ['jianning', 'yunnan'].filter(c => S.owners[c] === 'nanman') },
  { id: 'muomen', y: 231, s: 2, actors: ['shu'], text: '張郃追擊蜀軍，於木門道中伏戰死', kill: ['zhanghe'], cond: S => S.faction !== 'wei' || !S.flags.zhangheSafe, apply: () => [] },
  { id: 'yizhouwu', y: 230, s: 1, actors: ['wu'], text: '孫權遣衛溫、諸葛直浮海求夷州，得數千人而還', apply: () => [] },
];

export function pendingWorld(S) {
  const now = S.year * 4 + S.season;
  const out = [];
  for (const e of WORLD_EVENTS) {
    if (S.worldDone.includes(e.id)) continue;
    if (e.y * 4 + e.s > now) continue;
    S.worldDone.push(e.id);
    if (e.actors.includes(S.faction)) continue;
    if (e.cond && !e.cond(S)) continue;
    const cities = e.apply(S) || [];
    const to = e.to || 'shu';
    const kills = (e.kill || []).filter(g => !S.dead.includes(g) && !S.generals.includes(g));
    if (e.to && !cities.length && !kills.length) continue;
    if (e.kill && !e.to && !kills.length) continue;
    out.push({ ...e, cities, to, kills });
  }
  return out;
}

// —— 結局 ——
export function evaluateEnding(S, unified = false) {
  const f = S.faction, own = (c) => S.owns(c);
  const histRate = S.choices ? Math.round(S.hist / S.choices * 100) : 0;
  const cities = S.myCities().length, total = Object.keys(CITIES).length;
  let title, text;
  const virtue = S.renown >= 80 ? '仁德' : S.renown <= 25 ? '霸道' : '';
  if (unified) {
    title = { wei: '大魏一統', shu: '漢室中興', wu: '江東定鼎' }[f];
    text = {
      wei: `${S.year}年，魏軍旌旗遍插九州。延續四百年的漢末亂世，終由曹氏一手終結。`,
      shu: `${S.year}年，漢軍還於舊都，告祭高祖之廟。「興復漢室」不再是一句遺願。`,
      wu: `${S.year}年，孫氏自江東而起，北渡長江、西取巴蜀，開創南方一統天下之先河。`,
    }[f];
    if (virtue === '仁德') text += '百姓簞食壺漿以迎王師，史家稱之為仁德之君。';
    if (virtue === '霸道') text += '然殺伐過重，天下雖定而人心未附，史家評之為霸道之主。';
  } else if (f === 'shu') {
    if (own('luoyang') && own('changan')) { title = '還於舊都'; text = '北伐功成，長安、洛陽重歸漢家。諸葛丞相的〈出師表〉終得實現。'; }
    else if (own('changan')) { title = '北定關中'; text = '漢軍據有關中，與魏隔潼關對峙，興復之業已成大半。'; }
    else if (S.flags.guanyuAlive) { title = '桃園未散'; text = '關羽生還，荊益兩州互為犄角，蜀漢的命運從此改寫。'; }
    else { title = '出師未捷'; text = '「出師未捷身先死，長使英雄淚滿襟。」三分之勢已定，然北伐之志未竟。'; }
  } else if (f === 'wei') {
    if (own('chengdu') || own('jianye')) { title = '鯨吞天下'; text = '魏軍已破一國，天下大勢盡歸於魏。'; }
    else if (S.flags.chibiWin) { title = '赤壁不焚'; text = '曹操赤壁一戰功成，三分之勢從未真正形成，北方的鐵騎已飲馬長江。'; }
    else { title = '三分鼎立'; text = '魏據中原九州，十倍於吳蜀，然長江與蜀道天險，使天下三分之局延續。'; }
  } else {
    if (own('hefei') && own('xiangyang')) { title = '北據淮漢'; text = '吳軍奪得合肥、襄陽，江東終於有了問鼎中原的跳板。'; }
    else if (own('yizhou')) { title = '經略海外'; text = '東吳艦隊遠航夷州，開中原經營台灣之先聲。江東據有長江、南海，自成天地。'; }
    else { title = '劃江而治'; text = '孫權坐斷東南，與魏、蜀鼎足而立，江東六郡之業傳之子孫。'; }
  }
  return { title, text, histRate, cities, total, renown: S.renown, virtue };
}
