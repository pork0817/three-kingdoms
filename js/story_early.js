// 赤壁之戰（208）到荊州易主（219）的前期劇情，以及部分中後期新增章節
// 步驟格式同 story.js；另有 ['stage', 場景, 勢力, 演員[[id,x,z,朝向]]]、['act', id, 動作, 參數]、['effect', 種類, 參數]
const T = (t, hint, fx, extra = {}) => ({ t, hint, fx, ...extra });
const H = (t, hint, fx, extra = {}) => ({ t, hint, fx, hist: true, ...extra });
const Y = (t, hint, fx, extra = {}) => ({ t, hint, fx, yy: true, ...extra });
const P = Math.PI;
const recruitAll = (S, ids, loy = 65) => ids.forEach(g => { if (!S.dead.includes(g)) S.recruit(g, loy); });

// ════════════════════════ 魏 ════════════════════════
export const WEI_EARLY = [
  {
    title: '赤壁之戰', year: 208, steps: [
      ['title', '第一章　赤壁之戰', '建安十三年（西元208年）'],
      ['cam', 'xiangyang', 60],
      ['narr', '建安十三年，曹操平定北方後揮師南下。荊州牧劉表病逝，其子劉琮舉州投降。劉備於當陽長坂大敗，退守江夏。'],
      ['stage', 'tent', 'wei', [['caocao', 0, 6, P], ['jiaxu', -2.6, 2.5, P * 0.75], ['caoren', 2.6, 2.5, -P * 0.75], ['程昱', 3.4, 0, -P * 0.62]]],
      ['say', 'caocao', '今荊州已平，吾治水軍八十萬眾，方與孫將軍會獵於吳！'],
      ['say', 'jiaxu', '明公昔破袁氏，今收漢南，威名遠著，軍勢既大。若乘舊楚之饒，以饗吏士，撫安百姓，使安土樂業，則可不勞眾而江東稽服矣。'],
      ['choice', '是否立即東征江東？', [
        H('乘勝揮師東下，一舉蕩平江東', '進入赤壁之戰', S => S.flag('chibiGo')),
        T('採賈詡之言，暫緩東征、撫定荊州', '改寫歷史：避開赤壁；兵力 +15000、糧 +20000', S => { S.flag('noChibi'); S.addTroops(15000); S.addFood(20000); }),
      ]],
      ['if', S => S.flags.noChibi, [
        ['narr', '曹操聽從賈詡，留於荊州休養生息。孫劉雖已結盟，卻失去了一戰立威的機會。'],
        ['note', '史實上曹操沒有採納賈詡的建議，執意東進，結果在赤壁大敗。賈詡此計被後世評為「算無遺策」的代表。'],
      ], [
        ['say', '蔡瑁', '丞相，北方士卒不習水戰，在船上多生疾病，嘔吐不止。'],
        ['say', 'caocao', '可將戰船首尾以鐵索相連，上鋪闊板，人馬皆可行走，如履平地！'],
        ['say', '程昱', '船皆連鎖，固是平穩；但彼若用火攻，難以迴避，不可不防。'],
        ['choice', '如何部署艦隊？', [
          H('以鐵索連環戰船', '艦隊穩固、防禦提升，但最怕火攻', S => S.flag('chain')),
          T('分散停泊，加緊操練水軍', '不怕火攻，但士卒多病、士氣較低', S => S.flag('spread')),
        ]],
        ['narr', '此時，東吳老將黃蓋遣使送來降書，約定率船來降。'],
        ['choice', '是否相信黃蓋？', [
          H('黃蓋老臣受辱，必是真降！', '火船將趁夜逼近', S => S.flag('trustHG')),
          T('程昱所言有理，嚴加戒備', '敵軍火攻效果大減', S => S.flag('guard')),
        ]],
        ['stage', 'river', 'wei'],
        ['narr', '十一月，大江之上，曹軍戰船連綿數十里。是夜，東南風漸起……'],
        ['battle', S => ({
          name: '赤壁之戰', sub: '曹操 vs 周瑜', terrain: 'naval', time: 'night', wind: [0, 1],
          chained: S.flags.chain ? 'p' : null, playerMorale: S.flags.spread ? 80 : 100,
          playerLeader: 'caocao', playerGenerals: ['caoren', 'zhangliao', 'xuhuang', 'yujin', 'lejin'], maxTroops: 90000,
          enemy: { faction: 'wu', leader: 'zhouyu', generals: ['zhouyu', 'chengpu', 'huanggai', 'ganning', 'lvmeng', 'handang'], troops: 50000,
            tactics: S.flags.guard ? ['volley', 'drum'] : ['fireship', 'volley', 'drum'], comp: { inf: 0.4, spear: 0.2, archer: 0.4 } },
          reinforce: { side: 'e', at: 100, troops: 12000, general: 'liubei', generals: ['zhaoyun'], types: ['inf', 'spear'], msg: '劉備率軍自夏口殺來，與周瑜夾擊！' },
          parley: { enemyOpen: ['曹賊！你托名漢相，實為漢賊。今日便叫你的大軍葬身江底！'] },
          tips: S.flags.chain ? '艦隊以鐵索相連，穩如平地，但敵軍火船一旦衝入，火勢將延燒全軍！優先擊沉火船來路上的敵艦。' : '水戰中騎兵無法上陣。弓兵是水戰主力。',
        }), [
          ['narr', '火船尚未近身便被識破，魏軍艨艟順江而下，大破吳軍！江東為之震動。'],
          ['fx', S => { S.flag('chibiWin'); S.addGold(3000); S.addRenown(10); }],
          ['owner', 'chaisang', 'wei'],
          ['owner', 'wuchang', 'wei'],
          ['narr', '劉備兵敗，南投荊南四郡。'],
          ['owner', 'changsha', 'shu'],
          ['note', '你改寫了歷史：赤壁沒有焚燒。若曹操此戰獲勝，三國鼎立的局面很可能不會出現。'],
        ], [
          ['stage', 'river', 'wu'],
          ['effect', 'fire'],
          ['narr', '「時風盛猛，悉延燒岸上營落。頃之，煙炎張天，人馬燒溺死者甚眾。」'],
          ['narr', '曹操引軍從華容道步走，遇泥濘，道不通，悉使羸兵負草填之，騎乃得過。'],
          ['narr', '曹操留曹仁守江陵，自引大軍北還。次年，周瑜攻陷江陵。'],
          ['owner', 'jiangling', 'wu'],
          ['owner', 'yiling', 'wu'],
          ['fx', S => S.worldDone.push('jiangling')],
          ['note', '赤壁之戰是以少勝多的著名戰役。孫劉聯軍約五萬，以火攻擊敗曹軍，奠定了三國鼎立的基礎。'],
        ]],
      ]],
    ],
  },
  {
    title: '潼關之戰', year: 211, steps: [
      ['title', '第二章　潼關之戰', '建安十六年（西元211年）'],
      ['cam', 'changan', 55],
      ['narr', '建安十六年，曹操遣鍾繇討漢中張魯。關中諸將疑其襲己，馬超、韓遂等十部聯軍十餘萬，屯據潼關。'],
      ['stage', 'tent', 'wei', [['caocao', 0, 6, P], ['xuhuang', -2.6, 2.5, P * 0.75], ['jiaxu', 2.6, 2.5, -P * 0.75], ['xuchu', -3.4, 0, P * 0.62]]],
      ['say', 'caocao', '關中兵精將勇，馬超尤為悍勇。如何破之？'],
      ['say', 'xuhuang', '公盛兵於此，而賊不復別守蒲阪，知其無謀也。今假臣精兵渡蒲阪津，為軍先置，以截其裏，賊可擒也。'],
      ['choice', '渡河之策？', [
        H('依徐晃之計，遣精兵先渡蒲阪津', '戰鬥中將有一支奇兵出現在敵軍後方', S => S.flag('puban')),
        T('全軍正面強渡渭水', '堂堂正正，以力破敵'),
      ]],
      ['say', 'jiaxu', '離之而已。'],
      ['say', 'caocao', '……好！吾與韓遂陣前敘舊，再以塗改之書信予他，馬超必生疑心。'],
      ['choice', '是否使用離間計？', [
        H('用賈詡之計，抹書間韓遂', '西涼聯軍互相猜疑：兵力、士氣大減', S => S.flag('lijian')),
        T('不屑行此詭計，堂堂一戰', '名望 +5', S => S.addRenown(5)),
      ]],
      ['if', S => S.flags.lijian, [['note', '「抹書間韓遂」：曹操寫信給韓遂，故意多處塗改，像是韓遂自己改過。馬超見信，果然懷疑韓遂。這正是《孫子》「親而離之」的運用。']]],
      ['battle', S => ({
        name: '潼關之戰', sub: '曹操 vs 馬超', terrain: 'plains', riverMid: true,
        playerLeader: 'caocao', playerGenerals: ['xuchu', 'xuhuang', 'caoren', 'zhanghe', 'yujin'], maxTroops: 80000,
        enemy: { faction: 'xiliang', leader: 'machao', generals: ['machao', 'hansui', 'pangde', 'madai', 'chenggongying'], troops: S.flags.lijian ? 42000 : 60000,
          comp: { inf: 0.2, spear: 0.15, cav: 0.5, archer: 0.15 }, tactics: ['charge', 'drum'], formation: 'fengshi' },
        enemyMorale: S.flags.lijian ? 75 : 100,
        reinforce: S.flags.puban ? { side: 'p', at: 45, rear: true, troops: 12000, general: 'xuhuang', types: ['cav', 'spear'], msg: '徐晃自蒲阪津渡河，截斷西涼軍後路！' } : null,
        parley: { enemyOpen: ['曹賊！殺我父弟，此仇不共戴天！'], tauntAngry: '曹操老賊！吾必生啖汝肉！' },
        tips: '兩軍之間隔著渭水，渡河時速度大減、防禦下降。可讓敵軍先渡河，再半渡而擊之。',
      }), [
        ['narr', '西涼聯軍大潰，馬超、韓遂逃往涼州。曹操遂定關中。'],
        ['owner', 'tianshui', 'wei'],
        ['owner', 'wuwei', 'wei'],
        ['fx', S => S.worldDone.push('xiliang')],
        ['note', '史實：曹操在潼關之戰先以徐晃渡蒲阪津，再用賈詡離間計，大破關中聯軍。曹操說：「兵之變化，固非一道也。」'],
      ], [
        ['narr', '馬超驍勇，曹軍渡渭時遭突襲，曹操「割鬚棄袍」，賴許褚死戰方得脫險。（演義）'],
      ]],
    ],
  },
  {
    title: '威震逍遙津', year: 215, steps: [
      ['title', '第三章　威震逍遙津', '建安二十年（西元215年）'],
      ['fx', S => { if (!S.has('pangde') && !S.dead.includes('pangde')) S.recruit('pangde', 60); }],
      ['narr', '建安二十年，曹操西征張魯，張魯封倉庫而降，龐德隨之歸曹。'],
      ['cam', 'hefei', 40],
      ['narr', '孫權趁合肥空虛，親率十萬大軍來攻。合肥守將張遼、李典、樂進，兵僅七千。'],
      ['stage', 'wall', 'wei', [['zhangliao', 0, 1, 0], ['lejin', -2.2, 1.5, 0.4]]],
      ['say', 'zhangliao', '公遠征在外，比救至，彼破我必矣。是以教指及其未合逆擊之，折其盛勢，以安眾心，然後可守也。'],
      ['say', 'lejin', '敵眾我寡，不如堅守待援……'],
      ['choice', '如何應敵？', [
        H('張遼募八百死士，天明出城突擊', '趁吳軍未備殺入大營：敵軍開戰時陷入混亂', S => S.flag('zl800')),
        T('閉城堅守，等待援軍', '戰鬥中途將有夏侯惇援軍', S => S.flag('zlHold')),
      ]],
      ['battle', S => S.flags.zl800 ? {
        name: '逍遙津之戰', sub: '張遼八百破十萬', terrain: 'plains', time: 'dawn', nightRaid: 'p',
        playerLeader: 'zhangliao', playerGenerals: ['lejin', 'pangde'], maxTroops: 12000, playerMorale: 120,
        enemy: { faction: 'wu', leader: 'sunquan', generals: ['sunquan', 'lvmeng', 'ganning', 'lingtong', 'chengpu'], troops: 40000, tactics: ['volley', 'drum'] },
        enemyMorale: 75,
        parley: { enemyOpen: ['張遼小兒，竟敢出城？'] },
        tips: '天明時分吳軍尚未整備（如同夜襲）：以騎兵直衝孫權本陣！',
        pursuitNote: '孫權退至逍遙津，橋板已被拆斷……',
      } : {
        name: '合肥之戰', sub: '張遼 vs 孫權', terrain: 'siege', attacker: 'enemy', cityName: '合肥',
        playerLeader: 'zhangliao', playerGenerals: ['lejin', 'pangde'], maxTroops: 12000,
        enemy: { faction: 'wu', leader: 'sunquan', generals: ['sunquan', 'lvmeng', 'ganning', 'lingtong', 'chengpu'], troops: 40000, weapons: ['ladder'], tactics: ['volley', 'drum'] },
        reinforce: { side: 'p', at: 120, troops: 20000, general: 'xiahoudun', types: ['cav', 'inf'], msg: '夏侯惇率援軍趕到！' },
      }, [
        ['narr', '張遼「被甲持戟，先登陷陣，殺數十人，斬二將」，直衝孫權麾下。孫權撤退時於逍遙津又遭追擊，險遭生擒。'],
        ['narr', '自此，江東小兒聞張遼之名，夜不敢啼。'],
        ['fx', S => { S.addRenown(10); S.addLoyalty('zhangliao', 15); }],
      ], [
        ['narr', '合肥陷落！吳軍兵鋒直指壽春。'],
        ['owner', 'hefei', 'wu'],
      ]],
    ],
  },
  {
    title: '定軍山', year: 219, requires: S => S.owns('hanzhong'), steps: [
      ['title', '第四章　定軍山', '建安二十四年（西元219年）'],
      ['cam', 'hanzhong', 45],
      ['narr', '劉備取益州後北爭漢中，與夏侯淵相持年餘。正月，劉備自陽平南渡沔水，於定軍山勢作營。'],
      ['stage', 'tent', 'wei', [['xiahouyuan', 0, 6, P], ['zhanghe', -2.6, 2.5, P * 0.75]]],
      ['say', 'xiahouyuan', '劉備夜燒圍鹿角！我當親率輕兵往修，張郃守東圍！'],
      ['say', 'zhanghe', '將軍乃一軍主帥，豈可親冒矢石？末將願往。'],
      ['narr', '曹操曾告誡夏侯淵：「為將當有怯弱時，不可但恃勇也。」'],
      ['choice', '夏侯淵的決定？', [
        H('親率四百輕兵修補鹿角', '主帥將暴露在前方！', S => S.flag('exposed')),
        T('謹記曹操告誡，遣部將修補鹿角', '穩守營寨'),
      ]],
      ['battle', S => ({
        name: '定軍山之戰', sub: '夏侯淵 vs 黃忠', terrain: 'mountain', hill: 'e',
        playerLeader: 'xiahouyuan', playerGenerals: ['zhanghe', 'xuhuang', 'guohuai'], maxTroops: 50000, playerLeaderExposed: !!S.flags.exposed,
        enemy: { faction: 'shu', leader: 'huangzhong', generals: ['huangzhong', 'zhaoyun', 'fazheng', 'weiyan'], troops: 45000, tactics: ['charge', 'drum', 'volley'] },
        parley: { enemyOpen: ['老將黃忠在此！夏侯淵，納命來！'], tauntAngry: '老匹夫！看我先斬你首級！' },
        tips: S.flags.exposed ? '主帥兵少且在前方，敵軍必定直取！迅速派兵掩護主帥。' : '敵軍據定軍山居高臨下，不宜仰攻。',
      }), [
        ['narr', '魏軍擊退黃忠，劉備久攻漢中不下。'],
      ], [
        ['narr', '黃忠推鋒必進，勸率士卒，金鼓振天，歡聲動谷，一戰斬夏侯淵。'],
        ['if', S => S.flags.exposed, [['fx', S => S.lose('xiahouyuan', '戰死於定軍山')]]],
        ['owner', 'hanzhong', 'shu'],
        ['narr', '曹操親征漢中，相持數月，夜以「雞肋」為口令。楊修曰：「夫雞肋，棄之如可惜，食之無所得。」曹操遂引軍北還。'],
      ]],
    ],
  },
  {
    title: '水淹七軍', year: 219, requires: S => S.owns('xiangyang'), steps: [
      ['title', '第五章　水淹七軍', '建安二十四年秋'],
      ['cam', 'xiangyang', 45],
      ['narr', '同年七月，關羽自江陵北伐，圍曹仁於樊城。曹操遣于禁督七軍三萬人往救，龐德為先鋒。'],
      ['stage', 'tent', 'wei', [['yujin', 0, 6, P], ['pangde', -2.6, 2.5, P * 0.75], ['caoren', 2.6, 2.5, -P * 0.75]]],
      ['say', 'pangde', '我受國恩，義在效死。我欲身自擊羽，今年我不殺羽，羽當殺我！'],
      ['say', 'yujin', '樊城之北地勢低平，便於救援，大軍就在此紮營。'],
      ['choice', '于禁七軍的營地？', [
        H('屯於樊北平地', '若逢大雨，恐有水患', S => S.flag('lowground')),
        T('移營於高阜之上', '可避水患'),
      ]],
      ['choice', '是否借助東吳之力？', [
        H('遣使說孫權，許割江南以襲關羽後方', '東吳將從背後偷襲荊州；與吳關係 +20', S => { S.flag('askWu'); S.addRel('wei', 'wu', 20); }),
        T('不借外力，自行解圍', '名望 +5', S => S.addRenown(5)),
      ]],
      ['if', S => S.flags.lowground, [['narr', '八月，大霖雨，漢水溢，平地水數丈，于禁七軍皆沒……']]],
      ['battle', S => ({
        name: '樊城之戰', sub: '曹仁 vs 關羽', terrain: 'siege', attacker: 'enemy', cityName: '樊城', gateHP: 5000,
        playerLeader: 'caoren', playerGenerals: ['yujin', 'pangde', 'manchong'], maxTroops: 40000, flood: S.flags.lowground ? 'p' : null,
        enemy: { faction: 'shu', leader: 'guanyu', generals: ['guanyu', 'guanping', 'liaohua'], troops: 36000, weapons: ['ladder', 'ram'], tactics: ['charge', 'volley', 'drum'], formation: 'fengshi' },
        reinforce: { side: 'p', at: 110, troops: 20000, general: 'xuhuang', types: ['inf', 'spear'], msg: '徐晃率援軍長驅直入，突破關羽重圍！' },
        noSurrender: true,
        parley: { enemyOpen: ['曹仁！樊城已成孤城，速速開城投降！'], tauntAngry: '鼠輩安敢辱我！' },
      }), [
        ['narr', '徐晃擊破關羽圍頭屯，關羽撤圍而還。'],
        ['if', S => S.flags.askWu, [['narr', '此時，呂蒙白衣渡江，襲取江陵、公安。關羽腹背受敵，敗走麥城。']]],
      ], [
        ['narr', '樊城陷落！關羽威震華夏，曹操甚至議徙許都以避其鋒。'],
        ['owner', 'xiangyang', 'shu'],
        ['if', S => S.flags.lowground, [['fx', S => { S.captured('yujin', 'shu'); S.lose('pangde', '被關羽所斬'); }]]],
        ['note', '史實：于禁投降，龐德不屈被斬。曹操嘆曰：「吾知禁三十年，何意臨危處難，反不如龐德邪！」'],
      ]],
    ],
  },
];

