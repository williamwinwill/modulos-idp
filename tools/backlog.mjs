// Cliente compartilhado para Codex e operação manual. O servidor é o único escritor.
const [command,id,payload] = process.argv.slice(2);
const origin = `http://127.0.0.1:${process.env.ATLAS_BACKLOG_PORT || 4381}`;
try {
  const response = await fetch(`${origin}/api/backlog`);
  const board = await response.json();
  if (!response.ok) throw new Error(board.error);
  if (command === 'list') console.log(JSON.stringify({revision:board.revision,items:board.items.map(({id,title,status,module,owner,deferred})=>({id,title,status,module,owner,deferred}))},null,2));
  else if (command === 'get') {const item=board.items.find(item=>item.id===id);if(!item)throw new Error('Item não encontrado.');console.log(JSON.stringify(item,null,2));}
  else if (command === 'update' || command === 'create') {
    const item = JSON.parse(command === 'create' ? id : payload);
    const result = await fetch(`${origin}/api/backlog/items${command === 'update' ? '/'+encodeURIComponent(id) : ''}`,{method:command === 'update'?'PATCH':'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({revision:board.revision,actor:'Codex',item})});
    const data = await result.json(); if (!result.ok) throw new Error(data.error);
    console.log(JSON.stringify(command === 'create' ? data.items.at(-1) : data.items.find(item=>item.id===id),null,2));
  } else throw new Error('Uso: node tools/backlog.mjs list | get ATL-001 | create <json> | update ATL-001 <json>');
} catch (error) {console.error(error.message);process.exitCode=1;}
