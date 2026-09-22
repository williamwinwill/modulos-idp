const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const STAGES = ['backlog','refine','hypothesis','todo','doing','validation','done'];
const MODULES = ['agents','repositories','backstage','cross'];
const FIELDS = ['title','module','description','plan','acceptance','hypothesis','hypothesisRequired','hypothesisResult','implementation','verification','validationResult','commit','owner','deferred','status'];
class BoardError extends Error { constructor(message, status = 422) { super(message); this.status = status; } }
function assert(ok, message, status) { if (!ok) throw new BoardError(message, status); }
function validateFields(item) {
  for (const key of FIELDS.filter(k => !['hypothesisRequired','deferred'].includes(k))) {
    assert(typeof item[key] === 'string' && item[key].length <= 20000, `Campo inválido: ${key}.`);
  }
  assert(item.title.trim().length > 0 && item.title.length <= 180, 'Informe um título com até 180 caracteres.');
  assert(MODULES.includes(item.module), 'Módulo inválido.');
  assert(STAGES.includes(item.status), 'Etapa inválida.');
  assert(typeof item.hypothesisRequired === 'boolean' && typeof item.deferred === 'boolean', 'Opção inválida.');
  for (const field of ['hypothesisResult','validationResult']) assert(['pending','approved','rejected'].includes(item[field]), 'Resultado inválido.');
}
function verifyCommit(repo, ref, id, git = process.env.ATLAS_GIT || 'git') {
  assert(/^[a-f0-9]{7,40}$/i.test(ref), 'Informe o hash do commit (7 a 40 caracteres hexadecimais).');
  const run = args => execFileSync(git, ['-C', repo, ...args], {encoding:'utf8', timeout:10000, stdio:['ignore','pipe','pipe']}).trim();
  try {
    const hash = run(['rev-parse','--verify',`${ref}^{commit}`]);
    run(['merge-base','--is-ancestor',hash,'HEAD']);
    const message = run(['show','-s','--format=%B',hash]);
    assert(new RegExp(`(^|[^A-Z0-9-])${id}([^A-Z0-9-]|$)`, 'i').test(message), `O commit deve mencionar ${id} na mensagem para vinculá-lo a este item.`);
    return { hash, subject: run(['show','-s','--format=%s',hash]), checkedAt: new Date().toISOString() };
  } catch (error) {
    if (error instanceof BoardError) throw error;
    throw new BoardError('Não foi possível verificar o commit no histórico atual. Confira o hash, o Git e a branch.');
  }
}
function ready(item) {
  assert(!item.deferred, 'Retire o adiamento antes de iniciar este item.');
  assert(item.plan.trim() && item.acceptance.trim(), 'Para To do, registre o plano e os critérios de aceite.');
  if (item.hypothesisRequired) assert(item.hypothesis.trim() && item.hypothesisResult === 'approved', 'Valide a hipótese exigida antes de entrar em To do.');
}
function evolve(board, id, patch, actor, expectedRevision, checkCommit, now = new Date().toISOString()) {
  assert(board.revision === expectedRevision, 'O quadro foi atualizado. Recarregue os dados antes de salvar; seu texto continua no formulário.', 409);
  assert(actor === 'Você' || actor === 'Codex', 'Autor inválido.');
  assert(patch && typeof patch === 'object' && !Array.isArray(patch), 'Atualização inválida.');
  for (const key of Object.keys(patch)) assert(FIELDS.includes(key), `Campo não permitido: ${key}.`);
  const result = structuredClone(board);
  let item = result.items.find(i => i.id === id);
  const creating = id == null;
  if (creating) {
    const next = Math.max(0,...result.items.map(i => Number(i.id.slice(4)))) + 1;
    item = {id:`ATL-${String(next).padStart(3,'0')}`, title:'',module:'cross',description:'',plan:'',acceptance:'',hypothesis:'',hypothesisRequired:false,hypothesisResult:'pending',implementation:'',verification:'',validationResult:'pending',commit:'',owner:'',deferred:false,status:'backlog',createdAt:now,updatedAt:now,history:[],commitEvidence:null};
    result.items.push(item);
  }
  assert(item, 'Item não encontrado.', 404);
  const previous = structuredClone(item);
  Object.assign(item, patch);
  validateFields(item);
  if (creating) assert(item.status === 'backlog', 'Novas ideias começam no Backlog.');
  const changed = FIELDS.filter(k => item[k] !== previous[k]);
  if (!creating && changed.length === 0) return board;
  if (previous.status === 'done') {
    assert(['backlog','refine'].includes(item.status), 'Reabra o item em Backlog ou Refinar antes de editá-lo.');
    item.commit = ''; item.commitEvidence = null; item.validationResult = 'pending';
  }
  if (changed.some(k => ['plan','acceptance','implementation'].includes(k)) && !Object.hasOwn(patch,'validationResult')) item.validationResult = 'pending';
  if (changed.includes('hypothesis') && !Object.hasOwn(patch,'hypothesisResult')) item.hypothesisResult = 'pending';
  if (['todo','doing','validation','done'].includes(item.status)) ready(item);
  if (item.status === 'doing' && previous.status !== 'doing') assert(['todo','validation'].includes(previous.status), 'Doing começa em To do ou retorna de Validação.');
  if (item.status === 'validation') {
    assert(['doing','validation'].includes(previous.status), 'A implementação precisa passar por Doing antes de Validação.');
    assert(item.implementation.trim() && item.verification.trim(), 'Registre o que foi implementado e os testes realizados.');
  }
  if (item.status === 'done') {
    assert(previous.status === 'validation', 'Conclua a partir de Validação.');
    assert(item.validationResult === 'approved' && item.implementation.trim() && item.verification.trim(), 'Concluído exige validação aprovada e evidências da implementação e dos testes.');
    item.commitEvidence = checkCommit(item.commit, item.id);
    item.commit = item.commitEvidence.hash;
  } else if (previous.status !== 'done') item.commitEvidence = null;
  item.updatedAt = now;
  const changes = {};
  for (const key of FIELDS) if (creating || item[key] !== previous[key]) changes[key] = {from:creating ? null : previous[key], to:item[key]};
  item.history.push({at:now,actor,from:creating ? null : previous.status,to:item.status,changes,commitEvidence:item.commitEvidence});
  result.revision++; result.updatedAt = now;
  return result;
}
function readBoard(file) {
  const board = JSON.parse(fs.readFileSync(file,'utf8'));
  assert(board.schemaVersion === 1 && Number.isInteger(board.revision) && Array.isArray(board.items), 'Arquivo do quadro inválido.', 500);
  const ids = new Set();
  for (const item of board.items) { validateFields(item); assert(/^ATL-\d+$/.test(item.id) && !ids.has(item.id), 'ID inválido ou duplicado.',500); ids.add(item.id); }
  return board;
}
function saveBoard(file, board) {
  const temporary = path.join(path.dirname(file),`.backlog-${process.pid}-${Date.now()}.tmp`);
  try { fs.writeFileSync(temporary,JSON.stringify(board,null,2)+'\n',{flag:'wx'}); fs.renameSync(temporary,file); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
module.exports = {STAGES,MODULES,BoardError,evolve,verifyCommit,readBoard,saveBoard};
