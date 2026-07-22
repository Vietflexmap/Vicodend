import http from 'node:http';
import {issueToken, verifyToken} from './security.js';
import {HashLedger} from './ledger.js';

const env=process.env;
const port=Number(env.PORT||3000), secret=env.VICODE_SECRET||'';
const allowed=new Set((env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean));
const ttl=Math.min(Number(env.TOKEN_TTL_SECONDS||300),900);
if (secret.length<32) throw new Error('VICODE_SECRET must contain at least 32 characters');
if (!allowed.size) throw new Error('ALLOWED_ORIGINS is required');
const ledger=new HashLedger();
const buckets=new Map();
function json(res,status,body,origin='') {
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; frame-ancestors 'none'"};
  if (allowed.has(origin)) Object.assign(headers,{'access-control-allow-origin':origin,'vary':'Origin'});
  res.writeHead(status,headers); res.end(JSON.stringify(body));
}
function limited(ip) { const now=Date.now(), b=buckets.get(ip)||{start:now,count:0}; if(now-b.start>60000){b.start=now;b.count=0} b.count++; buckets.set(ip,b); return b.count>60; }
const server=http.createServer((req,res)=>{
  const origin=req.headers.origin||''; const ip=req.socket.remoteAddress||'unknown';
  if(limited(ip)) return json(res,429,{error:'rate_limited'},origin);
  if(req.method==='GET'&&req.url==='/health') return json(res,200,{ok:true,ledger:ledger.verify()});
  if(!allowed.has(origin)) { ledger.append({type:'origin_denied',origin,ip}); return json(res,403,{error:'origin_denied'}); }
  if(req.method==='POST'&&req.url==='/v1/token') { const token=issueToken(secret,origin,ttl); ledger.append({type:'token_issued',origin}); return json(res,200,{token,expiresIn:ttl},origin); }
  if(req.method==='GET'&&req.url==='/v1/protected') {
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!verifyToken(secret,token,origin)) { ledger.append({type:'token_denied',origin}); return json(res,401,{error:'invalid_token'},origin); }
    return json(res,200,{ok:true,message:'Protected backend response'},origin);
  }
  json(res,404,{error:'not_found'},origin);
});
server.listen(port,'127.0.0.1',()=>console.log(`VICODE listening on 127.0.0.1:${port}`));
