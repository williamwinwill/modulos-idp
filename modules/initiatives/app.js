
(() => {
const root=document.getElementById('infra-ia'), content=root.querySelector('#ia-content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v);
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:2}).format(v);
const C=globalThis.InitiativesCore;
const statuses=C.statuses,metricKeys=C.metricKeys;
let state=C.initial(),lastSaved=structuredClone(state),areas=state.areas,kinds=state.kinds,extraFields=state.extraFields,items=state.items,columns=state.columns;
let kindFilter='',ready=false,busy=false,formBaseline={};
const today=()=>new Date().toLocaleDateString('pt-BR');
const localMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
const endpoint=new URL('../../api/initiatives',location.href);
const $=s=>document.querySelector(s);
function apply(data){state=C.validate(data);({areas,kinds,extraFields,items,columns}=state);lastSaved=structuredClone(state);}
function snapshot(){return {...state,areas,kinds,extraFields,items,columns};}
function setBusy(value){busy=value;document.querySelectorAll('button,input,select,textarea').forEach(x=>x.disabled=value);}
function notice(message,error=false){$('#ia-notice').textContent=message;$('#ia-notice').classList.toggle('error',error);}
function formValues(form){const values={};if(form)for(const [name,value] of new FormData(form))(values[name]??=[]).push(value);return values;}
async function load({preserve=false}={}){
 const form=preserve?root.querySelector('form'):null,values=formValues(form);
 const changed=Object.keys({...formBaseline,...values}).filter(name=>JSON.stringify(values[name]||[])!==JSON.stringify(formBaseline[name]||[]));
 const links=form?[...form.querySelectorAll('.ia-link-fields')].map(row=>({type:row.querySelector('[name="link-type"]').value,title:row.querySelector('[name="link-title"]').value,url:row.querySelector('[name="link-url"]').value})):[];
 const formId=form?.id;
 setBusy(true);
 try{const response=await fetch(endpoint,{cache:'no-store'});if(!response.ok)throw Error('Serviço de dados indisponível.');apply(await response.json());ready=true;render();
   if(formId){const target=root.querySelector('#'+formId);if(target){
     if(changed.some(name=>name.startsWith('link-'))){target.querySelector('#ia-link-fields').innerHTML=links.map(linkFields).join('');target.querySelector('#ia-link-fields').closest('details').open=true;}
     for(const name of changed.filter(name=>!name.startsWith('link-'))){const entries=values[name]||[];[...target.elements].filter(x=>x.name===name).forEach((x,index)=>{if(x.type==='checkbox')x.checked=entries.includes(x.value);else x.value=entries[index]??'';});}
     if(changed.length)target.dataset.dirty='true';
   }}
   notice(preserve?'Base recarregada. Revise seu formulário e salve novamente.':'');note('Base carregada · revisão '+state.revision);
 }catch(e){notice(ready?'Não foi possível atualizar a base. Seu formulário foi preservado.':'Inicie o serviço com npm run initiatives e abra http://127.0.0.1:4382/modules/initiatives/. Um servidor estático não grava o arquivo JSON.',true);if(!ready)content.innerHTML='<section class="ia-panel"><h1>Conectar à base</h1><p>Execute <code>npm run initiatives</code> na pasta da plataforma.</p><p>Depois abra o módulo pelo endereço do serviço local.</p></section>';}
 finally{setBusy(false);}
}
async function persist(){
 setBusy(true);note('Salvando no arquivo…');
 try{const proposal=C.validate(snapshot());const response=await fetch(endpoint,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(proposal)});const data=await response.json();if(!response.ok)throw Error(data.error||'Falha ao salvar.');apply(data);notice('');note('Salvo no arquivo · revisão '+state.revision+' · '+new Date(state.updatedAt).toLocaleTimeString('pt-BR'));return true;}
 catch(e){apply(lastSaved);note('Gravação não confirmada');notice(e.message+' Se necessário, use Recarregar base. Os campos em edição foram preservados.',true);return false;}
 finally{setBusy(false);}
}
function ask(title,text){return new Promise(resolve=>{const dialog=$('#ia-dialog');dialog.innerHTML=`<div class="dialog-content"><h2 id="ia-dialog-title">${esc(title)}</h2><p>${esc(text)}</p><div class="actions"><button class="btn" data-answer="cancel">Cancelar</button><button class="btn primary" data-answer="confirm">Confirmar</button></div></div>`;dialog.onclose=()=>resolve(dialog.returnValue==='confirm');dialog.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>dialog.close(button.dataset.answer));dialog.returnValue='cancel';dialog.showModal();});}
let view='list', selected=null, period=localMonth(), query='', area='', status='', quality='Medido', presenting=false, confirmDelete=null;
const measureDrafts=new Map();
const draftKey=()=>`${selected}:${period}`;
const month=()=>{const label=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(`${period}-01T12:00:00`));return label.charAt(0).toUpperCase()+label.slice(1);};
function readMeasureForm(form){const data=new FormData(form),record={evidence:String(data.get('evidence')||'').trim()};metricKeys.forEach(key=>{const raw=data.get(key);record[key]={value:raw===''?null:Number(raw),quality:data.get(key+'-quality')};});return record;}
const icon=name=>`<span aria-hidden="true">${({plus:'＋',pencil:'✎',presentation:'▣','arrow-left':'←','columns-3':'☷'}[name]||'')}</span>`;
const note=text=>document.querySelector('#ia-feedback').textContent=text;
const option=(v,current,label=v)=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(label)}</option>`;
const statusBadge=s=>`<span class="ia-badge ${s==='Em uso'?'ia-good':s==='Ideia'||s==='Em avaliação'?'ia-amber':''}">${esc(s)}</span>`;
function filtered(){return items.filter(i=>(!query||(i.name+' '+i.description+' '+i.owner).toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))&&(!area||i.areas.includes(area))&&(!status||i.status===status)&&(!kindFilter||(kindFilter==='__untyped__'?!i.kind:i.kind===kindFilter)));}
function metricValue(i,k){return i.metrics[period]?.[k]??{value:null,quality:'Estimado'};}
function metricLabel(k,v){return k==='hours'?`${fmt(v)} h`:k==='tokens'?fmt(v):money(v);}
function qualifies(x){return x.value!==null&&Number.isFinite(x.value)&&(quality==='Todos'||x.quality===quality);}
function totals(list,k){return C.summarize(list,period,quality)[k];}
function selector(){return `<label class="ia-period">${view==='measure'?'Mês do registro':'Período'}<input id="ia-period" type="month" min="1900-01" max="9999-12" required value="${period}"></label>`;}
function filters(){return `<div class="ia-tools"><label>Buscar iniciativas<input id="ia-query" value="${esc(query)}" placeholder="Nome, descrição ou responsável"></label><label>Área<select id="ia-area">${option('',area,'Todas as áreas')}${areas.map(a=>option(a.name,area,a.name+(a.active?'':' · arquivada'))).join('')}</select></label><label>Tipo<select id="ia-kind-filter">${option('',kindFilter,'Todos os tipos')}${option('__untyped__',kindFilter,'Sem tipo')}${kinds.map(k=>option(k.name,kindFilter,k.name+(k.active?'':' · arquivado'))).join('')}</select></label><label>Status<select id="ia-status">${option('',status,'Todos os status')}${statuses.map(s=>option(s,status)).join('')}</select></label></div>`;}
function qualityControl(){return `<div class="ia-row ia-between"><label class="ia-row" style="flex-direction:row;align-items:center">Indicadores<select id="ia-quality" style="width:auto">${option('Medido',quality,'Somente medidos')}${option('Estimado',quality,'Somente estimados')}${option('Todos',quality,'Medidos + estimados')}</select></label><small>${quality==='Todos'?'Totais combinam medições e estimativas':'Valores não informados ficam fora dos totais'}</small></div>`;}
function kpis(list){const h=totals(list,'hours'),s=totals(list,'saving'),c=totals(list,'cost');return `<div class="ia-kpis"><div class="ia-kpi"><small>Iniciativas em uso</small><strong>${list.filter(i=>i.status==='Em uso').length}<span style="font-size:14px;color:var(--ia-muted)"> / ${list.length}</span></strong><small>No recorte selecionado</small></div>${[[h,'Tempo poupado','hours'],[s,'Redução de gasto','saving'],[c,'Custo de operação','cost']].map(([t,label,k])=>`<div class="ia-kpi"><small>${label}</small><strong>${t.count?metricLabel(k,t.sum):'—'}</strong><small>${t.count} de ${list.length} iniciativas · ${quality==='Todos'?'combinado':quality.toLowerCase()}</small></div>`).join('')}</div>`;}
function table(list,indicators=false){
 const keys=Object.keys(columns).filter(k=>columns[k].show&&(indicators?metricKeys.includes(k):!metricKeys.includes(k)));
 const custom=indicators?[]:extraFields.filter(f=>f.show);
 return `<div class="ia-table-wrap"><table><thead><tr><th>Iniciativa / áreas</th>${keys.map(k=>`<th class="${metricKeys.includes(k)?'ia-num':''}">${columns[k].label}</th>`).join('')}${custom.map(f=>`<th>${esc(f.name)}</th>`).join('')}</tr></thead><tbody>${list.map(i=>`<tr><td><button class="ia-name" data-open="${i.id}">${esc(i.name)}</button><small class="ia-desc" ${design.descriptions&&!indicators?'':'hidden'}>${esc(i.description)}</small><div class="ia-areas">${i.areas.map(a=>`<span class="ia-badge">${esc(a)}</span>`).join('')}</div></td>${keys.map(k=>{if(k==='kind')return `<td>${i.kind?`<span class="ia-badge">${esc(i.kind)}</span>`:'<small>Sem tipo</small>'}</td>`;if(k==='owner')return `<td>${esc(i.owner||'Não informado')}</td>`;if(k==='status')return `<td>${statusBadge(i.status)}</td>`;const v=metricValue(i,k);return `<td class="ia-num">${qualifies(v)?`${metricLabel(k,v.value)}<small>${v.quality}</small>`:v.value===null?'<small>Não informado</small>':'<small>Fora do recorte</small>'}</td>`;}).join('')}${custom.map(f=>`<td>${esc(i.custom[f.id]||'—')}</td>`).join('')}</tr>`).join('')}</tbody></table>${list.length?'':'<div class="ia-empty">Nenhuma iniciativa encontrada para estes filtros.</div>'}</div>`;
}
const design={density:'Confortável',descriptions:true};
function render(){
root.style.setProperty('--ia-cell-pad',design.density==='Compacta'?'10px':'16px');
document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view||(['detail','edit','measure'].includes(view)&&b.dataset.view==='list');b.setAttribute('aria-current',active?'page':'false');b.classList.toggle('active',active);b.hidden=presenting&&b.dataset.view==='settings';});
document.querySelector('#ia-present').innerHTML=icon(presenting?'pencil':'presentation')+(presenting?'Voltar à edição':'Apresentar');
if(view==='list')renderList();else if(view==='results')renderResults();else if(view==='settings')renderSettings();else if(view==='detail')renderDetail();else if(view==='edit')renderEdit();else if(view==='measure')renderMeasure();
if(view==='edit'){
 const value=current()?.kind||'';
 content.querySelector('#ia-edit-form > .ia-grid').insertAdjacentHTML('beforeend',`<label class="ia-full">Tipo · opcional<select name="initiative-kind">${option('',value,'Sem tipo')}${kinds.filter(k=>k.active||k.name===value).map(k=>option(k.name,value,k.name+(k.active?'':' · arquivado'))).join('')}</select><small>Os tipos podem ser cadastrados em Configurações.</small></label>`);
}
if(view==='detail'&&current()){const item=current();content.querySelector('.ia-heading .ia-row').insertAdjacentHTML('beforeend',`<span class="ia-badge">${esc(item.kind||'Sem tipo')}</span>`);}
const periodLabel=content.querySelector('.ia-period');
if(periodLabel){const actions=periodLabel.parentElement;if(actions.classList.contains('ia-row')){actions.classList.add('ia-period-actions');actions.classList.remove('ia-row');}}
if(['list','results','settings'].includes(view)){const heading=content.querySelector('h1');if(heading)heading.insertAdjacentHTML('beforebegin','<p class="ia-eyebrow">INFRAESTRUTURA E PROJETOS</p>');}
const saveInitiative=content.querySelector('#ia-edit-form button[type="submit"]');if(saveInitiative)saveInitiative.textContent='Salvar iniciativa';
if(view==='detail'&&!presenting)content.querySelector('.ia-heading').insertAdjacentHTML('beforeend','<button class="ia-danger" id="ia-delete-item">Excluir iniciativa</button>');
const saveMetrics=content.querySelector('#ia-measure-form button[type="submit"]');if(saveMetrics)saveMetrics.textContent='Salvar este mês';
if(view==='settings'){
 const grid=content.querySelector('.ia-grid'),columnPanel=grid.children[1];
 columnPanel.classList.add('ia-full');
 columnPanel.innerHTML=`<h3>Colunas das tabelas</h3><div class="ia-grid">${[['Iniciativas',false],['Indicadores',true]].map(([title,isMetric])=>`<fieldset><legend>${title}</legend><div class="ia-stack">${Object.entries(columns).filter(([key])=>metricKeys.includes(key)===isMetric).map(([key,c])=>`<label class="ia-check"><input type="checkbox" data-column="${key}" ${c.show?'checked':''}>${c.label}</label>`).join('')}</div></fieldset>`).join('')}</div><small style="display:block;margin-top:16px">Nome e áreas sempre visíveis. Ocultar uma coluna preserva os dados.</small>`;
 grid.children[0].insertAdjacentHTML('afterend',`<section class="ia-panel"><h3>Tipos de iniciativa</h3>${kinds.map((k,index)=>{const used=items.some(i=>i.kind===k.name);return `<div class="ia-list-row"><span>${esc(k.name)} ${k.active?'':'<small>· arquivado</small>'}</span><button class="ia-quiet" data-kind-action="${index}">${!k.active?'Reativar':used?'Arquivar':'Remover'}</button></div>`;}).join('')}<form id="ia-kind-form" class="ia-row" style="margin-top:16px"><label style="flex:1">Novo tipo<input name="kind" required maxlength="50" placeholder="Ex.: Ferramenta de IA"></label><button type="submit" style="align-self:end">Adicionar</button></form><small style="display:block;margin-top:12px">Campo opcional. Tipos em uso são arquivados, preservando os cadastros existentes.</small></section>`);
}
if(view==='settings'){const storage=content.querySelector('.ia-grid > section:last-child');storage.innerHTML='<h3>Arquivo de dados</h3><p>Alterações são gravadas no arquivo JSON pelo serviço local.</p><small>Use Exportar dados para guardar uma cópia. A versão anterior também é preservada no arquivo .bak.</small>';}
formBaseline=formValues(root.querySelector('form'));
}
function renderList(){const list=filtered();content.innerHTML=`<div class="ia-heading"><div><h1>Iniciativas de IA</h1><p class="ia-muted">Organize as iniciativas por área, tipo e estágio.</p></div>${presenting?'':`<button class="ia-primary" id="ia-new">${icon('plus')}Nova iniciativa</button>`}</div>${filters()}<section class="ia-panel" style="padding:0"><div class="ia-row ia-between" style="padding:17px 20px 7px"><h2>Iniciativas <span class="ia-badge">${list.length}</span></h2>${presenting?'':`<button class="ia-quiet" id="ia-columns">${icon('columns-3')}Colunas</button>`}</div>${table(list)}</section>`;}
function renderResults(){
 const list=filtered();
 content.innerHTML=`<div class="ia-heading"><div><h1>Indicadores</h1><p class="ia-muted">Acompanhe tempo poupado, redução de gasto e custos por mês.</p></div>${selector()}</div>${filters()}${qualityControl()}${kpis(list)}
 <section class="ia-panel" style="padding:0;margin-bottom:20px"><div class="ia-row ia-between" style="padding:17px 20px 12px"><h2>Indicadores por iniciativa</h2><small>${month()}</small></div>${table(list,true)}</section>
 <div class="ia-result-grid"><section class="ia-panel"><h3>Estágio das iniciativas</h3>${statuses.map(s=>{const n=list.filter(i=>i.status===s).length;return `<div style="margin-top:14px"><div class="ia-row ia-between"><span>${s}</span><span>${n}</span></div><div class="ia-track"><span style="width:${list.length?n/list.length*100:0}%"></span></div></div>`}).join('')}</section>
 <section class="ia-panel"><h3>Participação por área</h3>${areas.map(a=>{const n=list.filter(i=>i.areas.includes(a.name)).length;return n?`<div class="ia-list-row"><span>${esc(a.name)}</span><span>${n} iniciativas</span></div>`:''}).join('')}<small style="display:block;margin-top:16px">Uma iniciativa pode aparecer em mais de uma área. O total geral conta cada iniciativa uma vez.</small></section>
 <section class="ia-panel"><h3>Preenchimento do mês</h3>${metricKeys.map(k=>{const values=list.map(i=>metricValue(i,k)).filter(x=>x.value!==null&&Number.isFinite(x.value));const measured=values.filter(x=>x.quality==='Medido').length;return `<div class="ia-list-row"><div><span>${columns[k].label}</span><small style="display:block">${measured} medidos · ${values.length-measured} estimados</small></div><span>${values.length} de ${list.length}</span></div>`}).join('')}<small style="display:block;margin-top:16px">Iniciativas que informaram cada valor neste mês, incluindo zero e estimativas. Respeita os filtros de área, tipo, status e busca; independe do filtro de qualidade.</small></section></div>`;
}
function current(){return items.find(i=>i.id===selected);}
function back(label='Voltar ao portfólio'){return `<button class="ia-quiet" id="ia-back" style="margin-bottom:16px;padding-left:0">${icon('arrow-left')}${label}</button>`;}
function renderDetail(){const i=current();if(!i){view='list';render();return;}const record=i.metrics[period];content.innerHTML=`${back()}<div class="ia-heading"><div><div class="ia-row" style="margin-bottom:10px">${statusBadge(i.status)}${i.areas.map(a=>`<span class="ia-badge">${esc(a)}</span>`).join('')}</div><h1>${esc(i.name)}</h1><p class="ia-muted">${esc(i.owner||'Responsável não informado')} · atualizado em ${esc(i.updated)}</p></div>${presenting?'':`<button id="ia-edit">${icon('pencil')}Editar iniciativa</button>`}</div><div class="ia-grid"><section class="ia-panel"><h3>Problema e solução</h3><p class="ia-copy">${esc(i.description)}</p><hr class="ia-rule"><h3>Arquitetura</h3><p class="ia-copy">${esc(i.architecture||'Ainda não informada')}</p><small style="display:block;margin-top:16px">Modelo / provedor: ${esc(i.model||'Não informado')}</small></section><section class="ia-panel"><h3>Documentação e recursos</h3>${i.links.length?i.links.map(l=>`<div class="ia-list-row"><div><small>${esc(l.type)}</small><div><a class="ia-link" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.title||l.type)} ↗</a></div></div></div>`).join(''):'<p class="ia-muted">Nenhum link cadastrado.</p>'}</section><section class="ia-panel ia-full"><div class="ia-row ia-between"><h2>Registro mensal</h2><div class="ia-row">${selector()}${presenting?'':`<button class="ia-primary" id="ia-measure">${icon('plus')}${record?'Editar registro':'Registrar indicadores'}</button>`}</div></div><div class="ia-kpis">${['hours','saving','cost','tokens'].map(k=>{const x=metricValue(i,k);return `<div class="ia-kpi" style="background:var(--ia-bg)"><small>${columns[k].label}${k==='cost'?' · IA + infra':''}</small><strong>${x.value===null?'—':metricLabel(k,x.value)}</strong><span class="ia-badge ${x.value===null?'':x.quality==='Medido'?'ia-good':'ia-amber'}">${x.value===null?'Não informado':x.quality}</span></div>`}).join('')}</div><h3>Evidência / premissas</h3><p class="ia-copy ia-muted">${esc(record?.evidence||'Ainda não há registro para este mês.')}</p></section>${extraFields.length?`<section class="ia-panel ia-full"><h3>Informações adicionais</h3>${extraFields.map(f=>`<div class="ia-list-row"><span>${esc(f.name)}</span><span>${esc(i.custom[f.id]||'Não informado')}</span></div>`).join('')}</section>`:''}</div>`;}
function renderEdit(){const i=current()||{name:'',areas:[],status:'Ideia',owner:'',description:'',architecture:'',model:'',links:[],custom:{}};content.innerHTML=`${back()}<div class="ia-heading"><div><h1>${selected?'Editar iniciativa':'Nova iniciativa'}</h1><p class="ia-muted">Comece pelo essencial. Os indicadores podem ser registrados depois.</p></div></div><form id="ia-edit-form" class="ia-panel ia-stack"><div class="ia-grid"><label class="ia-full">Nome *<input name="name" required maxlength="120" value="${esc(i.name)}" placeholder="Ex.: Assistente de diagnóstico de redes"></label><label class="ia-full">Descrição *<textarea name="description" required placeholder="Qual problema resolve e como a IA ajuda?">${esc(i.description)}</textarea></label><fieldset class="ia-full"><legend>Áreas envolvidas *</legend><div class="ia-row">${areas.filter(a=>a.active||i.areas.includes(a.name)).map(a=>`<label class="ia-check"><input type="checkbox" name="areas" value="${esc(a.name)}" ${i.areas.includes(a.name)?'checked':''}>${esc(a.name)}${a.active?'':' (arquivada)'}</label>`).join('')}</div></fieldset><label>Status<select name="status">${statuses.map(s=>option(s,i.status)).join('')}</select></label><label>Responsável<input name="owner" value="${esc(i.owner)}" placeholder="Pessoa ou equipe"></label></div><details><summary>Arquitetura e modelo</summary><div class="ia-grid"><label class="ia-full">Arquitetura<textarea name="architecture" placeholder="Componentes e fluxo principal">${esc(i.architecture)}</textarea></label><label class="ia-full">Modelo / provedor<input name="model" value="${esc(i.model)}" placeholder="Pode ser preenchido depois"></label></div></details><details ${i.links.length?'open':''}><summary>Documentação e links</summary><div id="ia-link-fields" class="ia-stack">${i.links.map(linkFields).join('')}</div><button type="button" id="ia-add-link" style="margin-top:12px">${icon('plus')}Adicionar link</button></details>${extraFields.length?`<details open><summary>Campos personalizados</summary><div class="ia-grid">${extraFields.map(f=>`<label>${esc(f.name)}<input name="custom-${f.id}" type="${f.type}" ${f.type==='number'?'step="any"':''} value="${esc(i.custom[f.id]||'')}"></label>`).join('')}</div></details>`:''}<p id="ia-form-error" class="ia-error" role="alert"></p><div class="ia-row"><button class="ia-primary" type="submit">Salvar iniciativa</button><button type="button" id="ia-cancel">Cancelar</button></div></form>`;}
function linkFields(l={type:'Confluence',title:'',url:''}){return `<div class="ia-link-fields ia-grid"><label>Tipo<select name="link-type">${['Confluence','Arquitetura','Painel','Repositório do projeto','Repositório IaC','Outro'].map(t=>option(t,l.type)).join('')}</select></label><label>Título<input name="link-title" value="${esc(l.title)}" placeholder="Nome do recurso"></label><label>Endereço<input type="url" name="link-url" required value="${esc(l.url)}" placeholder="https://..."></label><div class="ia-row"><button type="button" data-remove-link>Remover link</button></div></div>`;}
function renderMeasure(){
 const i=current();if(!i){view='list';render();return;}const saved=i.metrics[period],draft=measureDrafts.get(draftKey()),record=draft||saved;
 content.innerHTML=`${back('Voltar à iniciativa')}<div class="ia-heading"><div><h1>Registrar indicadores</h1><p class="ia-muted">${esc(i.name)}</p></div></div>
 <form id="ia-measure-form" class="ia-panel ia-stack">
 <div class="ia-row ia-between" style="align-items:flex-end">${selector()}<span class="ia-badge ${saved?'ia-good':'ia-amber'}">${draft?'Rascunho deste mês':saved?'Registro existente':'Novo registro'}</span></div>
 <small>${month()} · ${saved?'Ao salvar, os valores deste mês serão atualizados.':'Ainda não há indicadores salvos para este mês.'}</small>
 <div class="ia-grid">${[['hours','Tempo poupado (horas/mês)'],['saving','Redução de gasto (R$/mês)'],['cost','Custo de operação: IA + infra (R$/mês)'],['tokens','Tokens consumidos no mês']].map(([k,label])=>{const x=record?.[k]||{value:null,quality:'Estimado'};return `<div class="ia-metric"><label>${label}<input type="number" min="0" step="${k==='tokens'?'1':k==='hours'?'0.1':'0.01'}" name="${k}" value="${x.value??''}" placeholder="Não informado"></label><label>Qualidade<select name="${k}-quality">${option('Estimado',x.quality)}${option('Medido',x.quality)}</select></label></div>`;}).join('')}
 <label class="ia-full">Evidências e premissas<textarea name="evidence" placeholder="Ex.: 100 execuções × 25 minutos poupados; custo informado na fatura.">${esc(record?.evidence||'')}</textarea></label></div>
 <small>Em branco = não informado. Zero = valor conhecido igual a zero. Horas poupadas não são convertidas automaticamente em dinheiro.</small>
 <small>Ao trocar de mês, o rascunho fica preservado nesta sessão. Salve cada mês separadamente.</small>
 <div class="ia-row"><button type="submit" class="ia-primary">Salvar este mês</button><button type="button" id="ia-cancel-measure">Cancelar</button></div></form>`;
}
function renderSettings(){content.innerHTML=`<div class="ia-heading"><div><h1>Configurações</h1><p class="ia-muted">Adapte o catálogo à organização da sua área.</p></div></div><div class="ia-grid"><section class="ia-panel"><h3>Áreas</h3>${areas.map((a,idx)=>{const used=items.some(i=>i.areas.includes(a.name));return `<div class="ia-list-row"><span>${esc(a.name)} ${a.active?'':'<small>· arquivada</small>'}</span><button class="ia-quiet" data-area-action="${idx}">${!a.active?'Reativar':used?'Arquivar':'Remover'}</button></div>`}).join('')}<form id="ia-area-form" class="ia-row" style="margin-top:16px"><label style="flex:1">Nova área<input name="area" required maxlength="50" placeholder="Ex.: Segurança"></label><button type="submit" style="align-self:end">Adicionar</button></form><small style="display:block;margin-top:12px">Áreas em uso são arquivadas e continuam nos registros existentes.</small></section><section class="ia-panel"><h3>Colunas da tabela</h3><div class="ia-stack">${Object.entries(columns).map(([k,c])=>`<label class="ia-check"><input type="checkbox" data-column="${k}" ${c.show?'checked':''}>${c.label}</label>`).join('')}</div><small style="display:block;margin-top:16px">Nome e áreas sempre visíveis. Ocultar uma coluna preserva os dados.</small></section><section class="ia-panel ia-full"><h3>Campos personalizados</h3>${extraFields.length?extraFields.map(f=>`<div class="ia-list-row"><label class="ia-check"><input type="checkbox" data-custom-show="${f.id}" ${f.show?'checked':''}>${esc(f.name)} <small>${esc({text:'Texto',number:'Número',url:'Link',date:'Data'}[f.type])}</small></label><div class="ia-row">${confirmDelete===f.id?`<small>Excluir os valores deste campo?</small><button data-delete-field="${f.id}">Confirmar exclusão</button><button id="ia-cancel-delete">Cancelar</button>`:`<button class="ia-quiet" data-confirm-field="${f.id}">Excluir campo</button>`}</div></div>`).join(''):'<p class="ia-muted">Nenhum campo adicional.</p>'}<form id="ia-field-form" class="ia-tools" style="margin:18px 0 0"><label>Nome do campo<input name="field" required maxlength="60" placeholder="Ex.: Patrocinador"></label><label>Tipo<select name="type"><option value="text">Texto</option><option value="number">Número</option><option value="url">Link</option><option value="date">Data</option></select></label><button type="submit">Adicionar campo</button></form></section><section class="ia-panel ia-full"><div class="ia-row ia-between"><h3 style="margin:0">Arquivo de dados</h3><span class="ia-badge ia-amber">Fluxo proposto</span></div><div class="ia-row" style="margin-top:16px"><span class="ia-badge">Abrir arquivo</span><span>→</span><span class="ia-badge">Editar iniciativas</span><span>→</span><span class="ia-badge">Baixar arquivo atualizado</span></div><small style="display:block;margin-top:14px">Base proposta: iniciativas.json · atualização por um editor de cada vez · publicação manual da versão para consulta.</small></section></div>`;}
function preserveMetricDraft(){const form=root.querySelector('#ia-measure-form');if(form&&view==='measure')measureDrafts.set(draftKey(),readMeasureForm(form));}
function go(v){if(view==='measure'&&v!==view)preserveMetricDraft();view=v;render();}
document.addEventListener('click',async e=>{
const b=e.target.closest('button,[data-view]');if(!b||busy)return;
if(b.id==='ia-reload'){await load({preserve:true});return;}
if(b.id==='ia-export'){if(!ready)return;const blob=new Blob([JSON.stringify(lastSaved,null,2)+'\n'],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iniciativas-'+localMonth()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);return;}
if(!ready)return;
if(b.dataset.view){e.preventDefault();if(view==='edit'&&root.querySelector('form')?.dataset.dirty&&!(await ask('Sair sem salvar?', 'As alterações deste formulário serão descartadas.')))return;go(b.dataset.view);return;}
if(b.dataset.open){selected=b.dataset.open;go('detail');return;}
if(b.id==='ia-present'){presenting=!presenting;if(['settings','edit','measure'].includes(view))view='list';document.body.dataset.presenting=String(presenting);render();note(presenting?'Modo de apresentação':'Modo de edição');return;}
if(b.id==='ia-new'){selected=null;go('edit');}
if(b.id==='ia-delete-item'){if(await ask('Excluir iniciativa?', 'A iniciativa e seus registros mensais serão removidos.')){items=items.filter(i=>i.id!==selected);if(await persist()){selected=null;go('list');}}}
if(b.id==='ia-columns')go('settings');
if(b.id==='ia-back')go(view==='measure'?'detail':'list');
if(b.id==='ia-edit')go('edit');
if(b.id==='ia-measure')go('measure');
if(b.id==='ia-cancel')go(selected?'detail':'list');
if(b.id==='ia-cancel-measure'){measureDrafts.delete(draftKey());view='detail';render();}
if(b.id==='ia-add-link'){root.querySelector('#ia-link-fields').insertAdjacentHTML('beforeend',linkFields());}
if(b.hasAttribute('data-remove-link'))b.closest('.ia-link-fields').remove();
if(b.hasAttribute('data-area-action')){const idx=Number(b.dataset.areaAction),a=areas[idx];if(!a.active)a.active=true;else if(items.some(i=>i.areas.includes(a.name)))a.active=false;else{areas.splice(idx,1);if(area===a.name)area='';}if(await persist())render();}
if(b.hasAttribute('data-kind-action')){const idx=Number(b.dataset.kindAction),kind=kinds[idx];if(!kind.active)kind.active=true;else if(items.some(i=>i.kind===kind.name))kind.active=false;else{kinds.splice(idx,1);if(kindFilter===kind.name)kindFilter='';}if(await persist())render();}
if(b.dataset.confirmField){confirmDelete=b.dataset.confirmField;render();}
if(b.id==='ia-cancel-delete'){confirmDelete=null;render();}
if(b.dataset.deleteField){const id=b.dataset.deleteField;extraFields=extraFields.filter(f=>f.id!==id);items.forEach(i=>delete i.custom[id]);if(await persist()){confirmDelete=null;render();}}
});
root.addEventListener('change',async e=>{
if(busy||!ready)return;
const t=e.target;
if(t.id==='ia-period'){
 const next=t.value;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(next)||!t.checkValidity()){t.value=period;note('Escolha um mês e ano válidos.');return;}
 if(next===period)return;
 const form=root.querySelector('#ia-measure-form');
 if(form){if(!form.reportValidity()){t.value=period;return;}measureDrafts.set(draftKey(),readMeasureForm(form));}
 period=next;render();
 if(view==='measure')note(`Período do registro: ${month()}. Salvar atualiza apenas este mês.`);
}
if(t.id==='ia-area'){area=t.value;render();}
if(t.id==='ia-kind-filter'){kindFilter=t.value;render();}
if(t.id==='ia-status'){status=t.value;render();}
if(t.id==='ia-quality'){quality=t.value;render();}
if(t.dataset.column){columns[t.dataset.column].show=t.checked;if(!await persist())t.checked=columns[t.dataset.column].show;}
if(t.dataset.customShow){extraFields.find(f=>f.id===t.dataset.customShow).show=t.checked;if(!await persist())t.checked=extraFields.find(f=>f.id===t.dataset.customShow).show;}
});
root.addEventListener('input',e=>{if(e.target.closest('#ia-edit-form'))e.target.closest('form').dataset.dirty='true';if(e.target.id==='ia-query'){const start=e.target.selectionStart,end=e.target.selectionEnd;query=e.target.value;render();const input=root.querySelector('#ia-query');input.focus();input.setSelectionRange(start,end);}});
root.addEventListener('submit',async e=>{
e.preventDefault();if(busy||!ready)return;const form=e.target,f=new FormData(form);
if(form.id==='ia-area-form'){const name=f.get('area').trim();if(!name)return;if(areas.some(a=>a.name.toLowerCase()===name.toLowerCase())){note('Essa área já está cadastrada.');return;}areas.push({name,active:true});if(await persist())render();}
if(form.id==='ia-kind-form'){const name=f.get('kind').trim();if(!name)return;if(kinds.some(k=>k.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){note('Esse tipo já está cadastrado.');return;}kinds.push({name,active:true});if(await persist())render();}
if(form.id==='ia-field-form'){const name=f.get('field').trim();if(!name)return;if(extraFields.some(x=>x.name.toLowerCase()===name.toLowerCase())){note('Esse campo já existe.');return;}extraFields.push({id:'f'+Date.now(),name,type:f.get('type'),show:true});if(await persist())render();}
if(form.id==='ia-edit-form'){
 const selectedAreas=f.getAll('areas'),name=f.get('name').trim(),description=f.get('description').trim();
 if(!selectedAreas.length||!name||!description){root.querySelector('#ia-form-error').textContent='Preencha nome, descrição e pelo menos uma área.';return;}
 const links=[...form.querySelectorAll('.ia-link-fields')].map(row=>({type:row.querySelector('[name="link-type"]').value,title:row.querySelector('[name="link-title"]').value.trim(),url:row.querySelector('[name="link-url"]').value.trim()}));
 if(links.some(l=>!/^https?:\/\//i.test(l.url))){root.querySelector('#ia-form-error').textContent='Use links iniciados por http:// ou https://.';return;}
 let i=current();if(selected&&!i){notice('Esta iniciativa foi removida por outro editor. Copie os campos e crie uma nova iniciativa, se necessário.',true);return;}const oldSelection=selected;if(!i){i={id:crypto.randomUUID(),metrics:{},custom:{}};items.push(i);selected=i.id;}
 Object.assign(i,{name,description,areas:selectedAreas,kind:String(f.get('initiative-kind')||''),status:f.get('status'),owner:f.get('owner').trim(),architecture:f.get('architecture').trim(),model:f.get('model').trim(),links,updated:today()});
 extraFields.forEach(x=>i.custom[x.id]=String(f.get('custom-'+x.id)||''));if(await persist())go('detail');else selected=oldSelection;
}
if(form.id==='ia-measure-form'){if(!current()){notice('Iniciativa removida. Recarregue a base.',true);return;}current().metrics[period]=readMeasureForm(form);current().updated=today();if(await persist()){measureDrafts.delete(draftKey());view='detail';render();}}
});
load();
})();