export const WEI_LATE = {
  mengda: {
    title: '擒孟達', year: 227, steps: [
      ['title', '第一章　擒孟達', '太和元年（西元227年）'],
      ['cam', 'wan', 45],
      ['narr', '孟達原為蜀將，降魏後鎮守新城。諸葛亮北伐前夕，孟達暗中與蜀通款，欲舉兵反魏。'],
      ['stage', 'tent', 'wei', [['simayi', 0, 6, P]]],
      ['say', 'simayi', '孟達無信義，今彼方猶豫，宜及其未定，促決之。'],
      ['choice', '司馬懿的行動？', [
        H('不待上表，倍道兼行，八日直抵新城', '出其不意：孟達城防未固', S => S.flag('fastMarch')),
        T('依例先上表請命', '穩妥，但孟達已有準備'),
      ]],
      ['battle', S => ({
        name: '新城之戰', sub: '司馬懿 vs 孟達', terrain: 'siege', attacker: 'player', cityName: '新城', gateHP: S.flags.fastMarch ? 2500 : 5000,
        playerLeader: 'simayi', playerGenerals: ['zhanghe', 'guohuai'], maxTroops: 40000,
        enemy: { faction: 'shu', leader: 'mengda', generals: ['mengda'], troops: 15000, tactics: ['volley', 'rockfall'] },
        enemyMorale: S.flags.fastMarch ? 60 : 95, surrenderBonus: 0.2,
        parley: { enemyOpen: S.flags.fastMarch ? ['（孟達大驚）吾舉事八日，而兵至城下，何其神速也！'] : ['司馬懿，你終究來了。'] },
      }), [
        ['narr', '孟達部將李輔、鄧賢開門出降。孟達被斬，新城平定。'],
        ['fx', S => { S.kill('mengda'); S.addGold(1000); }],
      ], [
        ['narr', '孟達據城自守，蜀吳援兵將至，司馬懿只得退兵。'],
      ]],
    ],
  },
};

