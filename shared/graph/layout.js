/* Deterministic directed layout: one node per repository, including cycles and isolates. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasGraph=api})(globalThis,()=>{
'use strict';
function layout(repositories,dependencies){
 const byId=new Map(),id=name=>name.toLowerCase();
 for(const r of repositories)byId.set(id(r.name),{...r,id:id(r.name)});
 for(const d of dependencies)for(const name of [d.from,d.to])if(!byId.has(id(name)))byId.set(id(name),{id:id(name),name,category:'Não descoberto',latest:null});
 const nodes=[...byId.values()].sort((a,b)=>a.id.localeCompare(b.id)),adj=new Map(nodes.map(n=>[n.id,[]])),rev=new Map(nodes.map(n=>[n.id,[]]));
 const edges=dependencies.map((d,index)=>({...d,index,fromId:id(d.from),toId:id(d.to)}));
 for(const e of edges){adj.get(e.fromId).push(e.toId);rev.get(e.toId).push(e.fromId)}
 // Iterative Kosaraju avoids stack overflow on deep dependency chains.
 const seen=new Set(),order=[];
 for(const n of nodes){if(seen.has(n.id))continue;seen.add(n.id);const stack=[[n.id,0]];while(stack.length){const top=stack[stack.length-1],next=adj.get(top[0]);if(top[1]<next.length){const child=next[top[1]++];if(!seen.has(child)){seen.add(child);stack.push([child,0])}}else{order.push(top[0]);stack.pop()}}}
 const component=new Map(),groups=[];
 for(const n of order.reverse()){if(component.has(n))continue;const index=groups.length,members=[],stack=[n];component.set(n,index);while(stack.length){const current=stack.pop();members.push(current);for(const child of rev.get(current))if(!component.has(child)){component.set(child,index);stack.push(child)}}groups.push(members)}
 const next=groups.map(()=>new Set()),degree=groups.map(()=>0),ranks=groups.map(()=>0);
 for(const e of edges){const a=component.get(e.fromId),b=component.get(e.toId);e.cyclic=a===b;if(a!==b&&!next[a].has(b)){next[a].add(b);degree[b]++}}
 const queue=degree.flatMap((d,i)=>d===0?[i]:[]);for(let q=0;q<queue.length;q++){const a=queue[q];for(const b of next[a]){ranks[b]=Math.max(ranks[b],ranks[a]+1);if(--degree[b]===0)queue.push(b)}}
 const connected=nodes.filter(n=>adj.get(n.id).length||rev.get(n.id).length),isolated=nodes.filter(n=>!adj.get(n.id).length&&!rev.get(n.id).length),layers=[];
 for(const n of connected){n.rank=ranks[component.get(n.id)];n.cyclic=groups[component.get(n.id)].length>1;(layers[n.rank]??=[]).push(n)}
 // Order each layer by the average position of its consumers to reduce crossings.
 layers.forEach((layer,column)=>{if(!column)return;const prev=new Map(nodes.map(n=>[n.id,(layers[n.rank]||[]).indexOf(n)]));layer.sort((a,b)=>{const avg=n=>{const incoming=rev.get(n.id).filter(p=>byId.get(p).rank<n.rank);return incoming.length?incoming.reduce((sum,p)=>sum+prev.get(p),0)/incoming.length:0};return avg(a)-avg(b)||a.id.localeCompare(b.id)})});
 const W=252,H=86,DX=356,DY=124,PAD=44;
 let width=340,height=100;
 layers.forEach((layer,column)=>{layer.forEach((n,row)=>{n.x=PAD+column*DX;n.y=70+row*DY;n.width=W;n.height=H});width=Math.max(width,PAD*2+column*DX+W+70);height=Math.max(height,70+layer.length*DY)});
 const beside=connected.length>0&&width<=1200&&isolated.length<=24,isolatedX=beside?width+32:PAD,isolatedY=beside?70:connected.length?height+55:70,cols=Math.min(beside?2:4,Math.max(1,Math.ceil(Math.sqrt(isolated.length))));
 isolated.forEach((n,i)=>{n.x=isolatedX+(i%cols)*(W+32);n.y=isolatedY+Math.floor(i/cols)*DY;n.width=W;n.height=H;n.isolated=true});
 if(isolated.length){width=Math.max(width,isolatedX+PAD+cols*(W+32)-32);height=Math.max(height,isolatedY+Math.ceil(isolated.length/cols)*DY)}
 for(const e of edges){const a=byId.get(e.fromId),b=byId.get(e.toId),out=adj.get(a.id).indexOf(b.id),incoming=rev.get(b.id).indexOf(a.id);const sy=a.y+20+(H-40)*(out+1)/(adj.get(a.id).length+1),ty=b.y+20+(H-40)*(incoming+1)/(rev.get(b.id).length+1);if(a.rank===b.rank){const x=a.x+W+28+12*(out%3);e.path=`M ${a.x+W} ${sy} C ${x} ${sy}, ${x} ${ty}, ${b.x+W} ${ty}`}else{const start=a.x+W,end=b.x,mid=(start+end)/2;e.path=`M ${start} ${sy} C ${mid} ${sy}, ${mid} ${ty}, ${end} ${ty}`}}
 return {nodes,edges,width,height:height+20,connectedCount:connected.length,isolatedCount:isolated.length,isolatedY,isolatedX,cyclicCount:groups.filter(g=>g.length>1).length};
}
return {layout};
});
