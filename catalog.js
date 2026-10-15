import {PATTERNS as BASE,parseRLE} from './engine.js';
export function normalize(cells){const mx=Math.min(...cells.map(c=>c[0])),my=Math.min(...cells.map(c=>c[1]));return [...new Map(cells.map(([x,y])=>[`${x-mx},${y-my}`,[x-mx,y-my]])).values()];}
export function transform(cells,rotation=0,mirror=false){return normalize(cells.map(([x,y])=>{if(mirror)x=-x;for(let n=0;n<rotation;n++)[x,y]=[-y,x];return[x,y];}));}
export function combine(parts){return normalize(parts.flatMap(({cells,x=0,y=0,rotation=0,mirror=false})=>transform(cells,rotation,mirror).map(([a,b])=>[a+x,b+y])));}
const standard=(id,name,category,kind,rle,desc,expected={})=>({id,name,category,kind,en:id.toUpperCase(),cells:parseRLE(rle),desc,question:'다음 세대를 먼저 예상하고 실행해 보세요.',...expected});
const fromBase=(id,category,expected={})=>({...BASE.find(p=>p.id===id),category,...expected});
export const CATALOG=[
  fromBase('block','정지형',{period:1}),
  standard('beehive','벌집','정지형','고정점','b2o$o2bo$b2o!','여섯 칸이 고리처럼 연결된 정지형입니다.',{period:1}),
  standard('loaf','로프','정지형','고정점','b2o$o2bo$bobo$2bo!','일곱 칸의 비대칭 정지형입니다.',{period:1}),
  standard('boat','보트','정지형','고정점','2o$obo$bo!','다섯 칸으로 이루어진 정지형입니다.',{period:1}),
  standard('tub','텁','정지형','고정점','bo$obo$bo!','마름모로 놓인 네 칸이 유지됩니다.',{period:1}),
  standard('ship','십','정지형','고정점','2o$obo$b2o!','이름은 ship이지만 이 패턴은 이동하지 않는 정지형입니다.',{period:1}),
  standard('pond','연못','정지형','고정점','b2o$o2bo$o2bo$b2o!','빈 중심을 둘러싼 여덟 칸이 유지됩니다.',{period:1}),
  fromBase('blinker','진동자',{period:2}),
  standard('toad','두꺼비','진동자','주기 2','b3o$3o!','두 줄의 세 칸이 다른 형태를 거쳐 돌아옵니다.',{period:2}),
  standard('beacon','비콘','진동자','주기 2','2o$2o$2b2o$2b2o!','대각선의 두 블록이 가까워서 두 칸이 번갈아 사라집니다.',{period:2}),
  standard('pulsar','펄서','진동자','주기 3','2b3o3b3o2b$13b$o4bobo4bo$o4bobo4bo$o4bobo4bo$2b3o3b3o2b$13b$2b3o3b3o2b$o4bobo4bo$o4bobo4bo$o4bobo4bo$13b$2b3o3b3o!','대칭적인 배열이 세 세대마다 돌아옵니다.',{period:3}),
  standard('pentadecathlon','펜타데카슬론','진동자','주기 15','2bo4bo$2ob4ob2o$2bo4bo!','중간에 크게 모양이 달라지고 열다섯 세대 뒤 돌아옵니다.',{period:15}),
  standard('clock','시계','진동자','주기 2','2bo$obo$bobo$bo!','여섯 칸이 두 모양 사이를 오갑니다.',{period:2}),
  fromBase('glider','이동형',{period:4,shift:[1,1]}),
  standard('lwss','경량 우주선','이동형','4세대마다 2칸 이동','bo2bo$o$o3bo$4o!','모양을 회복하면서 수평으로 이동합니다.',{period:4,shift:[-2,0]}),
  standard('mwss','중량 우주선','이동형','4세대마다 2칸 이동','3bo$bo3bo$o$o4bo$5o!','경량 우주선보다 큰 수평 이동 패턴입니다.',{period:4,shift:[-2,0]}),
  standard('hwss','대형 우주선','이동형','4세대마다 2칸 이동','3b2o$bo4bo$o$o5bo$6o!','두 칸 폭의 머리를 가진 큰 수평 이동 패턴입니다.',{period:4,shift:[-2,0]}),
  fromBase('gun','생성형'),
  fromBase('rpentomino','과도형'),
  standard('diehard','다이하드','과도형','긴 변화 후 소멸','6bo$2o$bo3b3o!','일곱 칸으로 시작해 한동안 변하다가 사라집니다.'),
  standard('acorn','도토리','과도형','긴 변화','bo$3bo$2o2b3o!','일곱 칸에서 시작합니다. 작은 유한 격자에서는 무한 격자의 최종 결과와 달라집니다.'),
];
const by=id=>CATALOG.find(p=>p.id===id).cells;
const combo=(id,name,parts,desc,expected={})=>({id,name,category:'조합',kind:expected.period?`복합 주기 ${expected.period}`:'배치 실험',cells:combine(parts),desc,...expected});
const gridParts=(id,cols,rows,pitch=7,alternating=false)=>Array.from({length:cols*rows},(_,i)=>({cells:by(id),x:i%cols*pitch,y:Math.floor(i/cols)*pitch,rotation:alternating?i%2:0}));
CATALOG.push(
  combo('block-grid','블록 격자',gridParts('block',5,4,5),'서로 떨어진 블록 20개입니다. 모든 블록이 독립적으로 고정됩니다.',{period:1}),
  combo('blink-grid','블링커 격자',gridParts('blinker',5,4,5),'같은 위상의 블링커 20개가 함께 진동합니다.',{period:2}),
  combo('blink-checker','위상이 다른 블링커',gridParts('blinker',5,4,5,true),'가로와 세로 블링커를 번갈아 놓았습니다. 위상은 다르지만 전체 주기는 2입니다.',{period:2}),
  combo('period-six','주기 2와 3의 조합',[{cells:by('blinker'),x:0,y:5},{cells:by('pulsar'),x:14,y:0}],'간섭이 없는 주기 2와 3의 패턴을 함께 놓으면 전체 주기는 최소공배수 6입니다.',{period:6}),
  combo('period-thirty','주기 2와 15의 조합',[{cells:by('blinker'),x:0,y:10},{cells:by('pentadecathlon'),x:19,y:8}],'서로 간섭하지 않는 두 진동자의 전체 주기는 최소공배수 30입니다.',{period:30}),
  combo('pulsar-pair','펄서 쌍',[{cells:by('pulsar')},{cells:by('pulsar'),x:24}],'두 펄서를 떨어뜨린 합성 패턴입니다.',{period:3}),
  combo('glider-fleet','글라이더 편대',gridParts('glider',4,3,8),'같은 방향의 글라이더 12개가 함께 이동합니다. 경계에 닿기 전의 움직임을 비교하세요.',{period:4,shift:[1,1]}),
  combo('spaceship-fleet','우주선 편대',[{cells:by('lwss'),y:0},{cells:by('mwss'),y:12},{cells:by('hwss'),y:25}],'크기가 다른 우주선이 같은 평균 속도로 이동합니다.',{period:4,shift:[-2,0]}),
  combo('glider-collision','글라이더 마주보기',[{cells:by('glider')},{cells:by('glider'),x:14,y:14,rotation:2}],'반대 방향으로 움직이는 두 글라이더입니다. 충돌 뒤 결과는 시작 위치와 위상에 따라 달라집니다.'),
  combo('four-gliders','네 방향 글라이더',[{cells:by('glider')},{cells:by('glider'),x:20,rotation:1},{cells:by('glider'),x:20,y:20,rotation:2},{cells:by('glider'),y:20,rotation:3}],'중앙을 향하는 네 방향 글라이더를 함께 놓은 충돌 실험입니다.'),
  combo('glider-block','글라이더와 블록',[{cells:by('glider')},{cells:by('block'),x:10,y:10}],'이동형과 정지형을 충돌시킵니다. 한 칸의 위치 변화가 상호작용을 바꿀 수 있습니다.'),
  combo('glider-pond','글라이더와 연못',[{cells:by('glider')},{cells:by('pond'),x:12,y:12}],'다른 정지형을 장애물로 두고 결과를 비교합니다.'),
  combo('double-gun','글라이더 건 두 대',[{cells:by('gun')},{cells:by('gun'),x:47,y:12,rotation:2}],'반대 방향을 향한 두 생성기입니다. 유한 격자와 충돌의 영향을 관찰하세요.'),
  combo('transient-cluster','과도형 네 개',[{cells:by('rpentomino')},{cells:by('rpentomino'),x:18,rotation:1},{cells:by('rpentomino'),y:18,rotation:3},{cells:by('rpentomino'),x:18,y:18,rotation:2}],'R 펜토미노 네 개를 회전해서 놓았습니다. 변화가 서로 만날 때의 결과를 비교합니다.'),
  combo('acorn-pair','도토리 쌍',[{cells:by('acorn')},{cells:by('acorn'),x:22,y:14,mirror:true}],'대칭으로 놓인 과도형의 성장과 충돌을 관찰합니다.'),
);
for(const p of CATALOG){p.en??=p.id.toUpperCase();p.question??='어떤 이웃 관계가 유지되고, 어디에서 새 칸이 태어날까요?';}
export const CATEGORIES=['전체','정지형','진동자','이동형','생성형','과도형','조합'];
