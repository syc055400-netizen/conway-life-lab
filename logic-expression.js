const VARIABLES=['p','q','r','s'];
const GATES=['and','or','not'];
const SYNTAX_ERROR='논리식의 입력과 괄호를 확인해 주세요. 예: (p and q) or not r';
const invalid=()=>new Error(SYNTAX_ERROR);
const isVariable=value=>VARIABLES.includes(value);
const precedence=node=>node.variable?4:node.gate==='not'?3:node.gate==='and'?2:1;

// These strings describe the parsed tree; no user input is executed as JavaScript.
function format(node,symbols=false){
 if(node.variable)return node.variable;
 const child=(value,isRight=false)=>{
  const text=format(value,symbols);
  const needsBrackets=precedence(value)<precedence(node)||(isRight&&node.gate!=='not'&&precedence(value)===precedence(node));
  return needsBrackets?`(${text})`:text;
 };
 if(node.gate==='not')return `${symbols?'¬':'not '}${child(node.left)}`;
 return `${child(node.left)} ${symbols?(node.gate==='and'?'∧':'∨'):node.gate} ${child(node.right,true)}`;
}

/**
 * Parse AND/OR/NOT using NOT > AND > OR precedence.
 * Each node is one gate, ordered after its dependencies. A reference is either
 * an input variable (p/q/r/s) or an earlier gate id (g1, g2, ...).
 */
export function parseExpression(raw){
 if(typeof raw!=='string'||!raw.trim())throw invalid();
 if(raw.length>500)throw new Error('논리식은 500자 이하로 입력해 주세요.');
 const source=raw.toLowerCase(),tokens=[];
 for(let i=0;i<source.length;){
  const ch=source[i];
  if(/\s/u.test(ch)){i++;continue;}
  const pair=source.slice(i,i+2);
  if(pair==='&&'||pair==='||'){tokens.push(pair==='&&'?'and':'or');i+=2;continue;}
  const symbol={'∧':'and','∨':'or','¬':'not','!':'not','(':'(',')':')'}[ch];
  if(symbol){tokens.push(symbol);i++;continue;}
  if(/[a-z]/.test(ch)){
   const word=source.slice(i).match(/^[a-z]+/)[0];
   if(!isVariable(word)&&!GATES.includes(word))throw new Error('변수는 p, q, r, s만, 연산은 AND, OR, NOT만 사용할 수 있습니다.');
   tokens.push(word);i+=word.length;continue;
  }
  throw invalid();
 }
 let pos=0,gateCount=0;
 function gate(operation,left,right=null){
  if(++gateCount>12)throw new Error('논리 연산은 최대 12개까지 사용할 수 있습니다.');
  return{gate:operation,left,right};
 }
 function operand(){
  const token=tokens[pos++];
  if(isVariable(token))return{variable:token};
  if(token==='not')return gate('not',operand());
  if(token==='('){const node=disjunction();if(tokens[pos++]!==')')throw invalid();return node;}
  throw invalid();
 }
 function conjunction(){
  let node=operand();
  while(tokens[pos]==='and'){pos++;node=gate('and',node,operand());}
  return node;
 }
 function disjunction(){
  let node=conjunction();
  while(tokens[pos]==='or'){pos++;node=gate('or',node,conjunction());}
  return node;
 }
 const ast=disjunction();
 if(pos!==tokens.length)throw invalid();
 if(!gateCount)throw new Error('AND, OR, NOT 중 하나 이상을 사용해 주세요.');
 const nodes=[],used=new Set();
 function compile(node){
  if(node.variable){used.add(node.variable);return node.variable;}
  const left=compile(node.left),right=node.gate==='not'?null:compile(node.right),id=`g${nodes.length+1}`;
  nodes.push({id,gate:node.gate,left,right,display:format(node,true)});
  return id;
 }
 const rootId=compile(ast),root=nodes.at(-1);
 return{ast,nodes,variables:VARIABLES.filter(variable=>used.has(variable)),canonical:format(ast),display:format(ast,true),rootId,gate:root.gate,left:root.left,right:root.right};
}

function readBit(value,label){
 if(value!==0&&value!==1)throw new Error(`${label}의 값은 0 또는 1이어야 합니다.`);
 return value;
}

/** Read one gate's operands, using measured previous gate outputs in results. */
export function expressionInputs(model,values,node=model?.nodes?.at(-1),results={}){
 if(!model||!Array.isArray(model.nodes)||!node||!GATES.includes(node.gate)||!model.nodes.includes(node))throw invalid();
 const nodeIndex=model.nodes.indexOf(node);
 const read=ref=>{
  if(isVariable(ref))return readBit(values?.[ref],ref);
  if(!model.nodes.slice(0,nodeIndex).some(previous=>previous.id===ref))throw invalid();
  return readBit(results?.[ref],`${ref} 실행 결과`);
 };
 return{a:read(node.left),b:node.gate==='not'?0:read(node.right)};
}

/** Compute the Boolean reference answer independently of the Life simulation. */
export function evaluateExpression(model,values){
 if(!model?.ast||!Array.isArray(model.variables))throw invalid();
 // Check every input, including inputs hidden by Boolean short circuiting.
 for(const variable of model.variables)readBit(values?.[variable],variable);
 function evaluate(node){
  if(node.variable)return readBit(values?.[node.variable],node.variable);
  const a=evaluate(node.left);
  if(node.gate==='not')return 1-a;
  const b=evaluate(node.right);
  if(node.gate==='and')return a&b;
  if(node.gate==='or')return a|b;
  throw invalid();
 }
 return evaluate(model.ast);
}
