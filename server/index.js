import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import crypto from 'node:crypto';
import { provisionLxc, proxmoxReadiness } from './proxmox.js';
import { applySecurityHeaders, createRateLimiter } from './security.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app=express(),__dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(__dirname,'..');
const PORT=Number(process.env.PORT||3000),prod=process.env.NODE_ENV==='production';
fs.mkdirSync(path.join(root,'data'),{recursive:true});
const required=['SESSION_SECRET','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI'];
const missing=required.filter(k=>!process.env[k]);if(prod&&missing.length)console.error('[startup] Missing environment variables:',missing.join(', '));
if(prod&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw new Error('SESSION_SECRET must be at least 32 characters in production.');
app.disable('x-powered-by');
app.set('trust proxy', 1);
// Defense in depth. Cloudflare/WAF limits are still required for distributed floods.
app.use(applySecurityHeaders);
const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: 240,
  keyPrefix: 'api',
  message: 'Too many API requests. Please slow down and try again.'
});
const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 12,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please wait before trying again.'
});
const adminEdgeLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 10,
  keyPrefix: 'admin-login',
  message: 'Too many admin sign-in attempts. Please wait before trying again.'
});
app.use('/api', (req, res, next) => req.path === '/health' ? next() : apiLimiter(req, res, next));
app.use(['/api/auth/register', '/api/auth/login'], authLimiter);
app.use('/api/admin/login', adminEdgeLimiter);
app.use(express.json({limit:'20kb'}));
app.use(session({name:'hx_freehost_sid',secret:process.env.SESSION_SECRET||'development-only-change-me',resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:prod,sameSite:'lax',maxAge:604800000}}));

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
const DATA_FILE=path.join(root,'data','rewards.json');
function readData(){
  let stored={};
  try{stored=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));}catch{}
  // Normalize older data files so newly added features never crash on missing arrays.
  return {
    users:stored&&stored.users&&typeof stored.users==='object'&&!Array.isArray(stored.users)?stored.users:{},
    claims:Array.isArray(stored?.claims)?stored.claims:[],
    inviteClaims:Array.isArray(stored?.inviteClaims)?stored.inviteClaims:[],
    hostingRequests:Array.isArray(stored?.hostingRequests)?stored.hostingRequests:[]
  };
}
let data=readData();
function writeData(){const tmp=DATA_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data,null,2),{mode:0o600});fs.renameSync(tmp,DATA_FILE);}
function ensureUser(id){if(!data.users[id])data.users[id]={balance:0,verifiedInvites:0,activeBoosts:0,referrer:null,pendingReferrer:null,creditedMilestones:[],createdAt:Date.now()};if(!Array.isArray(data.inviteClaims))data.inviteClaims=[];if(!Array.isArray(data.hostingRequests))data.hostingRequests=[];return data.users[id];}
const inviteTiers=[[2,200],[4,600],[8,900],[12,1300],[16,1700],[24,2400],[28,2900],[34,3400],[38,4000],[42,4500]];
const boostTiers=[[1,2000],[2,4000],[3,4700],[4,5000],[7,6900],[10,10000]];
function creditInviteMilestones(id){const u=ensureUser(id);for(const [count,amount] of inviteTiers){const key='invite:'+count;if(u.verifiedInvites>=count&&!u.creditedMilestones.includes(key)){u.balance+=amount;u.creditedMilestones.push(key);}}}
function discordGuildMemberships(accessToken){return fetch('https://discord.com/api/users/@me/guilds',{headers:{Authorization:'Bearer '+accessToken,Accept:'application/json'},signal:AbortSignal.timeout(10000)});}

