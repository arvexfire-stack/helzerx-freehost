import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app=express(),__dirname=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(__dirname,'..');
const PORT=Number(process.env.PORT||8787),prod=process.env.NODE_ENV==='production';
const required=['SESSION_SECRET','DISCORD_CLIENT_ID','DISCORD_CLIENT_SECRET','DISCORD_REDIRECT_URI'];
const missing=required.filter(k=>!process.env[k]);if(prod&&missing.length)console.error('[startup] Missing environment variables:',missing.join(', '));
if(prod&&(!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32))throw new Error('SESSION_SECRET must be at least 32 characters in production.');
const SQLiteStore=SQLiteStoreFactory(session);
app.disable('x-powered-by');app.set('trust proxy',1);app.use(express.json({limit:'20kb'}));
app.use(session({name:'hx_freehost_sid',store:new SQLiteStore({dir:path.join(root,'data'),db:'sessions.sqlite'}),secret:process.env.SESSION_SECRET||'development-only-change-me',resave:false,saveUninitialized:false,rolling:true,cookie:{httpOnly:true,secure:prod,sameSite:'lax',maxAge:604800000}}));
const pendingOAuth=new Map();
function publicUser(u){return u?{id:u.id,username:u.username,global_name:u.global_name||u.username,avatar:u.avatar?'https://cdn.discordapp.com/avatars/'+u.id+'/'+u.avatar+'.'+(u.avatar.startsWith('a_')?'gif':'png')+'?size=128':null}:null;}
function auth(req,res,next){if(!req.session.user)return res.status(401).json({error:'DISCORD_LOGIN_REQUIRED'});next();}
async function rewardsFor(user){
 if(!process.env.REWARDS_API_URL||!process.env.REWARDS_API_TOKEN)return {connected:false,balance:0,verifiedInvites:0,activeBoosts:0,rewards:[],message:'Rewards verification is not connected yet. Your HZL balance will appear when the official rewards service is configured.'};
 try{const base=process.env.REWARDS_API_URL.replace(/\/$/,'');const response=await fetch(base+'/users/'+encodeURIComponent(user.id),{headers:{Authorization:'Bearer '+process.env.REWARDS_API_TOKEN,Accept:'application/json'},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error('Rewards service returned '+response.status);const d=await response.json();return {connected:true,balance:Math.max(0,Number(d.balance)||0),verifiedInvites:Math.max(0,Number(d.verifiedInvites)||0),activeBoosts:Math.max(0,Number(d.activeBoosts)||0),rewards:Array.isArray(d.rewards)?d.rewards:[],message:null};}
 catch(e){console.error('[rewards service]',e.message);return {connected:false,balance:0,verifiedInvites:0,activeBoosts:0,rewards:[],message:'The rewards service is temporarily unavailable. Please try again later.'};}
}
app.get('/api/health',(_q,r)=>r.json({ok:true,service:'helzerx-freehost',discordConfigured:Boolean(process.env.DISCORD_CLIENT_ID&&process.env.DISCORD_CLIENT_SECRET),rewardsConfigured:Boolean(process.env.REWARDS_API_URL&&process.env.REWARDS_API_TOKEN)}));
app.get('/api/auth/discord',(req,res)=>{if(!process.env.DISCORD_CLIENT_ID||!process.env.DISCORD_REDIRECT_URI)return res.status(503).send('Discord login is not configured yet.');const state=crypto.randomBytes(32).toString('hex');pendingOAuth.set(state,Date.now());for(const [k,t] of pendingOAuth)if(Date.now()-t>600000)pendingOAuth.delete(k);const u=new URL('https://discord.com/oauth2/authorize');u.searchParams.set('client_id',process.env.DISCORD_CLIENT_ID);u.searchParams.set('response_type','code');u.searchParams.set('redirect_uri',process.env.DISCORD_REDIRECT_URI);u.searchParams.set('scope','identify');u.searchParams.set('state',state);res.redirect(u.toString());});
app.get('/api/auth/discord/callback',async(req,res)=>{const {code,state,error}=req.query;if(error)return res.redirect('/?login=cancelled');const issued=pendingOAuth.get(String(state||''));pendingOAuth.delete(String(state||''));if(!issued||Date.now()-issued>600000||typeof code!=='string')return res.status(400).send('Invalid or expired Discord login state. Please return and try again.');try{
 const form=new URLSearchParams({client_id:process.env.DISCORD_CLIENT_ID,client_secret:process.env.DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:process.env.DISCORD_REDIRECT_URI});
 const tr=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'},body:form,signal:AbortSignal.timeout(10000)});const tok=await tr.json();if(!tr.ok||!tok.access_token)throw new Error('Discord token exchange failed');
 const mr=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:'Bearer '+tok.access_token,Accept:'application/json'},signal:AbortSignal.timeout(10000)});const me=await mr.json();if(!mr.ok||!me.id)throw new Error('Discord identity lookup failed');
 if(process.env.DISCORD_GUILD_ID&&process.env.DISCORD_BOT_TOKEN){const gm=await fetch('https://discord.com/api/guilds/'+encodeURIComponent(process.env.DISCORD_GUILD_ID)+'/members/'+encodeURIComponent(me.id),{headers:{Authorization:'Bot '+process.env.DISCORD_BOT_TOKEN},signal:AbortSignal.timeout(8000)});if(gm.status===404)return res.redirect('/?login=join-discord');if(!gm.ok)console.warn('[discord] Guild membership check failed:',gm.status);}
 await new Promise((resolve,reject)=>req.session.regenerate(e=>e?reject(e):resolve()));req.session.user={id:me.id,username:me.username,global_name:me.global_name||me.username,avatar:me.avatar||null,loggedAt:Date.now()};req.session.save(e=>{if(e)return res.status(500).send('Could not create a secure session. Please try again.');res.redirect('/?login=success');});
 }catch(e){console.error('[discord OAuth]',e.message);res.redirect('/?login=failed');}});
app.post('/api/auth/logout',(req,res)=>req.session.destroy(e=>{res.clearCookie('hx_freehost_sid',{httpOnly:true,secure:prod,sameSite:'lax'});if(e)return res.status(500).json({error:'Logout failed'});res.json({ok:true});}));
app.get('/api/me',auth,async(req,res)=>{res.set('Cache-Control','no-store');res.json({user:publicUser(req.session.user),rewards:await rewardsFor(req.session.user)});});
app.get('/api/rewards',auth,async(req,res)=>{res.set('Cache-Control','no-store');res.json(await rewardsFor(req.session.user));});
app.get('/api/plans',(_q,r)=>r.json({plans:[{id:'minecraft',title:'Minecraft Hosting',description:'Explore eligible Minecraft hosting rewards.',features:['Multiple RAM options','High-performance CPU resources','NVMe storage','Available locations'],command:'.mc-plans'},{id:'vps',title:'KVM VPS',description:'Explore eligible KVM VPS rewards.',features:['Multiple RAM options','Dedicated vCPU resources','NVMe storage','Available locations'],command:'.vps-plans'}]}));
if(prod){app.use(express.static(path.join(root,'dist'),{index:false,maxAge:'1h'}));app.get('*',(req,res)=>res.sendFile(path.join(root,'dist','index.html')));}else app.get('/',(_q,r)=>r.send('HelzerX Free Hosting API is running. Start Vite on port 5173.'));
app.listen(PORT,'0.0.0.0',()=>console.log('HelzerX Free Hosting server listening on '+PORT));
