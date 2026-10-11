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
  const arctic = Object.freeze({
    id:"arctic",name:"북극",icon:"❄️",subtitle:"빙하 대탈출",
    areas:freeze([
      {name:"극지 탐험기지",x:0,y:1000,w:720,h:536},
      {name:"눈보라 평원",x:0,y:0,w:1050,h:1000},
      {name:"얼음 호수",x:720,y:950,w:1328,h:586},
      {name:"오로라 빙하",x:1050,y:0,w:998,h:950},
    ]),
    start:Object.freeze({x:126,y:1315}),
    exit:Object.freeze({x:1880,y:140,radius:38}),
    key:Object.freeze({x:1685,y:945,radius:19}),
    obstacles:freeze([
      rect(260,1080,155,70),rect(510,1220,80,172),rect(370,770,160,76),
      rect(710,670,80,205),rect(944,1090,213,77),rect(1080,400,72,180),
      rect(1235,790,170,72),rect(1455,1120,96,225),rect(1700,535,205,70),
      rect(1740,242,68,165),rect(310,315,200,79),rect(642,181,82,165),
      rect(1360,315,166,77),rect(830,1335,145,96),
    ]),
    enemies:freeze([
      enemy("ice-fox","fox",320,1000,113,20),
      enemy("snow-wolf","wolf",960,855,123,22),
      enemy("seal-thief","seal",1550,490,98,22),
    ]),
    boss:Object.freeze({id:"polar-bear",kind:"polar_bear",x:1800,y:462,speed:178,radius:26}),
    shelters:freeze([
      shelter("snow-start","snowbank","눈더미",184,1215,4),
      shelter("igloo-west","igloo","이글루",604,1037,5),
      shelter("ice-cave-west","ice_cave","빙하 동굴",575,580,6),
      shelter("snow-middle","snowbank","눈더미",985,945,4),
      shelter("igloo-lake","igloo","이글루",1265,1230,5),
      shelter("ice-cave-east","ice_cave","빙하 동굴",1462,600,6),
      shelter("snow-key","snowbank","눈더미",1830,1060,4),
      shelter("igloo-gate","igloo","이글루",1605,155,5),
    ]),
    hazards:freeze([
      {x:432,y:700,radius:41,phase:0},{x:890,y:979,radius:41,phase:2.7},
      {x:1405,y:980,radius:41,phase:4.4},{x:1820,y:677,radius:41,phase:1.2},
    ]),
    stars:freeze([{x:230,y:850},{x:748,y:420},{x:1175,y:1290},{x:1560,y:195},{x:1940,y:855}]),
    searchLocations,
    landmarks:freeze([
      {x:190,y:1370,kind:"station",label:"극지 탐험기지"},
      {x:540,y:440,kind:"blizzard",label:"눈보라 평원"},
      {x:1100,y:1320,kind:"lake",label:"얼음 호수"},
      {x:1490,y:425,kind:"aurora",label:"오로라 협곡"},
      {x:1750,y:775,kind:"glacier",label:"빙하 절벽"},
    ]),
    hazardName:"고드름",bossName:"북극곰",goalName:"쇄빙선 선착장",
  });
  const pyramid = Object.freeze({
    id:"pyramid",name:"피라미드",icon:"🏺",subtitle:"사막 유적의 저주",
    areas:freeze([
      {name:"사막 탐험 캠프",x:0,y:1000,w:750,h:536},
      {name:"모래언덕 길",x:0,y:0,w:1060,h:1000},
      {name:"스핑크스 광장",x:750,y:950,w:1298,h:586},
      {name:"파라오의 유적",x:1060,y:0,w:988,h:950},
    ]),
    start:Object.freeze({x:130,y:1330}),
    exit:Object.freeze({x:1905,y:150,radius:38}),
    key:Object.freeze({x:1670,y:935,radius:19}),
    obstacles:freeze([
      rect(264,1162,180,50),rect(550,1280,71,175),rect(395,850,172,74),
      rect(660,680,91,195),rect(925,1090,207,75),rect(1025,393,90,180),
      rect(1275,798,178,80),rect(1450,1140,95,205),rect(1715,545,193,78),
      rect(1750,220,75,172),rect(327,295,178,75),rect(638,177,78,186),
      rect(1330,316,200,73),rect(804,1350,132,90),
    ]),
    enemies:freeze([
      enemy("scarab-swarm","scarab",333,1030,125,19),
      enemy("mummy-guard","mummy",960,805,105,22),
      enemy("anubis-watch","anubis",1525,485,120,23),
    ]),
    boss:Object.freeze({id:"pharaoh-spirit",kind:"pharaoh",x:1800,y:455,speed:179,radius:23}),
    shelters:freeze([
      shelter("jar-start","jar","거대 항아리",190,1220,4),
      shelter("sarc-west","sarcophagus","석관 뒤",615,1050,5),
      shelter("secret-west","secret_room","비밀 벽 틈",565,580,6),
      shelter("jar-center","jar","거대 항아리",1000,935,4),
      shelter("sarc-square","sarcophagus","석관 뒤",1265,1240,5),
      shelter("secret-ruin","secret_room","비밀 벽 틈",1440,600,6),
      shelter("jar-key","jar","거대 항아리",1815,1070,4),
      shelter("sarc-gate","sarcophagus","석관 뒤",1635,155,5),
    ]),
    hazards:freeze([
      {x:455,y:705,radius:41,phase:0},{x:885,y:980,radius:41,phase:2.7},
      {x:1380,y:1000,radius:41,phase:4.4},{x:1790,y:677,radius:41,phase:1.2},
    ]),
    stars:freeze([{x:235,y:800},{x:755,y:435},{x:1180,y:1310},{x:1600,y:205},{x:1925,y:840}]),
    searchLocations,
    landmarks:freeze([
      {x:170,y:1380,kind:"desert_camp",label:"사막 캠프"},
      {x:540,y:430,kind:"dunes",label:"모래언덕 길"},
      {x:1055,y:1325,kind:"sphinx",label:"스핑크스 광장"},
      {x:1440,y:430,kind:"pyramid",label:"피라미드 유적"},
      {x:1770,y:805,kind:"obelisk",label:"왕의 회랑"},
    ]),
    hazardName:"돌 함정",bossName:"파라오의 혼령",goalName:"왕의 방 출구",
  });
  const WORLDS=Object.freeze({jungle,arctic,pyramid});
  function getWorld(id) { return WORLDS[id] || jungle; }
  function worldIds() { return Object.keys(WORLDS); }
  return Object.freeze({ WORLDS,getWorld,worldIds });
});