// All generations are computed synchronously from the unchanged previous board.
export const W = 96, H = 60;
export const makeBoard = (w=W,h=H) => new Uint8Array(w*h);
export function countNeighbors(board,x,y,w=W,h=H,wrap=false) {
  let count=0;
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) {
    if(dx===0&&dy===0) continue;
    let xx=x+dx,yy=y+dy;
    if(wrap) { xx=(xx+w)%w; yy=(yy+h)%h; }
    if(xx>=0&&xx<w&&yy>=0&&yy<h) count+=board[yy*w+xx];
  }
  return count;
}
export function nextCell(alive,neighbors) { return Number(neighbors===3||(alive===1&&neighbors===2)); }
export function evolve(board,w=W,h=H,wrap=false) {
  const next=makeBoard(w,h); let born=0,died=0,population=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const i=y*w+x;
    next[i]=nextCell(board[i],countNeighbors(board,x,y,w,h,wrap));
    population+=next[i]; if(next[i]&&!board[i])born++; if(board[i]&&!next[i])died++;
  }
  return {board:next,born,died,population};
}
export function parseRLE(rle) {
  let x=0,y=0,n='',cells=[];
  for(const c of rle.replace(/^#.*$/gm,'').replace(/^x\s*=.*$/gm,'')) {
    if(/[0-9]/.test(c)) {n+=c;continue;}
    if(!'bo$!'.includes(c))continue;
    const k=Number(n)||1;n='';
    if(c==='b')x+=k;
    if(c==='o'){for(let j=0;j<k;j++)cells.push([x+j,y]);x+=k;}
    if(c==='$'){y+=k;x=0;} if(c==='!')break;
  }
  return cells;
}
export const PATTERNS = [
  {id:'glider',name:'글라이더',en:'GLIDER',kind:'이동',desc:'4세대 뒤 같은 모양이 대각선으로 한 칸 이동합니다. 칸은 이동하지 않고, 모양이 이동합니다.',rle:'bob$2bo$3o!',question:'이동 명령이 없는데, 왜 움직일까요?'},
  {id:'block',name:'블록',en:'BLOCK',kind:'정지',desc:'2 × 2 정사각형의 각 살아 있는 칸에는 이웃이 3개입니다. 다음 세대에도 같은 상태를 유지합니다.',rle:'2o$2o!',question:'주변의 빈 칸에서는 왜 새로 태어나지 않을까요?'},
  {id:'blinker',name:'블링커',en:'BLINKER',kind:'주기 2',desc:'가로 세 칸과 세로 세 칸이 번갈아 나타납니다. 두 번 갱신하면 원래 상태로 돌아옵니다.',rle:'3o!',question:'가운데 칸은 살아남고, 양끝 칸은 왜 죽을까요?'},
  {id:'rpentomino',name:'R 펜토미노',en:'R-PENTOMINO',kind:'복잡한 변화',desc:'5개의 칸에서 시작해 복잡하게 변합니다. 유한 격자에서는 가장자리에 도달한 이후 원래 무한 격자와 결과가 달라질 수 있습니다.',rle:'b2o$2o$bo!',question:'글라이더와 같은 다섯 칸인데, 결과는 같을까요?'},
  {id:'gun',name:'글라이더 건',en:'GOSPER GLIDER GUN',kind:'생성',desc:'30세대마다 글라이더를 만들어 냅니다. 무한 격자에서는 계속 퍼지지만, 이 화면의 유한 격자에서는 경계의 영향을 받습니다.',rle:'24bo$22bobo$12b2o6b2o12b2o$11bo3bo4b2o12b2o$2o8bo5bo3b2o$2o8bo3bob2o4bobo$10bo5bo7bo$11bo3bo$12b2o!',question:'유한한 시작 상태가 끝없이 새로운 패턴을 만들 수 있을까요?'}
].map(p=>({...p,cells:parseRLE(p.rle)}));
export function placeCells(cells,w=W,h=H) {
  const b=makeBoard(w,h); if(!cells.length)return b;
  const maxX=Math.max(...cells.map(c=>c[0])),maxY=Math.max(...cells.map(c=>c[1]));
  const ox=Math.floor((w-maxX-1)/2),oy=Math.floor((h-maxY-1)/2);
  for(const [x,y] of cells)if(x+ox>=0&&x+ox<w&&y+oy>=0&&y+oy<h)b[(y+oy)*w+x+ox]=1;
  return b;
}
export const population = board => board.reduce((a,b)=>a+b,0);
export const stateKey = board => Array.from(board).join('');