// ════════════════════════ 蜀 ════════════════════════
export const SHU_EARLY = [
  {
    title: '赤壁之戰', year: 208, steps: [
      ['title', '第一章　赤壁之戰', '建安十三年（西元208年）'],
      ['cam', 'wuchang', 45],
      ['narr', '建安十三年，曹操南下荊州，劉琮投降。劉備攜民南逃，於當陽長坂被曹軍追及。趙雲懷抱幼主力戰突圍，張飛據水斷橋，瞋目橫矛，曹軍無敢近者。'],
      ['stage', 'tent', 'shu', [['liubei', 0, 6, P], ['zhugeliang', -2.6, 2.5, P * 0.75], ['guanyu', 2.6, 2.5, -P * 0.75], ['zhangfei', 3.4, 0, -P * 0.62], ['zhaoyun', -3.4, 0, P * 0.62]]],
      ['say', 'liubei', '曹操大軍壓境，我等兵微將寡，如之奈何？'],
      ['say', 'zhugeliang', '事急矣，請奉命求救於孫將軍。'],
      ['stage', 'palace', 'wu', [['sunquan', 0, 7.5, P], ['張昭', -2.6, 3, P * 0.6], ['lusu', 2.6, 3, -P * 0.6], ['zhugeliang', 0, 0.5, 0]]],
      ['say', '張昭', '曹公豺虎也，挾天子以征四方，動以朝廷為辭。今日拒之，事更不順。愚謂大計不如迎之。'],
      ['choice', '諸葛亮如何說服孫權？', [
        H('激將：「若不能當，何不按兵束甲，北面而事之！」', '孫權大怒而決戰；與吳關係 +20', S => S.addRel('shu', 'wu', 20)),
        T('分析利害：「強弩之末，勢不能穿魯縞」', '習得兵法【火攻】', S => S.learn('fire')),
      ]],
      ['say', 'sunquan', '吾不能舉全吳之地，十萬之眾，受制於人。吾計決矣！'],
      ['act', 'sunquan', 'shake'],
      ['effect', 'shake'],
      ['say', 'sunquan', '諸將吏敢復有言當迎操者，與此案同！'],
      ['note', '「拔刀斫前奏案」：孫權以刀砍斷面前的桌案，表示抗曹的決心。孫劉聯軍由此結成。'],
      ['fx', S => { S.addRel('shu', 'wu', 15); S.flag('alliance'); }],
      ['stage', 'river', 'wu'],
      ['narr', '十一月，周瑜、程普率水軍三萬，與劉備並力逆曹操，遇於赤壁。曹軍戰船首尾相接，黃蓋請以火攻。'],
      ['stage', 'tent', 'shu', [['liubei', 0, 6, P], ['zhugeliang', -2.6, 2.5, P * 0.75], ['guanyu', 2.6, 2.5, -P * 0.75], ['zhangfei', 3.4, 0, -P * 0.62], ['zhaoyun', -3.4, 0, P * 0.62]]],
      ['say', 'zhugeliang', '曹軍北人，不習水戰，又以鐵索連舟。此戰勝負，全在一把火。'],
      ['choice', '我軍如何助戰？', [
        Y('諸葛亮設壇「借東風」，助周郎火攻', '習得兵法【火船】', S => S.learn('fireship')),
        H('率關張趙登船，與吳軍並肩作戰', '兵力 +4000、士氣高昂；黃蓋火船先行，曹軍開戰時已傷亡慘重', S => { S.addTroops(4000); S.flag('chibiBrave'); }),
      ]],
      ['stage', 'river', 'shu'],
      ['narr', '是夜，東南風大起。孫劉聯軍戰船順風而下，直逼曹營……'],
      ['battle', S => ({
        name: '赤壁之戰', sub: '孫劉聯軍 vs 曹操', terrain: 'naval', time: 'night', wind: [0, -1],
        playerLeader: 'liubei', playerGenerals: ['zhugeliang', 'guanyu', 'zhangfei', 'zhaoyun'], maxTroops: S.flags.chibiBrave ? 24000 : 20000,
        playerMorale: S.flags.chibiBrave ? 110 : 100, chained: S.flags.chibiBrave ? null : 'e',
        enemy: { faction: 'wei', leader: 'caocao', generals: ['caocao', 'caoren', 'zhangliao', 'xuhuang', 'yujin'], troops: S.flags.chibiBrave ? 32000 : 55000, comp: { inf: 0.45, spear: 0.25, archer: 0.3 }, tactics: ['volley', 'drum'] },
        enemyMorale: S.flags.chibiBrave ? 60 : 80,
        reinforce: { side: 'p', at: S.flags.chibiBrave ? 20 : 30, troops: S.flags.chibiBrave ? 28000 : 24000, general: 'zhouyu', generals: ['huanggai', 'ganning', 'chengpu'], types: ['archer', 'inf', 'archer', 'spear'], msg: '周瑜、黃蓋率江東水師殺到！孫劉聯軍並力破曹！' },
        parley: { enemyOpen: ['大耳賊！敗軍之將，也敢來江上送死？'] },
        tips: '水戰：弓兵是主力，騎兵無法上船。曹軍戰船以鐵索相連——若有【火船】，順東南風放出，火勢會延燒整支艦隊！約 30 秒後周瑜的吳軍水師會趕到。',
      }), [
        ['effect', 'fire'],
        ['narr', '「時風盛猛，悉延燒岸上營落。頃之，煙炎張天，人馬燒溺死者甚眾。」'],
        ['fx', S => { S.flag('chibiWin'); S.addGold(1500); S.addRenown(8); S.addRel('shu', 'wu', 10); }],
      ], [
        ['narr', '我軍一度受挫，幸賴周瑜、黃蓋火船得手，曹軍終究大敗。'],
        ['effect', 'fire'],
      ]],
      ['stage', 'field', 'shu', [['liubei', 0, 6, P], ['zhugeliang', -2.6, 2.5, P * 0.75], ['guanyu', 2.6, 2.5, -P * 0.75], ['zhangfei', 3.4, 0, -P * 0.62], ['zhaoyun', -3.4, 0, P * 0.62]]],
      ['say', 'zhugeliang', '曹操兵敗，必走華容道。主公可遣一軍埋伏於此。'],
      ['choice', '派誰伏擊華容道？', [
        Y('關羽', '義重如山的關羽……', S => S.flags.hr = 'guanyu'),
        T('張飛', '勇猛無比，絕不留情', S => S.flags.hr = 'zhangfei'),
        T('趙雲', '沉穩可靠', S => S.flags.hr = 'zhaoyun'),
      ]],
      ['battle', S => ({
        name: '華容道', sub: '伏擊敗退的曹操', terrain: 'mountain', time: 'dusk', weather: 'rain', allowAmbush: true,
        playerLeader: S.flags.hr, playerGenerals: ['liubei', 'guanping', 'liaohua'], maxTroops: 16000,
        enemy: { faction: 'wei', leader: 'caocao', generals: ['caocao', 'xuchu', 'zhangliao'], troops: 22000, comp: { inf: 0.5, cav: 0.4, spear: 0.1 }, tactics: ['charge', 'drum'] },
        enemyMarching: true, enemyMorale: 55,
        parley: { enemyOpen: S.flags.hr === 'guanyu' ? ['雲長……將軍可還記得昔日許田之恩？'] : ['天亡我也……'] },
        tips: '曹軍將沿山道經過：布陣時把部隊設為「伏兵」，待曹軍深入時殺出！大雨中無法火攻。',
        captiveScript: {
          caocao: [
            ['say', 'caocao', '……將軍可念昔日之情，放某一條生路？'],
            ['choice', '如何處置曹操？', [
              Y('義釋曹操', '名望 +10；忠義之名傳於天下', S => S.addRenown(10)),
              T('斬殺曹操', '改寫歷史！曹丕將提前繼位', S => { S.kill('caocao'); S.flag('killed_caocao'); S.addRenown(-5); }),
            ]],
          ],
        },
      }), [
        ['narr', '曹軍潰散，北方元氣大傷。'],
        ['fx', S => S.addGold(1500)],
      ], [
        ['narr', '曹操於泥濘中令羸兵負草填路，騎兵乃得過，脫身北還。'],
      ]],
      ['note', '華容道關羽義釋曹操的故事出自《三國演義》。史書記載曹操是在泥濘中強行開路逃脫的。'],
    ],
  },
  {
    title: '荊南四郡', year: 210, steps: [
      ['title', '第二章　荊南四郡', '建安十四年～十五年（西元209-210年）'],
      ['cam', 'changsha', 45],
      ['narr', '赤壁戰後，劉備表劉琦為荊州刺史，引兵南征武陵、長沙、桂陽、零陵四郡。'],
      ['stage', 'tent', 'shu', [['liubei', 0, 6, P], ['zhugeliang', -2.6, 2.5, P * 0.75], ['guanyu', 2.6, 2.5, -P * 0.75]]],
      ['say', 'zhugeliang', '長沙太守韓玄麾下有一老將黃忠，年近六旬，有萬夫不當之勇。'],
      ['say', 'guanyu', '某願取長沙！'],
      ['choice', '誰去攻長沙？', [
        Y('命關羽攻長沙', '關羽將與黃忠陣前交鋒', S => S.flag('gyCS')),
        T('主公親率大軍征討', ''),
      ]],
      ['battle', S => ({
        name: '長沙之戰', sub: '攻取荊南', terrain: 'siege', attacker: 'player', cityName: '長沙', gateHP: 2500,
        playerLeader: S.flags.gyCS ? 'guanyu' : 'liubei', playerGenerals: ['zhangfei', 'zhaoyun', 'guanping'], maxTroops: 20000,
        enemy: { faction: 'jingnan', leader: 'hanxuan', generals: ['hanxuan', 'huangzhong', 'weiyan'], troops: 12000, tactics: ['volley', 'rockfall'], comp: { inf: 0.4, spear: 0.2, archer: 0.4 } },
        parley: { enemyOpen: ['（城頭一員白髮老將張弓搭箭）來將通名！'] },
        captiveScript: { huangzhong: [], weiyan: [], hanxuan: [] },
      }), [
        ['narr', '魏延殺韓玄，獻城投降。老將黃忠亦歸順劉備。'],
        ['fx', S => { S.kill('hanxuan'); recruitAll(S, ['huangzhong', 'weiyan'], 70); }],
        ['owner', 'changsha', 'shu'],
      ], [
        ['narr', '長沙城堅，劉備改先取武陵、零陵。'],
      ]],
      ['narr', '武陵金旋、零陵劉度相繼歸降。襄陽名士馬良、馬謖兄弟亦來投效。'],
      ['owner', 'wuling', 'shu'],
      ['owner', 'lingling', 'shu'],
      ['fx', S => { recruitAll(S, ['maliang', 'masu'], 75); S.worldDone.push('jingnan'); }],
      ['stage', 'palace', 'wu', [['sunquan', 0, 7.5, P], ['lusu', 2.6, 3, -P * 0.6], ['liubei', 0, 0.5, 0]]],
      ['narr', '周瑜攻下江陵後於建安十五年病逝。劉備親至京口見孫權，求都督荊州。'],
      ['say', 'lusu', '劉備英雄，宜借以荊州，使撫安之。多操之敵，而自為樹黨，計之上也。'],
      ['choice', '是否向孫權「借荊州」？', [
        H('借荊州，進駐江陵', '得到戰略要地江陵；日後需歸還', S => S.flag('borrowed')),
        T('婉拒，以免日後糾紛', '與吳關係 +10', S => S.addRel('shu', 'wu', 10)),
      ]],
      ['if', S => S.flags.borrowed && ['wu', 'wei'].includes(S.owners.jiangling), [
        ['owner', 'jiangling', 'shu'],
        ['fx', S => S.worldDone.push('jiangling', 'borrow')],
      ]],
      ['choice', '孫權欲將其妹嫁予劉備以固盟好。', [
        H('迎娶孫夫人', '孫尚香加入；與吳關係 +15', S => { S.recruit('sunshangxiang', 60); S.addRel('shu', 'wu', 15); }),
        T('婉拒這門親事', ''),
      ]],
      ['narr', '龐統經魯肅、諸葛亮舉薦，投奔劉備，任軍師中郎將。'],
      ['fx', S => S.recruit('pangtong', 80)],
    ],
  },
  {
    title: '入主益州', year: 214, steps: [
      ['title', '第三章　入主益州', '建安十六年～十九年（西元211-214年）'],
      ['cam', 'chengdu', 50],
      ['narr', '建安十六年，益州牧劉璋聞曹操將征漢中，內懷恐懼。別駕張松、法正勸劉璋迎劉備入蜀以拒張魯。'],
      ['stage', 'tent', 'shu', [['liubei', 0, 6, P], ['pangtong', -2.6, 2.5, P * 0.75], ['huangzhong', 2.6, 2.5, -P * 0.75]]],
      ['say', 'pangtong', '陰選精兵，晝夜兼道，徑襲成都，此上計也；揚言還荊州，誘斬楊懷、高沛，進取其兵，此中計也；退還白帝，連引荊州，徐還圖之，此下計也。'],
      ['choice', '取益州之計？', [
        T('上計：精兵晝夜兼程，直襲成都', '奇襲：敵軍措手不及', S => S.flag('upper')),
        H('中計：誘斬楊懷、高沛，奪其兵馬', '兵力 +8000', S => { S.addTroops(8000); S.flag('mid'); }),
        T('下計：退還白帝，徐圖之', '名望 +10，但敵軍有充分準備', S => { S.addRenown(10); S.flag('lower'); }),
      ]],
      ['narr', '建安十九年，劉備圍雒城，張任據城死守。'],
      ['say', 'pangtong', '主公，統願率一軍從小路進襲雒城西門！'],
      ['choice', '是否讓龐統走小路？', [
        H('准其所請', '龐統可能遭遇不測……', S => S.flag('pangSmall')),
        T('令其隨大軍同行', '穩妥'),
      ]],
      ['battle', S => ({
        name: '雒城之戰', sub: '劉備 vs 張任', terrain: 'siege', attacker: 'player', cityName: '雒城', gateHP: 4500,
        playerLeader: 'liubei', playerGenerals: ['pangtong', 'huangzhong', 'weiyan'], maxTroops: 30000,
        enemy: { faction: 'liuzhang', leader: 'zhangren', generals: ['zhangren', 'liyan', 'huangquan'], troops: S.flags.upper ? 14000 : S.flags.lower ? 28000 : 22000, tactics: ['volley', 'rockfall', 'shield'] },
        enemyMorale: S.flags.upper ? 70 : 100,
        reinforce: { side: 'p', at: 120, troops: 15000, general: 'zhangfei', generals: ['zhaoyun'], types: ['inf', 'cav'], msg: '張飛、趙雲、諸葛亮溯江而上，前來會師！' },
        captiveScript: {
          zhangren: [
            ['say', 'zhangren', '老臣終不復事二主！'],
            ['choice', '如何處置張任？', [H('成全其忠義', '名望 +5', S => { S.kill('zhangren'); S.addRenown(5); }), T('囚之不殺', '', S => S.prisoners.push('zhangren'))]],
          ],
          huangquan: [], liyan: [],
        },
      }), [
        ['if', S => S.flags.pangSmall, [['narr', '龐統率軍攻城，為流矢所中，卒於雒城，年僅三十六。'], ['fx', S => S.lose('pangtong', '中流矢身亡')]]],
        ['narr', '雒城陷落，劉備進圍成都。馬超自張魯處來投，成都震恐。'],
        ['fx', S => recruitAll(S, ['machao', 'madai'], 70)],
        ['stage', 'palace', 'liuzhang', [['liuzhang', 0, 7.5, P], ['liubei', 0, 1, 0]]],
        ['say', 'liuzhang', '父子在州二十餘年，無恩德以加百姓。百姓攻戰三年，肌膏草野者，以璋故也，何心能安！'],
        ['narr', '劉璋開城出降。益州平定。'],
        ['owner', 'chengdu', 'shu'], ['owner', 'zitong', 'shu'], ['owner', 'jiangzhou', 'shu'], ['owner', 'yongan', 'shu'], ['owner', 'yuexi', 'shu'],
        ['fx', S => { recruitAll(S, ['fazheng', 'huangquan', 'yanyan', 'liyan', 'wuban', 'mengda'], 65); S.kill('liuzhang'); S.worldDone.push('yizhou'); S.addRenown(10); }],
      ], [
        ['if', S => S.flags.pangSmall, [['narr', '龐統中流矢身亡。'], ['fx', S => S.lose('pangtong', '中流矢身亡')]]],
        ['narr', '雒城久攻不下，劉備只得暫退。'],
      ]],
    ],
  },
  {
    title: '定軍山', year: 219, requires: S => S.owns('chengdu') && !S.owns('hanzhong'), steps: [
      ['title', '第四章　定軍山', '建安二十四年（西元219年）'],
      ['cam', 'hanzhong', 45],
      ['narr', '建安二十年，曹操降張魯，留夏侯淵、張郃守漢中。劉備納法正之策，北爭漢中。'],
      ['stage', 'tent', 'shu', [['liubei', 0, 6, P], ['fazheng', -2.6, 2.5, P * 0.75], ['huangzhong', 2.6, 2.5, -P * 0.75]]],
      ['narr', '劉備自陽平南渡沔水，緣山稍前，於定軍山勢作營。夏侯淵將兵來爭其地。'],
      ['say', 'fazheng', '可擊矣！'],
      ['choice', '如何進攻？', [
        H('待夏侯淵修補鹿角時，命黃忠居高突擊', '敵軍主帥將暴露在前方！', S => S.flag('fzStrike')),
        T('全軍正面強攻', ''),
      ]],
      ['battle', S => ({
        name: '定軍山之戰', sub: '黃忠 vs 夏侯淵', terrain: 'mountain', hill: 'p',
        playerLeader: 'huangzhong', playerGenerals: ['liubei', 'zhaoyun', 'fazheng', 'weiyan'], maxTroops: 45000,
        enemy: { faction: 'wei', leader: 'xiahouyuan', generals: ['xiahouyuan', 'zhanghe', 'xuhuang'], troops: 45000, tactics: ['charge', 'volley', 'drum'], weapons: ['armor'] },
        enemyLeaderExposed: !!S.flags.fzStrike,
        parley: { enemyOpen: ['蜀中無人，竟派一老卒來送死？'], tauntAngry: '老匹夫！' },
        tips: S.flags.fzStrike ? '夏侯淵兵少而在前！以騎兵直取敵帥。' : '我軍據有高地：居高臨下有攻擊加成。',
      }), [
        ['narr', '黃忠推鋒必進，金鼓振天，歡聲動谷，一戰斬夏侯淵！'],
        ['fx', S => { if (!S.prisoners.includes('xiahouyuan')) S.kill('xiahouyuan'); S.worldDone.push('dingjun'); }],
        ['owner', 'hanzhong', 'shu'],
        ['stage', 'palace', 'shu', [['liubei', 0, 7.5, P], ['zhugeliang', -2.6, 3, P * 0.6], ['fazheng', 2.6, 3, -P * 0.6], ['huangzhong', -3.4, 0.5, P * 0.6], ['zhaoyun', 3.4, 0.5, -P * 0.6]]],
        ['narr', '曹操親征漢中，相持數月，終以「雞肋」為令退兵。秋，劉備自立為漢中王。'],
        ['fx', S => S.addRenown(10)],
      ], [
        ['narr', '魏軍堅守，劉備只得退兵。'],
      ]],
    ],
  },
  {
    title: '威震華夏', year: 219, requires: S => S.owns('jiangling') && S.isAlive('guanyu') && S.has('guanyu'), steps: [
      ['title', '第五章　威震華夏', '建安二十四年秋'],
      ['cam', 'jiangling', 45],
      ['narr', '同年七月，關羽留糜芳守江陵、傅士仁守公安，親率大軍北攻樊城。'],
      ['stage', 'tent', 'shu', [['guanyu', 0, 6, P], ['guanping', -2.6, 2.5, P * 0.75], ['liaohua', 2.6, 2.5, -P * 0.75]]],
      ['say', 'liaohua', '將軍北伐，江陵空虛。糜芳、傅士仁素與將軍不睦，東吳呂蒙又虎視眈眈……'],
      ['choice', '後方如何部署？', [
        T('留重兵鎮守江陵，嚴防東吳', '北伐兵力減少，但荊州無虞', S => S.flag('guardJL')),
        H('盡調後方兵馬北上', '全力攻打樊城', S => S.flag('allIn')),
      ]],
      ['narr', '八月，大霖雨，漢水溢，平地水數丈。'],
      ['choice', '是否趁漢水暴漲進攻？', [
        H('乘大船攻擊被淹的魏營——水淹七軍', '魏軍兵力、士氣大減', S => S.flag('floodE')),
        T('等待水退再戰', ''),
      ]],
      ['battle', S => ({
        name: '樊城之戰', sub: '關羽 vs 曹仁', terrain: 'siege', attacker: 'player', cityName: '樊城', gateHP: 5000,
        playerLeader: 'guanyu', playerGenerals: ['guanping', 'liaohua'], maxTroops: S.flags.allIn ? 40000 : 26000,
        enemy: { faction: 'wei', leader: 'caoren', generals: ['caoren', 'yujin', 'pangde', 'manchong'], troops: 36000, tactics: ['rockfall', 'volley', 'shield'] },
        flood: S.flags.floodE ? 'e' : null,
        reinforce: { side: 'e', at: 120, troops: 20000, general: 'xuhuang', types: ['inf', 'spear'], msg: '徐晃率援軍殺到！' },
        parley: { enemyOpen: ['關羽！我樊城上下誓死不降！'] },
      }), [
        ['narr', '樊城陷落！關羽威震華夏，曹操議徙許都以避其鋒。'],
        ['owner', 'xiangyang', 'shu'],
        ['fx', S => S.addRenown(10)],
      ], [
        ['narr', '徐晃擊破圍頭，關羽撤圍而還。'],
      ]],
      ['if', S => S.flags.guardJL, [
        ['narr', '呂蒙見江陵守備森嚴，不敢輕動。荊州安然無恙。'],
        ['fx', S => { S.flag('guanyuAlive'); S.flag('noPartition'); }],
      ], [
        ['stage', 'river', 'wu'],
        ['narr', '此時，東吳呂蒙偽稱病重，陸遜代之。呂蒙伏精兵於船中，使白衣搖櫓，晝夜兼行，盡收江邊屯候。糜芳、傅士仁開城投降。'],
        ['owner', 'jiangling', 'wu'], ['owner', 'yiling', 'wu'], ['owner', 'wuling', 'wu'], ['owner', 'lingling', 'wu'],
        ['fx', S => { if (S.owners.changsha === 'shu') S.setOwner('changsha', 'wu'); S.worldDone.push('baiyi'); S.addRel('shu', 'wu', -60); }],
        ['choice', '關羽腹背受敵，退守麥城。如何突圍？', [
          H('走小路，經臨沮回西川', '可能遭遇伏兵', S => S.flag('smallRoad')),
          T('走大路，與吳軍正面決戰', ''),
        ]],
        ['battle', S => ({
          name: '麥城突圍', sub: '關羽 vs 呂蒙', terrain: 'mountain', time: 'night', weather: 'snow',
          playerLeader: 'guanyu', playerGenerals: ['guanping', 'liaohua'], maxTroops: 7000, playerMorale: 70,
          enemy: { faction: 'wu', leader: 'lvmeng', generals: ['lvmeng', 'panzhang', 'zhuran'], troops: 20000, tactics: ['volley', 'drum'] },
          enemyAmbush: S.flags.smallRoad ? { count: 2, share: 0.45, generals: ['panzhang', 'zhuran'] } : null,
          noPeace: true,
          parley: { enemyOpen: ['關將軍，大勢已去，何不降吳？'], refuse: '玉可碎而不改其白，竹可焚而不毀其節！' },
        }), [
          ['narr', '關羽殺出重圍，西入益州！'],
          ['fx', S => S.flag('guanyuAlive')],
        ], [
          ['narr', '十二月，關羽父子於臨沮被潘璋部將馬忠擒獲，不屈遇害。'],
          ['fx', S => { S.lose('guanyu', '遇害於臨沮'); S.lose('guanping', '遇害'); S.flag('guanyuDead'); }],
        ]],
      ]],
    ],
  },
];

