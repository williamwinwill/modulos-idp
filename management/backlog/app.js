(() => {
  const stages = {
    backlog:['Backlog','Ideias que fazem sentido. Uma frase basta; os detalhes vêm depois.'],
    refine:['Refinar','Construímos o plano juntos, com os detalhes que você trouxer e o que precisarmos investigar.'],
    hypothesis:['Validar hipótese','Etapa opcional para experimentar uma ideia antes de assumir a implementação.'],
    todo:['To do','Plano e critérios de aceite definidos. Você pode escolher um item ou pedir que Codex escolha.'],
    doing:['Doing','Implementação iniciada. Responsável, progresso registrado e histórico ficam visíveis aqui.'],
    validation:['Validação','Conferimos a implementação, as evidências e os critérios de aceite.'],
    done:['Concluído','Entrega validada e vinculada a um commit existente. Sem etapa de release por enquanto.']
  };
  const modules = {agents:'Agentes CI/CD',repositories:'Repositórios',backstage:'Backstage',cross:'Transversal'};
  const labels = {title:'título',module:'módulo',description:'ideia',plan:'plano',acceptance:'aceite',hypothesis:'hipótese',hypothesisRequired:'exigência de hipótese',hypothesisResult:'resultado da hipótese',implementation:'implementação',verification:'testes',validationResult:'validação',commit:'commit',owner:'responsável',deferred:'adiamento',status:'etapa'};
  const fields = Object.keys(labels);
  const $ = selector => document.querySelector(selector);
  const form = $('#item-form');
  let board = null, editingId = null, editRevision = null, original = null, saving = false, online = false, refreshing = false;
  const esc = text => String(text ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date = value => new Date(value).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const stage = () => Object.hasOwn(stages,location.hash.slice(1)) ? location.hash.slice(1) : 'backlog';
  function notify(text) {$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').hidden=true,3500);}
  function error(text) {$('#error').textContent=text;$('#error').hidden=!text;}
  function redraw() {
    if (!board) return;
    const current = stage();
    $('#tabs').innerHTML=Object.entries(stages).map(([id,[name]])=>`<button type="button" class="tab" role="tab" id="tab-${id}" aria-controls="stage-panel" aria-selected="${id===current}" data-stage="${id}">${name}<span class="tab-count">${board.items.filter(item=>item.status===id).length}</span></button>`).join('');
    $('#stage-panel').setAttribute('aria-labelledby',`tab-${current}`);
    $('#stage-name').textContent=stages[current][0];$('#stage-description').textContent=stages[current][1];
    const module = $('#module-filter').value;const query=$('#search').value.trim().toLocaleLowerCase('pt-BR');
    const list=board.items.filter(item=>item.status===current && (module==='all'||item.module===module) && `${item.id} ${item.title}`.toLocaleLowerCase('pt-BR').includes(query));
    $('#stage-count').textContent=`${list.length} ${list.length===1?'item':'itens'}`;
    $('#cards').innerHTML=list.length ? list.map(item=>`<button type="button" class="item-card" data-id="${item.id}"><span class="card-top"><span>${item.id}</span><span>${item.deferred?'<span class="pill deferred">Adiado</span>':item.status==='doing'?'<span class="pill doing">Em implementação</span>':item.status==='done'?'<span class="pill done">Commit verificado</span>':''}</span></span><strong>${esc(item.title)}</strong><span class="excerpt">${esc(item.status==='doing' && item.implementation ? item.implementation : item.description||'Vamos construir os detalhes juntos.')}</span><span class="pill">${modules[item.module]}</span><span class="card-bottom"><span>${esc(item.owner||'A definir')}</span><span>${date(item.updatedAt)}</span></span></button>`).join('') : '<div class="empty"><strong>Nenhum item nesta seleção</strong><p>As ideias avançam quando estiverem prontas para o próximo passo.</p></div>';
    $('#footer-count').textContent=`${board.items.length} itens · ${board.items.filter(item=>item.status==='doing').length} em Doing · ${board.items.filter(item=>item.deferred).length} adiados`;
  }
  async function refresh() {
    if (refreshing || saving) return;
    if (location.protocol==='file:') {$('#offline').hidden=false;$('#connection').textContent='Servidor local necessário';return;}
    refreshing=true;
    try {
      const res=await fetch('/api/backlog',{cache:'no-store'});if(!res.ok)throw new Error();const next=await res.json();if(next.schemaVersion!==1)throw new Error();
      const changed=board?.revision!==next.revision;board=next;online=true;$('#new').disabled=false;$('#offline').hidden=true;error('');
      $('#connection').textContent=`● Dados compartilhados · atualização ${date(board.updatedAt)} · revisão ${board.revision}`;
      if(changed)redraw();
      if($('#editor').open && editRevision!==board.revision)$('#conflict').hidden=false;
    } catch {online=false;$('#new').disabled=true;$('#connection').textContent='Sem conexão · último quadro preservado';error('Não foi possível conectar ao servidor do backlog. Inicie npm run backlog na pasta atlas-platform.');if(!board)$('#offline').hidden=false;}
    finally {refreshing=false;}
  }
  function fill(item) {
    for(const field of fields){const input=form.elements.namedItem(field);if(input.type==='checkbox')input.checked=Boolean(item[field]);else input.value=item[field]??'';}
  }
  function requestFor(item) {
    if(!item)return 'Salve a ideia para gerar um pedido com seu ID.';
    const task={backlog:'Converse comigo sobre esta ideia e ajude a decidir se vamos refiná-la.',refine:'Refine comigo o plano e os critérios de aceite. Investigue o projeto quando necessário.',hypothesis:'Ajude a definir e validar a hipótese; registre as evidências e o resultado.',todo:'Implemente este item seguindo o plano e os critérios de aceite. Atualize para Doing ao iniciar, registre progresso e faça commit antes de concluir.',doing:'Consulte o progresso e continue a implementação deste item.',validation:'Valide a implementação e os critérios de aceite. Registre o resultado e conclua somente com commit verificado.',done:'Revise o resultado e o histórico desta entrega.'}[item.status];
    return `Trabalhe no item ${item.id} — ${item.title}, do controle de backlog do Atlas. ${task} Use o quadro compartilhado e as instruções em AGENTS.md.`;
  }
  function openItem(id) {
    const item=board?.items.find(item=>item.id===id);
    editingId=item?.id||null;editRevision=board.revision;original=item?structuredClone(item):null;form.reset();
    fill(item || {title:'',module:'cross',status:'backlog',hypothesisResult:'pending',validationResult:'pending'});
    $('#item-id').textContent=item?.id||'NOVA IDEIA';$('#editor-title').textContent=item?'Detalhes e próximo passo':'Uma ideia para o backlog';
    $('#save').textContent=item?'Salvar alterações':'Salvar ideia';$('#form-error').hidden=true;$('#conflict').hidden=true;
    $('#status').disabled=!item;$('#save-note').textContent=item?'Salvo no projeto, compartilhado com Codex.':'Ideias novas não precisam de plano.';
    $('#planning').open=Boolean(item && ['refine','todo'].includes(item.status));
    $('#hypothesis-section').open=item?.status==='hypothesis';$('#delivery').open=Boolean(item && ['doing','validation','done'].includes(item.status));
    $('#collaborate').hidden=!item;$('#collaborate').open=false;$('#prompt').value=requestFor(item);
    $('#history-section').hidden=!item;$('#history-section').open=false;$('#history-count').textContent=`${item?.history.length||0} registros`;
    $('#history').innerHTML=item ? [...item.history].reverse().map(event=>`<li>${esc(event.actor)} · ${event.from===event.to?'Atualização':`${stages[event.from]?.[0]||'Registro'} → ${stages[event.to]?.[0]||event.to}`}<small>${date(event.at)} · ${esc(Object.keys(event.changes||{}).map(k=>labels[k]||k).join(', '))}</small>${event.note?`<small>${esc(event.note)}</small>`:''}${event.commitEvidence?`<small>Commit: ${esc(event.commitEvidence.hash)}</small>`:''}</li>`).join(''):'';
    $('#commit-evidence').textContent=item?.commitEvidence?`Verificado: ${item.commitEvidence.hash} · ${item.commitEvidence.subject}`:'';
    transitionHelp();if(!$('#editor').open)$('#editor').showModal();
  }
  function transitionHelp() {
    const value=form.elements.status.value;
    $('#transition-help').textContent=value==='done'?'Exige validação aprovada e commit da entrega, com o ID na mensagem.':value==='todo'?'Exige plano, critérios de aceite e hipótese aprovada, se obrigatória.':value==='doing'?'Disponível a partir de To do ou Validação. O registro não dispara Codex automaticamente.':value==='validation'?'Exige implementação em Doing e registro das verificações.':stages[value][1];
    if(value==='done'||value==='validation')$('#delivery').open=true;
    if(value==='todo'||value==='refine')$('#planning').open=true;
    if(value==='hypothesis')$('#hypothesis-section').open=true;
  }
  async function save(event) {
    event.preventDefault();if(saving)return;
    const item={};for(const field of fields){const input=form.elements.namedItem(field);const value=input.type==='checkbox'?input.checked:input.value.trim();if(!original||original[field]!==value)item[field]=value;}
    saving=true;$('#save').disabled=true;$('#form-error').hidden=true;
    try {
      if(!online)throw new Error('Servidor desconectado. Reconecte antes de salvar; seu texto foi preservado.');
      const res=await fetch('/api/backlog/items'+(editingId?'/'+editingId:''),{method:editingId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:editRevision,actor:'Você',item})});
      const data=await res.json();if(!res.ok){if(res.status===409)$('#conflict').hidden=false;throw new Error(data.error);}
      board=data;$('#editor').close();redraw();$('#connection').textContent=`● Dados compartilhados · atualização ${date(board.updatedAt)} · revisão ${board.revision}`;notify('Alterações salvas no quadro.');
    } catch(error){$('#form-error').textContent=error.message;$('#form-error').hidden=false;$('#form-error').scrollIntoView({block:'nearest'});}
    finally{saving=false;$('#save').disabled=false;}
  }
  $('#modules').innerHTML=(globalThis.AtlasPlatform?.modules||[]).map(module=>`<a href="../../${esc(module.path)}">${esc(module.title)}</a>`).join('');
  $('#status').innerHTML=Object.entries(stages).map(([id,[name]])=>`<option value="${id}">${name}</option>`).join('');
  $('#tabs').addEventListener('click',event=>{const button=event.target.closest('[data-stage]');if(button)location.hash=button.dataset.stage;});
  $('#tabs').addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const buttons=[...$('#tabs').querySelectorAll('button')];const index=buttons.indexOf(document.activeElement);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;const id=buttons[next].dataset.stage;location.hash=id;setTimeout(()=>document.getElementById('tab-'+id)?.focus(),0);});
  $('#cards').addEventListener('click',event=>{const button=event.target.closest('[data-id]');if(button)openItem(button.dataset.id);});
  $('#new').addEventListener('click',()=>openItem(null));$('#close').addEventListener('click',()=>$('#editor').close());
  $('#refresh').addEventListener('click',refresh);$('#search').addEventListener('input',redraw);$('#module-filter').addEventListener('change',redraw);
  form.addEventListener('submit',save);$('#status').addEventListener('change',transitionHelp);
  $('#reload-item').addEventListener('click',async()=>{await refresh();if(online)openItem(editingId);});
  $('#copy-prompt').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#prompt').value);notify('Pedido copiado. Envie nesta conversa para continuar.');}catch{$('#prompt').focus();$('#prompt').select();notify('Selecione e copie o pedido.');}});
  addEventListener('hashchange',redraw);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  setInterval(()=>{if(!document.hidden)refresh();},5000);refresh();
})();
