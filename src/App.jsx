import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, Layers, LogOut, Menu, MessageCircle, RefreshCw, Server, ShieldCheck, Users, Wallet, Zap, Lock, Coins } from 'lucide-react';

const money = n => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const referralParam = new URLSearchParams(window.location.search).get('ref');
const loginUrl = '/api/auth/discord' + (referralParam ? '?ref=' + encodeURIComponent(referralParam) : '');

function Brand() {
  return <a className="brand" href="/" aria-label="HelzerX Free Hosting"><span className="brand-mark">H<span>X</span></span><span className="brand-copy"><b>HelzerX</b><small>FREE HOSTING</small></span></a>;
}

function App() {
  const [me, setMe] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [mobile, setMobile] = useState(false);
  const [invite, setInvite] = useState(null);
  const [boostCount, setBoostCount] = useState('1');
  const [hostingOptions, setHostingOptions] = useState([]);
  const [hostingRequests, setHostingRequests] = useState([]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) { setMe(null); setRewards(null); return; }
      const d = await r.json();
      setMe(d.user);
      setRewards(d.rewards);
      try {
        const ir = await fetch('/api/invites', { credentials: 'same-origin', cache: 'no-store' });
        if (ir.ok) setInvite(await ir.json());
        const hr = await fetch('/api/hosting-options', { credentials: 'same-origin', cache: 'no-store' });
        if (hr.ok) { const hd = await hr.json(); setHostingOptions(Array.isArray(hd.options) ? hd.options : []); }
        const rr = await fetch('/api/hosting-requests', { credentials: 'same-origin', cache: 'no-store' });
        if (rr.ok) { const rd = await rr.json(); setHostingRequests(Array.isArray(rd.requests) ? rd.requests : []); }
      } catch {}
    } catch { setMe(null); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    const p = new URLSearchParams(location.search);
    const status = p.get('login');
    if (status) {
      const messages = {
        success: 'Discord account connected successfully.',
        cancelled: 'Discord login was cancelled.',
        failed: 'Discord login failed. Please try again.',
        'join-discord': 'Join the official HelzerX Cloud Discord server first, then sign in.'
      };
      setToast(messages[status] || '');
      history.replaceState({}, '', location.pathname);
    }
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      setMe(null);
      setRewards(null);
      setToast('You have been signed out.');
    } finally { setBusy(false); }
  }
  async function refresh() { await load(); setToast('Account information refreshed.'); }
  async function claimBoost() {
    setBusy(true);
    try {
      const r = await fetch('/api/boost-claims', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boosts: Number(boostCount) }) });
      const d = await r.json();
      setToast(d.message || d.error || 'Could not submit claim.');
    } catch { setToast('Could not submit claim. Please try again.'); }
    finally { setBusy(false); }
  }
  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(invite?.referralUrl || '');
      setToast('Your invite link has been copied.');
    } catch { setToast(invite?.referralUrl || 'Copy your invite link manually.'); }
  }
  async function requestHosting(option) {
    let sshPublicKey = '';
    if (option.service === 'lxc') {
      sshPublicKey = window.prompt('Paste your SSH PUBLIC key (for example, the contents of ~/.ssh/id_ed25519.pub). Never paste a private key or password.');
      if (!sshPublicKey) return;
      if (sshPublicKey.length > 2048 || !/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+(?: .{0,256})?$/.test(sshPublicKey.trim())) {
        setToast('That does not look like a supported SSH public key. Do not paste a private key.');
        return;
      }
    }
    setBusy(true);
    try {
      const r = await fetch('/api/hosting-requests', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: option.service, planId: option.id, sshPublicKey: sshPublicKey.trim() })
      });
      const d = await r.json();
      setToast(d.message || d.error || 'Unable to submit hosting request.');
      if (r.ok) {
        const rr = await fetch('/api/hosting-requests', { credentials: 'same-origin', cache: 'no-store' });
        if (rr.ok) { const rd = await rr.json(); setHostingRequests(rd.requests || []); }
      }
    } catch { setToast('Unable to submit hosting request. Please try again.'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="boot"><div className="boot-orb"><span>HX</span></div><p>Preparing your HelzerX space</p><div className="loader-line"><i /></div></div>;

  if (!me) return (
    <main className="auth-screen">
      <header className="topbar">
        <Brand />
        <a className="top-link" href="https://cloud.helzerx.cyou" target="_blank" rel="noreferrer">HelzerX Cloud <ExternalLink size={13} /></a>
      </header>
      <section className="auth-hero">
        <div className="auth-copy">
          <div className="eyebrow"><span className="live-dot" /> HELZERX REWARDS · MEMBER ACCESS</div>
          <h1>Your next project<br />starts with <em>possibility.</em></h1>
          <p className="auth-lead">Earn HZL through verified community rewards, keep track of your balance, and explore hosting you can redeem.</p>
          <div className="auth-points">
            <span><ShieldCheck /> Verified Discord identity</span>
            <span><Wallet /> Your HZL balance</span>
            <span><Server /> Hosting rewards</span>
          </div>
          <a href={loginUrl} className="button primary login-button"><MessageCircle size={17} /> Continue with Discord <ArrowRight size={16} /></a>
          <div className="privacy-note"><Lock size={13} /> Secure sign-in · We only request your Discord identity</div>
        </div>
        <div className="auth-art">
          <img src="/images/helzerx-network.jpg" alt="Network switch ports connecting HelzerX hosting infrastructure" />
          <div className="art-caption"><b>Connection, built to last.</b><span>01 / HELZERX CLOUD</span></div>
        </div>
      </section>
      <section className="auth-bottom">
        <div><span className="step-no">01</span><b>Connect</b><p>Sign in with Discord.</p></div><ArrowRight className="step-arrow" />
        <div><span className="step-no">02</span><b>Earn HZL</b><p>Build rewards through eligible activity.</p></div><ArrowRight className="step-arrow" />
        <div><span className="step-no">03</span><b>Redeem</b><p>Explore hosting rewards when eligible.</p></div>
      </section>
      <footer className="footer auth-footer"><Brand /><span>HZL is an internal reward credit with no cash value.</span><small>© 2026 HelzerX Cloud</small></footer>
      {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
    </main>
  );

  return (
    <div className="dashboard">
      <header className="topbar dashbar">
        <Brand />
        <nav className={mobile ? 'nav-links open' : 'nav-links'} aria-label="Member navigation">
          <a onClick={() => setMobile(false)} href="#overview">Overview</a>
          <a onClick={() => setMobile(false)} href="#earn">Earn HZL</a>
          <a onClick={() => setMobile(false)} href="#hosting">Hosting</a>
          <a onClick={() => setMobile(false)} href="#rules">Reward rules</a>
        </nav>
        <div className="account">
          <button className="refresh-btn" title="Refresh balance" aria-label="Refresh balance" onClick={refresh}><RefreshCw size={15} /></button>
          {me.avatar ? <img className="avatar" src={me.avatar} alt="" /> : <span className="avatar fallback">{me.username.slice(0, 1).toUpperCase()}</span>}
          <span className="account-name">{me.global_name || me.username}<small>Discord verified</small></span>
          <button className="logout-btn" onClick={logout} disabled={busy} title="Sign out" aria-label="Sign out"><LogOut size={15} /></button>
          <button className="mobile-menu" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-label={mobile ? 'Close navigation' : 'Open navigation'}><Menu size={18} /></button>
        </div>
      </header>
      <main className="dash-main">
        <section className="welcome-row" id="overview">
          <div>
            <div className="eyebrow"><span className="live-dot" /> MEMBER SPACE / 01</div>
            <h1>Make room for<br /><em>what comes next.</em></h1>
            <p>Your community support can turn into hosting possibilities. Track verified HZL rewards and discover what you can redeem.</p>
          </div>
          <div className="welcome-orb">
            <img src="/images/helzerx-datacenter.jpg" alt="Rows of illuminated servers inside a HelzerX data center" />
            <span className="orb-label">YOUR REWARDS SPACE</span>
          </div>
        </section>
        <section className="stats-grid" aria-label="Rewards summary">
          <article className="stat-card balance-card">
            <div className="stat-top"><span className="stat-icon"><Wallet /></span><span className="stat-label">AVAILABLE BALANCE</span></div>
            <div className="balance-number">{money(rewards?.balance)} <small>HZL</small></div>
            <div className="stat-foot"><span>{rewards?.connected ? 'Website rewards ledger' : 'Rewards service not connected'}</span><Coins size={15} /></div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon purple"><Users /></span><span className="stat-label">VERIFIED INVITES</span></div>
            <div className="stat-number">{money(rewards?.verifiedInvites)}</div>
            <div className="stat-foot">Verified community invites <Users size={15} /></div>
          </article>
          <article className="stat-card">
            <div className="stat-top"><span className="stat-icon cyan"><Zap /></span><span className="stat-label">ACTIVE BOOSTS</span></div>
            <div className="stat-number">{money(rewards?.activeBoosts)}</div>
            <div className="stat-foot">Eligible server boosts <Activity size={15} /></div>
          </article>
        </section>
        {!rewards?.connected && <div className="status-note"><span className="status-symbol"><Activity size={17} /></span><div><b>Reward sync is waiting for setup</b><p>{rewards?.message || 'Your account is signed in. The HZL balance will be shown when the official rewards service is connected. This page will not invent or award unverified credits.'}</p></div><button onClick={refresh} aria-label="Refresh"><RefreshCw size={15} /></button></div>}

        <section className="section-block" id="website-rewards">
          <div className="section-heading"><div><div className="eyebrow">WEBSITE-NATIVE REWARDS / 02</div><h2>Your link.<br /><em>Your community.</em></h2></div><p>Share your personal HelzerX invite link. New members must sign in with Discord and pass the configured community eligibility check.</p></div>
          <div className="earn-grid">
            <article className="earn-card">
              <div className="card-content">
                <span className="card-kicker">YOUR PERSONAL INVITE LINK</span><h3>Invite and earn HZL.</h3>
                <p>Each eligible new Discord account can be attributed to one referrer only. Repeat sign-ins do not create extra invite credit.</p>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '22px 0' }}><code style={{ overflowWrap: 'anywhere', flex: '1', padding: 14, background: '#eceee8' }}>{invite?.referralUrl || 'Preparing your invite link…'}</code><button className="button secondary" onClick={copyInvite}><Copy size={14} /> Copy link</button></div>
                <div className="stat-foot"><span>Verified invites credited</span><b>{money(invite?.verifiedInvites || 0)}</b></div>
              </div>
            </article>
            <article className="earn-card">
              <div className="card-content">
                <span className="card-kicker">BOOST REWARDS · WEBSITE CLAIM</span><h3>Submit a boost claim.</h3>
                <p>No Discord bot is required for submitting claims. Because Discord OAuth cannot independently prove active boosts, claims stay pending until reviewed by an authorized administrator.</p>
                <label style={{ display: 'block', margin: '18px 0 8px', fontSize: 10 }} htmlFor="boost-count">Boost tier</label>
                <select id="boost-count" value={boostCount} onChange={e => setBoostCount(e.target.value)} style={{ width: '100%', padding: 12, border: '1px solid #d9dbd3', background: '#f8f8f5', color: 'inherit' }}>{[[1, 2000], [2, 4000], [3, 4700], [4, 5000], [7, 6900], [10, 10000]].map(([n, v]) => <option key={n} value={n}>{n} boost{n > 1 ? 's' : ''} — {money(v)} HZL</option>)}</select>
                <button className="button primary" style={{ marginTop: 14 }} onClick={claimBoost} disabled={busy}>Submit for verification <ArrowRight size={15} /></button>
                <p className="fine-print">A claim is not a credit. HZL is added only after approval.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="section-block" id="earn">
          <div className="section-heading"><div><div className="eyebrow">EARN · COLLECT · REDEEM / 02</div><h2>Earn HZL.<br /><em>Build something real.</em></h2></div><p>Two ways to support the community and unlock eligible hosting rewards.</p></div>
          <div className="earn-grid">
            <article className="earn-card invite-card">
              <div className="earn-visual"><div className="visual-halo" /><div className="visual-icon"><Users /></div><span className="visual-pill">COMMUNITY</span></div>
              <div className="card-content"><span className="card-kicker">PATH 01 · VERIFIED INVITES</span><h3>Grow the community.</h3><p>Invite genuine new members to HelzerX Cloud. Eligible invites are verified before rewards are credited.</p>
                <div className="reward-list">{[[2, 200], [4, 600], [8, 900], [12, 1300], [16, 1700], [24, 2400], [28, 2900], [34, 3400], [38, 4000], [42, 4500]].map(([n, v]) => <div className="reward-row" key={n}><span>{n} verified invites</span><b>{money(v)} <small>HZL</small></b></div>)}</div>
                <div className="card-actions"><a href="https://discord.com" target="_blank" rel="noreferrer" className="button secondary">Open Discord <ArrowUpRight size={15} /></a><span>Verified in the website</span></div>
              </div>
            </article>
            <article className="earn-card boost-card">
              <div className="earn-visual"><div className="visual-halo" /><div className="visual-icon"><Zap /></div><span className="visual-pill">BOOST REWARDS</span></div>
              <div className="card-content"><span className="card-kicker">PATH 02 · SERVER BOOSTS</span><h3>Boost. Earn. Unlock.</h3><p>Support the official Discord server with eligible active boosts and claim rewards after verification.</p>
                <div className="reward-list">{[[1, 2000], [2, 4000], [3, 4700], [4, 5000], [7, 6900], [10, 10000]].map(([n, v]) => <div className="reward-row" key={n}><span>{n} server boost{n > 1 ? 's' : ''}</span><b>{money(v)} <small>HZL</small></b></div>)}</div>
                <div className="card-actions"><a href="https://discord.com" target="_blank" rel="noreferrer" className="button secondary">Boost on Discord <ArrowUpRight size={15} /></a><span>Manual review</span></div>
              </div>
            </article>
          </div>
          <p className="fine-print">Reward tables reflect the currently provided program rules. Eligibility, qualification periods and crediting depend on official verification. Values are not cash and cannot be withdrawn.</p>
        </section>

        <section className="section-block" id="redeem">
          <div className="section-heading"><div><div className="eyebrow">REDEEM HZL / 03</div><h2>Turn credits into<br /><em>hosting.</em></h2></div><p>Only plans explicitly configured by HelzerX administrators appear here. Requests are reviewed before credits are deducted.</p></div>
          {hostingOptions.length ? <div className="hosting-grid">{hostingOptions.map(option => <article className="hosting-card" key={option.id}>
            <div className="hosting-icon">{option.service === 'minecraft' ? <Layers /> : <Server />}</div>
            <span className="hosting-index">{option.service === 'minecraft' ? 'MINECRAFT HOSTING' : option.service === 'lxc' ? 'LINUX CONTAINER (LXC)' : 'HOSTING'} / HZL REDEMPTION</span>
            <h3>{option.name}</h3><p>{option.description || 'Eligible hosting reward plan.'}</p>
            <div className="hosting-bottom"><span>Cost <code>{money(option.cost)} HZL</code></span><button disabled={busy || Number(rewards?.balance || 0) < option.cost} onClick={() => requestHosting(option)}>{Number(rewards?.balance || 0) < option.cost ? 'Not enough HZL' : 'Request hosting'} <ArrowRight size={15} /></button></div>
          </article>)}</div> : <div className="status-note"><span className="status-symbol"><ShieldCheck size={17} /></span><div><b>No hosting plans configured yet</b><p>Hosting redemption is safely disabled until the administrator configures real plan IDs, service types and HZL prices in HOSTING_REDEMPTION_OPTIONS. No fake plan prices are shown.</p></div></div>}
          {hostingRequests.length > 0 && <div style={{ marginTop: 20 }}><h3 style={{ fontSize: 14 }}>Your hosting requests</h3>{hostingRequests.map(x => <div className="reward-row" key={x.id}><span>{x.planName} · {x.provisioningStatus || x.status}{x.vmid ? ` · CT ${x.vmid}` : ''}{x.hostname ? ` · ${x.hostname}` : ''}</span><b>{money(x.cost)} HZL</b></div>)}</div>}
        </section>

        <section className="section-block hosting-section" id="hosting">
          <div className="section-heading"><div><div className="eyebrow">YOUR HZL HAS A PURPOSE / 03</div><h2>Choose your next<br /><em>hosting destination.</em></h2></div><p>Review the available options and redemption requirements before requesting a reward.</p></div>
          <div className="hosting-grid">
            <article className="hosting-card"><div className="hosting-icon"><Layers /></div><span className="hosting-index">01 / GAME SERVERS</span><h3>Minecraft Hosting</h3><p>Build your world on hosting designed for Minecraft projects.</p><ul>{['Multiple RAM options', 'High-performance CPU resources', 'NVMe storage', 'Available locations'].map(x => <li key={x}><Check size={14} />{x}</li>)}</ul><div className="hosting-bottom"><span>Website HZL redemption</span><button onClick={() => document.getElementById('redeem')?.scrollIntoView({ behavior: 'smooth' })}>View plans <ArrowRight size={15} /></button></div></article>
            <article className="hosting-card featured-host"><div className="hosting-icon"><Server /></div><span className="hosting-index">02 / VIRTUAL SERVERS</span><h3>Linux Container Hosting</h3><p>Explore eligible Linux containers running on Proxmox. This is LXC hosting, not a KVM virtual machine.</p><ul>{['Isolated Linux container', 'Configured CPU and memory limits', 'NVMe-backed storage where available', 'SSH public-key access'].map(x => <li key={x}><Check size={14} />{x}</li>)}</ul><div className="hosting-bottom"><span>Website HZL redemption</span><button onClick={() => document.getElementById('redeem')?.scrollIntoView({ behavior: 'smooth' })}>View plans <ArrowRight size={15} /></button></div></article>
          </div>
        </section>

        <section className="steps-band"><div className="eyebrow">SIMPLE BY DESIGN / 04</div><h2>From support to <em>server online.</em></h2><div className="process-grid">{[{ n: '01', title: 'Connect Discord', desc: 'Your identity is verified securely.' }, { n: '02', title: 'Earn HZL', desc: 'Earn from eligible, verified activity.' }, { n: '03', title: 'Check your balance', desc: 'Check your website dashboard.' }, { n: '04', title: 'Redeem hosting', desc: 'Choose eligible plans and follow the website status.' }].map(x => <article key={x.n}><span>{x.n}</span><b>{x.title}</b><p>{x.desc}</p></article>)}</div></section>
        <section className="rules-section" id="rules">
          <div><div className="eyebrow">CLEAR RULES · TRUST FIRST / 05</div><h2>Built for<br /><em>real supporters.</em></h2><p>HZL is an internal HelzerX Cloud reward credit designed for eligible hosting redemptions. It has no cash value.</p></div>
          <div className="rules-list">{['Only verified, eligible invites and server boosts count.', 'Self-invites, duplicate or fake accounts, bots and manipulation are not eligible.', 'Boosts must stay active for the required qualification period.', 'Suspicious activity may be reviewed before rewards or hosting are approved.', 'Reward values, eligible services and qualification rules may change.', 'No cash withdrawal, cash exchange or real-money value is provided for HZL.'].map((x, i) => <div key={x}><span>0{i + 1}</span><p>{x}</p><Check size={15} /></div>)}</div>
        </section>
        <section className="help-banner"><div className="help-icon"><MessageCircle /></div><div><span className="eyebrow">NEED A HAND?</span><h3>We’ll help you find your next step.</h3><p>Visit the official HelzerX Cloud Discord and open a support ticket.</p></div><a className="button dark-button" href="https://discord.com" target="_blank" rel="noreferrer">Get support <ArrowUpRight size={15} /></a></section>
      </main>
      <footer className="footer"><Brand /><span>Thoughtful hosting rewards for people building what comes next.</span><div><small>HZL has no cash value.</small><small>© 2026 HelzerX Cloud</small></div></footer>
      {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
    </div>
  );
}

export default App;
