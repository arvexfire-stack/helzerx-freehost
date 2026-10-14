import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import { provisionLxc, proxmoxReadiness, manageLxc, inspectLxc, runLxcTerminal, manageLxcSnapshot } from './proxmox.js';
import { readState, writeState } from './database.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app=express(),__dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(__dirname,'..');
const PORT=Number(process.env.PORT||3000),prod=process.env.NODE_ENV==='production';
fs.mkdirSync(path.join(root,'data'),{recursive:true});
const required=['SESSION_SECRET','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI'];
const missing=required.filter(k=>!process.env[k]);if(prod&&missing.length)console.error('[startup] Missing environment variables:',missing.join(', '));
if(prod&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw new Error('SESSION_SECRET must be at least 32 characters in production.');
app.disable('x-powered-by');app.set('trust proxy',1);app.use(express.json({limit:'20kb'}));
app.use(session({name:'hx_freehost_sid',secret:process.env.SESSION_SECRET||'development-only-change-me',resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:prod,sameSite:'lax',maxAge:604800000}}));

/**
 * Pre-release access gate: until the public launch date, only the named Discord
 * account and the configured, authenticated staff admin account may use the app.
 * Keep this before every route/static handler so direct API calls are gated too.
 */
const PRE_RELEASE_ALLOWED_DISCORD_IDS = new Set(['1536553900474114091']);
const PRE_RELEASE_LAUNCH_DATE = '2026-10-17';
const PRE_RELEASE_MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#070910">
<title>HelzerX FreeHost — Preparing for launch</title>
<style>
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#070910;color:#f6f7fb;font-synthesis:none;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
*{box-sizing:border-box}
html{min-height:100%;background:#070910}
body{margin:0;min-height:100svh;overflow-x:hidden;display:grid;place-items:center;padding:clamp(18px,4vw,44px);position:relative;isolation:isolate;background:radial-gradient(ellipse at 50% 0%,rgba(39,104,255,.16),transparent 48%),radial-gradient(ellipse at 100% 80%,rgba(143,67,255,.11),transparent 38%),#070910}
body:before,body:after{content:"";position:fixed;inset:0;pointer-events:none;z-index:-1}
body:before{opacity:.22;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:52px 52px;mask-image:linear-gradient(to bottom,black,transparent 90%)}
body:after{background:radial-gradient(circle at 50% 45%,transparent 0,rgba(3,5,12,.15) 55%,#070910 100%)}
.scene{width:min(100%,940px);perspective:1200px;animation:scene-in 1s cubic-bezier(.2,.75,.2,1) both}
.panel{position:relative;overflow:hidden;isolation:isolate;padding:clamp(28px,6vw,68px) clamp(22px,6vw,76px) clamp(26px,4vw,48px);border:1px solid rgba(172,193,255,.16);border-radius:32px;background:linear-gradient(145deg,rgba(21,27,47,.9),rgba(10,13,25,.91) 58%,rgba(13,13,28,.94));box-shadow:0 40px 120px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.07);text-align:center;transform-style:preserve-3d}
.panel:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 50% -5%,rgba(75,123,255,.18),transparent 48%),linear-gradient(115deg,transparent 25%,rgba(255,255,255,.025) 50%,transparent 75%);background-size:auto,220% 100%;animation:panel-shimmer 9s ease-in-out infinite}
.panel:after{content:"";position:absolute;top:0;left:12%;right:12%;height:1px;background:linear-gradient(90deg,transparent,rgba(131,171,255,.65),rgba(190,143,255,.6),transparent);filter:blur(.3px)}
.brand{display:inline-flex;align-items:center;gap:11px;font-size:12px;font-weight:850;letter-spacing:.2em;text-transform:uppercase;color:#e8edff}
.brand-mark{display:grid;place-items:center;width:34px;height:34px;border-radius:11px;border:1px solid rgba(142,177,255,.4);background:linear-gradient(145deg,rgba(99,142,255,.28),rgba(107,67,208,.14));box-shadow:0 0 28px rgba(80,120,255,.16),inset 0 1px 0 rgba(255,255,255,.2);font-size:13px;letter-spacing:-.08em;color:#fff}
.art{height:228px;max-width:430px;margin:0 auto 2px;position:relative;display:grid;place-items:center;perspective:850px;transform-style:preserve-3d}
.glow{position:absolute;width:180px;height:180px;border-radius:50%;background:#386aff;filter:blur(68px);opacity:.27;animation:glow-pulse 4s ease-in-out infinite}
.core{position:relative;width:104px;height:104px;border-radius:30px;display:grid;place-items:center;transform:rotateX(13deg) rotateY(-18deg) rotateZ(-7deg);transform-style:preserve-3d;background:linear-gradient(145deg,#8bb4ff 0%,#4c72ee 28%,#292a78 70%,#171a3b 100%);border:1px solid rgba(212,226,255,.75);box-shadow:inset 5px 5px 14px rgba(255,255,255,.26),inset -10px -12px 20px rgba(3,5,28,.58),0 24px 55px rgba(42,78,226,.32);animation:core-float 5s ease-in-out infinite}
.core:before{content:"";position:absolute;inset:9px;border:1px solid rgba(230,239,255,.38);border-radius:23px;transform:translateZ(13px);box-shadow:inset 0 0 20px rgba(255,255,255,.06)}
.core:after{content:"HX";font-size:31px;font-weight:900;letter-spacing:-.12em;padding-right:4px;color:#fff;text-shadow:0 2px 18px rgba(255,255,255,.42);transform:translateZ(22px)}
.orbit{position:absolute;width:235px;height:82px;border:1px solid rgba(133,166,255,.58);border-radius:50%;transform-style:preserve-3d;box-shadow:0 0 22px rgba(82,121,255,.1);animation:orbit-spin 10s linear infinite}
.orbit.one{transform:rotateX(68deg) rotateZ(-26deg)}
.orbit.two{width:270px;height:100px;border-color:rgba(183,139,255,.48);transform:rotateX(68deg) rotateZ(48deg);animation-duration:14s;animation-direction:reverse}
.orbit.three{width:190px;height:62px;border-color:rgba(126,206,255,.32);transform:rotateX(72deg) rotateZ(90deg);animation-duration:18s}
.node{position:absolute;width:11px;height:11px;border-radius:50%;background:#c8d8ff;box-shadow:0 0 15px 4px rgba(112,155,255,.6)}
.node.n1{top:40px;left:calc(50% - 128px)}.node.n2{right:calc(50% - 135px);bottom:54px;background:#d9baff;box-shadow:0 0 16px 4px rgba(169,111,255,.6)}.node.n3{top:36px;right:calc(50% - 85px);width:7px;height:7px}
.spark{position:absolute;width:4px;height:4px;border-radius:50%;background:#d9e5ff;box-shadow:0 0 12px 2px rgba(150,180,255,.8);animation:spark-drift 4s ease-in-out infinite}
.spark.s1{top:24px;left:24%;animation-delay:-1s}.spark.s2{right:21%;top:57px;animation-delay:-2.2s}.spark.s3{bottom:22px;left:33%;animation-delay:-.7s}.spark.s4{bottom:44px;right:28%;animation-delay:-3s}
.tag{display:inline-flex;align-items:center;gap:9px;padding:8px 12px;border:1px solid rgba(119,158,255,.25);border-radius:999px;background:rgba(81,119,225,.09);color:#b8cbff;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
.pulse{width:6px;height:6px;border-radius:50%;background:#8aaaff;box-shadow:0 0 0 4px rgba(111,151,255,.12);animation:status-pulse 2s ease-out infinite}
h1{max-width:700px;margin:22px auto 16px;font-size:clamp(34px,6.4vw,62px);font-weight:780;letter-spacing:-.065em;line-height:1.02;text-wrap:balance}
h1 span{display:block;background:linear-gradient(100deg,#fff 12%,#c8d7ff 48%,#a9a5ff 82%);background-clip:text;-webkit-background-clip:text;color:transparent}
.copy{max-width:520px;margin:0 auto;color:#a9b0c5;font-size:clamp(14px,2vw,16px);line-height:1.85;text-wrap:pretty}
.release{display:flex;align-items:center;justify-content:center;gap:14px;max-width:410px;margin:30px auto 0;padding:16px 20px;border:1px solid rgba(157,176,255,.16);border-radius:18px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,255,255,.018));box-shadow:inset 0 1px 0 rgba(255,255,255,.04);text-align:left}
.calendar{flex:0 0 42px;height:42px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,rgba(105,145,255,.2),rgba(125,83,224,.13));border:1px solid rgba(145,171,255,.2);color:#c9d6ff}
.calendar svg{width:20px;height:20px}
.release small{display:block;margin-bottom:5px;color:#7f8aa8;font-size:10px;font-weight:800;letter-spacing:.13em;text-transform:uppercase}
.release strong{display:block;color:#eef1ff;font-size:15px;font-weight:750;letter-spacing:.01em}
.footer{margin-top:30px;color:#69738e;font-size:11px;letter-spacing:.04em}
.footer b{color:#9aa8cc;font-weight:700}
@keyframes scene-in{from{opacity:0;transform:translateY(24px) rotateX(5deg) scale(.985);filter:blur(8px)}to{opacity:1;transform:translateY(0) rotateX(0) scale(1);filter:blur(0)}}
@keyframes core-float{0%,100%{transform:translateY(0) rotateX(13deg) rotateY(-18deg) rotateZ(-7deg)}50%{transform:translateY(-10px) rotateX(18deg) rotateY(-8deg) rotateZ(-3deg)}}
@keyframes orbit-spin{from{rotate:0deg}to{rotate:360deg}}
@keyframes glow-pulse{0%,100%{opacity:.2;transform:scale(.9)}50%{opacity:.38;transform:scale(1.12)}}
@keyframes status-pulse{0%{box-shadow:0 0 0 0 rgba(111,151,255,.4)}75%,100%{box-shadow:0 0 0 7px rgba(111,151,255,0)}}
@keyframes spark-drift{0%,100%{transform:translate3d(0,0,0);opacity:.25}50%{transform:translate3d(5px,-11px,14px);opacity:1}}
@keyframes panel-shimmer{0%,70%,100%{background-position:0 0,100% 0}35%{background-position:0 0,0 0}}
@media(max-width:560px){body{padding:14px}.panel{border-radius:25px;padding:26px 21px 25px}.art{height:190px;transform:scale(.9);margin-top:-4px;margin-bottom:-3px}.core{width:88px;height:88px;border-radius:26px}.core:before{border-radius:19px}.core:after{font-size:27px}.orbit{width:205px;height:74px}.orbit.two{width:235px;height:88px}.orbit.three{width:165px;height:56px}h1{font-size:clamp(34px,10vw,48px)}.copy{font-size:14px}.release{margin-top:24px;padding:14px 15px}.footer{margin-top:24px}}
@media(prefers-reduced-motion:reduce){*,*:before,*:after{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important;transition:none!important}}
</style>
</head>
<body>
<main class="scene">
<section class="panel" aria-labelledby="headline">
<div class="brand"><span class="brand-mark" aria-hidden="true">HX</span><span>HelzerX FreeHost</span></div>
<div class="art" aria-hidden="true">
<div class="glow"></div><div class="orbit one"></div><div class="orbit two"></div><div class="orbit three"></div>
<div class="node n1"></div><div class="node n2"></div><div class="node n3"></div>
<div class="spark s1"></div><div class="spark s2"></div><div class="spark s3"></div><div class="spark s4"></div>
<div class="core"></div>
</div>
<div class="tag"><span class="pulse"></span> Private pre-release</div>
<h1 id="headline">Something great is <span>taking shape.</span></h1>
<p class="copy">We’re putting the finishing touches on HelzerX FreeHost. Our infrastructure is in private testing while we complete final checks for a smoother, more reliable launch. Public access will open soon.</p>
<div class="release">
<div class="calendar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="15" rx="3"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17"/></svg></div>
<div><small>Planned public release</small><strong>17 October 2026</strong></div>
</div>
<div class="footer"><b>HelzerX Technologies</b> <span aria-hidden="true">·</span> Built carefully. Launching soon.</div>
</section>
</main>
</body>
</html>`;
function isAllowedPreReleaseSession(req) {
  const discordId = String(req.session?.user?.id || '');
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const sessionAdminEmail = String(req.session?.admin?.email || '').trim().toLowerCase();
  const validAdmin = Boolean(req.session?.admin?.authenticated === true &&
    req.session?.admin?.staffSecretVerified === true && adminEmail &&
    sessionAdminEmail === adminEmail &&
    Date.now() - Number(req.session?.admin?.loggedAt || 0) <= 2 * 60 * 60 * 1000);
  return PRE_RELEASE_ALLOWED_DISCORD_IDS.has(discordId) || validAdmin;
}
function isPreReleaseGateException(req) {
  const p = req.path;
  if (req.method === 'GET' && ['/api/auth/discord','/api/auth/discord/callback'].includes(p)) return true;
  if (p === '/api/auth/logout' && req.method === 'POST') return true;
  if (p === '/api/admin/login' && req.method === 'POST') return true;
  if (p === '/api/admin/logout' && req.method === 'POST') return true;
  // The admin sign-in screen is intentionally reachable; its protected APIs still require adminOnly.
  if (req.method === 'GET' && ['/admin','/admin/','/admin.html'].includes(p)) return true;
  return false;
}
app.use((req, res, next) => {
  if (isAllowedPreReleaseSession(req) || isPreReleaseGateException(req)) return next();
  res.set({
    'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'Retry-After': '259200'
  });
  if (req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: 'PRE_RELEASE_MAINTENANCE',
      message: 'HelzerX FreeHost is in private testing until 17 October 2026.',
      releaseDate: PRE_RELEASE_LAUNCH_DATE
    });
  }
  return res.status(503).type('html').send(PRE_RELEASE_MAINTENANCE_HTML);
});

// Never let a CDN, browser cache, or SPA fallback serve a stale public page for staff-only paths.
app.use(['/admin', '/admin/', '/admin.html'], (_req, res, next) => {
  res.set({
    'Cache-Control': 'private, no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'CDN-Cache-Control': 'no-store',
    'Cloudflare-CDN-Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff'
  });
  next();
});
app.get('/admin.html', (_req, res) => res.status(404).type('text/plain').send('Not found'));

// Serve both slash variants directly. Redirecting between them can loop when a proxy/CDN
// also canonicalizes the path, so neither URL redirects to the other.
function sendPrivateAdmin(_req, res) {
  res.status(200);
  res.type('html');
  res.sendFile(path.join(root, 'private', 'admin.html'), { dotfiles: 'deny', cacheControl: false }, (err) => {
    if (err && !res.headersSent) res.status(404).type('text/plain').send('Not found');
  });
}
app.get(['/admin', '/admin/'], sendPrivateAdmin);

// Customer control panel: private, authenticated and never cached.
app.use(['/control','/control/','/control.html'],(_req,res,next)=>{
 res.set({'Cache-Control':'private, no-store, no-cache, must-revalidate, max-age=0','Pragma':'no-cache','Expires':'0','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'});next();
});
app.get(['/control','/control/'],(req,res)=>{
 if(!req.session.user)return res.redirect('/?login=required&next=%2Fcontrol');
 res.type('html').sendFile(path.join(root,'private','control.html'),{dotfiles:'deny',cacheControl:false},err=>{if(err&&!res.headersSent)res.status(404).type('text/plain').send('Not found');});
});

const pendingOAuth=new Map();
const adminLoginAttempts=new Map();
const ADMIN_LOCK_WINDOW_MS=15*60*1000, ADMIN_MAX_ATTEMPTS=6;
function safeEqual(a,b){const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
function adminLoginLimiter(req,res,next){
 const key=req.ip||req.socket.remoteAddress||'unknown',now=Date.now();
 let entry=adminLoginAttempts.get(key);
 if(!entry||now-entry.startedAt>ADMIN_LOCK_WINDOW_MS){entry={startedAt:now,count:0,blockedUntil:0};adminLoginAttempts.set(key,entry);}
 if(entry.blockedUntil>now)return res.status(429).json({error:'Too many sign-in attempts. Try again in 15 minutes.'});
 next();
}
function adminMutationOrigin(req,res,next){
 const origin=req.get('origin');
 if(origin){try{if(new URL(origin).origin!==new URL(`${req.protocol}://${req.get('host')}`).origin)return res.status(403).json({error:'Cross-origin admin request denied.'});}catch{return res.status(403).json({error:'Invalid request origin.'});}}
 if(!req.is('application/json'))return res.status(415).json({error:'JSON requests required.'});
 next();
}
const LEGACY_DATA_FILE=path.join(root,'data','rewards.json');
function readData(){
  const stored=readState();
  const hasDatabaseData=Object.values(stored).some(value=>Array.isArray(value)?value.length>0:Object.keys(value||{}).length>0);
  if(!hasDatabaseData&&fs.existsSync(LEGACY_DATA_FILE)){
    try {
      const legacy=JSON.parse(fs.readFileSync(LEGACY_DATA_FILE,'utf8'));
      const migrated={
        users:legacy?.users&&typeof legacy.users==='object'&&!Array.isArray(legacy.users)?legacy.users:{},
        claims:Array.isArray(legacy?.claims)?legacy.claims:[],
        inviteClaims:Array.isArray(legacy?.inviteClaims)?legacy.inviteClaims:[],
        hostingRequests:Array.isArray(legacy?.hostingRequests)?legacy.hostingRequests:[],
        tickets:[], plans:[], auditLogs:[]
      };
      writeState(migrated);
      return migrated;
    } catch(error) { console.error('[database migration] Legacy rewards file could not be migrated:',error.message); }
  }
  let envPlans=[];
  try { envPlans=JSON.parse(process.env.HOSTING_REDEMPTION_OPTIONS||'[]'); } catch {}
  const state={
    users:stored.users||{},
    claims:stored.claims||[],
    inviteClaims:stored.inviteClaims||[],
    hostingRequests:stored.hostingRequests||[],
    tickets:stored.tickets||[],
    plans:Array.isArray(stored.plans)?stored.plans:[],
    auditLogs:stored.auditLogs||[]
  };
  if(!state.plans.length&&Array.isArray(envPlans)&&envPlans.length){
    state.plans=envPlans.filter(x=>x&&typeof x.id==='string'&&typeof x.service==='string').map(x=>({...x,enabled:x.enabled!==false}));
    writeState(state);
  }
  return state;
}
let data=readData();
function writeData(){writeState(data);}
function ensureUser(id){if(!data.users[id])data.users[id]={balance:0,verifiedInvites:0,activeBoosts:0,referrer:null,pendingReferrer:null,creditedMilestones:[],createdAt:Date.now()};if(!Array.isArray(data.inviteClaims))data.inviteClaims=[];if(!Array.isArray(data.hostingRequests))data.hostingRequests=[];return data.users[id];}
const inviteTiers=[[2,200],[4,600],[8,900],[12,1300],[16,1700],[24,2400],[28,2900],[34,3400],[38,4000],[42,4500]];
const boostTiers=[[1,2000],[2,4000],[3,4700],[4,5000],[7,6900],[10,10000]];
function creditInviteMilestones(id){const u=ensureUser(id);for(const [count,amount] of inviteTiers){const key='invite:'+count;if(u.verifiedInvites>=count&&!u.creditedMilestones.includes(key)){u.balance+=amount;u.creditedMilestones.push(key);}}}
function discordGuildMemberships(accessToken){return fetch('https://discord.com/api/users/@me/guilds',{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},signal:AbortSignal.timeout(10000)});}

function publicUser(u){return u?{id:u.id,username:u.username,global_name:u.global_name||u.username,avatar:u.avatar?'https://cdn.discordapp.com/avatars/'+u.id+'/'+u.avatar+'.'+(u.avatar.startsWith('a_')?'gif':'png')+'?size=128':null}:null;}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'DISCORD_LOGIN_REQUIRED'});const account=data.users[req.session.user.id];if(account?.status==='suspended')return res.status(403).json({error:'ACCOUNT_SUSPENDED'});next();}
async function rewardsFor(user){const u=ensureUser(user.id);return {connected:true,balance:u.balance,verifiedInvites:u.verifiedInvites,activeBoosts:u.activeBoosts,rewards:[],message:null,inviteTiers,boostTiers,referralCode:user.id};}
app.get('/api/health',(_q,r)=>r.json({ok:true,service:'helzerx-freehost',discordConfigured:Boolean(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET),rewardsConfigured:Boolean(process.env.REWARDS_API_URL&&process.env.REWARDS_API_TOKEN),proxmox:{enabled:proxmoxReadiness().enabled,ready:proxmoxReadiness().ready}}));
app.get('/api/auth/discord',(req,res)=>{if(!process.env.DISCORD_CLIENT_ID||!process.env.DISCORD_REDIRECT_URI)return res.status(503).send('Discord login is not configured yet.');const state=crypto.randomBytes(32).toString('hex');pendingOAuth.set(state,{createdAt:Date.now(),referral:typeof req.query.ref==='string'?req.query.ref:''});for(const [k,v] of pendingOAuth)if(Date.now()-v.createdAt>600000)pendingOAuth.delete(k);const u=new URL('https://discord.com/oauth2/authorize');u.searchParams.set('client_id',process.env.DISCORD_CLIENT_ID);u.searchParams.set('response_type','code');u.searchParams.set('redirect_uri',process.env.DISCORD_REDIRECT_URI);u.searchParams.set('scope','identify guilds');u.searchParams.set('state',state);res.redirect(u.toString());});
app.get('/api/auth/discord/callback',async(req,res)=>{const {code,state,error}=req.query;if(error)return res.redirect('/?login=cancelled');const issued=pendingOAuth.get(String(state||''));pendingOAuth.delete(String(state||''));const referral=issued?.referral||'';if(!issued||Date.now()-issued.createdAt>600000||typeof code!=='string')return res.status(400).send('Invalid or expired Discord login state. Please return and try again.');try{
 const form=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:process.env.DISCORD_REDIRECT_URI});
 const tr=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:form,signal:AbortSignal.timeout(10000)});const tok=await tr.json();if(!tr.ok||!tok.access_token)throw new Error('Discord token exchange failed');
 const guildsResponse=await discordGuildMemberships(tok.access_token);let guilds=[];if(guildsResponse.ok)guilds=await guildsResponse.json();if(process.env.DISCORD_GUILD_ID&&(!guildsResponse.ok||!guilds.some(g=>g.id===process.env.DISCORD_GUILD_ID)))return res.redirect('/?login=join-discord');
 const mr=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+tok.access_token,Accept:'application/json'},signal:AbortSignal.timeout(10000)});const me=await mr.json();if(!mr.ok||!me.id)throw new Error('Discord identity lookup failed');
 
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.user={id:me.id,username:me.username,global_name:me.global_name||me.username,avatar:me.avatar||null,loggedAt:Date.now()};
 const member=ensureUser(me.id);if(referral&&referral!==me.id&&!member.referrer&&!member.pendingReferrer&&data.users[referral]){member.pendingReferrer=referral;data.inviteClaims.push({id:crypto.randomUUID(),referrerId:referral,inviteeId:me.id,inviteeUsername:me.username,status:'pending',createdAt:new Date().toISOString()});}writeData();req.session.save(e=>{if(e)return res.status(500).send('Could not create a secure session. Please try again.');res.redirect('/?login=success');});
 }catch(e){console.error('[discord OAuth]',e.message);res.redirect('/?login=failed');}});
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

app.post('/api/auth/register', (req, res) => {
  const firstName = String(req.body?.firstName || '').trim();
  const lastName = String(req.body?.lastName || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const referral = String(req.body?.referralCode || '').trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  for (const [, u] of Object.entries(data.users)) {
    if (u.email && u.email.toLowerCase() === email) {
      return res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const id = 'usr_' + crypto.randomBytes(6).toString('hex');
  const username = (firstName + (lastName ? ' ' + lastName : '')).trim() || email.split('@')[0];

  const userRecord = {
    id,
    email,
    salt,
    passwordHash,
    username,
    global_name: username,
    balance: 0,
    verifiedInvites: 0,
    activeBoosts: 0,
    referrer: null,
    pendingReferrer: null,
    creditedMilestones: [],
    createdAt: Date.now()
  };

  data.users[id] = userRecord;

  if (referral && referral !== id && data.users[referral]) {
    userRecord.pendingReferrer = referral;
    data.inviteClaims.push({
      id: crypto.randomUUID(),
      referrerId: referral,
      inviteeId: id,
      inviteeUsername: username,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  writeData();

  req.session.user = {
    id,
    email,
    username,
    global_name: username,
    avatar: null,
    loggedAt: Date.now()
  };

  req.session.save(e => {
    if (e) return res.status(500).json({ error: 'Failed to initialize secure session' });
    res.status(201).json({ ok: true, user: publicUser(req.session.user) });
  });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter your email and password.' });
  }

  let foundUser = null;
  for (const [, u] of Object.entries(data.users)) {
    if (u.email && u.email.toLowerCase() === email) {
      foundUser = u;
      break;
    }
  }

  if (!foundUser || !foundUser.passwordHash || !foundUser.salt) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const hashToTest = hashPassword(password, foundUser.salt);
  if (hashToTest !== foundUser.passwordHash) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  req.session.user = {
    id: foundUser.id,
    email: foundUser.email,
    username: foundUser.username,
    global_name: foundUser.global_name || foundUser.username,
    avatar: foundUser.avatar || null,
    loggedAt: Date.now()
  };

  req.session.save(e => {
    if (e) return res.status(500).json({ error: 'Failed to initialize secure session' });
    res.json({ ok: true, user: publicUser(req.session.user) });
  });
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(e => {
  res.clearCookie('hx_freehost_sid', { httpOnly: true, secure: prod, sameSite: 'lax' });
  if (e) return res.status(500).json({ error: 'Logout failed' });
  res.json({ ok: true });
}));
app.get('/api/me',auth,async(req,res)=>{res.set('Cache-Control','no-store');res.json({user:publicUser(req.session.user),rewards:await rewardsFor(req.session.user)});});
app.get('/api/rewards',auth,async(req,res)=>{res.set('Cache-Control','no-store');res.json(await rewardsFor(req.session.user));});
app.get('/api/invites',auth,(req,res)=>{const u=ensureUser(req.session.user.id);res.set('Cache-Control','no-store');res.json({referralCode:req.session.user.id,referralUrl:(process.env.APP_URL||'https://free.helzerx.cyou')+'/?ref='+encodeURIComponent(req.session.user.id),verifiedInvites:u.verifiedInvites,pendingInvites:data.inviteClaims.filter(c=>c.referrerId===req.session.user.id&&c.status==='pending').length,creditedMilestones:u.creditedMilestones});});
app.get('/api/hosting-options',auth,(_req,res)=>{const options=data.plans.filter(x=>x.enabled!==false);const readiness=proxmoxReadiness();res.set('Cache-Control','no-store');res.json({options:options.map(({id,service,name,cost,description})=>({id,service,name,cost,description})),provisioning:{enabled:readiness.enabled,ready:readiness.ready}})});

// User-owned LXC control APIs. Every lookup is scoped to the signed-in account.
function ownedLxcRequest(req,res,allowedStatuses){
 const item=data.hostingRequests.find(x=>x.id===req.params.id&&x.userId===req.session.user.id);
 if(!item){res.status(404).json({error:'Hosting instance not found.'});return null;}
 if(item.service!=='lxc'||!Number.isInteger(Number(item.vmid))){res.status(409).json({error:'This instance does not support LXC controls.'});return null;}
 if(allowedStatuses&&!allowedStatuses.includes(item.status)){res.status(409).json({error:'This action is not available for the instance current status.'});return null;}
 return item;
}
function recordUserVpsAction(req,item,action,details={}){
 data.auditLogs.unshift({id:crypto.randomUUID(),actorId:req.session.user.id,actorName:req.session.user.username||'user',actorRole:'user',action,targetType:'hosting_request',targetId:item.id,details,createdAt:new Date().toISOString()});
 if(data.auditLogs.length>5000)data.auditLogs.length=5000;
}
app.get('/api/control/instances/:id/inspect',auth,async(req,res)=>{
 const item=ownedLxcRequest(req,res,['provisioned','suspended','provisioning-error']);if(!item)return;
 try{const live=await inspectLxc({vmid:item.vmid});res.set('Cache-Control','no-store');res.json({ok:true,request:{id:item.id,vmid:item.vmid,hostname:item.hostname,planName:item.planName,status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt},live});}
 catch(error){res.status(502).json({error:String(error.message||'Could not inspect instance').slice(0,400)});}
});
app.post('/api/control/instances/:id/action',auth,adminMutationOrigin,async(req,res)=>{
 const action=String(req.body?.action||'');
 if(!['start','stop','reboot','suspend','resume'].includes(action))return res.status(400).json({error:'Unsupported instance action.'});
 const allowed=action==='start'||action==='resume'?['suspended','provisioned']:['provisioned','suspended'];
 const item=ownedLxcRequest(req,res,allowed);if(!item)return;
 if(['start','resume'].includes(action)&&item.status==='provisioned'&&action==='start')return res.status(409).json({error:'Instance is already marked as running.'});
 try{
  const result=await manageLxc({vmid:item.vmid,action});
  item.updatedAt=new Date().toISOString();
  if(['suspend','stop'].includes(action)){item.status='suspended';item.provisioningStatus='container-stopped';}
  else {item.status='provisioned';item.provisioningStatus='container-running';}
  recordUserVpsAction(req,item,'user_vps_'+action,{vmid:item.vmid});writeData();
  res.json({ok:true,request:{id:item.id,status:item.status,vmid:item.vmid,hostname:item.hostname},proxmox:result});
 }catch(error){res.status(502).json({error:String(error.message||'Instance action failed').slice(0,400)});}
});
app.post('/api/control/instances/:id/terminal',auth,adminMutationOrigin,async(req,res)=>{
 const item=ownedLxcRequest(req,res,['provisioned']);if(!item)return;
 const command=String(req.body?.command||'');
 if(!command.trim()||command.length>4000)return res.status(400).json({error:'Command must be 1–4000 characters.'});
 try{
  const live=await inspectLxc({vmid:item.vmid});
  if(live.status?.status!=='running')return res.status(409).json({error:'Instance is not running. Start it before using the terminal.'});
  const result=await runLxcTerminal({vmid:item.vmid,command});
  recordUserVpsAction(req,item,'user_vps_terminal_command',{vmid:item.vmid,commandLength:command.length});writeData();
  res.json({ok:true,...result});
 }catch(error){res.status(502).json({error:String(error.message||'Terminal command failed').slice(0,400)});}
});
app.post('/api/control/instances/:id/snapshots',auth,adminMutationOrigin,async(req,res)=>{
 const item=ownedLxcRequest(req,res,['provisioned','suspended']);if(!item)return;
 const action=String(req.body?.action||''),name=String(req.body?.name||'').trim();
 if(!['create','delete'].includes(action))return res.status(400).json({error:'Snapshot action must be create or delete.'});
 if(action==='delete'&&!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(name))return res.status(400).json({error:'Invalid snapshot name.'});
 try{
  if(action==='delete'){const live=await inspectLxc({vmid:item.vmid});if(!(live.snapshots||[]).some(x=>x.name===name))return res.status(404).json({error:'Snapshot not found.'});}
  const result=await manageLxcSnapshot({vmid:item.vmid,action,name});
  recordUserVpsAction(req,item,'user_vps_snapshot_'+action,{vmid:item.vmid,name});writeData();
  res.json({ok:true,...result});
 }catch(error){res.status(502).json({error:String(error.message||'Snapshot operation failed').slice(0,400)});}
});
app.post('/api/hosting-requests/:id/remove-failed',auth,adminMutationOrigin,(req,res)=>{
 const index=data.hostingRequests.findIndex(x=>x.id===req.params.id&&x.userId===req.session.user.id);
 if(index<0)return res.status(404).json({error:'Hosting request not found.'});
 const item=data.hostingRequests[index];
 const removableStatuses=new Set(['provisioning-error','failed','rejected','cancelled']);
 if(!removableStatuses.has(String(item.status||'').toLowerCase()))return res.status(409).json({error:'Only failed, rejected or cancelled requests can be removed.'});
 if(item.vmid!==undefined&&item.vmid!==null&&String(item.vmid).trim()!=='')return res.status(409).json({error:'This failed request has a VMID assigned. Contact support to verify and clean up the Proxmox container before removing its record.'});
 data.hostingRequests.splice(index,1);
 if(!Array.isArray(data.auditLogs))data.auditLogs=[];
 data.auditLogs.unshift({id:crypto.randomUUID(),actorId:req.session.user.id,actorName:req.session.user.username||'user',actorRole:'user',action:'user_removed_failed_hosting_request',targetType:'hosting_request',targetId:item.id,details:{status:item.status,service:item.service},createdAt:new Date().toISOString()});
 if(data.auditLogs.length>5000)data.auditLogs.length=5000;
 writeData();
 res.json({ok:true,message:'Failed hosting request removed.',id:item.id});
});
app.get('/api/hosting-requests',auth,(req,res)=>{res.set('Cache-Control','no-store');res.json({requests:data.hostingRequests.filter(x=>x.userId===req.session.user.id).map(({id,service,planName,cost,status,createdAt,updatedAt,vmid,hostname,provisioningStatus,error})=>({id,service,planName,cost,status,createdAt,updatedAt,vmid,hostname,provisioningStatus,error}))})});
app.post('/api/hosting-requests',auth,(req,res)=>{const service=String(req.body?.service||'');const planId=String(req.body?.planId||'');const sshPublicKey=typeof req.body?.sshPublicKey==='string'?req.body.sshPublicKey.trim():'';const option=data.plans.find(x=>x.enabled!==false&&x.id===planId&&x.service===service&&Number.isSafeInteger(x.cost)&&x.cost>0&&typeof x.name==='string');if(!option)return res.status(400).json({error:'This hosting plan is not currently configured for HZL redemption.'});if(service==='lxc'&&!/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+(?: .{0,256})?$/.test(sshPublicKey)||sshPublicKey.length>2048)return res.status(400).json({error:'Provide a valid SSH public key for your LXC account. Never submit a private key or password.'});const u=ensureUser(req.session.user.id);if(u.balance<option.cost)return res.status(400).json({error:'Not enough HZL for this hosting plan.'});if(data.hostingRequests.some(x=>x.userId===req.session.user.id&&x.status==='pending'))return res.status(409).json({error:'You already have a pending hosting request.'});const request={id:crypto.randomUUID(),userId:req.session.user.id,username:req.session.user.username,service,planId:option.id,planName:option.name,cost:option.cost,planSnapshot:{id:option.id,service:option.service,name:option.name,cost:option.cost,...(option.proxmox?{proxmox:{...option.proxmox}}:{})},status:'pending',...(service==='lxc'?{sshPublicKey}:{}),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};data.hostingRequests.push(request);writeData();res.status(201).json({ok:true,request:{id:request.id,service,planName:request.planName,cost:request.cost,status:request.status},message:'Hosting request submitted for review. HZL is not deducted until an administrator approves it.'});});
app.get('/api/boost-rewards',auth,(_req,res)=>res.json({tiers:boostTiers,verification:'Boost rewards are submitted as claims and must be reviewed. Discord OAuth alone cannot verify active server boosts without a privileged integration.'}));
app.post('/api/boost-claims',auth,(req,res)=>{const count=Number(req.body?.boosts);if(![1,2,3,4,7,10].includes(count))return res.status(400).json({error:'Choose an eligible boost tier.'});const duplicate=data.claims.some(c=>c.userId===req.session.user.id&&c.status==='pending');if(duplicate)return res.status(409).json({error:'You already have a pending boost claim.'});const tier=boostTiers.find(x=>x[0]===count);data.claims.push({id:crypto.randomUUID(),userId:req.session.user.id,username:req.session.user.username,boosts:count,amount:tier[1],status:'pending',createdAt:new Date().toISOString()});writeData();res.status(201).json({ok:true,message:'Claim submitted for manual verification. HZL will only be credited after approval.'});});
app.get('/api/boost-claims',auth,(req,res)=>res.json({claims:data.claims.filter(c=>c.userId===req.session.user.id).map(({id,boosts,amount,status,createdAt})=>({id,boosts,amount,status,createdAt}))}));
function adminOnly(req,res,next){
 if(!process.env.ADMIN_EMAIL||!process.env.ADMIN_PASSWORD||!/^[0-9]{6}$/.test(String(process.env.STAFF_SECRET||'')))return res.status(503).json({error:'Secure staff sign-in is not configured.'});
 if(!req.session?.admin?.authenticated||req.session.admin.staffSecretVerified!==true||!req.session.admin.email||req.session.admin.email!==String(process.env.ADMIN_EMAIL||'').trim().toLowerCase())return res.status(401).json({error:'Sign-in required.'});
 if(Date.now()-Number(req.session.admin.loggedAt||0)>2*60*60*1000){req.session.destroy(()=>{});res.clearCookie('hx_freehost_sid',{httpOnly:true,secure:prod,sameSite:'lax',path:'/'});return res.status(401).json({error:'Admin session expired. Sign in again.'});}
 res.set('Cache-Control','no-store');next();
}
app.post('/api/admin/login',adminLoginLimiter,adminMutationOrigin,async(req,res)=>{
 const ip=req.ip||req.socket.remoteAddress||'unknown';
 const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||''),staffSecret=String(req.body?.staffSecret||'');
 const configuredEmail=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase(),configuredPassword=String(process.env.ADMIN_PASSWORD||''),configuredStaffSecret=String(process.env.STAFF_SECRET||'');
 if(!configuredEmail||!configuredPassword||!/^[0-9]{6}$/.test(configuredStaffSecret))return res.status(503).json({error:'Secure staff sign-in is not configured on the server.'});
 const validEmail=safeEqual(email,configuredEmail),validPassword=safeEqual(password,configuredPassword),validStaffSecret=safeEqual(staffSecret,configuredStaffSecret);
 const valid=Boolean(validEmail & validPassword & validStaffSecret);
 if(!valid){
  const now=Date.now();let state=adminLoginAttempts.get(ip);
  if(!state||now-state.startedAt>ADMIN_LOCK_WINDOW_MS)state={startedAt:now,count:0,blockedUntil:0};
  state.count++;if(state.count>=ADMIN_MAX_ATTEMPTS)state.blockedUntil=now+ADMIN_LOCK_WINDOW_MS;
  adminLoginAttempts.set(ip,state);
  return res.status(state.blockedUntil?429:401).json({error:state.blockedUntil?'Too many sign-in attempts. Try again in 15 minutes.':'Invalid email or password.'});
 }
 adminLoginAttempts.delete(ip);
 await new Promise((resolve,reject)=>req.session.regenerate(err=>err?reject(err):resolve()));
 req.session.admin={authenticated:true,staffSecretVerified:true,email:configuredEmail,loggedAt:Date.now()};
 req.session.save(err=>{if(err)return res.status(500).json({error:'Could not create secure admin session.'});res.set('Cache-Control','no-store');res.json({ok:true});});
});
app.get('/api/admin/session',adminOnly,(_req,res)=>res.json({ok:true}));
app.post('/api/admin/logout',adminMutationOrigin,(req,res)=>req.session.destroy(err=>{
 res.clearCookie('hx_freehost_sid',{httpOnly:true,secure:prod,sameSite:'lax',path:'/'});
 if(err)return res.status(500).json({error:'Sign-out failed.'});
 res.set('Cache-Control','no-store');res.json({ok:true});
}));
app.get('/api/admin/boost-claims',adminOnly,(_req,res)=>res.json({claims:data.claims}));
app.get('/api/admin/invite-claims',adminOnly,(_req,res)=>res.json({claims:data.inviteClaims.filter(c=>c.status==='pending')}));
app.post('/api/admin/invite-claims/:id/review',adminOnly,adminMutationOrigin,(req,res)=>{const claim=data.inviteClaims.find(c=>c.id===req.params.id);if(!claim)return res.status(404).json({error:'Invite claim not found'});if(claim.status!=='pending')return res.status(409).json({error:'Invite claim has already been reviewed'});const action=req.body?.action;if(!['approve','reject'].includes(action))return res.status(400).json({error:'Action must be approve or reject'});claim.status=action==='approve'?'approved':'rejected';claim.reviewedAt=new Date().toISOString();const invitee=ensureUser(claim.inviteeId);invitee.pendingReferrer=null;if(action==='approve'){invitee.referrer=claim.referrerId;const owner=ensureUser(claim.referrerId);owner.verifiedInvites+=1;creditInviteMilestones(claim.referrerId);}writeData();res.json({ok:true,claim});});
app.get('/api/admin/hosting-requests',adminOnly,(_req,res)=>res.json({requests:data.hostingRequests.map(({sshPublicKey,...x})=>x)}));
app.post('/api/admin/hosting-requests/:id/review',adminOnly,adminMutationOrigin,async(req,res)=>{const item=data.hostingRequests.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'Hosting request not found'});if(item.status!=='pending')return res.status(409).json({error:'Hosting request has already been reviewed'});const action=req.body?.action;if(!['approve','reject'].includes(action))return res.status(400).json({error:'Action must be approve or reject'});const u=ensureUser(item.userId);if(action==='reject'){item.status='rejected';item.reviewedAt=new Date().toISOString();item.updatedAt=item.reviewedAt;writeData();return res.json({ok:true,request:item})}if(u.balance<item.cost)return res.status(409).json({error:'User balance is no longer sufficient'});const plan=item.planSnapshot||data.plans.find(x=>x.id===item.planId&&x.service===item.service&&x.proxmox);if(!plan||!plan.proxmox||plan.service!=='lxc')return res.status(409).json({error:'Only explicitly configured LXC plans can be provisioned. No HZL was deducted.'});const readiness=proxmoxReadiness();if(!readiness.ready)return res.status(503).json({error:'Proxmox provisioning is not ready. No HZL was deducted.',missing:readiness.missing});u.balance-=item.cost;item.status='provisioning';item.provisioningStatus='creating-container';item.reviewedAt=new Date().toISOString();item.updatedAt=item.reviewedAt;item.provisioningAttempts=(item.provisioningAttempts||0)+1;writeData();try{const created=await provisionLxc({requestId:item.id,plan,username:item.username,sshPublicKey:item.sshPublicKey});item.status='provisioned';item.provisioningStatus='container-start-requested';item.vmid=created.vmid;item.hostname=created.hostname;item.proxmoxTask=created.upid;item.updatedAt=new Date().toISOString();writeData();return res.json({ok:true,request:item})}catch(e){item.status='provisioning-error';item.provisioningStatus='needs-admin-reconciliation';item.error=String(e.message||'Provisioning failed').slice(0,500);item.updatedAt=new Date().toISOString();writeData();console.error('[proxmox provisioning]',item.id,item.error);return res.status(502).json({error:'Provisioning did not complete cleanly. The request is locked against duplicate provisioning and requires admin reconciliation; HZL was not automatically refunded to avoid double provisioning.',request:{id:item.id,status:item.status,provisioningStatus:item.provisioningStatus}})}});
app.post('/api/admin/boost-claims/:id/review',adminOnly,adminMutationOrigin,(req,res)=>{const claim=data.claims.find(c=>c.id===req.params.id);if(!claim)return res.status(404).json({error:'Claim not found'});if(claim.status!=='pending')return res.status(409).json({error:'Claim has already been reviewed'});const action=req.body?.action;if(!['approve','reject'].includes(action))return res.status(400).json({error:'Action must be approve or reject'});claim.status=action==='approve'?'approved':'rejected';claim.reviewedAt=new Date().toISOString();if(action==='approve'){const u=ensureUser(claim.userId);u.balance+=claim.amount;u.activeBoosts=Math.max(u.activeBoosts,claim.boosts);}writeData();res.json({ok:true,claim});});

function auditAdmin(req,action,targetType,targetId,details={}) {
  data.auditLogs.unshift({id:crypto.randomUUID(),adminEmail:req.session.admin.email,action,targetType,targetId:String(targetId||''),details,createdAt:new Date().toISOString()});
  if(data.auditLogs.length>5000)data.auditLogs.length=5000;
}
function safeAdminUser(id,u) {
  return {id,username:u.username||u.global_name||'Unknown',email:u.email||null,balance:Number(u.balance)||0,verifiedInvites:Number(u.verifiedInvites)||0,activeBoosts:Number(u.activeBoosts)||0,createdAt:u.createdAt||null,status:u.status==='suspended'?'suspended':'active',avatar:u.avatar||null,referrer:u.referrer||null};
}
app.get('/api/tickets',auth,(req,res)=>{res.set('Cache-Control','no-store');res.json({tickets:data.tickets.filter(t=>t.userId===req.session.user.id).map(({messages=[],...t})=>({...t,messageCount:messages.length,lastMessageAt:messages.at(-1)?.createdAt||t.createdAt}))})});
app.post('/api/tickets',auth,adminMutationOrigin,(req,res)=>{
 const subject=String(req.body?.subject||'').trim(),message=String(req.body?.message||'').trim(),category=String(req.body?.category||'general');
 if(subject.length<4||subject.length>120)return res.status(400).json({error:'Ticket subject must be 4–120 characters.'});
 if(message.length<5||message.length>5000)return res.status(400).json({error:'Message must be 5–5000 characters.'});
 if(!['general','billing','technical','vps','account'].includes(category))return res.status(400).json({error:'Invalid ticket category.'});
 const openCount=data.tickets.filter(t=>t.userId===req.session.user.id&&t.status!=='closed').length;
 if(openCount>=10)return res.status(429).json({error:'You have reached the limit of 10 open tickets.'});
 const now=new Date().toISOString(),ticket={id:crypto.randomUUID(),userId:req.session.user.id,username:req.session.user.username||'Member',subject,category,status:'open',priority:'normal',createdAt:now,updatedAt:now,messages:[{id:crypto.randomUUID(),authorId:req.session.user.id,authorName:req.session.user.username||'Member',authorRole:'user',message,createdAt:now}]};
 data.tickets.push(ticket);writeData();res.status(201).json({ok:true,ticket:{...ticket}});
});
app.post('/api/tickets/:id/messages',auth,adminMutationOrigin,(req,res)=>{
 const ticket=data.tickets.find(t=>t.id===req.params.id&&t.userId===req.session.user.id);
 if(!ticket)return res.status(404).json({error:'Ticket not found.'});
 if(ticket.status==='closed')return res.status(409).json({error:'This ticket is closed.'});
 const message=String(req.body?.message||'').trim();if(message.length<1||message.length>5000)return res.status(400).json({error:'Message must be 1–5000 characters.'});
 const now=new Date().toISOString();ticket.messages.push({id:crypto.randomUUID(),authorId:req.session.user.id,authorName:req.session.user.username||'Member',authorRole:'user',message,createdAt:now});ticket.updatedAt=now;ticket.status='open';writeData();res.json({ok:true,ticket});
});
app.get('/api/tickets/:id',auth,(req,res)=>{const ticket=data.tickets.find(t=>t.id===req.params.id&&t.userId===req.session.user.id);if(!ticket)return res.status(404).json({error:'Ticket not found.'});res.set('Cache-Control','no-store');res.json({ticket})});

app.get('/api/admin/overview',adminOnly,(_req,res)=>{
 const users=Object.values(data.users),requests=data.hostingRequests;
 res.json({stats:{users:users.length,activeUsers:users.filter(u=>u.status!=='suspended').length,suspendedUsers:users.filter(u=>u.status==='suspended').length,openTickets:data.tickets.filter(t=>t.status!=='closed').length,pendingHosting:requests.filter(x=>x.status==='pending').length,activeVps:requests.filter(x=>['provisioned','suspended'].includes(x.status)).length,totalHzl:users.reduce((n,u)=>n+(Number(u.balance)||0),0)},proxmox:proxmoxReadiness()});
});
app.get('/api/admin/users',adminOnly,(req,res)=>{
 const q=String(req.query.q||'').trim().toLowerCase(),status=String(req.query.status||'all');
 const users=Object.entries(data.users).map(([id,u])=>safeAdminUser(id,u)).filter(u=>(!q||[u.id,u.username,u.email||''].some(v=>String(v).toLowerCase().includes(q)))&&(status==='all'||u.status===status)).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
 res.json({users,total:users.length});
});
app.get('/api/admin/users/:id',adminOnly,(req,res)=>{
 const u=data.users[req.params.id];if(!u)return res.status(404).json({error:'User not found.'});
 const id=req.params.id,hosting=data.hostingRequests.filter(x=>x.userId===id).map(({sshPublicKey,...x})=>x),tickets=data.tickets.filter(x=>x.userId===id).map(({messages,...x})=>({...x,messageCount:(messages||[]).length})),invites=data.inviteClaims.filter(x=>x.referrerId===id||x.inviteeId===id),boosts=data.claims.filter(x=>x.userId===id);
 res.set('Cache-Control','no-store');res.json({user:{...safeAdminUser(id,u),globalName:u.global_name||u.username,avatar:u.avatar||null,referrer:u.referrer||null,pendingReferrer:u.pendingReferrer||null,creditedMilestones:u.creditedMilestones||[],statusReason:u.statusReason||null,statusUpdatedAt:u.statusUpdatedAt||null},hosting,tickets,inviteClaims:invites,boostClaims:boosts});
});
app.post('/api/admin/users/:id/balance',adminOnly,adminMutationOrigin,(req,res)=>{
 const user=data.users[req.params.id];if(!user)return res.status(404).json({error:'User not found.'});
 const action=String(req.body?.action||''),amount=Number(req.body?.amount),reason=String(req.body?.reason||'').trim();
 if(!['add','remove'].includes(action)||!Number.isSafeInteger(amount)||amount<1||amount>100000000)return res.status(400).json({error:'Choose add/remove and an integer HZL amount between 1 and 100,000,000.'});
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide an audit reason (3–300 characters).'});
 const before=Number(user.balance)||0;if(action==='remove'&&before<amount)return res.status(409).json({error:'User does not have enough HZL to remove.'});
 user.balance=action==='add'?before+amount:before-amount;
 auditAdmin(req,'balance_'+action,'user',req.params.id,{amount,before,after:user.balance,reason});writeData();
 res.json({ok:true,user:safeAdminUser(req.params.id,user)});
});
app.post('/api/admin/users/:id/status',adminOnly,adminMutationOrigin,(req,res)=>{
 const user=data.users[req.params.id];if(!user)return res.status(404).json({error:'User not found.'});
 const status=String(req.body?.status||''),reason=String(req.body?.reason||'').trim();
 if(!['active','suspended'].includes(status))return res.status(400).json({error:'Status must be active or suspended.'});
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide a reason (3–300 characters).'});
 user.status=status;user.statusReason=reason;user.statusUpdatedAt=new Date().toISOString();
 auditAdmin(req,'user_'+status,'user',req.params.id,{reason});writeData();res.json({ok:true,user:safeAdminUser(req.params.id,user)});
});
app.get('/api/admin/plans',adminOnly,(_req,res)=>res.json({plans:data.plans}));
app.post('/api/admin/plans',adminOnly,adminMutationOrigin,(req,res)=>{
 const {id,service,name,cost,description,enabled=true,proxmox:resources}=req.body||{};
 if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]{1,30}$/i.test(id)||data.plans.some(p=>p.id===id))return res.status(400).json({error:'Plan ID must be unique and 2–31 letters, numbers or hyphens.'});
 if(!['lxc','minecraft','vps'].includes(service)||typeof name!=='string'||name.trim().length<2||name.trim().length>100||!Number.isSafeInteger(Number(cost))||Number(cost)<1||Number(cost)>100000000)return res.status(400).json({error:'Invalid plan service, name or HZL cost.'});
 if(description!==undefined&&(typeof description!=='string'||description.length>1000))return res.status(400).json({error:'Description must be at most 1000 characters.'});
 const plan={id,service,name:name.trim(),cost:Number(cost),description:String(description||''),enabled:Boolean(enabled)};
 if(service==='lxc'){if(!resources)return res.status(400).json({error:'LXC plans require explicit Proxmox resources (cores, memory, disk and swap).'});const cores=Number(resources.cores),memory=Number(resources.memory),disk=Number(resources.disk),swap=Number(resources.swap??512);if(!Number.isInteger(cores)||cores<1||cores>64||!Number.isInteger(memory)||memory<256||memory>1048576||!Number.isInteger(disk)||disk<2||disk>10000||!Number.isInteger(swap)||swap<0||swap>1048576)return res.status(400).json({error:'Invalid LXC resource limits.'});plan.proxmox={cores,memory,disk,swap};}
 data.plans.push(plan);auditAdmin(req,'plan_create','plan',id,{service,cost:plan.cost});writeData();res.status(201).json({ok:true,plan});
});
app.put('/api/admin/plans/:id',adminOnly,adminMutationOrigin,(req,res)=>{
 const plan=data.plans.find(p=>p.id===req.params.id);if(!plan)return res.status(404).json({error:'Plan not found.'});
 const {name,cost,description,enabled,proxmox:resources}=req.body||{};
 if(name!==undefined&&(typeof name!=='string'||name.trim().length<2||name.trim().length>100))return res.status(400).json({error:'Invalid plan name.'});
 if(cost!==undefined&&(!Number.isSafeInteger(Number(cost))||Number(cost)<1||Number(cost)>100000000))return res.status(400).json({error:'Invalid HZL cost.'});
 if(description!==undefined&&(typeof description!=='string'||description.length>1000))return res.status(400).json({error:'Description must be at most 1000 characters.'});
 if(name!==undefined)plan.name=name.trim();if(cost!==undefined)plan.cost=Number(cost);if(description!==undefined)plan.description=description;if(enabled!==undefined)plan.enabled=Boolean(enabled);
 if(resources!==undefined){if(plan.service!=='lxc'||!resources||!Number.isInteger(Number(resources.cores))||Number(resources.cores)<1||!Number.isInteger(Number(resources.memory))||Number(resources.memory)<256||!Number.isInteger(Number(resources.disk))||Number(resources.disk)<2)return res.status(400).json({error:'Invalid LXC resource mapping.'});plan.proxmox={cores:Number(resources.cores),memory:Number(resources.memory),disk:Number(resources.disk),swap:Number(resources.swap??512)};}
 auditAdmin(req,'plan_update','plan',plan.id,{name:plan.name,cost:plan.cost,enabled:plan.enabled});writeData();res.json({ok:true,plan});
});
app.delete('/api/admin/plans/:id',adminOnly,adminMutationOrigin,(req,res)=>{
 const idx=data.plans.findIndex(p=>p.id===req.params.id);if(idx<0)return res.status(404).json({error:'Plan not found.'});
 if(data.hostingRequests.some(x=>x.planId===req.params.id&&['pending','provisioning','provisioned','suspended'].includes(x.status)))return res.status(409).json({error:'Plan is referenced by pending or active hosting requests. Disable it instead.'});
 const [plan]=data.plans.splice(idx,1);auditAdmin(req,'plan_delete','plan',plan.id,{name:plan.name});writeData();res.json({ok:true});
});
app.get('/api/admin/tickets',adminOnly,(req,res)=>{
 const status=String(req.query.status||'open'),q=String(req.query.q||'').toLowerCase();
 const tickets=data.tickets.filter(t=>(status==='all'||t.status===status)&&( !q||[t.id,t.subject,t.username,t.userId].some(v=>String(v||'').toLowerCase().includes(q)))).map(t=>({...t,messages:t.messages||[]})).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
 res.json({tickets,total:tickets.length});
});
app.post('/api/admin/tickets/:id/messages',adminOnly,adminMutationOrigin,(req,res)=>{
 const ticket=data.tickets.find(t=>t.id===req.params.id);if(!ticket)return res.status(404).json({error:'Ticket not found.'});
 const message=String(req.body?.message||'').trim();if(message.length<1||message.length>5000)return res.status(400).json({error:'Message must be 1–5000 characters.'});
 const now=new Date().toISOString();ticket.messages=ticket.messages||[];ticket.messages.push({id:crypto.randomUUID(),authorId:req.session.admin.email,authorName:'HelzerX Support',authorRole:'admin',message,createdAt:now});ticket.updatedAt=now;if(ticket.status==='closed')ticket.status='open';auditAdmin(req,'ticket_reply','ticket',ticket.id,{});writeData();res.json({ok:true,ticket});
});
app.post('/api/admin/tickets/:id/status',adminOnly,adminMutationOrigin,(req,res)=>{
 const ticket=data.tickets.find(t=>t.id===req.params.id);if(!ticket)return res.status(404).json({error:'Ticket not found.'});
 const status=String(req.body?.status||''),priority=String(req.body?.priority||ticket.priority||'normal');
 if(!['open','in_progress','waiting_user','closed'].includes(status)||!['low','normal','high','urgent'].includes(priority))return res.status(400).json({error:'Invalid ticket status or priority.'});
 ticket.status=status;ticket.priority=priority;ticket.updatedAt=new Date().toISOString();auditAdmin(req,'ticket_status','ticket',ticket.id,{status,priority});writeData();res.json({ok:true,ticket});
});

app.post('/api/admin/hosting-requests/manual',adminOnly,adminMutationOrigin,async(req,res)=>{
 const userId=String(req.body?.userId||''),planId=String(req.body?.planId||''),sshPublicKey=String(req.body?.sshPublicKey||'').trim(),charge=req.body?.charge===true;
 const user=data.users[userId];if(!user)return res.status(404).json({error:'User not found.'});
 const plan=data.plans.find(p=>p.id===planId&&p.enabled!==false);
 if(!plan||plan.service!=='lxc'||!plan.proxmox)return res.status(400).json({error:'Choose an enabled LXC plan with an explicit Proxmox resource mapping.'});
 if(sshPublicKey && (!/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+(?: .{0,256})?$/.test(sshPublicKey)||sshPublicKey.length>2048))return res.status(400).json({error:'Provide a valid SSH public key or leave it empty to generate a new key automatically.'});
 if(charge&&(Number(user.balance)||0)<plan.cost)return res.status(409).json({error:'User does not have enough HZL.'});
 const readiness=proxmoxReadiness();if(!readiness.ready)return res.status(503).json({error:'Proxmox provisioning is not ready.',missing:readiness.missing});
 const now=new Date().toISOString(),request={id:crypto.randomUUID(),userId,username:user.username||user.global_name||userId,service:'lxc',planId:plan.id,planName:plan.name,cost:charge?plan.cost:0,status:'provisioning',sshPublicKey,manualCreated:true,createdAt:now,updatedAt:now,createdBy:req.session.admin.email};
 data.hostingRequests.push(request);if(charge){user.balance-=plan.cost;auditAdmin(req,'balance_remove','user',userId,{amount:plan.cost,reason:'Manual LXC provisioning: '+request.id});}
 request.provisioningAttempts=1;writeData();
 try{const created=await provisionLxc({requestId:request.id,plan,username:request.username,sshPublicKey});request.status='provisioned';request.provisioningStatus='container-started';request.vmid=created.vmid;request.hostname=created.hostname;request.proxmoxTask=created.upid;request.updatedAt=new Date().toISOString();auditAdmin(req,'vps_manual_create','hosting_request',request.id,{userId,vmid:created.vmid,charged:charge?plan.cost:0});writeData();res.status(201).json({ok:true,request:{...request,sshPublicKey:undefined},...(created.generatedSshPrivateKey?{generatedSshPrivateKey:created.generatedSshPrivateKey}:{} )});
 }catch(error){request.status='provisioning-error';request.provisioningStatus='needs-admin-reconciliation';request.error=String(error?.message||'Provisioning failed').slice(0,500);request.updatedAt=new Date().toISOString();try{auditAdmin(req,'vps_manual_create_failed','hosting_request',request.id,{userId,error:request.error});writeData();}catch(persistError){console.error('[manual LXC provisioning] Failed to persist error state for request '+request.id+':',persistError);}console.error('[manual LXC provisioning] Request '+request.id+' failed:',error?.stack||request.error);return res.status(502).json({error:'Manual LXC provisioning failed: '+request.error+'. Do not retry until the existing request and Proxmox VMID have been reconciled.',request:{id:request.id,status:request.status,provisioningStatus:request.provisioningStatus}});}
});
app.get('/api/admin/hosting-requests/:id/inspect',adminOnly,async(req,res)=>{
 const item=data.hostingRequests.find(x=>x.id===req.params.id);
 if(!item)return res.status(404).json({error:'Hosting request not found.'});
 if(item.service!=='lxc'||!Number.isInteger(Number(item.vmid))||!['provisioned','suspended','provisioning-error'].includes(item.status))return res.status(409).json({error:'This record is not an inspectable managed LXC container.'});
 try{const live=await inspectLxc({vmid:item.vmid});res.set('Cache-Control','no-store');res.json({ok:true,request:{id:item.id,vmid:item.vmid,hostname:item.hostname,planName:item.planName,username:item.username,status:item.status,createdAt:item.createdAt,updatedAt:item.updatedAt},live});}
 catch(error){res.status(502).json({error:String(error.message||'Could not inspect container').slice(0,500)});}
});
app.post('/api/admin/hosting-requests/:id/terminal',adminOnly,adminMutationOrigin,async(req,res)=>{
 const item=data.hostingRequests.find(x=>x.id===req.params.id);
 if(!item)return res.status(404).json({error:'Hosting request not found.'});
 if(item.service!=='lxc'||!Number.isInteger(Number(item.vmid))||item.status!=='provisioned')return res.status(409).json({error:'Terminal access is available only for active managed LXC containers.'});
 const command=String(req.body?.command||''),reason=String(req.body?.reason||'').trim();
 if(!command.trim()||command.length>4000)return res.status(400).json({error:'Command must be 1–4000 characters.'});
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide an audit reason (3–300 characters).'});
 try{
  const live=await inspectLxc({vmid:item.vmid});
  if(live.status?.status!=='running')return res.status(409).json({error:'Container is not running. Start it before using the terminal.'});
  const result=await runLxcTerminal({vmid:item.vmid,command});
  auditAdmin(req,'vps_terminal_command','hosting_request',item.id,{vmid:item.vmid,commandLength:command.length,reason});
  writeData();res.json({ok:true,...result});
 }catch(error){res.status(502).json({error:String(error.message||'Terminal command failed').slice(0,500)});}
});
app.post('/api/admin/hosting-requests/:id/snapshots',adminOnly,adminMutationOrigin,async(req,res)=>{
 const item=data.hostingRequests.find(x=>x.id===req.params.id);
 if(!item)return res.status(404).json({error:'Hosting request not found.'});
 if(item.service!=='lxc'||!Number.isInteger(Number(item.vmid))||!['provisioned','suspended'].includes(item.status))return res.status(409).json({error:'Snapshots are available only for active managed LXC containers.'});
 const action=String(req.body?.action||''),name=String(req.body?.name||'').trim(),reason=String(req.body?.reason||'').trim();
 if(!['create','delete'].includes(action))return res.status(400).json({error:'Snapshot action must be create or delete.'});
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide an audit reason (3–300 characters).'});
 if(action==='delete'&&!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(name))return res.status(400).json({error:'Invalid snapshot name.'});
 try{
  if(action==='delete'){
   const live=await inspectLxc({vmid:item.vmid});
   if(!(live.snapshots||[]).some(x=>x.name===name))return res.status(404).json({error:'Snapshot not found.'});
  }
  const result=await manageLxcSnapshot({vmid:item.vmid,action,name});
  auditAdmin(req,'vps_snapshot_'+action,'hosting_request',item.id,{vmid:item.vmid,name,reason});writeData();
  res.json({ok:true,...result});
 }catch(error){res.status(502).json({error:String(error.message||'Snapshot operation failed').slice(0,500)});}
});
app.post('/api/admin/hosting-requests/:id/remove-failed',adminOnly,adminMutationOrigin,async(req,res)=>{
 const index=data.hostingRequests.findIndex(x=>x.id===req.params.id);
 if(index<0)return res.status(404).json({error:'Hosting request not found.'});
 const item=data.hostingRequests[index];
 const status=String(item.status||'').toLowerCase();
 const removableStatuses=new Set(['provisioning-error','failed','rejected','cancelled','error']);
 if(!removableStatuses.has(status)&&item.provisioningStatus!=='needs-admin-reconciliation')return res.status(409).json({error:'Only failed, rejected, cancelled, or provisioning-error requests can be removed.'});
 const reason=String(req.body?.reason||'').trim();
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide an audit reason (3–300 characters).'});
 const hasVmid=item.vmid!==undefined&&item.vmid!==null&&String(item.vmid).trim()!=='';
 if(hasVmid){
  const vmid=Number(item.vmid);
  if(item.service!=='lxc'||!Number.isInteger(vmid)||vmid<2000||vmid>2999)return res.status(409).json({error:'This failed request has a resource ID that cannot be safely cleaned up automatically. Keep the record and reconcile the resource manually.'});
  try{await manageLxc({vmid,action:'delete'});}
  catch(error){item.lastActionError=String(error.message||'Proxmox cleanup failed').slice(0,500);item.updatedAt=new Date().toISOString();writeData();return res.status(502).json({error:'Proxmox cleanup failed. The request record was kept so you can retry safely. '+item.lastActionError});}
 }
 data.hostingRequests.splice(index,1);
 auditAdmin(req,'failed_hosting_request_removed','hosting_request',item.id,{userId:item.userId,service:item.service,status:item.status,vmid:item.vmid??null,reason,proxmoxCleanup:hasVmid});
 writeData();
 res.json({ok:true,message:'Failed hosting request removed.',id:item.id});
});
app.post('/api/admin/hosting-requests/:id/action',adminOnly,adminMutationOrigin,async(req,res)=>{
 const item=data.hostingRequests.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'Hosting request not found.'});
 if(item.service!=='lxc'||!Number.isInteger(Number(item.vmid)))return res.status(409).json({error:'This record is not a managed LXC container.'});
 const action=String(req.body?.action||''),reason=String(req.body?.reason||'').trim();
 if(reason.length<3||reason.length>300)return res.status(400).json({error:'Provide an audit reason (3–300 characters).'});
 if(action==='delete'&&req.body?.confirm!==true)return res.status(400).json({error:'Explicit delete confirmation is required.'});
 if(['stop','suspend','reboot'].includes(action)&&!['provisioned','suspended'].includes(item.status))return res.status(409).json({error:'Only provisioned containers can be suspended.'});
 if(['start','resume'].includes(action)&&!['suspended','provisioned'].includes(item.status))return res.status(409).json({error:'Only suspended containers can be resumed.'});
 if(action==='delete'&&!['provisioned','suspended','provisioning-error'].includes(item.status))return res.status(409).json({error:'This container cannot be deleted from its current state.'});
 try{
  const result=await manageLxc({vmid:item.vmid,action});
  item.updatedAt=new Date().toISOString();
  if(['suspend','stop'].includes(action)){item.status='suspended';item.provisioningStatus='container-stopped';}
  else if(['resume','start','reboot'].includes(action)){item.status='provisioned';item.provisioningStatus='container-running';}
  else if(action==='delete'){item.status='deleted';item.provisioningStatus='container-deleted';item.deletedAt=item.updatedAt;item.deletedBy=req.session.admin.email;}
  auditAdmin(req,'vps_'+action,'hosting_request',item.id,{vmid:item.vmid,userId:item.userId,reason});writeData();res.json({ok:true,request:{id:item.id,status:item.status,vmid:item.vmid,hostname:item.hostname},proxmox:result});
 }catch(error){item.updatedAt=new Date().toISOString();item.lastActionError=String(error.message||'Proxmox action failed').slice(0,500);writeData();res.status(502).json({error:item.lastActionError});}
});
app.get('/api/admin/audit-logs',adminOnly,(req,res)=>{const limit=Math.max(1,Math.min(500,Number(req.query.limit)||100));res.json({logs:data.auditLogs.slice(0,limit)});});
app.get('/api/plans',(_q,r)=>r.json({plans:[{id:'minecraft',title:'Minecraft Hosting',description:'Explore eligible Minecraft hosting rewards.',features:['Multiple RAM options','High-performance CPU resources','NVMe storage','Available locations'],command:'.mc-plans'},{id:'vps',title:'KVM VPS',description:'Explore eligible KVM VPS rewards.',features:['Multiple RAM options','Dedicated vCPU resources','NVMe storage','Available locations'],command:'.vps-plans'}]}));
app.use(express.static(path.join(root, 'public'), { index: false, maxAge: '1h' }));
if (prod) {
  app.use(express.static(path.join(root, 'dist'), { index: false, maxAge: '1h' }));
  app.get('*', (req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0' },
    appType: 'spa',
    root,
  });
  app.use(vite.middlewares);
}
app.listen(PORT, '0.0.0.0', () => console.log('HelzerX Free Hosting server listening on ' + PORT));
