// 主線劇情：大部分依據《三國志》史實，玩家的選擇會改變之後的發展
// 步驟格式：
//  ['title', 主標, 副標]  ['cam', 城池id, 距離]  ['overview']  ['narr', 文字]  ['say', 說話者, 文字]
//  ['choice', 提示, [{ t, hint, hist, fx(S), then:[...] }]]  ['fx', S => …]  ['march', 起, 迄, 勢力]
//  ['owner', 城池, 勢力]  ['note', 史註]  ['battle', cfg 或 S => cfg, 勝[...], 敗[...]]  ['if', S => bool, 是[...], 否[...]]

const T = (t, hint, fx, extra = {}) => ({ t, hint, fx, ...extra });
const H = (t, hint, fx, extra = {}) => ({ t, hint, fx, hist: true, ...extra });
const ENDING = ['narr', '至此，三國鼎立之勢已成。然天下大勢，分久必合——主公，接下來的天下，由你親手書寫！（可在地圖上點選敵方城池出兵，一統天下）'];

// ════════════════════════════ 魏 ════════════════════════════
const WEI = [
  {
    title: '魏王受禪', year: 220, steps: [
      ['title', '第一章　魏王受禪', '建安二十五年（西元220年）'],
      ['cam', 'luoyang', 50],
      ['narr', '建安二十五年正月，魏王曹操薨於洛陽，享年六十六。世子曹丕嗣位為魏王、丞相。'],
      ['narr', '是年十月，漢獻帝於繁陽築受禪台，禪位於曹丕。曹丕即皇帝位，改元黃初，國號大魏。四百年漢祚，至此而終。'],
      ['say', 'caopi', '先王櫛風沐雨，掃平北方。今朕受天命，當使天下歸於一統。眾卿有何良策？'],
      ['say', '陳群', '陛下，自漢末以來，選士無度。臣請立九品官人之法，於州郡設中正，品評人物，以定仕途。'],
      ['say', 'simayi', '九品之法可收士族之心；然先帝「唯才是舉」，寒門英傑亦多賴此出頭。願陛下斟酌。'],
      ['choice', '如何選拔人才？', [
        H('推行九品中正制，收攬世家大族', '兵力 +8000、金 +800', S => { S.addTroops(8000); S.addGold(800); S.flag('nine'); }),
        T('延續「唯才是舉」，廣納寒門之士', '武將【郝昭】加入，習得兵法【堅壁陣】', S => { S.recruit('haozhao'); S.learn('shield'); }),
      ]],
      ['note', '九品中正制由陳群於西元220年提出並施行，此後成為魏晉南北朝三百餘年的選官制度，但也使門閥士族勢力日益膨脹。'],
      ['cam', 'jianye', 70],
      ['narr', '黃初二年（221年），劉備於成都稱帝，旋即為關羽報仇，大舉伐吳。孫權腹背受敵，遣使向魏稱臣。'],
      ['say', '劉曄', '陛下！孫權無故求降，必因內急。今蜀吳相爭，天賜良機，宜發兵直搗江東，則吳亡無日矣！'],
      ['say', '侍中', '人來降而伐之，恐寒天下欲降者之心。不如受其降，封為吳王，坐觀二虎相鬥。'],
      ['choice', '是否接受孫權稱臣？', [
        H('受其降，封孫權為吳王', '金 +1500（吳國貢品）、名望 +5', S => { S.addGold(1500); S.addRenown(5); S.flag('acceptWu'); }),
        T('採劉曄之計，趁虛襲吳', '習得兵法【誘敵深入】，日後吳軍兵力較弱；名望 -5', S => { S.learn('feint'); S.flag('wuWeak'); S.addRenown(-5); }),
      ]],
      ['note', '曹丕最終接受孫權稱臣，封其為吳王。劉曄嘆曰：「吳必藉蜀兵之退而叛魏。」夷陵戰後孫權果然翻臉。後世多認為這是曹丕錯失滅吳的良機。'],
      ['overview'],
    ],
  },
  {
    title: '三路伐吳', year: 222, steps: [
      ['title', '第二章　三路伐吳', '黃初三年（西元222年）'],
      ['narr', '夷陵戰後，孫權拒絕遣太子入朝為質。曹丕大怒，親率大軍三路伐吳：曹休出洞口、曹真圍江陵、曹仁攻濡須。'],
      ['march', 'hefei', 'ruxu', 'wei'],
      ['cam', 'ruxu', 40],
      ['say', 'caoren', '濡須守將朱桓，麾下不過數千。吾率步騎數萬，必能一舉拔之！'],
      ['say', '蔣濟', '將軍，濡須東有羨溪。若揚言攻羨溪，朱桓必分兵往救，我軍再以主力急攻濡須，可收奇效。'],
      ['choice', '如何進攻濡須？', [
        H('聲東擊西：揚言攻羨溪，誘朱桓分兵', '守軍大減；習得兵法【誘敵深入】', S => { S.flag('ruxuFeint'); S.learn('feint'); }),
        T('集中兵力，正面強攻', '獲得兵器【衝車】【雲梯】', S => { S.gainWeapon('ram'); S.gainWeapon('ladder'); }),
      ]],
      ['battle', S => ({
        name: '濡須之戰', sub: '曹仁 vs 朱桓', terrain: 'siege', attacker: 'player', cityName: '濡須', river: true,
        playerLeader: 'caoren', playerGenerals: ['caotai', 'changdiao', 'xuhuang'], maxTroops: 40000, gateHP: 3500,
        enemy: { faction: 'wu', leader: 'zhuhuan', generals: ['zhuhuan', 'quancong'], troops: Math.round((S.flags.ruxuFeint ? 9000 : 18000) * (S.flags.wuWeak ? 0.8 : 1)),
          tactics: ['volley', 'shield', 'rockfall', 'drum'], comp: { inf: 0.3, spear: 0.2, archer: 0.5 } },
        intro: [['zhuhuan', '兵法云：「客倍而主人半」。今曹仁遠來疲憊，我據高城、臨大江，以逸待勞，豈有不勝之理！']],
        parley: { enemyOpen: ['曹仁老賊！濡須城高池深，你縱有十萬之眾，又能奈我何？'], noSurrender: true },
        tips: '以步兵、槍兵撞破城門，弓兵壓制城頭守軍。衝車可大幅加快破門；雲梯可讓步兵攀城。',
      }), [
        ['narr', '魏軍攻破濡須塢，朱桓退守江南。長江北岸盡為大魏所有！'],
        ['owner', 'ruxu', 'wei'],
        ['note', '史實上曹仁在濡須大敗：部將常雕戰死、王雙被俘，三路伐吳無功而返。你改寫了歷史。'],
      ], [
        ['narr', '朱桓據城死守，魏軍損兵折將，曹仁只得退兵。'],
        ['note', '史實：曹仁揚言攻羨溪，朱桓果然分兵，但僅以五千人仍大破曹仁。部將常雕戰死，王雙被俘，魏軍死傷千餘人。'],
      ]],
    ],
  },
  {
    title: '街亭之戰', year: 228, steps: [
      ['title', '第三章　街亭之戰', '太和二年（西元228年）'],
      ['narr', '黃初七年（226年），文帝曹丕駕崩，太子曹叡即位，是為魏明帝。'],
      ['narr', '太和二年春，蜀漢丞相諸葛亮出祁山北伐。天水、南安、安定三郡叛魏應亮，關中震動。'],
      ['owner', 'tianshui', 'shu'],
      ['say', 'caorui', '諸葛亮來勢洶洶，誰可為朕退敵？'],
      ['say', 'zhanghe', '臣願往！'],
      ['say', 'caorui', '好！命張郃督步騎五萬，西拒諸葛亮！'],
      ['march', 'chencang', 'tianshui', 'wei'],
      ['narr', '張郃兵至街亭。探馬來報：蜀將馬謖不據城池，反而捨水上山，屯兵於南山之上。'],
      ['say', 'zhanghe', '哈哈！馬謖紙上談兵之輩也。山上無水，我若斷其汲道……'],
      ['choice', '如何破馬謖？', [
        H('圍山斷水，待其自亂', '蜀軍水源被斷，士氣將持續下降', S => S.flag('waterCut')),
        T('趁其立足未穩，強攻上山', '速戰速決；獲得兵器【雲梯】', S => S.gainWeapon('ladder')),
      ]],
      ['battle', S => ({
        name: '街亭之戰', sub: '張郃 vs 馬謖', terrain: 'plains', hill: 'e',
        playerLeader: 'zhanghe', playerGenerals: ['guohuai'], maxTroops: 50000,
        enemy: { faction: 'shu', leader: 'masu', generals: ['masu', 'wangping'], troops: 24000, formation: 'fangyuan', tactics: ['volley', 'rockfall', 'drum'] },
        waterCut: S.flags.waterCut ? 'e' : null, enemyHold: 60,
        parley: { enemyOpen: ['我熟讀兵書，「憑高視下，勢如破竹」！張郃，你敢上山否？'], tauntAngry: '張郃匹夫！看我下山取你首級！' },
        tips: S.flags.waterCut ? '敵軍水源已斷。可先以弓兵遠射，待其士氣崩潰再一舉衝上山頭。' : '敵軍據山，居高臨下有攻擊加成。宜以弓兵壓制，槍、步兵穩步登山。',
      }), [
        ['narr', '馬謖大敗，蜀軍潰散，唯王平率千人鳴鼓自守，徐徐撤退。諸葛亮失街亭，進無所據，只得退回漢中。'],
        ['owner', 'tianshui', 'wei'],
        ['note', '史實：馬謖違背諸葛亮節度，捨水上山，被張郃斷絕汲水之道而大敗。諸葛亮揮淚斬馬謖，並上疏自貶三等。'],
      ], [
        ['narr', '魏軍失利，蜀軍暫據隴右。所幸諸葛亮糧草不繼，未能東進。'],
      ]],
    ],
  },
  {
    title: '石亭之戰', year: 228, steps: [
      ['title', '第四章　石亭之戰', '太和二年秋'],
      ['cam', 'wan2', 45],
      ['narr', '吳鄱陽太守周魴遣使至魏，聲稱受孫權猜忌，願舉郡來降，請魏軍南下接應。為表誠意，周魴竟於郡府門前斷髮謝罪。'],
      ['say', 'caoxiu', '周魴斷髮明志，其心可鑒！吾率十萬大軍南下，江東可定！'],
      ['say', 'jiakui', '大司馬！周魴之降太過蹊蹺。吳人素多詭計，何不先遣斥候探查山道，再行進兵？'],
      ['choice', '是否相信周魴？', [
        H('周魴斷髮，必是真降！全軍急進', '將陷入吳軍伏擊', S => S.flag('trustZhou')),
        T('採賈逵之言，遣斥候探路', '識破敵軍伏兵；習得兵法【伏兵】', S => { S.flag('scout'); S.learn('ambush'); }),
      ]],
      ['march', 'shouchun', 'wan2', 'wei'],
      ['battle', S => ({
        name: '石亭之戰', sub: '曹休 vs 陸遜', terrain: 'mountain', time: 'dusk', forest: 'sides',
        playerLeader: 'caoxiu', playerGenerals: ['jiakui', 'zhanghe'], maxTroops: 60000,
        enemy: { faction: 'wu', leader: 'luxun', generals: ['luxun', 'zhuhuan', 'quancong'], troops: S.flags.wuWeak ? 36000 : 45000, tactics: ['fire', 'volley', 'drum'], formation: 'heyi' },
        enemyAmbush: { count: 2, share: 0.4, generals: ['zhuhuan', 'quancong'], revealed: !!S.flags.scout },
        parley: { enemyOpen: S.flags.scout ? ['哼，竟被你看破了……然我江東子弟，豈懼一戰！'] : ['曹休，你已入我彀中！石亭便是你葬身之地！'] },
        tips: S.flags.scout ? '斥候回報：敵軍伏兵藏於兩側山林（已標示）。可先穩住中路，伏兵現身時以騎兵、槍兵迎擊。' : '山道狹窄，兩側山林茂密……小心為上。',
      }), [
        ['narr', '魏軍識破吳人詭計，大破陸遜於石亭，江東為之震動！'],
        ['fx', S => S.addGold(1000)],
        ['owner', 'wan2', 'wei'],
      ], [
        ['narr', '曹休大敗，被吳軍追至夾石，賴賈逵援救方得脫身。魏軍死傷萬餘，車乘萬兩、軍資器械盡為吳所得。'],
        ['note', '史實：曹休中周魴詐降之計，於石亭被陸遜、朱桓、全琮三路夾擊而大敗，羞憤成疾，不久病逝。'],
      ]],
    ],
  },
  {
    title: '陳倉之守', year: 228, steps: [
      ['title', '第五章　陳倉之守', '太和二年冬'],
      ['cam', 'chencang', 40],
      ['narr', '同年冬，諸葛亮再出散關，以數萬之眾圍攻陳倉。守將郝昭麾下，僅千餘人。'],
      ['fx', S => { if (!S.has('haozhao')) S.recruit('haozhao'); }],
      ['say', '靳詳', '伯道兄，諸葛丞相大軍十倍於你，何必徒死？不如開城歸降。'],
      ['say', 'haozhao', '魏家科法，卿所練也；我之為人，卿所知也。我受國恩多而門戶重，卿無可言者，但有必死耳！'],
      ['choice', '郝昭如何應對？', [
        H('拒絕勸降，誓死守城', '全軍士氣大增；習得兵法【滾木礌石】', S => { S.flag('oath'); S.learn('rockfall'); }),
        T('假意拖延，暗中派人向張郃求援', '戰鬥中途將有張郃援軍趕到', S => S.flag('cReinf')),
      ]],
      ['battle', S => ({
        name: '陳倉之戰', sub: '郝昭 vs 諸葛亮', terrain: 'siege', attacker: 'enemy', cityName: '陳倉', gateHP: 5000,
        playerLeader: 'haozhao', maxTroops: 9000, playerMorale: S.flags.oath ? 120 : 100,
        enemy: { faction: 'shu', leader: 'zhugeliang', generals: ['zhugeliang', 'weiyan', 'wuban'], troops: 30000, weapons: ['ladder', 'ram', 'catapult'],
          tactics: ['volley', 'drum', 'fire'], comp: { inf: 0.35, spear: 0.25, cav: 0.05, archer: 0.35 } },
        reinforce: S.flags.cReinf ? { side: 'p', at: 70, troops: 14000, general: 'zhanghe', types: ['cav', 'inf'] } : null,
        noSurrender: true, timeLimit: 300,
        parley: { enemyOpen: ['郝伯道，你以千餘之眾，擋我數萬大軍，不覺可笑嗎？'], refuse: '吾頭可斷，陳倉不可失！' },
        tips: '弓兵已佈於城牆。敵軍架雲梯時用【滾木礌石】，撐過時限即可獲勝。',
      }), [
        ['narr', '郝昭以火箭焚雲梯，以石磨碎衝車，晝夜苦戰二十餘日。諸葛亮糧盡，只得退兵。'],
        ['note', '史實：陳倉之戰郝昭以千餘人抵擋諸葛亮數萬大軍二十餘日，諸葛亮的雲梯、衝車、井闌、地道皆被郝昭一一破解。'],
      ], [
        ['narr', '陳倉陷落！關中門戶洞開！'],
        ['owner', 'chencang', 'shu'],
      ]],
    ],
  },
  {
    title: '五丈原', year: 234, steps: [
      ['title', '第六章　五丈原', '青龍二年（西元234年）'],
      ['cam', 'chencang', 50],
      ['narr', '青龍二年，諸葛亮率十萬大軍第五次北伐，出斜谷，屯兵五丈原，與魏軍隔渭水對峙。'],
      ['say', 'simayi', '諸葛亮志大而不見機，多謀而少決，好兵而無權。彼糧運艱難，利在速戰；我但堅守，待其自斃。'],
      ['narr', '諸葛亮屢次挑戰，司馬懿堅壁不出。諸葛亮遂遣使送來婦人巾幗衣裳，以辱司馬懿。'],
      ['say', '眾將', '都督！蜀人欺我太甚！末將等願出營決一死戰！'],
      ['choice', '司馬懿如何應對？', [
        H('受巾幗之辱，堅守不出', '等待諸葛亮自斃', S => S.flag('hold234')),
        T('忍無可忍，出營決戰', '與諸葛亮正面交鋒'),
      ]],
      ['if', S => S.flags.hold234, [
        ['narr', '八月，諸葛亮積勞成疾，病逝於五丈原軍中，年五十四。蜀軍秘不發喪，整軍而退。'],
        ['say', 'simayi', '孔明已死！全軍追擊！'],
        ['battle', {
          name: '死諸葛走生仲達', sub: '司馬懿 vs 姜維', terrain: 'plains', time: 'dusk',
          playerLeader: 'simayi', playerGenerals: ['guohuai', 'zhanghe'], maxTroops: 60000,
          enemy: { faction: 'shu', leader: 'jiangwei', generals: ['jiangwei', 'weiyan', 'wangping'], troops: 32000, formation: 'yanxing', tactics: ['volley', 'drum', 'feint'], weapons: ['crossbow'] },
          enemyMorale: 80,
          intro: [['narr', '魏軍追至，蜀將姜維令軍中反旗鳴鼓，作勢迎戰。車上端坐一人，綸巾羽扇——竟似諸葛亮！']],
          parley: { enemyOpen: ['司馬懿！丞相在此，你還不下馬受降？'] },
          pursuitAmbush: 0.5, counterGenerals: ['weiyan'], counterMsg: '蜀軍伏兵殺出！魏延斷後！',
        }, [
          ['narr', '魏軍識破蜀軍虛張聲勢，大破其後衛。蜀漢北伐之勢自此一蹶不振。'],
          ['fx', S => { S.addGold(1500); S.addTroops(6000, '降卒 '); }],
        ], [
          ['narr', '司馬懿疑有伏兵，引軍退走。百姓諺曰：「死諸葛走生仲達。」'],
          ['note', '史實：諸葛亮死後，楊儀、姜維整軍撤退。司馬懿追擊，姜維反旗鳴鼓，司馬懿以為有詐而退。司馬懿聞之笑曰：「吾能料生，不能料死。」'],
        ]],
      ], [
        ['battle', {
          name: '五丈原之戰', sub: '司馬懿 vs 諸葛亮', terrain: 'plains', river: true,
          playerLeader: 'simayi', playerGenerals: ['guohuai', 'zhanghe', 'caozhen'], maxTroops: 70000,
          enemy: { faction: 'shu', leader: 'zhugeliang', generals: ['zhugeliang', 'jiangwei', 'weiyan', 'wangping'], troops: 60000, formation: 'yanxing',
            tactics: ['volley', 'fire', 'drum', 'shield', 'feint'], weapons: ['crossbow', 'muniu'] },
          parley: { enemyOpen: ['仲達，今日終於肯出營一戰了？'] },
        }, [
          ['narr', '魏軍大破蜀軍！諸葛亮積勞成疾，不久病逝軍中。'],
          ['owner', 'hanzhong', 'wei'],
        ], [
          ['narr', '魏軍大敗，司馬懿退守渭北，再不敢出。不久諸葛亮病逝，蜀軍退兵。'],
        ]],
      ]],
      ENDING,
    ],
  },
];

