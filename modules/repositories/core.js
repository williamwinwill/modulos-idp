/* Browser + Node: discovery and configuration, independent from the interface. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AtlasCore=api})(globalThis,()=>{
'use strict';
const defaults={schemaVersion:1,github:{organization:'',apiBase:'https://api.github.com',webBase:'https://github.com'},includeArchived:false,rules:[{pattern:'atlas-terraform-*',category:'Terraform'},{pattern:'atlas-template-*',category:'Template'},{pattern:'atlas-plugin-*',category:'Plugin'}],repositories:[{name:'atlas-frontend',category:'Frontend'},{name:'atlas',category:'Core'},{name:'break-glass',category:'Operação'}],exclude:[],dependencies:[{from:'atlas-template-rds',to:'atlas-terraform-rds',version:'v2.3.0',file:'template.yaml'},{from:'atlas-template-rds',to:'atlas-terraform-cloudwatch',version:'v1.4.0',file:'template.yaml'}]};
const clone=o=>JSON.parse(JSON.stringify(o));
const repoName=s=>typeof s==='string'&&/^[a-zA-Z0-9_.-]+$/.test(s)&&s!=='.'&&s!=='..'&&s.length<=100;
function validate(raw){
 if(!raw||raw.schemaVersion!==1)throw Error('schemaVersion deve ser 1.');
 const c=clone(raw),str=(s,max=200)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
 if(!c.github||typeof c.github.organization!=='string'||(c.github.organization&&!/^[a-zA-Z0-9-]+$/.test(c.github.organization)))throw Error('Informe uma organização válida.');
 for(const k of ['apiBase','webBase']){let u;try{u=new URL(c.github[k])}catch{throw Error(`${k}: URL inválida.`)}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error(`${k}: use uma URL HTTPS sem credenciais ou parâmetros.`);c.github[k]=u.href.replace(/\/$/,'')}
 if(typeof c.includeArchived!=='boolean')throw Error('includeArchived deve ser true ou false.');
 for(const k of ['rules','repositories','exclude','dependencies'])if(!Array.isArray(c[k])||c[k].length>2000)throw Error(`${k}: informe uma lista de até 2.000 itens.`);
 for(const r of c.rules)if(!r||!str(r.pattern,100)||!/^[a-zA-Z0-9_.*-]+$/.test(r.pattern)||!str(r.category,40))throw Error('Regra inválida. Use nomes e * como curinga, com uma categoria.');
 for(const r of c.repositories)if(!r||!repoName(r.name)||!str(r.category,40))throw Error('Repositório explícito inválido.');
 if(c.exclude.some(n=>!repoName(n)))throw Error('Exclusão inválida. Use o nome exato.');
 for(const d of c.dependencies)if(!d||!repoName(d.from)||!repoName(d.to)||!str(d.version)||typeof d.file!=='string'||d.file.length>500||d.from.toLowerCase()===d.to.toLowerCase())throw Error('Dependência inválida: informe origem, destino diferente, versão e arquivo.');
 const unique=(list,key)=>{const keys=list.map(key);if(new Set(keys).size!==keys.length)throw Error('Há entradas duplicadas na configuração.')};
 unique(c.repositories,r=>r.name.toLowerCase());unique(c.dependencies,d=>`${d.from.toLowerCase()}/${d.to.toLowerCase()}`);
 // Normalize to the public schema; tokens are never imported or exported.
 return {schemaVersion:1,github:{organization:c.github.organization.trim(),apiBase:c.github.apiBase,webBase:c.github.webBase},includeArchived:c.includeArchived,rules:c.rules.map(({pattern,category})=>({pattern,category})),repositories:c.repositories.map(({name,category})=>({name,category})),exclude:c.exclude,dependencies:c.dependencies.map(({from,to,version,file})=>({from,to,version,file}))};
}
function matches(name,pattern){return new RegExp('^'+pattern.split('*').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*')+'$','i').test(name)}
function category(name,c){return c.repositories.find(r=>r.name.toLowerCase()===name.toLowerCase())?.category||c.rules.find(r=>matches(name,r.pattern))?.category||null}
function selected(r,c){return !c.exclude.some(n=>n.toLowerCase()===r.name.toLowerCase())&&(c.includeArchived||!r.archived)&&!!category(r.name,c)}
function semver(s){const m=/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(s||'');return m?m.slice(1,4).map(BigInt):null}
function compare(a,b){const x=semver(a),y=semver(b);if(!x||!y)return null;for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1;return 0}
function latest(tags){return tags.map(t=>typeof t==='string'?t:t.name).filter(semver).sort((a,b)=>compare(b,a))[0]||null}
function status(used,available){const n=compare(used,available);return n===null?'unknown':n<0?'outdated':n===0?'current':'ahead'}
async function discover(config,{token='',fetchImpl=fetch,onProgress=()=>{}}={}){
 const c=validate(config);if(!c.github.organization)throw Error('Configure a organização do GitHub antes de descobrir.');
 const base=c.github.apiBase,org=encodeURIComponent(c.github.organization),warnings=[];
 async function get(path){let response;try{response=await fetchImpl(base+path,{headers:{Accept:'application/vnd.github+json',...(token?{Authorization:`Bearer ${token}`}:{})},signal:AbortSignal.timeout(30000),redirect:'error'})}catch{throw Error('Falha de conexão: verifique rede, URL da API e CORS.')}if(!response.ok){const reset=response.headers?.get('x-ratelimit-reset');throw Error(response.status===401?'Token inválido ou expirado.':response.status===403||response.status===429?`Acesso negado ou limite de API atingido.${reset?' Tente após '+new Date(Number(reset)*1000).toLocaleTimeString('pt-BR')+'.':''}`:response.status===404?'Recurso não encontrado ou sem permissão (404).':`GitHub retornou HTTP ${response.status}.`)}return response.json()}
 async function pages(path){let result=[];for(let page=1;page<=1000;page++){const data=await get(`${path}${path.includes('?')?'&':'?'}per_page=100&page=${page}`);if(!Array.isArray(data))throw Error('Resposta inesperada da API.');result.push(...data);if(data.length<100)return result}throw Error('Limite de paginação excedido; consulta não concluída.')}
 onProgress('Consultando repositórios da organização…');
 const all=await pages(`/orgs/${org}/repos?type=all&sort=full_name&direction=asc`);
 const result=all.filter(r=>selected(r,c)).map(r=>({name:r.name,description:r.description||'',category:category(r.name,c),archived:!!r.archived,private:!!r.private,latest:null,versionError:null,dependencyOnly:false}));
 const needed=new Set([...c.repositories.map(r=>r.name),...c.dependencies.flatMap(d=>[d.from,d.to])]);
 for(const name of needed){if(result.some(r=>r.name.toLowerCase()===name.toLowerCase())||c.exclude.some(n=>n.toLowerCase()===name.toLowerCase()))continue;let raw=all.find(r=>r.name.toLowerCase()===name.toLowerCase());if(!raw){try{raw=await get(`/repos/${org}/${encodeURIComponent(name)}`)}catch(e){warnings.push(`${name}: ${e.message}`);continue}}if(raw.archived&&!c.includeArchived)continue;result.push({name:raw.name,description:raw.description||'',category:category(raw.name,c)||'Dependência',archived:!!raw.archived,private:!!raw.private,latest:null,versionError:null,dependencyOnly:!category(raw.name,c)})}
 let cursor=0,done=0;
 await Promise.all(Array.from({length:Math.min(4,result.length)},async()=>{while(cursor<result.length){const r=result[cursor++];try{r.latest=latest(await pages(`/repos/${org}/${encodeURIComponent(r.name)}/tags`))}catch(e){r.versionError=e.message;warnings.push(`${r.name}: ${e.message}`)}onProgress(`Consultando versões · ${++done}/${result.length}`)}}));
 return {repos:result.sort((a,b)=>a.name.localeCompare(b.name)),warnings,syncedAt:new Date().toISOString(),source:'github'};
}
return {defaults,clone,validate,matches,category,selected,semver,compare,latest,status,discover};
});
