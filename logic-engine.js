export const LOGIC_N=128, READ_TIME=192;
export const SE=[[1,0],[2,1],[0,2],[1,2],[2,2]], NE=[[0,1],[1,0],[2,2],[2,1],[2,0]];
export const GATE_NAMES={and:'AND',or:'OR',not:'NOT',andnot:'A AND NOT B',nand:'NAND',nor:'NOR',xor:'XOR',xnor:'XNOR'};
export function outputWindow(distance=48){return{x:6+distance,y:10+distance,w:7,h:7,originX:8+distance,originY:12+distance};}
export const DETECTOR=outputWindow();
export function readTime(distance=48){return 4*distance;}
// Same synchronous B3/S23 rule as the main board; count only neighbours of live cells.
export function logicStep(board){const counts=new Uint8Array(board.length),next=new Uint8Array(board.length),n=LOGIC_N;for(let i=0;i<board.length;i++){if(!board[i])continue;const x=i%n,y=Math.floor(i/n);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx>=0&&xx<n&&yy>=0&&yy<n)counts[yy*n+xx]++;}}for(let i=0;i<board.length;i++)next[i]=Number(counts[i]===3||(board[i]&&counts[i]===2));return next;}
export function logicSeed(gate,a,b,phase=0){
 const board=new Uint8Array(LOGIC_N*LOGIC_N),signals=[];
 const put=(pattern,x,y,label,active,isB=false)=>{let points=pattern;if(isB&&phase){let isolated=new Uint8Array(board.length);pattern.forEach(([dx,dy])=>isolated[(y+dy)*LOGIC_N+x+dx]=1);for(let t=0;t<phase;t++)isolated=logicStep(isolated);points=[];for(let i=0;i<isolated.length;i++)if(isolated[i])points.push([i%LOGIC_N-x,Math.floor(i/LOGIC_N)-y]);}signals.push({x,y,label,active:!!active,direction:pattern===NE?'ne':'se',phase:isB?phase:0});if(active)points.forEach(([dx,dy])=>board[(y+dy)*LOGIC_N+x+dx]=1);};
 if(gate==='and'){put(SE,8,12,'A',a);put(SE,8,36,'B',b,true);put(NE,9,60,'차단 신호',1);}
 else if(gate==='or'){put(SE,8,12,'기준 신호',1);put(SE,8,36,'B',b,true);put(SE,8,60,'A',a);put(NE,9,84,'차단 신호',1);}
 else if(gate==='andnot'){put(SE,8,12,'A',a);put(NE,9,36,'B',b,true);}
 else{put(SE,8,12,'기준 신호',1);put(NE,9,36,'A',a,true);}
 return {board,signals};
}
export function inspectDetection(board,distance=48){const d=outputWindow(distance),expected=new Set(SE.map(([x,y])=>(d.originY+y)*LOGIC_N+d.originX+x));let count=0,exact=true;for(let y=d.y;y<d.y+d.h;y++)for(let x=d.x;x<d.x+d.w;x++){const i=y*LOGIC_N+x;count+=board[i];if(Boolean(board[i])!==expected.has(i))exact=false;}return{value:exact?1:count===0?0:null,count,exact};}
export function detect(board,distance=48){return inspectDetection(board,distance).value;}
export function gateValue(gate,a,b=0){switch(gate){case'and':return a&b;case'or':return a|b;case'not':return 1-a;case'andnot':return a&(1-b);case'nand':return 1-(a&b);case'nor':return 1-(a|b);case'xor':return a^b;case'xnor':return 1-(a^b);default:throw new Error('Unknown logic gate: '+gate);}}
export function runGate(gate,a,b,distance=48,phase=0){let{board}=logicSeed(gate,a,b,phase);for(let t=0;t<readTime(distance);t++)board=logicStep(board);return detect(board,distance);}
export function halfAdder(a,b){const p=a|b,c=a&b,r=1-c,s=p&r;return{a,b,p,c,r,s};}
export function fullAdder(a,b,cin=0){const p=a^b,q=a&b,r=cin&p,s=p^cin,cout=q|r;return{a,b,cin,p,q,r,s,cout};}
export function addBits(a,b){const rows=[];let carry=0,result=0;for(let bit=0;bit<4;bit++){const x=(a>>bit)&1,y=(b>>bit)&1,v=fullAdder(x,y,carry);rows.push({bit,...v});result|=v.s<<bit;carry=v.cout;}return{rows,result:result|(carry<<4)};}
export function composedCircuit(g1,g2,a,b,c){const p=gateValue(g1,a,b),out=gateValue(g2,p,c);return{p,out};}