// ════════════════════════════ 蜀 ════════════════════════════
const SHU = [
  {
    title: '昭烈稱帝', year: 221, steps: [
      ['title', '第一章　昭烈稱帝', '章武元年（西元221年）'],
      ['cam', 'chengdu', 45],
      ['narr', '建安二十五年，曹丕篡漢自立。消息傳至成都，謠傳漢帝已遇害。'],
      ['narr', '章武元年四月，漢中王劉備於成都武擔山之南即皇帝位，國號仍為「漢」，史稱蜀漢。'],
      ['say', 'liubei', '朕與雲長、翼德，誓同生死。今雲長為東吳所害，此仇不報，朕何以為人！'],
      ['narr', '六月，正當劉備整軍東征之際，車騎將軍張飛於閬中為部將范彊、張達所殺，二人攜張飛首級投奔東吳。'],
      ['fx', S => S.lose('zhangfei', '遇害')],
      ['say', 'liubei', '噫！飛死矣……'],
      ['say', 'zhaoyun', '陛下！國賊是曹操，非孫權也。若先滅魏，則吳自服。今曹丕篡漢，當順應眾心，早圖關中，不應置魏而先與吳戰！'],
      ['choice', '朕意如何？', [
        H('為二弟報仇，御駕親征伐吳', '將士同仇敵愾：兵力 +10000；進入夷陵之戰', S => { S.flag('eastern'); S.addTroops(10000); }),
        T('納趙雲之諫，聯吳伐魏', '改寫歷史：與東吳修好，北伐關中；名望 +10、習得【誘敵深入】', S => { S.flag('allyWu'); S.addRenown(10); S.learn('feint'); }),
      ]],
      ['note', '史實上劉備不聽趙雲、秦宓等人勸諫，親率大軍東征，結果在夷陵之戰慘敗——這是蜀漢由盛轉衰的轉捩點。'],
    ],
  },
  {
    title: '夷陵之戰', year: 222, requires: S => S.flags.eastern, steps: [
      ['title', '第二章　夷陵之戰', '章武二年（西元222年）'],
      ['march', 'yongan', 'yiling', 'shu'],
      ['cam', 'yiling', 40],
      ['narr', '劉備親率大軍東下，連破吳軍於巫、秭歸，兵鋒直抵夷陵、猇亭。孫權拜年僅三十九歲的陸遜為大都督，率軍五萬拒之。'],
      ['narr', '陸遜堅守不戰，兩軍自正月相持至六月。時值盛夏，酷熱難當。'],
      ['say', 'liubei', '天氣炎熱，將士苦不堪言。傳令各營移入山林之中，依溪澗紮營，以避暑熱！'],
      ['say', 'huangquan', '陛下！吳人悍戰，我軍順流而下，進易退難。連營七百里於林中，恐為敵所乘！臣請為前驅以當寇，陛下宜在後鎮守。'],
      ['choice', '如何紮營？', [
        H('移營林中避暑，連營七百里', '吳軍【火攻】威力倍增！', S => S.flag('forestCamp')),
        T('聽黃權之言，結營於平地，水陸並進', '不懼火攻；獲得兵器【樓船艨艟】', S => S.gainWeapon('warship')),
        T('派吳班於平地誘敵，伏精兵八千於山谷', '仍在林中紮營，但習得兵法【伏兵】', S => { S.flag('forestCamp'); S.learn('ambush'); }),
      ]],
      ['battle', S => ({
        name: '夷陵之戰', sub: '劉備 vs 陸遜', terrain: 'plains', time: 'dusk', river: true, allowAmbush: true,
        forest: S.flags.forestCamp ? 'p' : 'sides', camps: S.flags.forestCamp ? 'p' : null,
        playerLeader: 'liubei', playerGenerals: ['huangquan', 'wuban', 'guanxing', 'zhangbao', 'machao'], maxTroops: 55000,
        enemy: { faction: 'wu', leader: 'luxun', generals: ['luxun', 'zhuran', 'handang', 'xusheng', 'panzhang'], troops: 45000, tactics: ['fire', 'volley', 'drum', 'shield'], formation: 'heyi' },
        enemyHold: 40,
        parley: { enemyOpen: ['劉備，你以傾國之兵遠來，已是強弩之末。陸某在此，靜候多時了。'], tauntWise: '（陸遜神色自若，按兵不動）' },
        tips: S.flags.forestCamp ? '我軍營寨在林中，須提防敵軍火攻！可將部隊移出林地作戰。' : '吳軍以逸待勞，可善用騎兵衝擊其弓兵。',
        pursuitNote: '吳軍潰退，陸遜退保夷道……',
      }), [
        ['narr', '蜀軍識破陸遜之計，大破吳軍！劉備乘勝收復夷陵、江陵，荊州重歸大漢！'],
        ['owner', 'yiling', 'shu'],
        ['owner', 'jiangling', 'shu'],
        ['fx', S => S.flag('yilingWin')],
      ], [
        ['narr', '陸遜命士卒各持茅草，乘夜順風放火，連破蜀軍四十餘營。劉備大敗，退保白帝城。'],
        ['note', '史實：夷陵之戰蜀軍幾乎全軍覆沒，舟船器械、水步軍資一時略盡。馬良、馮習、張南、沙摩柯等戰死，黃權被迫降魏。'],
        ['fx', S => { S.lose('maliang', '戰死'); S.lose('huangquan', '被迫降魏'); }],
      ]],
      ['title', '白帝託孤', '章武三年（西元223年）'],
      ['cam', 'yongan', 35],
      ['if', S => S.flags.yilingWin, [['narr', '雖然大勝，劉備卻因連年征戰，積勞成疾，病倒於永安宮。']], [['narr', '劉備羞憤交加，一病不起，病倒於永安宮。']]],
      ['say', 'liubei', '君才十倍曹丕，必能安國，終定大事。若嗣子可輔，輔之；如其不才，君可自取。'],
      ['say', 'zhugeliang', '（涕泣）臣敢竭股肱之力，效忠貞之節，繼之以死！'],
      ['say', 'liubei', '勿以惡小而為之，勿以善小而不為。惟賢惟德，能服於人……'],
      ['narr', '章武三年四月，劉備崩於永安宮，年六十三。太子劉禪即位，諸葛亮受遺詔輔政。'],
      ['fx', S => S.lose('liubei', '駕崩')],
      ['choice', '丞相諸葛亮如何處理對吳關係？', [
        H('遣鄧芝使吳，重修舊好', '吳蜀再度結盟；金 +1000', S => { S.flag('allyWu'); S.addGold(1000); }),
        T('整軍經武，伺機再奪荊州', '兵力 +6000', S => S.addTroops(6000)),
      ]],
    ],
  },
  {
    title: '聯吳北伐', year: 222, requires: S => !S.flags.eastern, steps: [
      ['title', '第二章　聯吳北伐', '章武二年（西元222年）'],
      ['cam', 'hanzhong', 45],
      ['narr', '劉備納趙雲之言，遣使與孫權重修盟好，將伐吳之兵轉向北方。'],
      ['say', 'zhugeliang', '魏國新立，曹丕篡逆，關中人心未附。可出祁山，取天水，斷隴右，則長安可圖。'],
      ['say', 'machao', '臣世居西涼，羌胡之人素服臣威名。願為先鋒，取天水！'],
      ['choice', '派誰為帥？', [
        T('以馬超為先鋒，招撫羌胡', '羌騎援軍 +8000', S => { S.addTroops(8000, '羌騎'); S.flag('machaoLead'); }),
        T('由丞相親自統籌，穩紮穩打', '諸葛亮改良連弩：獲得兵器【諸葛連弩】', S => S.gainWeapon('crossbow')),
      ]],
      ['march', 'hanzhong', 'tianshui', 'shu'],
      ['battle', S => ({
        name: '天水之戰', sub: '蜀漢 vs 曹魏', terrain: 'plains',
        playerLeader: S.flags.machaoLead ? 'machao' : 'zhugeliang', playerGenerals: ['zhaoyun', 'weiyan', 'wangping', 'machao'], maxTroops: 50000,
        enemy: { faction: 'wei', leader: 'caozhen', generals: ['caozhen', 'guohuai', 'xiahoushang'], troops: 38000, tactics: ['charge', 'volley', 'drum'], weapons: ['armor'], formation: 'fengshi' },
        parley: { enemyOpen: ['大耳賊竟敢犯我邊境？'] },
      }), [
        ['narr', '蜀軍奪取天水，隴右震動！'],
        ['owner', 'tianshui', 'shu'],
      ], [['narr', '蜀軍受挫，暫退漢中。']]],
      ['narr', '劉備在諸葛亮輔佐下勵精圖治，然年事已高，於章武三年病逝成都，臨終託孤於諸葛亮。'],
      ['fx', S => S.lose('liubei', '病逝')],
    ],
  },
  {
    title: '七擒孟獲', year: 225, steps: [
      ['title', '第三章　七擒孟獲', '建興三年（西元225年）'],
      ['cam', 'jianning', 45],
      ['narr', '先主崩後，南中豪強雍闓等相繼叛亂，推南中大姓孟獲為首，聯合諸夷反漢。'],
      ['narr', '建興三年春，諸葛亮親率大軍南征。參軍馬謖送行數十里。'],
      ['say', 'masu', '南中恃其險遠，不服久矣。雖今日破之，明日復反耳。夫用兵之道，攻心為上，攻城為下；心戰為上，兵戰為下。願公服其心而已。'],
      ['choice', '南征方略？', [
        H('攻心為上：生擒孟獲，以德服之', '戰後可收服孟獲與南中', S => S.flag('gongxin')),
        T('以雷霆之勢平定南中', '戰後獲得大量金錢', S => S.flag('hardSouth')),
      ]],
      ['march', 'yuexi', 'jianning', 'shu'],
      ['battle', {
        name: '南中之戰', sub: '諸葛亮 vs 孟獲', terrain: 'mountain', forest: 'all', grass: 0x4e7a2e,
        playerLeader: 'zhugeliang', playerGenerals: ['zhaoyun', 'weiyan', 'wangping', 'masu'], maxTroops: 40000,
        enemy: { faction: 'nanman', leader: 'menghuo', generals: ['menghuo', 'mengyou', 'zhurong'], troops: 30000, tactics: ['drum', 'charge'], formation: 'fengshi' },
        enemyAmbush: { count: 1, share: 0.25, generals: ['zhurong'], revealed: false },
        parley: { enemyOpen: ['此乃我南中之地！你們漢人來此何干？'], tauntAngry: '氣煞我也！兒郎們，殺！' },
        captiveScript: { menghuo: async () => { }, zhurong: async () => { } },
        tips: '南中山林茂密，小心敵軍伏兵。【火攻】在林中威力倍增。',
      }, [
        ['if', S => S.flags.gongxin, [
          ['say', 'menghuo', '我不服！此乃中了你的詭計！若放我回去，整頓兵馬再戰，必能勝你！'],
          ['say', 'zhugeliang', '（笑）好，放你回去。'],
          ['narr', '孟獲屢敗屢戰，先後被擒七次，諸葛亮皆釋之。第七次被擒時，孟獲不肯離去。'],
          ['say', 'menghuo', '丞相天威也！南人不復反矣！'],
          ['fx', S => { S.recruit('menghuo'); S.recruit('zhurong'); S.addTroops(10000, '南中精兵'); S.addRenown(15); }],
          ['owner', 'jianning', 'shu'],
          ['owner', 'yunnan', 'shu'],
          ['note', '史實：《漢晉春秋》載諸葛亮「七縱七擒」孟獲，孟獲心服，南中平定。諸葛亮任用當地首領治理，「綱紀粗定，夷漢粗安」。'],
        ], [
          ['narr', '諸葛亮斬孟獲以儆效尤，盡收南中金銀、丹漆、耕牛、戰馬以給軍國之用。'],
          ['fx', S => { S.kill('menghuo'); S.addGold(2500); S.addRenown(-5); }],
          ['owner', 'jianning', 'shu'],
          ['owner', 'yunnan', 'shu'],
        ]],
      ], [
        ['narr', '蜀軍不習瘴氣，暫退越巂休整，來年再戰。'],
      ]],
    ],
  },
  {
    title: '出師北伐', year: 228, steps: [
      ['title', '第四章　出師表', '建興六年（西元228年）'],
      ['cam', 'hanzhong', 45],
      ['narr', '建興五年，諸葛亮上《出師表》，率軍北駐漢中。'],
      ['say', 'zhugeliang', '今南方已定，兵甲已足，當獎率三軍，北定中原，庶竭駑鈍，攘除奸凶，興復漢室，還於舊都。'],
      ['say', 'weiyan', '丞相！末將願率精兵五千，從褒中出，循秦嶺而東，當子午而北，不過十日可到長安。夏侯楙怯而無謀，聞末將奄至，必棄城逃走！'],
      ['say', 'zhugeliang', '此危計也……'],
      ['choice', '北伐路線？', [
        H('穩紮穩打，出祁山取隴右', '依循史實'),
        T('採魏延之計，奇兵出子午谷', '改寫歷史：奇襲長安！', S => S.flag('ziwu')),
      ]],
      ['if', S => S.flags.ziwu, [
        ['march', 'hanzhong', 'changan', 'shu'],
        ['battle', {
          name: '子午谷奇襲', sub: '魏延 vs 夏侯楙', terrain: 'siege', attacker: 'player', cityName: '長安', time: 'dawn', gateHP: 3000,
          playerLeader: 'weiyan', playerGenerals: ['wangping'], maxTroops: 14000,
          enemy: { faction: 'wei', leader: 'xiahoumao', generals: ['xiahoumao'], troops: 18000, tactics: ['volley'] },
          enemyMorale: 55, surrenderBonus: 0.25,
          reinforce: { side: 'e', at: 130, troops: 20000, general: 'caozhen', types: ['cav', 'inf'], msg: '曹真率關中援軍趕到！' },
          parley: { enemyOpen: ['（城上的夏侯楙驚慌失措）蜀……蜀軍怎會從天而降！'] },
          tips: '奇兵貴在神速！趁魏軍援兵未到，速破城門。',
        }, [
          ['narr', '長安陷落！夏侯楙棄城而逃，關中大震！'],
          ['owner', 'changan', 'shu'],
          ['note', '魏延的「子午谷奇謀」是三國史上最著名的「如果」之一。史實上諸葛亮認為此計太過冒險而未採用。'],
        ], [
          ['narr', '長安城堅，魏延孤軍無援，只得循原路退回漢中。'],
        ]],
      ], [
        ['narr', '諸葛亮揚聲由斜谷取郿，使趙雲、鄧芝為疑軍，親率大軍攻祁山。天水、南安、安定三郡皆叛魏應亮。'],
        ['owner', 'tianshui', 'shu'],
        ['narr', '天水郡中郎將姜維，因太守猜疑，無路可歸，只得投降蜀漢。'],
        ['say', 'jiangwei', '……維本是魏臣，今日至此，任憑丞相發落。'],
        ['say', 'zhugeliang', '伯約忠勤時事，思慮精密，敏於軍事，既有膽義，深解兵意。吾得伯約，如得一鳳也！'],
        ['fx', S => S.recruit('jiangwei')],
        ['say', 'zhugeliang', '魏將張郃率五萬大軍來援。街亭乃咽喉要地，誰可守之？'],
        ['say', 'masu', '末將願往！若有差失，乞斬全家！'],
        ['choice', '派誰守街亭？', [
          H('參軍馬謖', '熟讀兵書，但缺乏實戰', S => S.flags.jt = 'masu'),
          T('鎮北將軍魏延', '勇猛善戰', S => S.flags.jt = 'weiyan'),
          T('新降的姜維', '智勇雙全', S => S.flags.jt = 'jiangwei'),
        ]],
        ['if', S => S.flags.jt === 'masu', [
          ['say', 'wangping', '參軍！丞相令我等當道下寨。山上無水，若魏軍斷我汲道，不戰自亂！'],
          ['say', 'masu', '兵法云：「憑高視下，勢如劈竹」。若魏兵到來，吾教他片甲不回！'],
          ['choice', '馬謖如何佈陣？', [
            H('屯兵南山之上', '居高臨下，但可能被斷水', S => S.flag('onHill')),
            T('聽王平之言，當道紮營', '穩守要道'),
          ]],
        ]],
        ['battle', S => ({
          name: '街亭之戰', sub: `${S.flags.jt === 'masu' ? '馬謖' : S.flags.jt === 'weiyan' ? '魏延' : '姜維'} vs 張郃`, terrain: 'plains',
          hill: S.flags.onHill ? 'p' : null, waterCut: S.flags.onHill ? 'p' : null,
          playerLeader: S.flags.jt, playerGenerals: ['wangping'], maxTroops: 26000,
          enemy: { faction: 'wei', leader: 'zhanghe', generals: ['zhanghe', 'guohuai'], troops: 40000, tactics: ['charge', 'volley', 'drum'], weapons: ['armor'], formation: 'fengshi' },
          parley: { enemyOpen: ['蜀將聽著！我乃河北名將張郃，速速讓開道路！'] },
          tips: S.flags.onHill ? '我軍據山，居高臨下，但水源已斷，士氣會不斷下降。宜速戰！' : '當道據守，以槍兵擋住魏軍騎兵衝鋒。',
        }), [
          ['narr', '蜀軍守住街亭，張郃無功而返！諸葛亮遂得據隴右，關中震動！'],
          ['fx', S => { S.addRenown(10); S.flag('jtWin'); }],
        ], [
          ['narr', '街亭失守，諸葛亮進無所據，只得盡撤西縣千餘家還漢中。'],
          ['owner', 'tianshui', 'wei'],
          ['if', S => S.flags.jt === 'masu', [
            ['narr', '諸葛亮揮淚斬馬謖，並上疏自貶三等。'],
            ['fx', S => S.lose('masu', '被處斬')],
          ]],
        ]],
      ]],
    ],
  },
  {
    title: '陳倉之戰', year: 228, steps: [
      ['title', '第五章　陳倉之戰', '建興六年冬'],
      ['cam', 'chencang', 40],
      ['if', S => S.owns('chencang'), [
        ['narr', '陳倉已在我軍之手。諸葛亮整頓兵馬，休養生息。'],
        ['fx', S => S.addTroops(5000)],
      ], [
        ['narr', '同年冬，諸葛亮出散關，圍陳倉。守將郝昭，僅千餘人。'],
        ['say', 'zhugeliang', '陳倉城小，郝昭兵少。先遣其同鄉靳詳前往勸降。'],
        ['narr', '郝昭於城樓上答曰：「魏家科法，卿所練也；我之為人，卿所知也。我受國恩多而門戶重，但有必死耳！」'],
        ['choice', '如何攻城？', [
          H('雲梯、衝車齊上，晝夜強攻', '獲得兵器【雲梯】【衝車】', S => { S.gainWeapon('ladder'); S.gainWeapon('ram'); }),
          T('打造霹靂車，先轟城頭', '獲得兵器【霹靂車】【雲梯】', S => { S.gainWeapon('catapult'); S.gainWeapon('ladder'); }),
          T('掘地道潛入城中', '城門耐久大減', S => S.flag('tunnel')),
        ]],
        ['battle', S => ({
          name: '陳倉之戰', sub: '諸葛亮 vs 郝昭', terrain: 'siege', attacker: 'player', cityName: '陳倉', time: 'dusk',
          gateHP: S.flags.tunnel ? 2200 : 4500, timeLimit: 300,
          playerLeader: 'zhugeliang', playerGenerals: ['weiyan', 'jiangwei', 'wuban', 'wangping'], maxTroops: 40000,
          enemy: { faction: 'wei', leader: 'haozhao', generals: ['haozhao'], troops: 10000, tactics: ['rockfall', 'volley', 'fire', 'shield'] },
          reinforce: { side: 'e', at: 150, troops: 15000, general: 'zhanghe', types: ['cav', 'inf'], msg: '張郃率魏軍援兵趕到！' },
          noSurrender: true,
          parley: { enemyOpen: ['諸葛亮，陳倉在我郝昭手中，你休想前進一步！'] },
          tips: '須在張郃援軍到達前破城。弓兵壓制城頭，步兵撞門或攀城。',
        }), [
          ['narr', '陳倉陷落！關中門戶洞開！'],
          ['owner', 'chencang', 'shu'],
        ], [
          ['narr', '郝昭死守二十餘日，蜀軍糧盡退兵。魏將王雙追擊，反被蜀軍斬殺。'],
        ]],
      ]],
    ],
  },
  {
    title: '星落五丈原', year: 234, steps: [
      ['title', '第六章　星落五丈原', '建興十二年（西元234年）'],
      ['cam', 'chencang', 50],
      ['narr', '建興十二年春，諸葛亮率十萬大軍出斜谷，以木牛流馬運糧，屯田於五丈原，與司馬懿對峙於渭南。'],
      ['fx', S => S.gainWeapon('muniu')],
      ['say', 'zhugeliang', '仲達堅壁不出，我軍利在速戰。眾將以為如何？'],
      ['say', 'jiangwei', '丞相，司馬懿深沉多疑。可遣使送巾幗婦人之服，以激其出戰。'],
      ['choice', '如何應對司馬懿？', [
        H('送巾幗之服以辱之', '激將：魏軍士氣下降', S => S.flag('provoke')),
        T('分兵屯田，作久駐之計', '兵力 +5000', S => S.addTroops(5000)),
      ]],
      ['if', S => S.flags.provoke, [['narr', '司馬懿受巾幗之辱，上表請戰。魏帝遣辛毗持節至軍前，司馬懿乃止。然魏軍將士已憤懣難平。']]],
      ['say', 'zhugeliang', '（咳嗽不止）……吾意已決，今日與仲達決一死戰！'],
      ['battle', S => ({
        name: '五丈原之戰', sub: '諸葛亮 vs 司馬懿', terrain: 'plains', river: true,
        playerLeader: 'zhugeliang', playerGenerals: ['jiangwei', 'weiyan', 'wangping', 'zhaoyun'], maxTroops: 70000,
        enemy: { faction: 'wei', leader: 'simayi', generals: ['simayi', 'zhanghe', 'guohuai', 'xiahoushang'], troops: 70000, enemyHold: 60,
          tactics: ['shield', 'volley', 'drum', 'charge', 'feint'], weapons: ['armor'], formation: 'fangyuan' },
        enemyMorale: S.flags.provoke ? 85 : 100, enemyHold: 50,
        parley: { enemyOpen: ['孔明，你六出祁山，勞師遠征，又能奈我何？'], tauntWise: '（司馬懿撫鬚大笑）孔明，你我就此相持便是。' },
      }), [
        ['narr', '蜀軍大破司馬懿！諸葛亮強撐病體，揮師東進，關中震動！'],
        ['owner', 'changan', 'shu'],
        ['say', 'zhugeliang', '先帝……漢室，可興矣。'],
      ], [
        ['narr', '八月，諸葛亮病逝於五丈原軍中，年五十四。'],
        ['fx', S => S.lose('zhugeliang', '病逝五丈原')],
        ['narr', '姜維遵遺命，反旗鳴鼓，司馬懿疑有伏兵而退——「死諸葛走生仲達」。'],
        ['note', '杜甫〈蜀相〉：「出師未捷身先死，長使英雄淚滿襟。」'],
      ]],
      ENDING,
    ],
  },
];