export const SHU_LATE = {
  mumen: {
    title: '木門道', year: 231, requires: S => S.owns('hanzhong'), steps: [
      ['title', '第一章　木門道', '建興九年（西元231年）'],
      ['cam', 'tianshui', 50],
      ['narr', '建興九年，諸葛亮第四次北伐，以木牛運糧，圍祁山，於上邽割麥。司馬懿堅守不戰。六月，因大雨糧運不繼，諸葛亮只得退兵。'],
      ['stage', 'tent', 'shu', [['zhugeliang', 0, 6, P], ['jiangwei', -2.6, 2.5, P * 0.75], ['weiyan', 2.6, 2.5, -P * 0.75]]],
      ['say', 'jiangwei', '司馬懿必遣張郃追擊。木門道兩山夾道，可伏弓弩手於高處。'],
      ['choice', '撤退之計？', [
        H('於木門道兩側埋伏弓弩手', '張郃將追入伏擊圈；習得【伏兵】', S => { S.flag('mumen'); S.learn('ambush'); }),
        T('全軍迅速撤退', '安全撤回漢中'),
      ]],
      ['if', S => S.flags.mumen, [
        ['battle', {
          name: '木門道之戰', sub: '諸葛亮 vs 張郃', terrain: 'mountain', forest: 'sides', allowAmbush: true,
          playerLeader: 'zhugeliang', playerGenerals: ['jiangwei', 'weiyan', 'wangping'], maxTroops: 30000,
          enemy: { faction: 'wei', leader: 'zhanghe', generals: ['zhanghe', 'guohuai'], troops: 30000, tactics: ['charge'], weapons: ['armor'], formation: 'changshe' },
          enemyMarching: true,
          tips: '把弓兵設為伏兵藏在兩側山坡，待張郃追入山谷時萬弩齊發！',
        }, [
          ['narr', '張郃追至木門，蜀軍伏弩齊發，張郃右膝中箭而亡。'],
          ['fx', S => { if (!S.prisoners.includes('zhanghe')) S.kill('zhanghe'); S.gainWeapon('crossbow'); S.worldDone.push('muomen'); }],
        ], [
          ['narr', '魏軍突破伏擊，蜀軍且戰且退。'],
        ]],
      ], [['narr', '蜀軍安然撤回漢中。']]],
    ],
  },
};

