import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
const require=createRequire(import.meta.url);
const C=require('./core.js');
export const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const defaultFile=fileURLToPath(new URL('./data/iniciativas.json',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.svg':'image/svg+xml'};
const fail=(message,status)=>new C.DataError(message,status);
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':mime['.json'],'Cache-Control':'no-store'});res.end(JSON.stringify(data));};
function read(file){return C.validate(JSON.parse(fs.readFileSync(file,'utf8')));}
function atomic(file,data){
  const temporary=file+'.'+randomUUID()+'.tmp';
  try{const fd=fs.openSync(temporary,'wx',0o600);try{fs.writeFileSync(fd,JSON.stringify(data,null,2)+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(temporary,file);}
  finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}
}
async function body(req){if(!req.headers['content-type']?.startsWith('application/json'))throw fail('Envie JSON.',415);const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024)throw fail('A base excede o limite de 8 MB.',413);chunks.push(chunk);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw fail('JSON inválido.',400);}}
export function createService({root=projectRoot,file=defaultFile}={}){
  file=path.resolve(file);root=fs.realpathSync(root);fs.mkdirSync(path.dirname(file),{recursive:true});
  // Atomic creation: never replace an existing base, including a corrupt one.
  if(!fs.existsSync(file)){try{fs.writeFileSync(file,JSON.stringify(C.initial(),null,2)+'\n',{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}}
  read(file);
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try{
      const port=server.address()?.port;
      if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host))throw fail('Host não permitido.',403);
      const origin=`http://${req.headers.host}`,url=new URL(req.url,origin);
      if(url.pathname==='/api/initiatives'){
        if(req.headers.origin&&req.headers.origin!==origin)throw fail('Origem não permitida.',403);
        if(req.method==='GET')return json(res,200,read(file));
        if(req.method!=='PUT')throw fail('Método não permitido.',405);
        if(req.headers.origin!==origin)throw fail('Origem obrigatória.',403);
        const proposed=await body(req);
        // Lock only the synchronous read/compare/write transaction. Other processes
        // cannot overwrite a revision between validation and the atomic rename.
        const lock=file+'.lock';let fd;
        try{fd=fs.openSync(lock,'wx',0o600);}catch(e){if(e.code==='EEXIST')throw fail('A base está em gravação ou possui um bloqueio pendente. Tente novamente; consulte o README se persistir.',423);throw e;}
        try{
          fs.writeFileSync(fd,String(process.pid));
          const current=read(file),next=C.revise(current,proposed);
          atomic(file+'.bak',current);atomic(file,next);
          return json(res,200,next);
        }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
      }
      if(url.pathname.startsWith('/api/'))throw fail('API não encontrada.',404);
      if(!['GET','HEAD'].includes(req.method))throw fail('Método não permitido.',405);
      let relative;try{relative=decodeURIComponent(url.pathname);}catch{throw fail('Caminho inválido.',400);}
      if(relative==='/')relative='/index.html';
      if(relative.endsWith('/'))relative+='index.html';
      const segments=relative.split('/');
      if(segments.some(x=>x.startsWith('.')||['node_modules','data'].includes(x))||relative.includes('\\')||relative.endsWith('/data.json'))throw fail('Recurso não permitido.',403);
      const target=fs.realpathSync(path.resolve(root,'.'+relative));
      if(!target.startsWith(root+path.sep)||target===file||!fs.statSync(target).isFile()||!mime[path.extname(target)])throw fail('Recurso não permitido.',403);
      res.writeHead(200,{'Content-Type':mime[path.extname(target)],'Cache-Control':'no-store'});if(req.method==='HEAD')return res.end();fs.createReadStream(target).pipe(res);
    }catch(e){json(res,e.status||(e.code==='ENOENT'?404:500),{error:e instanceof C.DataError?e.message:'Não foi possível ler ou gravar a base. Os dados existentes foram preservados; consulte o terminal.'});if(!e.status&&e.code!=='ENOENT')console.error(e.message);}
  });
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const file=process.env.ATLAS_INITIATIVES_DATA||defaultFile;
    const port=Number(process.env.ATLAS_INITIATIVES_PORT||4382);
    if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Porta inválida.');
    const server=createService({file});server.on('error',e=>{console.error('Servidor não iniciado: '+e.message);process.exitCode=1;});
    server.listen(port,'127.0.0.1',()=>{console.log(`Iniciativas de IA: http://127.0.0.1:${port}/modules/initiatives/`);console.log(`Base JSON: ${path.resolve(file)}`);});
  }catch(e){console.error('Servidor não iniciado: '+e.message);process.exitCode=1;}
}
