import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {BoardError,evolve,readBoard,saveBoard,verifyCommit} = require('../management/backlog/core.cjs');
const root = fileURLToPath(new URL('../',import.meta.url));
const file = path.join(root,'management/backlog/data.json');
const port = Number(process.env.ATLAS_BACKLOG_PORT || 4381);
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const json = (res,status,data) => {res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
async function body(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new BoardError('Envie JSON.',415);
  let text = '';
  for await (const chunk of req) {text += chunk; if (Buffer.byteLength(text)>131072) throw new BoardError('Conteúdo muito grande.',413);}
  try {return JSON.parse(text);} catch {throw new BoardError('JSON inválido.',400);}
}
const server = http.createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try {
    if (![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)) throw new BoardError('Host não permitido.',403);
    const url = new URL(req.url,`http://${req.headers.host}`);
    if (url.pathname.startsWith('/api/')) {
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) throw new BoardError('Origem não permitida.',403);
      if (req.method === 'GET' && url.pathname === '/api/backlog') return json(res,200,readBoard(file));
      if (['POST','PATCH'].includes(req.method)) {
        if (req.headers.origin !== `http://${req.headers.host}`) throw new BoardError('Origem obrigatória.',403);
        const data = await body(req);
        let id = null;
        if (req.method === 'PATCH') {const match = url.pathname.match(/^\/api\/backlog\/items\/(ATL-\d+)$/); if (!match) throw new BoardError('Rota inválida.',404); id = match[1];}
        else if (url.pathname !== '/api/backlog/items') throw new BoardError('Rota inválida.',404);
        const board = evolve(readBoard(file),id,data.item,data.actor,data.revision,(ref,itemId) => verifyCommit(root,ref,itemId));
        saveBoard(file,board);
        return json(res,200,board);
      }
      throw new BoardError('Rota não encontrada.',404);
    }
    if (!['GET','HEAD'].includes(req.method)) throw new BoardError('Método não permitido.',405);
    let relative = decodeURIComponent(url.pathname);
    if (relative === '/') relative = '/management/backlog/index.html';
    if (relative.endsWith('/')) relative += 'index.html';
    if (relative.split('/').some(segment => segment.startsWith('.') || segment === 'node_modules') || relative.includes('\\') || relative.endsWith('/data.json')) throw new BoardError('Recurso não permitido.',403);
    const target = fs.realpathSync(path.join(root,relative));
    if (!target.startsWith(fs.realpathSync(root)+path.sep) || !fs.statSync(target).isFile()) throw new BoardError('Recurso não permitido.',403);
    const type = mime[path.extname(target)]; if (!type) throw new BoardError('Recurso não permitido.',403);
    res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(target).pipe(res);
  } catch (error) {json(res,error.status || (error.code === 'ENOENT' ? 404 : 500),{error:error instanceof BoardError ? error.message : 'Não foi possível ler ou salvar o recurso. Confira o servidor e o arquivo de dados.'});}
});
server.on('error',error => {console.error(`Servidor não iniciado: ${error.message}`);process.exitCode = 1;});
server.listen(port,'127.0.0.1',() => console.log(`Backlog Atlas: http://127.0.0.1:${port}/management/backlog/`));
