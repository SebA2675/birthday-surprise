const REVEAL_AT = '2026-10-28T00:01:00+05:30';
const LETTER_KEY = 'birthday-letter';
const COOKIE = 'birthday_session';
const MAX_ATTEMPTS = 8;
const WINDOW_SECONDS = 600;

function json(data, status=200, headers={}) { return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}}); }
function now() { return Date.now(); }
function isRevealed() { return now() >= new Date(REVEAL_AT).getTime(); }
function getCookie(request) { return (request.headers.get('Cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || ''; }
async function digest(value) { const bytes=new TextEncoder().encode(value); return crypto.subtle.digest('SHA-256',bytes).then(b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('')); }
async function sign(value, secret) { const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']); const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)); return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
async function validSession(token, secret) { if (!token || !secret) return false; const [stamp,mac]=token.split('.'); if (!stamp || !mac || now()-Number(stamp)>86400000) return false; return (await sign(stamp,secret))===mac; }
async function rateLimited(env, request) { if (!env.BIRTHDAY_KV) return false; const ip=request.headers.get('CF-Connecting-IP')||'unknown'; const key='attempts:'+await digest(ip); const item=await env.BIRTHDAY_KV.get(key,{type:'json'}); const current=item && item.expires>now() ? item.count : 0; if (current>=MAX_ATTEMPTS) return true; await env.BIRTHDAY_KV.put(key,JSON.stringify({count:current+1,expires:now()+WINDOW_SECONDS*1000}),{expirationTtl:WINDOW_SECONDS}); return false; }
async function letter(env) { if (!env.BIRTHDAY_KV) return null; const raw=await env.BIRTHDAY_KV.get(LETTER_KEY); if (!raw) return null; try { return JSON.parse(raw); } catch (_) { return {heading:'A birthday letter for you',recipient:'',body:raw,signoff:''}; } }
export async function onRequest({request,env}) {
  const method=request.method; const serverTime=now();
  if (method==='GET' && request.headers.get('X-Status')) return json({serverTime,revealed:isRevealed(),authorized:await validSession(getCookie(request),env.BIRTHDAY_PASSWORD)});
  if (!isRevealed()) return json({error:'The surprise is not ready yet. Come back at the appointed time.',serverTime},403);
  const secret=env.BIRTHDAY_PASSWORD;
  if (!secret) return json({error:'The site is not configured yet.'},500);
  if (method==='GET' && request.headers.get('X-Letter')) { if (!await validSession(getCookie(request),secret)) return json({error:'Please unlock the surprise first.'},401); const data=await letter(env); if (!data) return json({error:'The letter has not been added yet.'},503); return json(data); }
  if (method!=='POST') return json({error:'Method not allowed.'},405);
  if (await rateLimited(env,request)) return json({error:'Too many attempts. Please wait a few minutes.'},429);
  let body; try { body=await request.json(); } catch (_) { return json({error:'Please enter the secret word.'},400); }
  if (!body.password || body.password !== secret) return json({error:'That secret word is not quite right.'},401);
  const stamp=String(serverTime); const token=stamp+'.'+await sign(stamp,secret);
  return json({ok:true},{'Set-Cookie':`${COOKIE}=${token}; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=Strict`});
}
