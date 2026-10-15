import {makeBoard,evolve} from './engine.js';

const MASK=['..###...###..','.#####.#####.','#############','#############','#############','.###########.','..#########..','...#######...','....#####....','.....###.....','......#......'];
export const HEART_W=67,HEART_H=57;
export const HEART_CENTERS=MASK.flatMap((row,y)=>Array.from(row,(cell,x)=>cell==='#'?[3+5*x,3+5*y]:null).filter(Boolean));
export function createHeartBoard(){
  const board=makeBoard(HEART_W,HEART_H);
  for(const [x,y] of HEART_CENTERS)for(let dx=-1;dx<=1;dx++)board[y*HEART_W+x+dx]=1;
  return board;
}

// Every frame is a real B3/S23 generation; the separated blinkers never interact.
export function mountHeartEasterEgg(container){
  let board=createHeartBoard(),generation=0,timer=null;
  let wantsPlay=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.innerHTML=`<article class="heart-easter-egg" aria-label="하트 이스터 에그"><svg class="easter-egg-heart" viewBox="0 0 ${HEART_W} ${HEART_H}" role="img" aria-label="블링커 ${HEART_CENTERS.length}개로 만든 빨간 하트"></svg><div class="heart-caption"><h2>하트</h2><p>블링커 ${HEART_CENTERS.length}개 · 주기 2 · <span data-heart-generation>0</span>세대</p></div><div class="heart-controls"><button class="secondary" data-heart-play></button><button class="secondary" data-heart-step>한 세대</button></div></article>`;
  const svg=container.querySelector('.easter-egg-heart');
  const play=container.querySelector('[data-heart-play]');
  const generationLabel=container.querySelector('[data-heart-generation]');
  function render(){
    const cells=[];
    for(let y=0;y<HEART_H;y++)for(let x=0;x<HEART_W;x++)if(board[y*HEART_W+x])cells.push(`<rect x="${x+.06}" y="${y+.06}" width=".88" height=".88"/>`);
    svg.innerHTML=cells.join('');
    svg.dataset.generation=String(generation);
    generationLabel.textContent=String(generation);
    play.textContent=wantsPlay?'일시 정지':'재생';
    play.setAttribute('aria-label',wantsPlay?'하트 일시 정지':'하트 재생');
  }
  function step(){board=evolve(board,HEART_W,HEART_H,false).board;generation++;render();}
  function pause(){if(timer!==null){clearInterval(timer);timer=null;}}
  function resume(){if(wantsPlay&&timer===null&&!document.hidden)timer=setInterval(step,500);}
  play.addEventListener('click',()=>{wantsPlay=!wantsPlay;pause();resume();render();});
  container.querySelector('[data-heart-step]').addEventListener('click',()=>{wantsPlay=false;pause();step();});
  render();
  return {pause,resume,destroy:pause};
}
