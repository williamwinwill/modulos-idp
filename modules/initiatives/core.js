// Domain shared by the browser and local persistence service.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.InitiativesCore=api;})(globalThis,()=>{
  const statuses=['Ideia','Em avaliação','Em desenvolvimento','Em uso','Pausada','Encerrada'];
  const metricKeys=['hours','saving','cost','tokens'];
  const columnDefaults={kind:{label:'Tipo',show:true},status:{label:'Status',show:true},owner:{label:'Responsável',show:true},hours:{label:'Tempo poupado',show:true},saving:{label:'Redução de gasto',show:true},cost:{label:'Custo de operação',show:true},tokens:{label:'Tokens',show:false}};
  class DataError extends Error{constructor(message,status=422){super(message);this.status=status;}}
  function assert(ok,message){if(!ok)throw new DataError(message);}
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const safeKey=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(x)&&!['__proto__','prototype','constructor'].includes(x);
  const validPeriod=x=>typeof x==='string'&&/^(19\d{2}|[2-9]\d{3})-(0[1-9]|1[0-2])$/.test(x);
  function string(value,label,max=500,required=false){assert(typeof value==='string'&&value.length<=max,`${label}: texto inválido ou muito longo.`);const result=value.trim();assert(!required||result.length>0,`Preencha ${label}.`);return result;}
  function list(value,label,max){assert(Array.isArray(value)&&value.length<=max,`${label}: lista inválida ou muito grande.`);return value;}
  function url(value){const result=string(value,'Link',2048,true);try{const parsed=new URL(result);assert(['http:','https:'].includes(parsed.protocol),'Links devem usar HTTP ou HTTPS.');assert(!parsed.username&&!parsed.password,'Não inclua credenciais nos links.');}catch(e){if(e instanceof DataError)throw e;throw new DataError('Endereço de link inválido.');}return result;}
  function unique(values,label){assert(new Set(values).size===values.length,`${label}: valores duplicados.`);}
  function taxonomy(values,label){const result=list(values,label,200).map(x=>{assert(object(x),`${label}: item inválido.`);assert(typeof x.active==='boolean',`${label}: estado inválido.`);return {name:string(x.name,label,50,true),active:x.active};});unique(result.map(x=>x.name.toLocaleLowerCase('pt-BR')),label);return result;}
  function initial(){return {schemaVersion:1,revision:0,updatedAt:null,areas:['DevOps','Redes','Cloud','Atlas'].map(name=>({name,active:true})),kinds:['Agente','MCP','Skill','Assistente','Assistente agêntico','Workflow com IA'].map(name=>({name,active:true})),extraFields:[],columns:structuredClone(columnDefaults),items:[]};}
  function validate(input){
    assert(object(input)&&input.schemaVersion===1,'Versão de dados não suportada.');
    assert(Number.isSafeInteger(input.revision)&&input.revision>=0,'Revisão inválida.');
    assert(input.updatedAt===null||(typeof input.updatedAt==='string'&&input.updatedAt.length<=40&&Number.isFinite(Date.parse(input.updatedAt))),'Data de atualização inválida.');
    const areas=taxonomy(input.areas,'Áreas'),kinds=taxonomy(input.kinds,'Tipos');
    const extraFields=list(input.extraFields,'Campos',50).map(f=>{assert(object(f)&&safeKey(f.id),'Identificador de campo inválido.');assert(['text','number','url','date'].includes(f.type)&&typeof f.show==='boolean','Tipo de campo inválido.');return {id:f.id,name:string(f.name,'Nome do campo',60,true),type:f.type,show:f.show};});
    unique(extraFields.map(f=>f.id),'Campos');unique(extraFields.map(f=>f.name.toLocaleLowerCase('pt-BR')),'Nomes dos campos');
    assert(object(input.columns),'Colunas inválidas.');const columns={};
    for(const [key,definition] of Object.entries(columnDefaults)){assert(object(input.columns[key])&&typeof input.columns[key].show==='boolean','Coluna inválida.');columns[key]={...definition,show:input.columns[key].show};}
    const items=list(input.items,'Iniciativas',2000).map(i=>{
      assert(object(i)&&safeKey(String(i.id)),'Identificador da iniciativa inválido.');
      assert(statuses.includes(i.status),'Status inválido.');
      const selectedAreas=list(i.areas,'Áreas da iniciativa',200).map(a=>string(a,'Área',50,true));assert(selectedAreas.length>0,'Selecione pelo menos uma área.');unique(selectedAreas,'Áreas da iniciativa');assert(selectedAreas.every(a=>areas.some(x=>x.name===a)),'Área não cadastrada.');
      const kind=string(i.kind,'Tipo',50);assert(!kind||kinds.some(x=>x.name===kind),'Tipo não cadastrado.');
      const links=list(i.links,'Links',100).map(l=>{assert(object(l),'Link inválido.');return {type:string(l.type,'Tipo do link',80,true),title:string(l.title,'Título do link',200),url:url(l.url)};});
      assert(object(i.metrics)&&Object.keys(i.metrics).length<=1200,'Registros mensais inválidos.');const metrics={};
      for(const [period,record] of Object.entries(i.metrics)){
        assert(validPeriod(period)&&object(record),'Período inválido.');const clean={evidence:string(record.evidence,'Evidências',10000)};
        for(const key of metricKeys){const x=record[key];assert(object(x)&&['Medido','Estimado'].includes(x.quality),'Qualidade do indicador inválida.');assert(x.value===null||(typeof x.value==='number'&&Number.isFinite(x.value)&&x.value>=0&&x.value<=Number.MAX_SAFE_INTEGER),'Indicadores precisam ser números não negativos ou ficar vazios.');assert(key!=='tokens'||x.value===null||Number.isSafeInteger(x.value),'Tokens devem ser inteiros.');clean[key]={value:x.value,quality:x.quality};}
        metrics[period]=clean;
      }
      assert(object(i.custom),'Campos personalizados inválidos.');const custom={};
      for(const f of extraFields){const value=string(i.custom[f.id]??'',f.name,4000);if(value&&f.type==='url')url(value);if(value&&f.type==='number')assert(Number.isFinite(Number(value)),`${f.name}: número inválido.`);if(value&&f.type==='date'){const date=new Date(value+'T12:00:00Z');assert(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value,`${f.name}: data inválida.`);}custom[f.id]=value;}
      return {id:String(i.id),name:string(i.name,'Nome',120,true),description:string(i.description,'Descrição',10000,true),areas:selectedAreas,kind,status:i.status,owner:string(i.owner,'Responsável',200),architecture:string(i.architecture,'Arquitetura',20000),model:string(i.model,'Modelo/provedor',300),links,metrics,custom,updated:string(i.updated,'Última atualização',40)};
    });
    unique(items.map(i=>i.id),'Iniciativas');
    return {schemaVersion:1,revision:input.revision,updatedAt:input.updatedAt,areas,kinds,extraFields,columns,items};
  }
  function revise(current,proposal){if(proposal.revision!==current.revision)throw new DataError('Outra aba atualizou os dados. Recarregue a base antes de tentar novamente; seu formulário foi preservado.',409);const next=validate(proposal);next.revision=current.revision+1;next.updatedAt=new Date().toISOString();return next;}
  function summarize(items,period,quality='Todos'){assert(validPeriod(period),'Período inválido.');const totals={};for(const key of metricKeys){const values=items.map(i=>i.metrics[period]?.[key]).filter(x=>x&&x.value!==null);const included=values.filter(x=>quality==='Todos'||x.quality===quality);totals[key]={sum:included.reduce((sum,x)=>sum+x.value,0),count:included.length,filled:values.length,measured:values.filter(x=>x.quality==='Medido').length,estimated:values.filter(x=>x.quality==='Estimado').length};}return totals;}
  return {DataError,initial,validate,revise,summarize,statuses,metricKeys,validPeriod};
});