// ════════════════════════ 吳 ════════════════════════
export const WU_EARLY = [
  {
    title: '赤壁之戰', year: 208, steps: [
      ['title', '第一章　赤壁之戰', '建安十三年（西元208年）'],
      ['cam', 'chaisang', 45],
      ['narr', '建安十三年，曹操平定荊州，順江東下，致書孫權：「今治水軍八十萬眾，方與將軍會獵於吳。」江東震動。'],
      ['stage', 'palace', 'wu', [['sunquan', 0, 7.5, P], ['張昭', -2.6, 3, P * 0.6], ['lusu', 2.6, 3, -P * 0.6], ['zhouyu', 3.4, 0, -P * 0.6], ['zhugeliang', -3.4, 0, P * 0.6]]],
      ['say', '張昭', '曹公豺虎也，挾天子以征四方，動以朝廷為辭。今日拒之，事更不順。愚謂大計不如迎之。'],
      ['say', 'lusu', '今肅可迎操耳，如將軍，不可也。將軍迎操，欲安所歸？'],
      ['say', 'zhouyu', '操雖託名漢相，其實漢賊也。將軍以神武雄才，兼仗父兄之烈，割據江東，當橫行天下，為漢家除殘去穢。況操自送死，而可迎之邪？'],
      ['choice', '孫權的決斷？', [
        H('拔刀斫案：「敢復有言當迎操者，與此案同！」', '與劉備結盟抗曹', S => { S.addRel('wu', 'shu', 20); S.flag('fight'); }),
        T('遣使與曹操虛與委蛇，暗中備戰', '兵力 +5000，但劉備對你心存疑慮', S => { S.addTroops(5000); S.addRel('wu', 'shu', -10); }),
      ]],
      ['if', S => S.flags.fight, [['act', 'sunquan', 'shake'], ['effect', 'shake']]],
      ['stage', 'tent', 'wu', [['zhouyu', 0, 6, P], ['huanggai', -2.6, 2.5, P * 0.75], ['chengpu', 2.6, 2.5, -P * 0.75], ['ganning', -3.4, 0, P * 0.62]]],
      ['say', 'huanggai', '今寇眾我寡，難與持久。然觀操軍船艦首尾相接，可燒而走也。'],
      ['choice', '如何破曹？', [
        H('黃蓋詐降，以火船焚燒曹營', '習得兵法【火船】；曹軍艦隊以鐵索相連', S => { S.learn('fireship'); S.flag('kurou'); }),
        T('正面水戰，以精銳水軍擊之', '兵力 +6000', S => S.addTroops(6000)),
      ]],
      ['if', S => S.flags.kurou, [['narr', '黃蓋遣人送降書於曹操，約定率船來降。曹操信之。'], ['note', '「苦肉計」（周瑜杖打黃蓋）出自《三國演義》；史書記載黃蓋確實以詐降之計接近曹軍艦隊。']]],
      ['stage', 'river', 'wu'],
      ['narr', '十一月，是夜東南風急……'],
      ['battle', S => ({
        name: '赤壁之戰', sub: '周瑜 vs 曹操', terrain: 'naval', time: 'night', wind: [0, -1],
        playerLeader: 'zhouyu', playerGenerals: ['chengpu', 'huanggai', 'ganning', 'lvmeng', 'handang', 'zhoutai'], maxTroops: 40000,
        chained: S.flags.kurou ? 'e' : null,
        enemy: { faction: 'wei', leader: 'caocao', generals: ['caocao', 'caoren', 'zhangliao', 'xuhuang', 'yujin'], troops: 70000, comp: { inf: 0.45, spear: 0.25, archer: 0.3 }, tactics: ['volley', 'drum'] },
        enemyMorale: 80,
        reinforce: { side: 'p', at: 90, troops: 10000, general: 'liubei', generals: ['zhaoyun'], types: ['inf', 'spear'], msg: '劉備率軍自夏口來援！' },
        parley: { enemyOpen: ['孫權小兒，何不早降？'] },
        tips: S.flags.kurou ? '點選【火船】，火船將順著東南風衝向以鐵索相連的曹軍艦隊，火勢會延燒全軍！' : '曹軍人多，善用弓兵在遠處消耗敵軍。',
      }), [
        ['stage', 'river', 'wu'],
        ['effect', 'fire'],
        ['narr', '「談笑間，檣櫓灰飛煙滅」——曹軍大敗，曹操引殘兵自華容道北逃。'],
        ['fx', S => { S.flag('chibiWin'); S.addGold(2000); S.addRenown(10); }],
      ], [
        ['narr', '吳軍失利，曹操兵臨長江南岸……'],
        ['owner', 'chaisang', 'wei'],
      ]],
    ],
  },
  {
    title: '江陵之戰', year: 209, requires: S => S.flags.chibiWin, steps: [
      ['title', '第二章　江陵之戰', '建安十四年（西元209年）'],
      ['cam', 'jiangling', 45],
      ['narr', '赤壁戰後，周瑜、程普進攻南郡，與曹仁隔江對峙。甘寧先取夷陵，反被曹仁分兵圍困。'],
      ['stage', 'tent', 'wu', [['zhouyu', 0, 6, P], ['lvmeng', -2.6, 2.5, P * 0.75], ['chengpu', 2.6, 2.5, -P * 0.75]]],
      ['say', 'lvmeng', '留凌公績守江陵，蒙與君行，解圍釋急，勢亦不久。'],
      ['choice', '是否救援夷陵的甘寧？', [
        H('親率主力救援甘寧', '先取夷陵', S => S.flag('saveGN')),
        T('不顧甘寧，全力攻打江陵', '江陵守軍較少，但甘寧可能被俘'),
      ]],
      ['if', S => S.flags.saveGN, [['narr', '周瑜大破曹仁圍軍，與甘寧會合。'], ['owner', 'yiling', 'wu']], [['narr', '甘寧率數百人死守夷陵，城破被俘……'], ['fx', S => S.captured('ganning', 'wei')]]],
      ['battle', S => ({
        name: '江陵之戰', sub: '周瑜 vs 曹仁', terrain: 'siege', attacker: 'player', cityName: '江陵', gateHP: 5000,
        playerLeader: 'zhouyu', playerGenerals: ['chengpu', 'lvmeng', 'ganning', 'lingtong'], maxTroops: 40000,
        enemy: { faction: 'wei', leader: 'caoren', generals: ['caoren', 'caohong'], troops: S.flags.saveGN ? 26000 : 20000, tactics: ['rockfall', 'volley', 'shield'] },
        parley: { enemyOpen: ['周瑜小兒，江陵堅如磐石！'] },
      }), [
        ['narr', '周瑜親跨馬擽陣，被流矢射中右脅，瘡甚，便還。曹仁聞瑜臥未起，勒兵就陣。瑜乃自興，案行軍營，激揚吏士，曹仁由是遂退。'],
        ['owner', 'jiangling', 'wu'], ['owner', 'yiling', 'wu'],
        ['fx', S => S.worldDone.push('jiangling')],
      ], [['narr', '江陵久攻不克，兩軍繼續相持。']]],
      ['stage', 'palace', 'wu', [['sunquan', 0, 7.5, P], ['zhouyu', -2.6, 3, P * 0.6], ['lusu', 2.6, 3, -P * 0.6]]],
      ['narr', '建安十五年，劉備親至京口見孫權，求都督荊州。'],
      ['say', 'zhouyu', '劉備以梟雄之姿，而有關羽、張飛熊虎之將，必非久屈為人用者。愚謂大計宜徙備置吳，盛為築宮室，多其美女玩好，以娛其耳目。'],
      ['say', 'lusu', '不如借之，使撫安之。多操之敵，而自為樹黨，計之上也。'],
      ['choice', '是否借荊州給劉備？', [
        H('借荊州予劉備，共拒曹操', '孫劉同盟穩固；江陵易手', S => { S.flag('lend'); S.addRel('wu', 'shu', 25); }),
        T('拒絕，並採周瑜之計西取巴蜀', '改寫歷史：周瑜率軍伐蜀', S => { S.flag('zhouyuWest'); S.addRel('wu', 'shu', -25); }),
      ]],
      ['if', S => S.flags.lend && S.owns('jiangling') && S.alive('shu'), [
        ['owner', 'jiangling', 'shu'],
        ['fx', S => { S.worldDone.push('borrow'); if (S.has('sunshangxiang')) { S.generals = S.generals.filter(g => g !== 'sunshangxiang'); S.gfac.sunshangxiang = 'shu'; } }],
        ['narr', '孫權進妹固好，孫尚香嫁予劉備。'],
      ]],
      ['if', S => S.flags.zhouyuWest, [
        ['battle', {
          name: '西征巴蜀', sub: '周瑜 vs 劉璋', terrain: 'siege', attacker: 'player', cityName: '永安',
          playerLeader: 'zhouyu', playerGenerals: ['ganning', 'lingtong', 'lvmeng'], maxTroops: 30000,
          enemy: { faction: 'liuzhang', leader: 'yanyan', generals: ['yanyan', 'zhangren'], troops: 20000, tactics: ['volley', 'rockfall'] },
        }, [['owner', 'yongan', 'wu'], ['narr', '吳軍攻下永安，打開入蜀門戶！']], [['narr', '巴蜀天險，吳軍無功而返。']]],
      ]],
      ['narr', '建安十五年，周瑜病逝於巴丘，年三十六。臨終前推薦魯肅繼任。'],
      ['fx', S => S.lose('zhouyu', '病逝於巴丘')],
    ],
  },
  {
    title: '逍遙津', year: 215, steps: [
      ['title', '第三章　逍遙津', '建安二十年（西元215年）'],
      ['cam', 'hefei', 45],
      ['if', S => S.flags.lend && S.alive('shu'), [
        ['stage', 'field', 'wu', [['lusu', 0, 2, P], ['guanyu', 0, -2, 0]]],
        ['narr', '魯肅邀關羽相見，「各駐兵馬百步上，但諸將軍單刀俱會」。'],
        ['say', 'lusu', '國家區區本以土地借卿家者，卿家軍敗遠來，無以為資故也。今已得益州，既無奉還之意，但求三郡，又不從命。'],
        ['narr', '最終孫劉以湘水為界，長沙、江夏、桂陽歸吳。'],
      ]],
      ['narr', '曹操西征張魯，合肥空虛。孫權親率十萬大軍圍合肥。守將張遼、李典、樂進僅七千人。'],
      ['stage', 'tent', 'wu', [['sunquan', 0, 6, P], ['lvmeng', -2.6, 2.5, P * 0.75], ['lingtong', 2.6, 2.5, -P * 0.75], ['ganning', -3.4, 0, P * 0.62]]],
      ['say', 'lvmeng', '張遼驍勇，必將出城逆擊。陛下不可不防。'],
      ['choice', '如何攻城？', [
        T('大營嚴陣以待，防張遼突襲', '敵軍出城突擊時，我軍不會陷入混亂', S => S.flag('guardZL')),
        H('全力攻城', '張遼八百死士將突入大營'),
      ]],
      ['battle', S => ({
        name: '合肥之戰', sub: '孫權 vs 張遼', terrain: 'siege', attacker: 'player', cityName: '合肥', gateHP: 4000,
        playerLeader: 'sunquan', playerGenerals: ['lvmeng', 'ganning', 'lingtong', 'chengpu', 'xusheng', 'zhoutai'], maxTroops: 50000,
        playerMorale: S.flags.guardZL ? 100 : 85,
        enemy: { faction: 'wei', leader: 'zhangliao', generals: ['zhangliao', 'lejin'], troops: 9000, tactics: ['rockfall', 'volley', 'charge'] },
        enemyMorale: 115,
        reinforce: { side: 'e', at: 18, troops: 4000, general: null, types: ['cav'], shock: S.flags.guardZL ? 0 : 25, msg: '張遼率八百死士殺出城門，直衝孫權大營！' },
      }), [
        ['narr', '吳軍終於攻克合肥！淮南門戶洞開！'],
        ['owner', 'hefei', 'wu'],
      ], [
        ['narr', '孫權圍合肥十餘日不能下，撤軍時於逍遙津遭張遼追擊。凌統率親兵三百人死戰護主，孫權躍馬過橋方得脫險。'],
        ['fx', S => S.addLoyalty('lingtong', 20)],
      ]],
    ],
  },
  {
    title: '白衣渡江', year: 219, requires: S => S.owners.jiangling === 'shu' && S.isAlive('guanyu'), steps: [
      ['title', '第四章　白衣渡江', '建安二十四年（西元219年）'],
      ['cam', 'jiangling', 45],
      ['narr', '建安二十四年，關羽北攻樊城，水淹七軍，威震華夏。曹操遣使至東吳，許割江南之地，請孫權襲關羽之後。'],
      ['stage', 'tent', 'wu', [['sunquan', 0, 6, P], ['lvmeng', -2.6, 2.5, P * 0.75], ['luxun', 2.6, 2.5, -P * 0.75]]],
      ['say', 'lvmeng', '羽討樊而多留備兵，必恐蒙圖其後故也。蒙常有病，乞分士眾還建業，以治疾為名。羽聞之，必撤備兵，盡赴襄陽。大軍浮江，晝夜馳上，襲其空虛，則南郡可下，而羽可禽也。'],
      ['choice', '是否襲取荊州？', [
        H('採呂蒙之計，白衣渡江', '背盟襲取荊州；與蜀關係大降', S => { S.flag('baiyi'); S.addRel('wu', 'shu', -60); }),
        T('維持孫劉同盟，按兵不動', '與蜀關係 +20', S => { S.addRel('wu', 'shu', 20); S.flag('keepAlliance'); }),
      ]],
      ['if', S => S.flags.baiyi, [
        ['narr', '呂蒙伏精兵於船中，使白衣搖櫓，作商賈人服，晝夜兼行，至關羽所置江邊屯候，盡收縛之。'],
        ['battle', {
          name: '襲取江陵', sub: '呂蒙 vs 糜芳', terrain: 'siege', attacker: 'player', cityName: '江陵', time: 'night',
          playerLeader: 'lvmeng', playerGenerals: ['luxun', 'panzhang', 'zhuran'], maxTroops: 40000,
          enemy: { faction: 'shu', leader: 'mifang', generals: ['mifang'], troops: 12000, tactics: ['volley'] },
          enemyMorale: 40, surrenderBonus: 0.5,
          captiveScript: { mifang: [['fx', S => S.recruit('mifang', 40)]] },
        }, [
          ['owner', 'jiangling', 'wu'], ['owner', 'yiling', 'wu'], ['owner', 'wuling', 'wu'], ['owner', 'lingling', 'wu'],
          ['fx', S => S.worldDone.push('baiyi')],
          ['narr', '關羽聞江陵失守，回師南下，被困於麥城。'],
          ['battle', {
            name: '麥城之戰', sub: '呂蒙 vs 關羽', terrain: 'mountain', time: 'night', weather: 'snow', allowAmbush: true,
            playerLeader: 'lvmeng', playerGenerals: ['panzhang', 'zhuran', 'luxun'], maxTroops: 30000,
            enemy: { faction: 'shu', leader: 'guanyu', generals: ['guanyu', 'guanping', 'liaohua'], troops: 8000, tactics: ['charge'] },
            enemyMorale: 60, enemyMarching: true,
            tips: '在山道兩側埋伏，截斷關羽西歸之路。',
            captiveScript: { guanyu: [], guanping: [] },
          }, [], [['narr', '關羽突圍西去，逃入益州。'], ['fx', S => S.flag('guanyuEscaped')]]],
          ['if', S => !S.flags.guanyuEscaped, [
            ['narr', '十二月，關羽父子於臨沮被潘璋部將馬忠擒獲。'],
            ['stage', 'tent', 'wu', [['sunquan', 0, 6, P], ['guanyu', 0, 1.5, 0]]],
            ['say', 'guanyu', '玉可碎而不改其白，竹可焚而不毀其節。'],
            ['choice', '如何處置關羽？', [
              H('斬之，以絕後患', '劉備必將傾國來報仇', S => { S.kill('guanyu'); S.kill('guanping'); S.flag('killedGY'); }),
              T('以禮送還劉備', '名望 +15；與蜀關係回升，劉備或不會東征', S => { S.addRenown(15); S.addRel('wu', 'shu', 40); S.flag('releasedGY'); }),
            ]],
          ]],
        ], [
          ['narr', '糜芳死守江陵，白衣渡江之計失敗。'],
        ]],
      ], [
        ['narr', '孫權按兵不動，荊州之地依舊屬於劉備。'],
      ]],
    ],
  },
];

