export const MAP_IDS = Object.freeze(['river-meadow', 'camp', 'waterfall', 'cave', 'giant-tree', 'sky-ridge']);

let choiceSequence = 0;
const choices = (answer, right, wrong) => {
  const correct={id:answer,text:right}, incorrect={id:`not-${answer}`,text:wrong};
  const parity=choiceSequence++%2;
  return parity ? [incorrect,correct] : [correct,incorrect];
};
const labels = { hut:'학습 오두막', feather:'빛나는 깃털', firePit:'모닥불 관찰', steppingStones:'징검다리', echo:'폭포 물길', lookout:'폭포 전망대', glowTrail:'반딧불 길', echoCrystal:'수정 표면', crystalBridge:'수정 다리', barkPattern:'굵은 고목 줄기', seedTrail:'도토리 흔적', hollowEcho:'고목의 빈 구멍', windRibbon:'바람 리본', cloudShadow:'구름 그림자', windChime:'바람 종' };
const mission = (id, prompt, answerId, correct, wrong, explanation) => ({
  id, title: labels[id] || id, prompt, answerId, explanation, choices: choices(answerId, correct, wrong),
});

export const MAP_CONTENT = Object.freeze({
  'river-meadow': { id: 'river-meadow', title: '숲과 물가', objective: '물소리를 따라 숲을 걸어 보자', animal: { id: 'riverBird', name: '물가새', icon: '🐦', description: '푸른 깃털과 뾰족한 부리로 얕은 물가의 먹이를 살펴봐요.', questions: [
    { id: 'river-beak', prompt: '물가새의 뾰족한 부리는 무엇을 할 때 도움이 될까요?', answerId: 'catch-small-fish', explanation: '뾰족한 부리로 물속의 작은 먹이를 잡아요.', choices: [{id:'catch-small-fish',text:'물속의 작은 먹이를 잡아요'},{id:'sing-louder',text:'더 큰 소리를 내요'},{id:'dig-rock',text:'바위를 파요'},{id:'store-water',text:'물을 저장해요'}] },
    { id: 'river-perch', prompt: '가지에 앉아 물가를 살펴보면 어떤 점이 좋을까요?', answerId: 'spot-small-prey', explanation: '가지 위에서 물가를 살펴보면 물속의 작은 먹이를 발견할 수 있어요.', choices: [{id:'spot-small-prey',text:'물속의 작은 먹이를 발견할 수 있어요'},{id:'hide-from-rain',text:'나무 아래에서 비를 피할 수 있어요'},{id:'dig-tree',text:'나무줄기에 굴을 팔 수 있어요'},{id:'store-water',text:'물을 가지에 저장할 수 있어요'}] },
    { id: 'river-home', prompt: '물가새가 먹이를 찾으며 살기 좋은 곳은 어디일까요?', answerId: 'shallow-bank', explanation: '얕은 물가에는 작은 물고기와 곤충 같은 먹이가 있어요.', choices: [{id:'deep-cave',text:'어둡고 깊은 동굴'},{id:'dry-desert',text:'물이 없는 모래밭'},{id:'shallow-bank',text:'작은 먹이가 사는 얕은 물가'},{id:'busy-road',text:'차가 많이 다니는 곳'}] },
  ] } },
  camp: { id: 'camp', title: '숲속 탐험 캠프', objective: '학습 오두막을 찾아가 보자', animal: { id: 'bluebird', name: '파랑새', icon: '🐦', description: '숲 가장자리 나뭇가지에서 주변을 살펴보는 작은 새예요.', questions: [
    {id:'camp-beak',prompt:'파랑새의 부리로 무엇을 할 수 있을까요?',answerId:'pick-seeds',explanation:'작은 부리로 씨앗과 곤충을 집어요.',choices:choices('pick-seeds','씨앗과 곤충을 집어요','큰 바위를 옮겨요')},
    {id:'camp-nest',prompt:'새가 나뭇가지에 둥지를 만드는 까닭은 무엇일까요?',answerId:'safe-nest',explanation:'나뭇가지 사이 둥지는 알과 새끼를 안전하게 지켜줘요.',choices:choices('safe-nest','알과 새끼를 지켜줘요','물속에서 숨 쉬어요')},
    {id:'camp-food',prompt:'숲의 새가 먹이를 찾기 좋은 곳은 어디일까요?',answerId:'leafy-branches',explanation:'잎과 가지 주변에는 작은 곤충과 씨앗이 있어요.',choices:choices('leafy-branches','잎과 가지가 많은 곳','깊은 물속')},
  ] }, discoveries:[
    mission('hut','학습 오두막의 지붕은 어떤 모양인가요?','pointed-roof','뾰족한 지붕이에요','둥근 유리 지붕이에요','뾰족한 지붕이 비를 흘려보내요.'),
    mission('feather','숲길에서 찾은 깃털은 어디에 떨어져 있나요?','trail-edge','오솔길 가장자리에 있어요','물 한가운데 떠 있어요','깃털은 바람을 타고 길 가장자리까지 날아왔어요.'),
    mission('firePit','모닥불 주변의 돌은 무엇을 둘러싸고 있나요?','fire-ring','불을 둥글게 둘러싸요','나무 꼭대기를 둘러싸요','돌 고리는 불씨가 밖으로 튀는 것을 줄여줘요.'),
  ], animalAt:{x:22,z:13}, waterEdge:-15, hills:[{x:18,z:12,height:1.5}], props:'camp' },
  waterfall: { id:'waterfall', title:'안개 폭포 탐험', objective:'물소리를 따라 계곡으로 가 보자', animal:{id:'kingfisher',name:'물총새',icon:'🐦',description:'물가 나뭇가지에서 작은 물고기를 살펴봐요.',questions:[
    {id:'fall-beak',prompt:'물총새의 긴 부리는 무엇에 알맞을까요?',answerId:'catch-fish',explanation:'긴 부리로 물속의 작은 물고기를 재빨리 잡아요.',choices:choices('catch-fish','물고기를 잡아요','나무를 갉아요')},
    {id:'fall-feather',prompt:'물총새가 물에 뛰어들기 전에 하는 행동은 무엇일까요?',answerId:'watch-water',explanation:'물 위를 살피며 먹이가 있는 곳을 찾아요.',choices:choices('watch-water','물 위를 살펴봐요','모래 속에 씨앗을 묻어요')},
    {id:'fall-home',prompt:'물총새가 먹이를 찾기 좋은 곳은 어디일까요?',answerId:'clear-stream',explanation:'작은 물고기를 볼 수 있는 맑은 물가예요.',choices:choices('clear-stream','맑은 개울가','마른 바위 언덕')},
  ]}, discoveries:[
    mission('steppingStones','징검돌은 어떤 모양으로 놓였나요?','in-a-row','물길을 따라 줄지어 있어요','둥글게 모닥불을 둘러싸요','돌들이 물길을 건널 수 있도록 줄지어 놓였어요.'),
    mission('echo','폭포 아래 웅덩이에서 물은 어디로 흘러가나요?','falling-water','바위 아래 계곡으로 흘러가요','산 위쪽으로 거슬러 올라가요','높은 곳에서 내려온 물이 바위 아래 웅덩이로 모여요.'),
    mission('lookout','전망대에서 폭포를 보면 어떤 모습인가요?','waterfall-basin','물이 바위 아래로 흘러요','모래가 하늘로 날아요','높은 곳에서 물길과 웅덩이를 함께 볼 수 있어요.'),
  ], animalAt:{x:22,z:13}, waterEdge:-9, hills:[{x:14,z:2,height:1.7},{x:21,z:12,height:1.3}], props:'waterfall' },
  cave: { id:'cave', title:'반딧불 동굴 탐험', objective:'반딧불 길을 따라 동굴 안으로 가 보자', animal:{id:'littleBat',name:'작은 박쥐',icon:'🦇',description:'작은 박쥐는 어두운 동굴에서 날개를 펴고 작은 곤충을 찾아요.',questions:[
    {id:'cave-ear',prompt:'박쥐의 날개에서 잘 보이는 부분은 무엇일까요?',answerId:'wing-membrane',explanation:'박쥐의 날개는 길게 뻗은 손가락 사이의 얇은 막으로 이루어져 있어요.',choices:choices('wing-membrane','손가락 사이의 얇은 막','깃털로 덮인 판')},
    {id:'cave-wings',prompt:'박쥐의 날개는 어디에서 움직이기 좋을까요?',answerId:'open-cave',explanation:'날개를 펼칠 수 있는 동굴 공간을 날아다녀요.',choices:choices('open-cave','넓은 동굴 안','나무껍질 속')},
    {id:'cave-rest',prompt:'박쥐가 쉬는 곳은 어디일까요?',answerId:'cave-ceiling',explanation:'박쥐는 동굴 천장에 매달려 쉬어요.',choices:choices('cave-ceiling','동굴 천장','강바닥')},
  ]}, discoveries:[
    mission('glowTrail','반딧불 길의 작은 빛은 어떤 색인가요?','green-glow','초록빛이에요','주황빛이에요','초록빛 점들이 동굴 안쪽 길을 밝혀요.'),
    mission('echoCrystal','울림 수정 표면에는 어떤 무늬가 보이나요?','crystal-facets','반짝이는 면이 여러 갈래로 보여요','깃털 무늬가 촘촘히 보여요','빛을 받은 수정의 여러 면을 살펴봐요.'),
    mission('crystalBridge','수정 다리는 무엇으로 만들어졌나요?','stone-crystal','바위와 빛나는 수정이에요','나뭇잎과 깃털이에요','반짝이는 수정이 바위 사이를 이어줘요.'),
  ], animalAt:{x:22,z:13}, waterEdge:null, hills:[{x:-3,z:0,height:.4}], props:'cave' },
  'giant-tree': { id:'giant-tree', title:'거대한 고목 탐험', objective:'커다란 뿌리 사이 입구를 찾아보자', animal:{id:'squirrel',name:'다람쥐',icon:'🐿️',description:'다람쥐는 나무껍질 사이와 가지 위를 오가며 도토리를 찾아요.',questions:[
    {id:'tree-tail',prompt:'다람쥐의 꼬리는 어떻게 도움이 될까요?',answerId:'balance-branch',explanation:'풍성한 꼬리가 가지를 오를 때 균형을 잡아줘요.',choices:choices('balance-branch','가지에서 균형을 잡아요','물속에서 헤엄쳐요')},
    {id:'tree-food',prompt:'다람쥐가 나무 아래에서 찾는 먹이는 무엇일까요?',answerId:'acorn',explanation:'도토리와 씨앗을 모아 먹거나 숨겨요.',choices:choices('acorn','도토리와 씨앗','작은 물고기')},
    {id:'tree-home',prompt:'다람쥐가 안전하게 쉬기 좋은 곳은 어디일까요?',answerId:'tree-hollow',explanation:'나무 구멍은 비와 포식자를 피하기 좋아요.',choices:choices('tree-hollow','나무의 빈 구멍','개울 한가운데')},
  ]}, discoveries:[
    mission('barkPattern','고목 줄기는 어떤 모습인가요?','thick-trunk','굵고 길게 뻗어 있어요','가늘고 바닥에 누워 있어요','굵은 줄기가 위로 길게 뻗어 있어요.'),
    mission('seedTrail','도토리 흔적은 어디를 따라 이어지나요?','tree-roots','굵은 뿌리 사이로 이어져요','물속으로 이어져요','땅에 떨어진 도토리가 뿌리 사이 길을 보여줘요.'),
    mission('hollowEcho','고목의 빈 구멍 안쪽은 어떻게 보이나요?','dark-hollow','둥글고 어두운 빈 공간이에요','밝은 꽃잎으로 가득해요','나무 속 빈 공간의 모양을 살펴봤어요.'),
  ], animalAt:{x:22,z:13}, waterEdge:null, hills:[{x:0,z:0,height:1.0}], props:'giant-tree' },
  'sky-ridge': { id:'sky-ridge', title:'하늘 능선 탐험', objective:'구름 가까운 능선 입구를 찾아보자', animal:{id:'hawk',name:'하늘매',icon:'🦅',description:'하늘매는 넓은 날개를 펴고 산등성이 위를 날아요.',questions:[
    {id:'sky-wing',prompt:'하늘매가 높은 곳에서 잘 날 수 있는 까닭은 무엇일까요?',answerId:'wide-wings',explanation:'넓은 날개로 바람을 타고 오래 날아요.',choices:choices('wide-wings','넓은 날개로 바람을 타요','작은 지느러미가 있어요')},
    {id:'sky-view',prompt:'하늘매가 높은 바위에서 살피는 것은 무엇일까요?',answerId:'ground-prey',explanation:'높은 곳에서 땅과 주변의 먹이를 살펴봐요.',choices:choices('ground-prey','아래쪽 주변과 먹이','동굴 속 수정')},
    {id:'sky-wind',prompt:'능선에서 바람이 강할 때 매는 무엇을 할까요?',answerId:'glide',explanation:'날개를 펴고 바람을 이용해 미끄러지듯 날아요.',choices:choices('glide','날개를 펴고 활공해요','땅속으로 숨어요')},
  ]}, discoveries:[
    mission('windRibbon','바람 리본은 어느 쪽으로 흔들리나요?','wind-direction','바람이 부는 쪽으로 흔들려요','땅속으로 흔들려요','리본 끝은 바람이 가는 방향을 보여줘요.'),
    mission('cloudShadow','구름 그림자는 어디에 보이나요?','ridge-ground','능선 바닥 위에 보여요','동굴 천장 안에서만 보여요','구름 아래 능선 바닥에 어두운 그림자가 드리워져 있어요.'),
    mission('windChime','바람 종 아래에 달린 작은 추는 어디 있나요?','chime-bottom','종 아래에 매달려 있어요','능선 바닥에 묻혀 있어요','바람이 불면 아래에 달린 추가 움직여요.'),
  ], animalAt:{x:22,z:13}, waterEdge:null, hills:[{x:2,z:2,height:1.5},{x:20,z:10,height:1.8}], props:'sky-ridge' },
});