function publicUser(u){return u?{id:u.id,username:u.username,global_name:u.global_name||u.username,avatar:u.avatar?'https://cdn.discordapp.com/avatars/'+u.id+'/'+u.avatar+'.'+(u.avatar.startsWith('a_')?'gif':'png')+'?size=128':null}:null;}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'DISCORD_LOGIN_REQUIRED'});next();}
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
  if (!safeEqual(hashToTest, foundUser.passwordHash)) {
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
app.get('/api/hosting-options',auth,(_req,res)=>{let options=[];try{options=JSON.parse(process.env.HOSTING_REDEMPTION_OPTIONS||'[]')}catch{}const readiness=proxmoxReadiness();res.set('Cache-Control','no-store');res.json({options:options.map(({id,service,name,cost,description})=>({id,service,name,cost,description})),provisioning:{enabled:readiness.enabled,ready:readiness.ready}})});
app.get('/api/hosting-requests',auth,(req,res)=>{res.set('Cache-Control','no-store');res.json({requests:data.hostingRequests.filter(x=>x.userId===req.session.user.id).map(({id,service,planName,cost,status,createdAt,updatedAt,vmid,hostname,provisioningStatus,error})=>({id,service,planName,cost,status,createdAt,updatedAt,vmid,hostname,provisioningStatus,error}))})});
app.post('/api/hosting-requests',auth,(req,res)=>{const service=String(req.body?.service||'');const planId=String(req.body?.planId||'');const sshPublicKey=typeof req.body?.sshPublicKey==='string'?req.body.sshPublicKey.trim():'';let options=[];try{options=JSON.parse(process.env.HOSTING_REDEMPTION_OPTIONS||'[]')}catch{}const option=options.find(x=>x.id===planId&&x.service===service&&Number.isSafeInteger(x.cost)&&x.cost>0&&typeof x.name==='string');if(!option)return res.status(400).json({error:'This hosting plan is not currently configured for HZL redemption.'});if(service==='lxc'&&!/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+(?: .{0,256})?$/.test(sshPublicKey)||sshPublicKey.length>2048)return res.status(400).json({error:'Provide a valid SSH public key for your LXC account. Never submit a private key or password.'});const u=ensureUser(req.session.user.id);if(u.balance<option.cost)return res.status(400).json({error:'Not enough HZL for this hosting plan.'});if(data.hostingRequests.some(x=>x.userId===req.session.user.id&&x.status==='pending'))return res.status(409).json({error:'You already have a pending hosting request.'});const request={id:crypto.randomUUID(),userId:req.session.user.id,username:req.session.user.username,service,planId:option.id,planName:option.name,cost:option.cost,status:'pending',...(service==='lxc'?{sshPublicKey}:{}),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};data.hostingRequests.push(request);writeData();res.status(201).json({ok:true,request:{id:request.id,service,planName:request.planName,cost:request.cost,status:request.status},message:'Hosting request submitted for review. HZL is not deducted until an administrator approves it.'});});
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
app.get('/api/admin/hosting-requests',adminOnly,(_req,res)=>res.json({requests:data.hostingRequests.filter(x=>x.status==='pending'||x.status==='provisioning-error').map(({sshPublicKey,...x})=>x)}));
app.post('/api/admin/hosting-requests/:id/review',adminOnly,adminMutationOrigin,async(req,res)=>{const item=data.hostingRequests.find(x=>x.id===req.params.id);if(!item)return res.status(404).json({error:'Hosting request not found'});if(item.status!=='pending')return res.status(409).json({error:'Hosting request has already been reviewed'});const action=req.body?.action;if(!['approve','reject'].includes(action))return res.status(400).json({error:'Action must be approve or reject'});const u=ensureUser(item.userId);if(action==='reject'){item.status='rejected';item.reviewedAt=new Date().toISOString();item.updatedAt=item.reviewedAt;writeData();return res.json({ok:true,request:item})}if(u.balance<item.cost)return res.status(409).json({error:'User balance is no longer sufficient'});let options=[];try{options=JSON.parse(process.env.HOSTING_REDEMPTION_OPTIONS||'[]')}catch{}const plan=options.find(x=>x.id===item.planId&&x.service===item.service&&Number.isSafeInteger(x.cost)&&x.cost===item.cost);if(!plan||!plan.proxmox||plan.service!=='lxc')return res.status(409).json({error:'Only explicitly configured LXC plans can be provisioned. No HZL was deducted.'});const readiness=proxmoxReadiness();if(!readiness.ready)return res.status(503).json({error:'Proxmox provisioning is not ready. No HZL was deducted.',missing:readiness.missing});u.balance-=item.cost;item.status='provisioning';item.provisioningStatus='creating-container';item.reviewedAt=new Date().toISOString();item.updatedAt=item.reviewedAt;item.provisioningAttempts=(item.provisioningAttempts||0)+1;writeData();try{const created=await provisionLxc({requestId:item.id,plan,username:item.username,sshPublicKey:item.sshPublicKey});item.status='provisioned';item.provisioningStatus='container-start-requested';item.vmid=created.vmid;item.hostname=created.hostname;item.proxmoxTask=created.upid;item.updatedAt=new Date().toISOString();writeData();return res.json({ok:true,request:item})}catch(e){item.status='provisioning-error';item.provisioningStatus='needs-admin-reconciliation';item.error=String(e.message||'Provisioning failed').slice(0,500);item.updatedAt=new Date().toISOString();writeData();console.error('[proxmox provisioning]',item.id,item.error);return res.status(502).json({error:'Provisioning did not complete cleanly. The request is locked against duplicate provisioning and requires admin reconciliation; HZL was not automatically refunded to avoid double provisioning.',request:{id:item.id,status:item.status,provisioningStatus:item.provisioningStatus}})}});
app.post('/api/admin/boost-claims/:id/review',adminOnly,adminMutationOrigin,(req,res)=>{const claim=data.claims.find(c=>c.id===req.params.id);if(!claim)return res.status(404).json({error:'Claim not found'});if(claim.status!=='pending')return res.status(409).json({error:'Claim has already been reviewed'});const action=req.body?.action;if(!['approve','reject'].includes(action))return res.status(400).json({error:'Action must be approve or reject'});claim.status=action==='approve'?'approved':'rejected';claim.reviewedAt=new Date().toISOString();if(action==='approve'){const u=ensureUser(claim.userId);u.balance+=claim.amount;u.activeBoosts=Math.max(u.activeBoosts,claim.boosts);}writeData();res.json({ok:true,claim});});
app.get('/api/plans',(_q,r)=>r.json({plans:[{id:'minecraft',title:'Minecraft Hosting',description:'Explore eligible Minecraft hosting rewards.',features:['Multiple RAM options','High-performance CPU resources','NVMe storage','Available locations'],command:'.mc-plans'},{id:'vps',title:'KVM VPS',description:'Explore eligible KVM VPS rewards.',features:['Multiple RAM options','Dedicated vCPU resources','NVMe storage','Available locations'],command:'.vps-plans'}]}));
// Normalize parser and unexpected errors without exposing stack traces or internal details.
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (err instanceof SyntaxError && err.status === 400 && Object.prototype.hasOwnProperty.call(err, 'body')) {
    return res.status(400).json({ error: 'Invalid JSON request body.' });
  }
  console.error('[http error]', String(err?.message || 'Unknown error').slice(0, 300));
  return res.status(500).json({ error: 'Internal server error.' });
});
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
