const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {execFileSync} = require('node:child_process');
const {evolve,verifyCommit,saveBoard,readBoard} = require('../core.cjs');
const empty = () => ({schemaVersion:1,revision:0,items:[]});
const step = (board,item,checker=()=>({hash:'abc1234567',subject:'ATL-001: entrega',checkedAt:'2026-09-22'})) => evolve(board,'ATL-001',item,'Codex',board.revision,checker);
const idea = () => evolve(empty(),null,{title:'Item de teste',module:'agents'},'Você',0,()=>{throw new Error('Não deve verificar commit ao criar ideia');});
test('ideia simples, refinamento incompleto e preparação sem hipótese obrigatória',()=>{
  let board=idea();assert.equal(board.items[0].status,'backlog');
  board=step(board,{status:'refine'});
  assert.throws(()=>step(board,{status:'todo'}),/plano/);
  assert.throws(()=>step(board,{status:'doing',plan:'Plano',acceptance:'Aceite'}),/Doing começa/);
  board=step(board,{status:'todo',plan:'Plano',acceptance:'Aceite'});
  assert.equal(board.items[0].status,'todo');assert.equal(board.items[0].history.length,3);
});
test('hipótese obrigatória e adiamento impedem entrada no fluxo de entrega',()=>{
  let board=step(idea(),{status:'hypothesis',plan:'Plano',acceptance:'Aceite',hypothesisRequired:true,hypothesis:'Experimento'});
  assert.throws(()=>step(board,{status:'todo'}),/hipótese exigida/);
  assert.throws(()=>step(board,{status:'todo',hypothesisResult:'approved',deferred:true}),/adiamento/);
  board=step(board,{status:'todo',hypothesisResult:'approved'});assert.equal(board.items[0].status,'todo');
});
test('validação exige evidências e conclusão exige verificação de commit',()=>{
  let board=step(idea(),{status:'todo',plan:'Plano',acceptance:'Aceite'});
  assert.throws(()=>step(board,{status:'done'}),/Conclua a partir/);
  board=step(board,{status:'doing'});
  assert.throws(()=>step(board,{status:'validation'}),/Registre/);
  board=step(board,{status:'validation',implementation:'Alterações',verification:'Testes realizados'});
  assert.throws(()=>step(board,{status:'done',commit:'abc1234'}),/validação aprovada/);
  let checked=false;
  board=step(board,{status:'done',validationResult:'approved',commit:'abc1234'},(ref,id)=>{checked=true;assert.equal(id,'ATL-001');assert.equal(ref,'abc1234');return {hash:'abc123456789',subject:'ATL-001: entrega'};});
  assert.ok(checked);assert.equal(board.items[0].commit,'abc123456789');
  assert.throws(()=>step(board,{title:'Mudar sem reabrir'}),/Reabra/);
  board=step(board,{status:'refine'});assert.equal(board.items[0].commitEvidence,null);assert.equal(board.items[0].validationResult,'pending');assert.ok(board.items[0].history.at(-2).commitEvidence);
});
test('mudança na implementação invalida aprovação; erro de commit não modifica estado',()=>{
  let board=step(idea(),{status:'todo',plan:'Plano',acceptance:'Aceite'});board=step(board,{status:'doing'});
  board=step(board,{status:'validation',implementation:'Código',verification:'Teste',validationResult:'approved'});
  board=step(board,{implementation:'Código mudou'});assert.equal(board.items[0].validationResult,'pending');
  const before=JSON.stringify(board);
  assert.throws(()=>step(board,{status:'done',validationResult:'approved',commit:'abcdef0'},()=>{throw new Error('Commit inexistente');}),/inexistente/);
  assert.equal(JSON.stringify(board),before);
});
test('revisão concorrente é recusada sem perder a primeira alteração',()=>{
  const first=idea();const newer=step(first,{description:'Salvo por outro cliente'});
  assert.throws(()=>evolve(newer,'ATL-001',{description:'Texto antigo'},'Você',first.revision,()=>{}),error=>error.status===409);
  assert.equal(newer.items[0].description,'Salvo por outro cliente');
  assert.throws(()=>step(newer,{commitEvidence:{hash:'falso'}}),/não permitido/);
});
test('persistência mantém histórico e revisão após releitura',()=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-board-'));
  try{const file=path.join(directory,'data.json');const board=idea();saveBoard(file,board);assert.deepEqual(readBoard(file),board);assert.deepEqual(fs.readdirSync(directory),['data.json']);}
  finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('Git real exige hash existente, ID correto e commit ancestral de HEAD',()=>{
  const repo=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-commit-'));
  const git=process.env.ATLAS_GIT||'git';
  const run=args=>execFileSync(git,['-C',repo,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
  try{
    run(['init']);run(['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','ATL-001: primeira entrega']);
    const hash=run(['rev-parse','HEAD']);assert.equal(verifyCommit(repo,hash.slice(0,9),'ATL-001',git).hash,hash);
    assert.throws(()=>verifyCommit(repo,hash,'ATL-002',git),/mencionar ATL-002/);
    assert.throws(()=>verifyCommit(repo,'HEAD;whoami','ATL-001',git),/hash/);
    assert.throws(()=>verifyCommit(repo,'f'.repeat(40),'ATL-001',git),/verificar o commit/);
    run(['checkout','--orphan','other']);run(['-c','user.name=Test','-c','user.email=test@example.invalid','commit','--allow-empty','-m','outra raiz']);
    assert.throws(()=>verifyCommit(repo,hash,'ATL-001',git),/verificar o commit/);
  }finally{fs.rmSync(repo,{recursive:true,force:true});}
});