// ════════════════════════════ 吳 ════════════════════════════
const WU = [
  {
    title: '江東之主', year: 221, steps: [
      ['title', '第一章　江東之主', '黃初二年（西元221年）'],
      ['cam', 'jiangling', 55],
      ['narr', '建安二十四年，呂蒙白衣渡江，襲取荊州。關羽敗走麥城被擒，為吳所斬。東吳盡有荊州之地。'],
      ['cam', 'jianye', 45],
      ['narr', '黃初二年，劉備稱帝於成都，為報關羽之仇，傾國東征。孫權遣諸葛瑾求和，劉備不許。'],
      ['say', 'zhugejin', '主公，劉備盛怒而來，聲勢浩大。北方曹丕又虎視眈眈，我江東恐將兩面受敵。'],
      ['choice', '如何應對北方曹魏？', [
        H('遣使向曹丕稱臣，以穩北方', '魏國封孫權為吳王，暫不南侵；金 -500（貢品）', S => { S.flag('vassal'); S.addGold(-500); }),
        T('不向曹魏低頭，兩面備戰', '名望 +10、兵力 +6000，但日後魏軍來勢更猛', S => { S.flag('defy'); S.addRenown(10); S.addTroops(6000); }),
      ]],
      ['note', '孫權稱臣於魏，曹丕封其為吳王，加九錫。孫權能屈能伸，此舉化解了兩線作戰的危機。'],
      ['say', 'sunquan', '劉備勢大，誰可為都督，總領諸軍拒之？'],
      ['say', '闞澤', '主公若用陸伯言，必能破蜀！臣以全家性命擔保！'],
      ['say', '張昭', '陸遜乃一書生，非劉備敵手，恐不可用。'],
      ['choice', '任命誰為大都督？', [
        H('拜陸遜為大都督', '習得兵法【火攻】', S => { S.learn('fire'); S.flag('luxun'); }),
        T('任用老將韓當為帥', '援軍 +8000', S => S.addTroops(8000)),
      ]],
    ],
  },
  {
    title: '火燒連營', year: 222, steps: [
      ['title', '第二章　火燒連營', '黃武元年（西元222年）'],
      ['march', 'yongan', 'yiling', 'shu'],
      ['cam', 'yiling', 40],
      ['narr', '劉備大軍順江而下，旌旗蔽日，連營數百里。吳軍諸將紛紛請戰。'],
      ['say', 'handang', '都督！蜀軍欺人太甚！若再不出戰，我江東顏面何存？'],
      ['if', S => S.flags.luxun, [
        ['say', 'luxun', '劉備舉軍東下，銳氣始盛，且乘高守險，難可卒攻。宜且獎厲將士，廣施方略，以觀其變。'],
      ], [
        ['say', 'zhugejin', '韓將軍，劉備兵鋒正盛，不可輕出。'],
      ]],
      ['narr', '相持數月，時值盛夏，蜀軍不堪酷熱，將營寨移入山林之中，連營七百里。劉備又遣吳班率數千人於平地立營挑戰。'],
      ['choice', '是否出擊？', [
        H('堅守不出，待其疲憊', '蜀軍士氣低落，連營於林中——火攻威力倍增', S => S.flag('wait')),
        T('出擊吳班的平地營寨', '速戰速決（可能有詐……）', S => S.flag('bait')),
      ]],
      ['battle', S => ({
        name: '夷陵之戰', sub: `${S.flags.luxun ? '陸遜' : '韓當'} vs 劉備`, terrain: 'plains', time: S.flags.wait ? 'night' : 'day', river: true,
        forest: S.flags.wait ? 'e' : 'sides', camps: S.flags.wait ? 'e' : null, fireBonus: S.flags.wait ? 'p' : null,
        playerLeader: S.flags.luxun ? 'luxun' : 'handang', playerGenerals: ['zhuran', 'handang', 'xusheng', 'panzhang', 'sunhuan', 'zhoutai'], maxTroops: 50000,
        enemy: { faction: 'shu', leader: 'liubei', generals: ['liubei', 'huangquan', 'wuban', 'guanxing', 'zhangbao'], troops: 55000, tactics: ['charge', 'drum', 'volley'], formation: 'changshe' },
        enemyMorale: S.flags.wait ? 70 : 100,
        enemyAmbush: S.flags.bait ? { count: 2, share: 0.2, generals: ['wuban', 'guanxing'] } : null,
        parley: { enemyOpen: ['孫權鼠輩，害我二弟！今日便要你江東血債血償！'], persuade: '劉備，你遠道而來，已成強弩之末，何不罷兵回蜀？' },
        tips: S.flags.wait ? '敵營在林中！點選【火攻】再點敵軍部隊，火勢將會在連營中蔓延。' : '小心山谷中的伏兵。',
        pursuitNote: '劉備敗走馬鞍山，欲退往白帝城……',
      }), [
        ['narr', '吳軍乘夜順風放火，連破蜀軍四十餘營。劉備夜遁白帝城，蜀軍舟船器械、水步軍資一時略盡。'],
        ['fx', S => { S.addGold(1500); S.gainWeapon('spear'); }],
        ['choice', '是否乘勝追擊，攻取白帝城（永安）？', [
          H('收兵回防，以備曹魏', '穩妥'),
          T('追擊劉備，攻取永安', '奪取永安，但魏軍將趁虛而入', S => S.flag('pursued'), { then: [['march', 'yiling', 'yongan', 'wu'], ['owner', 'yongan', 'wu']] }),
        ]],
        ['note', '史實：徐盛、潘璋等請求追擊，陸遜認為曹丕必趁機襲吳，遂撤兵。果然不久曹丕即三路伐吳。'],
      ], [
        ['narr', '吳軍失利，劉備兵鋒直逼江陵！'],
        ['owner', 'yiling', 'shu'],
      ]],
    ],
  },
  {
    title: '濡須之戰', year: 223, steps: [
      ['title', '第三章　濡須之戰', '黃武二年（西元223年）'],
      ['cam', 'ruxu', 40],
      ['if', S => S.flags.vassal, [['narr', '夷陵戰後，孫權不肯遣太子入魏為質。曹丕大怒，三路伐吳。']], [['narr', '曹丕見孫權拒不稱臣，遣大軍三路伐吳。']]],
      ['narr', '大司馬曹仁率步騎數萬，直撲濡須。濡須督朱桓麾下，僅有五千人。'],
      ['march', 'hefei', 'ruxu', 'wei'],
      ['say', '諸將', '曹仁大軍壓境，我軍寡不敵眾，如何是好？'],
      ['say', 'zhuhuan', '凡兩軍交對，勝負在將，不在眾寡。兵法所謂「客倍而主人半」者，謂俱在平原，無城池之守。今我據高城，南臨大江，北背山陵，以逸待勞，為主制客，此百戰百勝之勢也！'],
      ['choice', '朱桓如何備戰？', [
        H('偃旗息鼓，示弱誘敵', '敵軍輕敵冒進；習得兵法【誘敵深入】', S => { S.learn('feint'); S.flag('lure'); }),
        T('加固城防，備足滾木礌石', '習得兵法【滾木礌石】', S => S.learn('rockfall')),
      ]],
      ['battle', S => ({
        name: '濡須之戰', sub: '朱桓 vs 曹仁', terrain: 'siege', attacker: 'enemy', cityName: '濡須', river: true, gateHP: 5000,
        playerLeader: 'zhuhuan', playerGenerals: ['dingfeng', 'quancong'], maxTroops: 16000,
        enemy: { faction: 'wei', leader: 'caoren', generals: ['caoren', 'caotai', 'changdiao'], troops: (S.flags.defy ? 42000 : 34000) + (S.flags.pursued ? 8000 : 0),
          weapons: ['ladder', 'ram'], tactics: ['charge', 'volley', 'drum'], formation: 'fengshi' },
        enemyReckless: !!S.flags.lure,
        parley: { enemyOpen: ['朱桓小兒，速速開城投降，可免一死！'], noSurrender: true },
        tips: '弓兵已上城牆。敵軍逼近城下時使用【滾木礌石】；撐過時限或擊潰敵軍即勝。',
      }), [
        ['narr', '朱桓大破曹仁，斬常雕，擒王雙，魏軍死傷千餘！'],
        ['fx', S => S.addGold(800)],
        ['note', '史實：濡須之戰朱桓以五千兵大破曹仁數萬大軍，戰後被封為嘉興侯。'],
      ], [
        ['narr', '濡須失守！魏軍飲馬長江！'],
        ['owner', 'ruxu', 'wei'],
      ]],
    ],
  },
  {
    title: '石亭之戰', year: 228, steps: [
      ['title', '第四章　石亭之戰', '黃武七年（西元228年）'],
      ['cam', 'wan2', 45],
      ['say', 'zhoufang', '主公，曹休貪功輕敵。臣願詐降於魏，誘曹休深入，伏兵擊之。為取信於曹休，臣……願斷髮為誓！'],
      ['choice', '是否採用周魴之計？', [
        H('准周魴之計，斷髮詐降', '曹休大軍將沿山道行軍；習得兵法【伏兵】', S => { S.flag('zf'); S.learn('ambush'); }),
        T('不必如此，正面迎敵', '援軍 +8000', S => S.addTroops(8000)),
      ]],
      ['if', S => S.flags.zf, [['narr', '曹休果然中計，親率步騎十萬，直趨皖城。']]],
      ['march', 'shouchun', 'wan2', 'wei'],
      ['battle', S => ({
        name: '石亭之戰', sub: '陸遜 vs 曹休', terrain: 'mountain', time: 'dusk', forest: 'sides',
        playerLeader: 'luxun', playerGenerals: ['zhuhuan', 'quancong', 'zhoufang', 'xusheng'], maxTroops: 50000,
        enemy: { faction: 'wei', leader: 'caoxiu', generals: ['caoxiu', 'xiahoushang', 'caotai'], troops: 52000, formation: S.flags.zf ? 'changshe' : 'yulin', tactics: ['charge', 'drum', 'volley'], weapons: ['armor'] },
        enemyMarching: !!S.flags.zf,
        reinforce: { side: 'e', at: 110, troops: 10000, general: 'jiakui', types: ['inf', 'archer'], msg: '賈逵率援軍趕到，救援曹休！' },
        parley: { enemyOpen: S.flags.zf ? ['周魴何在？為何不來迎接？……不好，中計了！'] : ['陸遜書生，也敢擋我大魏天兵？'] },
        tips: S.flags.zf ? '曹休大軍沿山道行軍。布陣時勾選「伏兵」，讓部隊藏於兩側山林，待敵軍深入時殺出！' : '',
      }), [
        ['narr', '陸遜居中，朱桓、全琮為左右翼，三道俱進，大破曹休，追亡逐北直至夾石。斬獲萬餘，牛馬騾驢車乘萬兩，軍資器械略盡。'],
        ['fx', S => { S.addGold(2000); S.gainWeapon('ram'); S.gainWeapon('armor'); }],
      ], [
        ['narr', '吳軍失利，曹休大軍逼近皖城！'],
        ['owner', 'wan2', 'wei'],
      ]],
    ],
  },
  {
    title: '合肥新城', year: 234, steps: [
      ['title', '第五章　合肥新城', '黃龍元年～嘉禾三年（西元229-234年）'],
      ['cam', 'jianye', 45],
      ['narr', '黃龍元年（229年），孫權於武昌即皇帝位，國號吳，旋遷都建業。至此，三國皆已稱帝。'],
      ['say', 'sunquan', '朕今登大寶，當與蜀漢共分天下。諸葛亮又將北伐，朕親率大軍攻合肥新城，以為呼應！'],
      ['cam', 'hefei', 40],
      ['narr', '合肥新城守將滿寵，智勇兼備。新城遠離水道，吳軍戰船無法靠近。'],
      ['say', 'luxun', '陛下，滿寵善用奇兵。夜間須嚴防敵軍偷營，焚我攻城器械。'],
      ['choice', '如何攻城？', [
        T('分兵夜巡，嚴防偷營', '攻城器械得以保全：獲得【霹靂車】【雲梯】', S => { S.gainWeapon('catapult'); S.gainWeapon('ladder'); }),
        H('晝夜猛攻，速戰速決', '獲得【雲梯】【衝車】', S => { S.gainWeapon('ladder'); S.gainWeapon('ram'); }),
      ]],
      ['battle', {
        name: '合肥新城之戰', sub: '孫權 vs 滿寵', terrain: 'siege', attacker: 'player', cityName: '合肥', gateHP: 6000,
        playerLeader: 'sunquan', playerGenerals: ['luxun', 'zhuhuan', 'dingfeng', 'quancong', 'zhoutai'], maxTroops: 60000,
        enemy: { faction: 'wei', leader: 'manchong', generals: ['manchong', 'caotai'], troops: 22000, tactics: ['rockfall', 'volley', 'fire', 'shield'] },
        reinforce: { side: 'e', at: 150, troops: 20000, general: 'caorui', types: ['cav', 'inf'], msg: '魏帝曹叡御駕親征，援軍趕到！' },
        parley: { enemyOpen: ['孫權！你十萬大軍屢攻合肥不下，今日還想重蹈覆轍嗎？'] },
        tips: '在魏帝援軍到達前破城！',
      }, [
        ['narr', '吳軍攻克合肥新城！淮南門戶洞開！'],
        ['owner', 'hefei', 'wu'],
      ], [
        ['narr', '滿寵募壯士焚燒吳軍攻具，射殺孫權之姪孫泰。時值盛夏，吳軍多病，又聞魏帝親征，孫權只得退兵。'],
        ['note', '史實：孫權一生多次進攻合肥皆未能成功，合肥成為東吳北上最大的障礙。'],
      ]],
      ENDING,
    ],
  },
];

export const STORY = { wei: WEI, shu: SHU, wu: WU };

export function nextChapter(S) {
  const list = STORY[S.faction];
  let i = S.chapter;
  while (i < list.length && list[i].requires && !list[i].requires(S)) i++;
  return i < list.length ? { idx: i, ch: list[i] } : null;
}