export const WU_LATE = {
  yizhou: {
    title: '浮海求夷州', year: 230, steps: [
      ['title', '第一章　浮海求夷州', '黃龍二年（西元230年）'],
      ['cam', 'jianan', 60],
      ['narr', '黃龍二年，孫權遣將軍衛溫、諸葛直率甲士萬人浮海，求夷州及亶州。'],
      ['stage', 'palace', 'wu', [['sunquan', 0, 7.5, P], ['luxun', -2.6, 3, P * 0.6], ['weiwen', 2.6, 3, -P * 0.6]]],
      ['say', 'luxun', '萬里襲取，風波難測，民易水土，必致疾疫。今驅見眾，經涉不毛，欲益更損，欲利反害。'],
      ['choice', '是否出兵夷州？', [
        H('出兵夷州，開拓海外', '遠征夷州（今台灣）', S => S.flag('yizhouGo')),
        T('聽陸遜之諫，罷兵休民', '名望 +10、糧 +20000', S => { S.addRenown(10); S.addFood(20000); }),
      ]],
      ['if', S => S.flags.yizhouGo, [
        ['march', 'jianan', 'yizhou', 'wu'],
        ['battle', {
          name: '夷州之戰', sub: '衛溫 vs 夷州水師', terrain: 'naval', sea: true, island: [0, -330], time: 'dawn',
          playerLeader: 'weiwen', playerGenerals: ['quancong'], maxTroops: 12000,
          enemy: { faction: 'yizhou', leader: 'yizhouwang', generals: ['yizhouwang'], troops: 9000, comp: { inf: 0.6, spear: 0.2, archer: 0.2 }, tactics: ['drum'] },
          tips: '外海決戰：夷州部落駕舟迎擊。水戰中弓兵是主力，擊潰敵船即可登島。',
        }, [
          ['owner', 'yizhou', 'wu'],
          ['narr', '衛溫於夷州得數千人而還。然「軍行經歲，士眾疾疫死者十有八九」。'],
          ['fx', S => S.addTroops(-3000, '疫病 ')],
          ['note', '《三國志·吳主傳》：「遣將軍衛溫、諸葛直將甲士萬人浮海求夷洲及亶洲……但得夷洲數千人還。」這是中國史書對台灣的早期記載之一。'],
        ], [['narr', '吳軍水土不服，無功而返。']]],
      ]],
    ],
  },
};
