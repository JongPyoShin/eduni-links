/* 마주치지 마! World data: same chase/hide/escape game in three environments. */
(function (root, factory) {
  const api = factory(root.SurvivalLogic);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SurvivalWorlds = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (L) {
  "use strict";
  if (!L) throw new Error("SurvivalLogic must load before worlds.js");
  const freeze = values => Object.freeze(values.map(v => Object.freeze(v)));
  const rect = (x,y,w,h) => ({x,y,w,h});
  const enemy = (id,kind,x,y,speed,radius=22) =>
    ({id,kind,x,y,speed,radius,axis:"x",min:x-80,max:x+80,direction:1});
  const shelter = (id,kind,name,x,y,seconds) =>
    ({id,kind,name,x,y,radius:kind==="ice_cave"||kind==="secret_room"?35:33,hideSeconds:seconds});
  const points = [
    [115,110], [1890,110], [115,1410], [1900,1410],
    [590,410], [1185,180], [1150,1435], [520,1450],
    [1930,810], [170,795],
  ];
  const searchLocations = freeze(points.map(([x,y])=>({x,y})));
  const jungle = Object.freeze({
    id:"jungle",name:"정글",icon:"🌴",subtitle:"깊은 숲의 대추격",
    areas:L.WORLD_AREAS,start:L.START,exit:L.EXIT,key:L.KEY,
    obstacles:L.OBSTACLES,enemies:L.ENEMIES,boss:L.JAGUAR,
    shelters:L.SHELTERS,hazards:L.HAZARDS,stars:L.STARS,
    searchLocations:L.SEARCH_LOCATIONS,
    landmarks:freeze([
      {x:175,y:1370,kind:"camp",label:"정글 야영지"},
      {x:540,y:480,kind:"butterflies",label:"나비 숲"},
      {x:1055,y:1355,kind:"flowers",label:"꽃밭 쉼터"},
      {x:1450,y:425,kind:"ruins",label:"고대 유적"},
      {x:1750,y:810,kind:"jungle",label:"신비한 숲길"},
    ]),
    hazardName:"나무 열매",bossName:"재규어",goalName:"정글 탈출문",
  });
  // Each expedition uses a different entrance, maze topology, key route and exit.
  // Arctic: travel west through an ice shelf, then south to the rescue vessel.
  const arctic = Object.freeze({
    id:"arctic",name:"북극",icon:"❄️",subtitle:"오로라 빙하를 건너 구조선을 찾아요",
    areas:freeze([
      {name:"쇄빙선 해안",x:0,y:700,w:600,h:836},
      {name:"설원 탐험기지",x:1250,y:890,w:798,h:646},
      {name:"별빛 빙하",x:0,y:0,w:900,h:700},
      {name:"오로라 협곡",x:900,y:0,w:1148,h:890},
      {name:"얼음 호수",x:600,y:700,w:650,h:836},
    ]),
    start:Object.freeze({x:1810,y:1350}),
    key:Object.freeze({x:330,y:300,radius:19}),
    exit:Object.freeze({x:180,y:870,radius:38}),
    trails:freeze([
      {points:[[1810,1350],[1620,1400],[1210,1360],[1040,1210],[870,940],[550,830],[450,580],[330,300]]},
      {points:[[330,300],[240,460],[180,650],[180,870]]},
      {points:[[1300,1350],[1060,980],[1410,750],[1690,450]]},
    ]),
    obstacles:freeze([
      rect(1500,1120,100,245),rect(1250,1260,175,67),rect(1110,980,75,245),
      rect(780,1090,230,80),rect(620,1300,130,135),rect(360,1030,75,260),
      rect(650,780,250,70),rect(1200,660,100,200),rect(1510,680,250,80),
      rect(1580,365,90,175),rect(1110,280,200,70),rect(770,355,80,250),
      rect(490,170,65,180),rect(230,500,200,85),
    ]),
    enemies:freeze([
      enemy("ice-fox","fox",1530,1050,113,20),
      enemy("snow-wolf","wolf",1020,700,123,22),
      enemy("seal-thief","seal",480,1100,98,22),
    ]),
    boss:Object.freeze({id:"polar-bear",kind:"polar_bear",x:970,y:210,speed:178,radius:26}),
    shelters:freeze([
      shelter("snow-start","snowbank","눈더미",1680,1330,4),
      shelter("igloo-lake","igloo","이글루",1230,1130,5),
      shelter("ice-cave-shelf","ice_cave","빙하 동굴",1370,540,6),
      shelter("snow-lake","snowbank","눈더미",850,1260,4),
      shelter("igloo-coast","igloo","이글루",545,890,5),
      shelter("ice-cave-north","ice_cave","빙하 동굴",595,440,6),
      shelter("snow-key","snowbank","눈더미",205,245,4),
      shelter("igloo-rescue","igloo","이글루",345,900,5),
    ]),
    hazards:freeze([
      {x:1550,y:930,radius:41,phase:0},{x:1080,y:780,radius:41,phase:2.7},
      {x:650,y:625,radius:41,phase:4.4},{x:345,y:650,radius:41,phase:1.2},
    ]),
    stars:freeze([{x:1820,y:1070},{x:1450,y:260},{x:980,y:1340},{x:540,y:670},{x:135,y:435}]),
    searchLocations:freeze([
      {x:110,y:110},{x:1910,y:110},{x:110,y:1410},{x:1930,y:1410},
      {x:570,y:600},{x:990,y:400},{x:1050,y:1460},{x:570,y:1460},
      {x:1840,y:830},{x:150,y:660},
    ]),
    landmarks:freeze([
      {x:1760,y:1210,kind:"station",label:"눈꽃 탐험기지"},
      {x:1420,y:290,kind:"aurora",label:"오로라 봉우리"},
      {x:1010,y:1280,kind:"lake",label:"거울 얼음 호수"},
      {x:395,y:425,kind:"glacier",label:"별빛 빙하"},
      {x:165,y:1085,kind:"station",label:"쇄빙선 구조 항구"},
    ]),
    hazardName:"고드름",bossName:"북극곰",goalName:"쇄빙선 구조 항구",
  });
  // Pyramid: enter at the northeast court, wind through the tomb and escape west.
  const pyramid = Object.freeze({
    id:"pyramid",name:"피라미드",icon:"🏺",subtitle:"유적 미궁에서 황금 문장을 찾아요",
    areas:freeze([
      {name:"왕의 출구",x:0,y:0,w:620,h:560},
      {name:"스핑크스 광장",x:0,y:560,w:800,h:976},
      {name:"왕의 지하 묘실",x:800,y:950,w:720,h:586},
      {name:"파라오의 회랑",x:800,y:0,w:650,h:950},
      {name:"사막 탐험 캠프",x:1450,y:0,w:598,h:950},
      {name:"모래 언덕",x:1520,y:950,w:528,h:586},
    ]),
    start:Object.freeze({x:1790,y:170}),
    key:Object.freeze({x:1010,y:1365,radius:19}),
    exit:Object.freeze({x:220,y:280,radius:38}),
    trails:freeze([
      {points:[[1790,170],[1780,480],[1540,660],[1480,840],[1320,1090],[1010,1365]]},
      {points:[[1010,1365],[700,1320],[520,1010],[755,780],[460,590],[220,280]]},
      {points:[[1580,250],[1330,390],[1080,695],[780,780],[590,980]]},
    ]),
    obstacles:freeze([
      rect(1400,160,85,400),rect(1630,340,270,80),rect(1170,520,420,75),
      rect(1160,760,85,290),rect(1450,930,330,85),rect(1570,1120,80,280),
      rect(1040,1190,210,60),rect(795,980,70,320),rect(500,1130,200,80),
      rect(290,860,95,230),rect(570,630,330,75),rect(900,280,75,350),
      rect(490,180,225,70),rect(210,420,250,80),
    ]),
    enemies:freeze([
      enemy("scarab-swarm","scarab",1530,630,125,19),
      enemy("mummy-guard","mummy",920,860,105,22),
      enemy("anubis-watch","anubis",405,725,120,23),
    ]),
    boss:Object.freeze({id:"pharaoh-spirit",kind:"pharaoh",x:340,y:1180,speed:179,radius:23}),
    shelters:freeze([
      shelter("jar-start","jar","거대 항아리",1765,245,4),
      shelter("sarc-upper","sarcophagus","석관 뒤",1230,255,5),
      shelter("secret-hall","secret_room","비밀 벽 틈",1010,740,6),
      shelter("jar-court","jar","거대 항아리",1440,760,4),
      shelter("sarc-tomb","sarcophagus","석관 뒤",1320,1310,5),
      shelter("secret-key","secret_room","비밀 벽 틈",895,1400,6),
      shelter("jar-west","jar","거대 항아리",510,790,4),
      shelter("sarc-gate","sarcophagus","석관 뒤",335,240,5),
    ]),
    hazards:freeze([
      {x:1665,y:710,radius:41,phase:0},{x:1110,y:1060,radius:41,phase:2.7},
      {x:630,y:930,radius:41,phase:4.4},{x:350,y:580,radius:41,phase:1.2},
    ]),
    stars:freeze([{x:1775,y:1330},{x:1320,y:670},{x:1050,y:1120},{x:680,y:350},{x:140,y:720}]),
    searchLocations:freeze([
      {x:100,y:120},{x:1920,y:125},{x:125,y:1410},{x:1910,y:1410},
      {x:515,y:530},{x:1050,y:175},{x:1080,y:1430},{x:560,y:1420},
      {x:1880,y:850},{x:150,y:900},
    ]),
    landmarks:freeze([
      {x:1800,y:115,kind:"desert_camp",label:"사막 탐험 캠프"},
      {x:1250,y:400,kind:"pyramid",label:"파라오의 미궁"},
      {x:1720,y:1190,kind:"dunes",label:"붉은 모래 언덕"},
      {x:1020,y:1480,kind:"obelisk",label:"왕의 지하 묘실"},
      {x:330,y:690,kind:"sphinx",label:"스핑크스 광장"},
    ]),
    hazardName:"돌 함정",bossName:"파라오의 혼령",goalName:"왕의 출구",
  });
  const WORLDS=Object.freeze({jungle,arctic,pyramid});
  function getWorld(id) { return WORLDS[id] || jungle; }
  function worldIds() { return Object.keys(WORLDS); }
  return Object.freeze({ WORLDS,getWorld,worldIds });
});