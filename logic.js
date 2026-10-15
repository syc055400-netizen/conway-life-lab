import {LOGIC_N as N,logicStep,logicSeed,inspectDetection,outputWindow,gateValue} from './logic-engine.js';
import {parseExpression,expressionInputs,evaluateExpression} from './logic-expression.js';
const $=id=>document.getElementById(id),END=192,BLUE='#255e87';
let model=parseExpression('p and q'),values={p:1,q:1,r:0,s:0},stageIndex=0,results={},board,signals=[],history=[],gen=0,timer=null,scenes=[];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currentGate(){return model.nodes[stageIndex];}
function inputs(){return expressionInputs(model,values,currentGate(),results);}
function complete(){return gen===END && stageIndex===model.nodes.length-1;}
function refLabel(ref){return ref?.startsWith('g')?'단계 '+ref.slice(1):ref;}
function result(){return gen===END?inspectDetection(board).value:null;}
function makeScenes(){
 const {a,b}=inputs(),p=refLabel(currentGate().left),q=refLabel(currentGate().right),g=currentGate().gate;
 let t=null,meeting='',after='';
 if(g==='not'&&a){t=40;meeting=`입력 ${p}와 기준 신호가 만납니다.`;after='두 신호가 모두 사라집니다. 출력으로 갈 신호가 남지 않습니다.';}
 else if(g==='and'&&b){t=40;meeting=`입력 ${q}가 차단 신호와 만납니다.`;after=a?`${q}가 차단 신호를 지웠습니다. ${p}는 출력으로 계속 갑니다.`:`차단 신호는 사라졌지만, ${p}가 0이어서 출력 신호는 없습니다.`;}
 else if(g==='and'&&a){t=88;meeting=`${q}가 없어서 차단 신호가 ${p}와 만납니다.`;after=`${p}와 차단 신호가 모두 사라집니다.`;}
 else if(g==='or'){t=a?40:b?88:136;meeting=a?`입력 ${p}가 차단 신호와 만납니다.`:b?`입력 ${q}가 차단 신호와 만납니다.`:'입력이 모두 0이어서 차단 신호가 기준 신호와 만납니다.';after=a||b?'차단 신호가 사라졌습니다. 맨 위의 기준 신호가 출력으로 갑니다.':'기준 신호도 사라졌습니다. 출력으로 갈 신호가 없습니다.';}
 const initial=g==='and'?`${p}는 출력으로 향하는 신호, ${q}는 차단 신호를 지우는 입력입니다.`:g==='or'?`${p} 또는 ${q}가 차단 신호를 지우면 기준 신호가 통과합니다.`:`기준 신호를 보냅니다. ${p}가 1이면 기준 신호를 지웁니다.`;
 const plan=[{t:0,title:'입력 배치',text:initial}];
 if(t!==null)plan.push({t,title:'두 신호가 만나는 순간',text:meeting},{t:t+12,title:'충돌 뒤',text:after});
 else plan.push({t:96,title:'신호의 이동',text:g==='not'?'입력이 0이어서 기준 신호를 막는 글라이더가 없습니다.':`입력 ${p}가 0이므로 출력으로 향하는 신호가 없습니다.`});
 plan.push({t:END,title:'출력 확인',text:''});return plan;
}
function currentScene(){return scenes.filter(s=>s.t<=gen).at(-1);}
function loadStage(){const {a,b}=inputs();({board,signals}=logicSeed(currentGate().gate,a,b));history=[board];gen=0;scenes=makeScenes();renderLogic();}
function reset(){pauseLogic();stageIndex=0;results={};loadStage();}
function advanceStage(){if(gen!==END || result()===null || complete())return false;stageIndex++;loadStage();return true;}
function ensure(t){while(history.length<=t)history.push(logicStep(history.at(-1)));}
function seek(t){gen=Math.min(END,Math.max(0,t));ensure(gen);board=history[gen];if(gen===END){results[currentGate().id]=inspectDetection(board).value;if(complete()||result()===null)pauseLogic();}renderLogic();}
export function pauseLogic(){if(timer)clearTimeout(timer);timer=null;if($('logic-play'))$('logic-play').textContent=complete()?'다시 실행':'실행';}
function playTick(){
 if(gen===END){if(!advanceStage()){pauseLogic();renderLogic();return;}timer=setTimeout(playTick,900);return;}
 const previous=gen;seek(gen+2);if(complete()||result()===null&&gen===END)return;
 const crossed=scenes.some(s=>s.t>previous&&s.t<=gen);
 timer=setTimeout(playTick,gen===END?1400:crossed?1050:78);
}
function sameModel(a,b){return a.canonical===b.canonical;}
function applyExpression(){
 try{const next=parseExpression($('logic-expression').value);$('logic-error').hidden=true;$('logic-expression').removeAttribute('aria-invalid');const changed=!sameModel(model,next);model=next;$('logic-expression').value=model.canonical;if(changed)reset();else renderLogic();return true;}
 catch(error){pauseLogic();$('logic-error').textContent=error.message;$('logic-error').hidden=false;$('logic-expression').setAttribute('aria-invalid','true');$('logic-expression').focus();return false;}
}
function mappedLabel(s){return s.label==='A'?refLabel(currentGate().left):s.label==='B'?refLabel(currentGate().right):s.label;}
function drawBoard(){
 const canvas=$('logic-board'),ctx=canvas.getContext('2d'),ox=4,oy=8,w=64,h=84,s=canvas.width/w;
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#eeeeee';ctx.lineWidth=.65;ctx.beginPath();for(let x=0;x<=w;x++){ctx.moveTo(x*s,0);ctx.lineTo(x*s,canvas.height);}for(let y=0;y<=h;y++){ctx.moveTo(0,y*s);ctx.lineTo(canvas.width,y*s);}ctx.stroke();
 ctx.save();ctx.setLineDash([5,7]);ctx.strokeStyle='#bdc9d0';ctx.lineWidth=1.5;
 for(const p of signals){if(!p.active)continue;ctx.beginPath();ctx.moveTo((p.x+1.5-ox)*s,(p.y+1.5-oy)*s);ctx.lineTo((p.x+61.5-ox)*s,(p.y+1.5-oy+(p.direction==='ne'?-60:60))*s);ctx.stroke();}ctx.restore();
 ctx.fillStyle='#171717';for(let y=oy;y<oy+h;y++)for(let x=ox;x<ox+w;x++)if(board[y*N+x])ctx.fillRect((x-ox)*s+.4,(y-oy)*s+.4,s-.8,s-.8);
 const d=outputWindow();ctx.strokeStyle=gen===END?BLUE:'#333';ctx.lineWidth=2.4;ctx.strokeRect((d.x-ox)*s,(d.y-oy)*s,d.w*s,d.h*s);
 ctx.font='600 18px Pretendard, sans-serif';ctx.fillStyle='#111';ctx.fillText('출력',(d.x-ox)*s,(d.y-oy)*s-9);
 if(gen===0){for(const p of signals){const label=`${mappedLabel(p)}${['A','B'].includes(p.label)?' = '+Number(p.active):''}`,x=(p.x+6-ox)*s,y=(p.y+2-oy)*s;ctx.font='500 19px Pretendard, sans-serif';ctx.fillStyle='#fff';ctx.fillRect(x-4,y-21,ctx.measureText(label).width+8,28);ctx.fillStyle='#111';ctx.fillText(label,x,y);}}
}
function gateShape(g,x=245,y=95){
 if(g==='and')return `<path d="M${x} ${y} H${x+48} A50 50 0 0 1 ${x+48} ${y+100} H${x} Z"/>`;
 if(g==='or')return `<path d="M${x} ${y} Q${x+60} ${y-4} ${x+104} ${y+50} Q${x+60} ${y+104} ${x} ${y+100} Q${x+30} ${y+50} ${x} ${y} Z"/>`;
 return `<path d="M${x} ${y} L${x} ${y+100} L${x+91} ${y+50} Z"/><circle cx="${x+98}" cy="${y+50}" r="7"/>`;
}
function renderSymbol(){
 const levels=Object.fromEntries(model.variables.map(v=>[v,0])),groups={0:model.variables};
 for(const node of model.nodes){levels[node.id]=1+Math.max(levels[node.left],node.right?levels[node.right]:0);(groups[levels[node.id]]??=[]).push(node.id);}
 const maxLevel=Math.max(...Object.values(levels)),height=Math.max(240,...Object.values(groups).map(g=>g.length*140+40)),width=(maxLevel+1)*185+125,pos={};
 for(const [level,refs] of Object.entries(groups))refs.forEach((ref,i)=>{pos[ref]={x:55+Number(level)*185,y:height*(i+1)/(refs.length+1)};});
 const text=(x,y,value,size=16)=>`<text x="${x}" y="${y}" text-anchor="middle" style="font-size:${size}px">${escape(value)}</text>`;
 const outputX=ref=>pos[ref].x+(levels[ref]===0?23:(model.nodes.find(n=>n.id===ref).gate==='and'?33.4:model.nodes.find(n=>n.id===ref).gate==='or'?38.2:39));
 let edges='',nodes='';
 for(const node of model.nodes){const p=pos[node.id];for(const [ref,offset] of [[node.left,node.gate==='not'?0:-16],...(node.right?[[node.right,16]]:[])]){const q=pos[ref],x1=outputX(ref),x2=p.x-45+(node.gate==='or'?11:0),y2=p.y+offset,mid=(x1+x2)/2;const bit=levels[ref]===0?values[ref]:results[ref];edges+=`<path d="M${x1} ${q.y} H${mid} V${y2} H${x2}" fill="none" stroke="${bit===1?BLUE:'#b7b7b7'}" stroke-width="2"/>`;}}
 for(const ref of model.variables){const p=pos[ref];nodes+=`<circle cx="${p.x}" cy="${p.y}" r="23" fill="#fff" stroke="#111" stroke-width="2"/>`+text(p.x,p.y+6,values[ref],20)+text(p.x,p.y-33,ref,18);}
 for(const node of model.nodes){const p=pos[node.id],active=node.id===currentGate().id,done=Object.hasOwn(results,node.id);nodes+=`<g transform="translate(${p.x-45},${p.y-40}) scale(.8)" class="logic-gate-shape" style="stroke:${active?BLUE:'#111'};stroke-width:${active?4:2.5}">${gateShape(node.gate,0,0)}</g>`+text(p.x+2,p.y-54,`${node.id.slice(1)} · ${node.gate.toUpperCase()}`)+text(p.x+5,p.y+60,done?`출력 ${results[node.id]??'?'}`:active?'실행 중':'대기',14);}
 const root=pos[model.rootId],out=complete()?result():null;
 edges+=`<path d="M${outputX(model.rootId)} ${root.y} H${width-40}" stroke="${out===1?BLUE:'#999'}" stroke-width="2"/>`;
 nodes+=text(width-32,root.y-14,'결과',14)+text(width-32,root.y+9,out===null?'?':out,22);
 $('logic-symbol').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="min-width:${model.nodes.length===1?0:Math.min(width,1800)}px" role="img" aria-label="${escape(model.display)}의 논리 기호 회로. 입력 변수는 각각 한 곳에서 출발합니다.">${edges}${nodes}</svg>`;
 $('logic-chain').innerHTML=model.nodes.map((n,i)=>`<li class="${i===stageIndex?'active':''}"><span>${i+1}. ${escape(n.display)}</span><strong>${Object.hasOwn(results,n.id)?results[n.id]??'판독 불가':'?'}</strong></li>`).join('');
}
function renderTruth(){
 const vars=model.variables,rows=[];for(let mask=0;mask<2**vars.length;mask++){const v=Object.fromEntries(vars.map((name,i)=>[name,(mask>>(vars.length-1-i))&1]));rows.push(`<tr class="${vars.every(name=>v[name]===values[name])?'current':''}">${vars.map(name=>`<td>${v[name]}</td>`).join('')}<td>${evaluateExpression(model,v)}</td></tr>`);}
 $('logic-truth').innerHTML=`<thead><tr>${vars.map(v=>`<th>${v}</th>`).join('')}<th>${escape(model.display)}</th></tr></thead><tbody>${rows.join('')}</tbody>`;
}
export function renderLogic(){
 if(!board)return;
 for(const v of ['p','q','r','s']){const b=$('logic-'+v);b.textContent=String(values[v]);b.setAttribute('aria-pressed',String(!!values[v]));b.dataset.bit=values[v];$('logic-'+v+'-wrap').hidden=!model.variables.includes(v);}
 $('logic-formula').textContent=model.display;$('logic-current-gate').textContent=`단계 ${stageIndex+1} / ${model.nodes.length} · ${currentGate().gate.toUpperCase()}`;$('logic-gen').textContent=`${gen} / ${END}세대`;$('logic-progress').value=gen;
 const current=currentScene(),done=gen===END,out=done?result():null;
 $('logic-scene-title').textContent=current.title;
 $('logic-scene-text').textContent=done?(out===1?'출력 창에 글라이더가 도착했습니다. 이 입력의 결과는 1입니다.':out===0?'출력 창이 비어 있습니다. 이 입력의 결과는 0입니다.':'예상한 글라이더 모양과 다릅니다. 이 상태는 판독할 수 없습니다.'):current.text;
 $('logic-result').textContent=complete()?`출력 ${out===null?'판독 불가':out}`:done?`단계 ${stageIndex+1} 출력 ${out===null?'판독 불가':out} → 다음 단계`:'출력 대기';
 $('logic-result').dataset.done=String(done);$('logic-next').disabled=complete()||(done&&out===null);$('logic-next').textContent=done&&!complete()?'다음 단계':'다음 장면';
 $('logic-play').textContent=timer?'일시 정지':complete()?'다시 실행':'실행';
 const stage=done?2:gen>0?1:0;document.querySelectorAll('[data-logic-stage]').forEach(e=>{e.classList.toggle('active',Number(e.dataset.logicStage)===stage);if(Number(e.dataset.logicStage)===stage)e.setAttribute('aria-current','step');else e.removeAttribute('aria-current');});
 drawBoard();renderSymbol();renderTruth();
}
export function initLogic(){
 $('logic-expression-form').addEventListener('submit',e=>{e.preventDefault();if(applyExpression())reset();});
 document.querySelectorAll('[data-expression]').forEach(b=>b.addEventListener('click',()=>{$('logic-expression').value=b.dataset.expression;if(applyExpression())reset();}));
 for(const name of ['p','q','r','s'])$('logic-'+name).addEventListener('click',()=>{if(!applyExpression())return;values[name]^=1;reset();});
 $('logic-play').addEventListener('click',()=>{if(!applyExpression())return;if(timer){pauseLogic();return;}if(complete())reset();timer=setTimeout(playTick,100);renderLogic();});
 $('logic-next').addEventListener('click',()=>{if(!applyExpression())return;pauseLogic();if(gen===END)advanceStage();else seek(scenes.find(s=>s.t>gen)?.t??END);});
 $('logic-reset').addEventListener('click',()=>{if(applyExpression())reset();});reset();
}
