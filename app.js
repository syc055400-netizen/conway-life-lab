import {initLogic,pauseLogic,renderLogic} from './logic.js';
import { W,H,makeBoard,countNeighbors,nextCell,evolve,placeCells,population,stateKey } from './engine.js';
import {CATALOG as PATTERNS,CATEGORIES,transform} from './catalog.js';
import {mountHeartEasterEgg} from './heart.js';
const $=id=>document.getElementById(id);
const $$=s=>Array.from(document.querySelectorAll(s));
let view='lab',heartAnimation=null;
let catalogCategory='전체',stampPattern=PATTERNS.find(p=>p.id==='glider'),stampRotation=0,stampMirror=false;
function updateRuleAnalysis(){let lonely=0,survivors=0,crowded=0,births=0;for(let y=0;y<H;y++)for(let x=0;x<W;x++){const n=countNeighbors(board,x,y,W,H,wrap);if(board[y*W+x]){if(n<2)lonely++;else if(n<=3)survivors++;else crowded++;}else if(n===3)births++;}$('rule-analysis').innerHTML=`<table><tr><th>현재 칸과 조건</th><th>개수</th><th>다음 상태</th></tr><tr><td>살아 있음 · 이웃 0 또는 1</td><td>${lonely}</td><td>죽음</td></tr><tr><td>살아 있음 · 이웃 2 또는 3</td><td>${survivors}</td><td>생존</td></tr><tr><td>살아 있음 · 이웃 4 이상</td><td>${crowded}</td><td>죽음</td></tr><tr><td>죽어 있음 · 이웃 3</td><td>${births}</td><td>탄생</td></tr></table><p>다음 세대의 살아 있는 칸 = 생존 ${survivors} + 탄생 ${births} = <b>${survivors+births}</b></p>`;}
function renderCatalog(){
  heartAnimation?.destroy();heartAnimation=null;
  const q=$('catalog-search').value.trim().toLowerCase(),isHeart=q==='하트';
  $('catalog-filters').innerHTML=CATEGORIES.map(c=>`<button data-category="${c}" class="${c===catalogCategory?'active':''}" aria-pressed="${c===catalogCategory}">${c}</button>`).join('');
  document.querySelector('#view-catalog .model-note').hidden=isHeart;
  if(isHeart){$('catalog-count').textContent='이스터 에그를 찾았어요.';heartAnimation=mountHeartEasterEgg($('catalog-cards'));if(view==='catalog')heartAnimation.resume();return;}
  const list=PATTERNS.filter(p=>(catalogCategory==='전체'||p.category===catalogCategory)&&`${p.name} ${p.desc} ${p.id}`.toLowerCase().includes(q));
  $('catalog-count').textContent=`${list.length}개 패턴 · 총 ${PATTERNS.length}개`;
  $('catalog-cards').innerHTML=list.map(p=>`<article class="catalog-card"><div class="catalog-image">${iconSVG(p.cells)}</div><div class="catalog-card-copy"><small>${p.category} / ${p.kind}</small><h3>${p.name}</h3><p>${p.desc}</p><div><button class="primary" data-load="${p.id}">불러오기</button><button class="secondary" data-stamp="${p.id}">추가 배치 ＋</button></div></div></article>`).join('');
}
function prepareStamp(p){stampPattern=p;stampRotation=0;stampMirror=false;$('stamp-name').textContent=p.name;setView('lab');setMode('stamp');}
function stampAt(p){const cells=transform(stampPattern.cells,stampRotation,stampMirror),maxX=Math.max(...cells.map(c=>c[0])),maxY=Math.max(...cells.map(c=>c[1])),ox=p.x-Math.floor(maxX/2),oy=p.y-Math.floor(maxY/2);if(ox<0||oy<0||ox+maxX>=W||oy+maxY>=H){setNotice('패턴이 전체 격자 밖으로 나갑니다. 중앙에 더 가깝게 배치해 주세요.');return;}const b=board.slice();cells.forEach(([x,y])=>b[(oy+y)*W+ox+x]=1);newRun(b,`${stampPattern.name} 패턴을 추가했습니다. 지금 배치가 새로운 0세대입니다.`);customPattern('직접 구성한 조합');}
$('catalog-search').addEventListener('input',renderCatalog);
$('catalog-filters').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){catalogCategory=b.dataset.category;if($('catalog-search').value.trim()==='하트')$('catalog-search').value='';renderCatalog();}});
$('catalog-cards').addEventListener('click',e=>{const b=e.target.closest('[data-load],[data-stamp]');if(!b)return;const p=PATTERNS.find(p=>p.id===(b.dataset.load||b.dataset.stamp));if(b.dataset.load){selectPattern(p);setView('lab');setMode('draw');}else prepareStamp(p);});
$('stamp-mode').addEventListener('click',()=>{setMode('stamp');$('stamp-name').textContent=stampPattern.name;});
$('stamp-rotate').addEventListener('click',()=>{stampRotation=(stampRotation+1)%4;$('stamp-name').textContent=`${stampPattern.name} · ${stampRotation*90}°${stampMirror?' · 반사':''}`;});
$('stamp-mirror').addEventListener('click',()=>{stampMirror=!stampMirror;$('stamp-name').textContent=`${stampPattern.name} · ${stampRotation*90}°${stampMirror?' · 반사':''}`;});
// Main simulator, with a finite board and an explicit boundary convention.
let selectedPattern=PATTERNS.find(p=>p.id==='blinker');
let board=placeCells(selectedPattern.cells),initialBoard=board.slice(),previous=null;
let gen=0,born=0,died=0,popHistory=[population(board)],history=[];
let timer=null,mode='draw',wrap=false,zoom=4,inspection=null,seen=new Map([[stateKey(board),0]]),repeatInfo=null;
const canvas=$('life-board'),ctx=canvas.getContext('2d');
function drawBoard(context,b,w,h,options={}){
  const z=options.zoom||1,vw=w/z,vh=h/z,ox=Math.floor((w-vw)/2),oy=Math.floor((h-vh)/2);
  const width=context.canvas.width,height=context.canvas.height,cw=width/vw,ch=height/vh;
  context.clearRect(0,0,width,height);context.fillStyle='#ffffff';context.fillRect(0,0,width,height);
  for(let y=0;y<vh;y++)for(let x=0;x<vw;x++){
    const i=(y+oy)*w+x+ox;
    if(b[i]){context.fillStyle=options.previous&&!options.previous[i]?'#597d99':'#252525';context.fillRect(x*cw+1,y*ch+1,cw-2,ch-2);}
    else if(options.previous?.[i]){context.fillStyle='#e6e6e6';context.fillRect(x*cw+1,y*ch+1,cw-2,ch-2);}
  }
  context.strokeStyle='#eeeeee';context.lineWidth=1;
  context.beginPath();for(let x=0;x<=vw;x++){context.moveTo(x*cw+.5,0);context.lineTo(x*cw+.5,height);}for(let y=0;y<=vh;y++){context.moveTo(0,y*ch+.5);context.lineTo(width,y*ch+.5);}context.stroke();
  if(options.inspection){
    const {x,y}=options.inspection;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      let xx=x+dx,yy=y+dy;
      if(options.wrap){xx=(xx+w)%w;yy=(yy+h)%h;}
      if(xx<0||xx>=w||yy<0||yy>=h)continue;
      const vx=xx-ox,vy=yy-oy;if(vx<0||vx>=vw||vy<0||vy>=vh)continue;
      context.fillStyle=dx===0&&dy===0?'#d6e7f2bb':'#d6e7f255';context.fillRect(vx*cw+1,vy*ch+1,cw-2,ch-2);
      context.strokeStyle=dx===0&&dy===0?'#336d94':'#7ba0bb';context.lineWidth=dx===0&&dy===0?3:2;context.strokeRect(vx*cw+1,vy*ch+1,cw-2,ch-2);
      context.fillStyle='#202020';context.font=`600 ${Math.max(10,cw*.6)}px monospace`;context.textAlign='center';context.textBaseline='middle';context.fillText(String(b[yy*w+xx]),vx*cw+cw/2,vy*ch+ch/2);
    }
  }
}
function updateChart(){
  const data=popHistory.slice(-180),max=Math.max(5,...data),points=data.map((v,i)=>`${30+i*760/Math.max(1,data.length-1)},${73-v/max*58}`);
  const path=data.length===1?`30,${73-data[0]/max*58} 790,${73-data[0]/max*58}`:points.join(' ');
  $('population-chart').innerHTML=`<line x1="30" y1="73" x2="795" y2="73" stroke="#dddddd"/><text x="0" y="18" font-size="10" fill="#333333" font-family="monospace">${max}</text><text x="8" y="77" font-size="10" fill="#333333" font-family="monospace">0</text><polyline points="${path}" fill="none" stroke="#222222" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
}
function updateInspector(){
  $('inspect-details').hidden=!inspection;
  if(!inspection)return;
  const {x,y}=inspection,a=board[y*W+x],n=countNeighbors(board,x,y,W,H,wrap),next=nextCell(a,n);
  const reason=next?(a?'생존 조건을 만족합니다.':'이웃 3개 → 새로 태어납니다.'):(a?(n<2?'이웃이 2개 미만 → 죽습니다.':'이웃이 4개 이상 → 죽습니다.'):'이웃이 3개가 아님 → 그대로 0입니다.');
  $('inspect-details').innerHTML=`<p>${y+1}행 ${x+1}열 · 현재 ${a}</p><p>살아 있는 이웃 <strong>${n}</strong>개</p><p><b>다음 상태: ${next}</b><br>${reason}</p>`;
}
function renderSim(){drawBoard(ctx,board,W,H,{previous,inspection,wrap,zoom});$('generation').textContent=gen.toLocaleString();$('population').textContent=population(board).toLocaleString();$('born').textContent=born;$('died').textContent=died;$('undo').disabled=history.length===0;$('zoom').value=String(zoom);$('boundary-label').textContent=`· ${wrap?'양끝 연결':'바깥은 0'}${zoom>1?` · 중앙 ${zoom}배 확대`:''}`;updateChart();updateInspector();updateRuleAnalysis();}
function pause(){if(timer){clearInterval(timer);timer=null;}$('play').innerHTML='▶ <span>시작</span>';$('play').setAttribute('aria-label','자동 재생');$('run-state').textContent='일시 정지';$('run-state').classList.remove('running');}
function setNotice(s){$('sim-notice').textContent=s;}
function step(){
  history.push({board:board.slice(),gen,born,died,previous:previous?.slice(),popHistory:popHistory.slice(),repeatInfo});if(history.length>200)history.shift();
  previous=board.slice();const result=evolve(board,W,H,wrap);board=result.board;born=result.born;died=result.died;gen++;
  popHistory.push(result.population);if(popHistory.length>180)popHistory.shift();
  const key=stateKey(board),prior=seen.get(key);
  if(prior!==undefined){repeatInfo={start:prior,period:gen-prior};setNotice(result.population===0?'모든 칸이 사라졌습니다. 빈 상태가 계속 유지됩니다.':`같은 상태 발견: ${prior}세대와 ${gen}세대가 같습니다. 반복 간격 ${gen-prior}세대.`);seen.set(key,gen);}
  else{if(seen.size>=2000)seen.delete(seen.keys().next().value);seen.set(key,gen);if(gen%10===0)setNotice('모든 칸을 동시에 갱신합니다.');}
  renderSim();
}
function togglePlay(){if(timer){pause();return;}timer=setInterval(step,1000/Number($('speed').value));$('play').innerHTML='Ⅱ <span>정지</span>';$('play').setAttribute('aria-label','일시 정지');$('run-state').textContent='진행 중';$('run-state').classList.add('running');}
function newRun(b,message,storeInitial=true){pause();board=b.slice();if(storeInitial)initialBoard=board.slice();previous=null;gen=0;born=0;died=0;history=[];popHistory=[population(board)];seen=new Map([[stateKey(board),0]]);repeatInfo=null;inspection=null;renderSim();setNotice(message);}
function selectPattern(p){selectedPattern=p;zoom=['block','blinker'].includes(p.id)?4:Math.max(...p.cells.map(c=>c[0]))<40&&Math.max(...p.cells.map(c=>c[1]))<24?2:1;newRun(placeCells(p.cells),p.question);$$('.pattern-btn').forEach(el=>{const active=el.dataset.pattern===p.id;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));});$('pattern-title').textContent=p.name;$('pattern-description').textContent=p.desc;$('pattern-question').textContent=p.question;}
function customPattern(title='직접 그린 패턴'){selectedPattern=null;$$('.pattern-btn').forEach(el=>{el.classList.remove('active');el.setAttribute('aria-pressed','false');});$('pattern-title').textContent=title;$('pattern-description').textContent='직접 만든 초기 배치입니다. 한 세대씩 진행하며 이웃과 다음 상태를 비교해 보세요.';$('pattern-question').textContent='멈추는지, 반복하는지, 이동하는지 확인하세요.';}
function iconSVG(cells){const w=Math.max(...cells.map(c=>c[0]))+1,h=Math.max(...cells.map(c=>c[1]))+1;return `<svg class="pattern-icon" viewBox="-1 -1 ${w+2} ${h+2}" aria-hidden="true">${cells.map(([x,y])=>`<rect x="${x}" y="${y}" width=".85" height=".85" rx=".08" fill="#222222"/>`).join('')}</svg>`;}
$('pattern-list').innerHTML=PATTERNS.filter(p=>['block','blinker','pulsar','glider','lwss','gun'].includes(p.id)).map(p=>`<button class="pattern-btn" data-pattern="${p.id}" aria-pressed="false">${iconSVG(p.cells)}<span><strong>${p.name}</strong><small>${p.kind}</small></span><span class="pattern-arrow">↗</span></button>`).join('');
$$('[data-pattern]').forEach(el=>el.addEventListener('click',()=>selectPattern(PATTERNS.find(p=>p.id===el.dataset.pattern))));
$('play').addEventListener('click',togglePlay);$('step').addEventListener('click',()=>{pause();step();});
function undo(){pause();const last=history.pop();if(!last)return;board=last.board;gen=last.gen;born=last.born;died=last.died;previous=last.previous;popHistory=last.popHistory;repeatInfo=last.repeatInfo;seen=new Map(history.map(s=>[stateKey(s.board),s.gen]));seen.set(stateKey(board),gen);renderSim();setNotice('한 세대 이전으로 돌아왔습니다.');}
$('undo').addEventListener('click',undo);
$('reset').addEventListener('click',()=>newRun(initialBoard,'처음 배치로 돌아왔습니다.',false));
$('clear').addEventListener('click',()=>{newRun(makeBoard(),'빈 격자입니다. 칸을 눌러 패턴을 그려 보세요.');customPattern('빈 격자');});
$('random').addEventListener('click',()=>{zoom=1;newRun(Uint8Array.from({length:W*H},()=>Number(Math.random()<.22)),'약 22%의 확률로 각 칸을 살린 무작위 초기 배치입니다.');customPattern('무작위 패턴');});
$('speed').addEventListener('input',()=>{$('speed-value').textContent=`${$('speed').value} /초`;if(timer){pause();togglePlay();}});
$('zoom').addEventListener('change',()=>{zoom=Number($('zoom').value);renderSim();setNotice(zoom===1?'전체 96 × 60 격자를 표시합니다.':'중앙을 확대합니다. 화면 밖의 칸도 계속 계산됩니다.');});
$('boundary').addEventListener('change',()=>{wrap=$('boundary').value==='wrap';$('boundary-label').textContent=wrap?'· 좌우·상하 가장자리 연결':'· 바깥은 죽은 상태';newRun(board,'경계 조건을 바꾸어 현재 배치에서 다시 시작합니다.');});
function setMode(m){mode=m;for(const t of ['draw','inspect','stamp']){$(`${t}-mode`).classList.toggle('active',m===t);$(`${t}-mode`).setAttribute('aria-pressed',String(m===t));}if(m!=='inspect')inspection=null;else pause();$('stamp-tools').hidden=m!=='stamp';renderSim();setNotice(m==='draw'?'칸을 누르거나 드래그하여 그릴 수 있습니다.':m==='stamp'?'격자를 눌러 선택한 패턴을 추가하세요.':'격자를 누르면 주변 8칸과 다음 상태를 확인합니다.');}
$('draw-mode').addEventListener('click',()=>setMode('draw'));$('inspect-mode').addEventListener('click',()=>setMode('inspect'));
function pointerCell(e){const r=canvas.getBoundingClientRect(),vw=W/zoom,vh=H/zoom,ox=Math.floor((W-vw)/2),oy=Math.floor((H-vh)/2);return{x:ox+Math.max(0,Math.min(vw-1,Math.floor((e.clientX-r.left)/r.width*vw))),y:oy+Math.max(0,Math.min(vh-1,Math.floor((e.clientY-r.top)/r.height*vh)))};}
let drawing=false,drawValue=1,lastDraw=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();pause();const p=pointerCell(e);canvas.setPointerCapture(e.pointerId);if(mode==='inspect'){inspection=p;renderSim();return;}if(mode==='stamp'){stampAt(p);return;}const value=1-board[p.y*W+p.x];newRun(board,'배치를 편집하고 있습니다. 새로운 0세대로 시작합니다.');customPattern();drawing=true;drawValue=value;lastDraw=null;paint(p);});
function paint(p){const key=p.y*W+p.x;if(key===lastDraw)return;board[key]=drawValue;lastDraw=key;initialBoard=board.slice();popHistory=[population(board)];seen=new Map([[stateKey(board),0]]);renderSim();}
canvas.addEventListener('pointermove',e=>{if(drawing)paint(pointerCell(e));});
canvas.addEventListener('pointerup',()=>{drawing=false;lastDraw=null;});canvas.addEventListener('pointercancel',()=>{drawing=false;lastDraw=null;});

function setView(next,push=true){if(!['lab','catalog','logic'].includes(next))next='lab';pause();pauseLogic();heartAnimation?.pause();view=next;for(const name of ['lab','catalog','logic'])$(`view-${name}`).hidden=name!==next;$$('.nav-link').forEach(el=>{const active=el.dataset.view===next;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});if(push)window.history.replaceState(null,'',`#${next}`);window.scrollTo({top:0,behavior:'instant'});if(next==='lab')renderSim();if(next==='logic')renderLogic();if(next==='catalog')heartAnimation?.resume();}
$$('[data-view]').forEach(el=>el.addEventListener('click',()=>setView(el.dataset.view)));
window.addEventListener('hashchange',()=>setView(location.hash.slice(1),false));
document.addEventListener('keydown',e=>{const tag=e.target.tagName;if(e.defaultPrevented||['INPUT','SELECT','TEXTAREA','BUTTON','A'].includes(tag)||e.target.isContentEditable||$('sources-dialog').open)return;if(view==='lab'){if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.key==='ArrowRight'){e.preventDefault();pause();step();}if(e.key==='ArrowLeft'){e.preventDefault();undo();}}});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').innerHTML='<span>브라우저 전체 화면을 사용해 주세요</span>';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').innerHTML=document.fullscreenElement?'⛶ <span>전체 화면 종료</span>':'⛶ <span>전체 화면</span>';});
$('sources-open').addEventListener('click',()=>$('sources-dialog').showModal());$('sources-close').addEventListener('click',()=>$('sources-dialog').close());$('sources-dialog').addEventListener('click',e=>{if(e.target===$('sources-dialog')){const r=$('sources-dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('sources-dialog').close();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();pauseLogic();heartAnimation?.pause();}else if(view==='catalog')heartAnimation?.resume();});
initLogic();renderCatalog();selectPattern(selectedPattern);setView(location.hash.slice(1)||'lab',false);
