import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, Layers, LogOut, Menu, MessageCircle, RefreshCw, Server, ShieldCheck, Users, Wallet, Zap, Lock, Coins } from 'lucide-react';

const money = n => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const referralParam = new URLSearchParams(window.location.search).get('ref');
const loginUrl = '/api/auth/discord' + (referralParam ? '?ref=' + encodeURIComponent(referralParam) : '');
const inviteMilestones = [[2, 200], [4, 600], [8, 900], [12, 1300], [16, 1700], [24, 2400], [28, 2900], [34, 3400], [38, 4000], [42, 4500]];
const boostTiers = [[1, 2000], [4, 5000], [10, 10000]];

function Brand() {
  return <a className="brand" href="/" aria-label="HelzerX Free Hosting home"><span className="brand-mark">H<span>X</span></span><span className="brand-copy"><b>HelzerX</b><small>FREE HOSTING</small></span></a>;
}

function PublicLanding({ toast, setToast }) {
  return (
    <div className="site-wrap">
      <main className="site-shell">
        <div className="site-columns">
          <div className="site-column">
            <section className="landing-hero reveal" data-reveal style={{ '--delay': '0ms' }}>
              <div className="hero-top">
                <Brand />
                <nav className="hero-nav" aria-label="Site navigation">
                  <a href="#services">Services</a>
                  <a href="#rewards">HZL rewards</a>
                  <a href="#eligibility">How it works</a>
                </nav>
              </div>
              <div className="hero-center">
                <div className="eyebrow"><span className="live-dot" /> HELZERX CLOUD · COMMUNITY HOSTING</div>
                <h1>Room to build.<br />A community behind it.</h1>
                <p>Minecraft hosting and Linux containers, with eligible hosting access for members who support the HelzerX community.</p>
                <div className="hero-actions" style={{ marginTop: 13 }}>
                  <a className="button primary" href={loginUrl}><MessageCircle size={12} /> Sign in with Discord <ArrowRight size={12} /></a>
                  <a className="button secondary" href="#services">Explore services</a>
                </div>
              </div>
              <div className="hero-foot">
                <span><Lock /> Discord identity sign-in</span>
                <span>Eligibility applies · HZL has no cash value</span>
              </div>
            </section>

            <figure className="photo-card reveal" data-reveal style={{ '--delay': '50ms', margin: 0 }}>
              <img src="/images/helzerx-datacenter.jpg" alt="Monochrome view of real server racks and cabling in a data center" />
              <figcaption className="photo-caption"><b>Infrastructure for what you make.</b><span>HELZERX CLOUD / 01</span></figcaption>
            </figure>

            <div className="trust-strip reveal" data-reveal style={{ '--delay': '90ms' }} aria-label="Program notes">
              <span><ShieldCheck /> Verified community activity</span>
              <span><Coins /> HZL is non-cash credit</span>
              <span><Activity /> Claims reviewed by admins</span>
            </div>

            <section className="preview-panel reveal" data-reveal style={{ '--delay': '130ms' }} aria-labelledby="preview-title">
              <div className="preview-head"><h2 id="preview-title">Your member space, at a glance</h2><span className="pill">Discord verified</span></div>
              <div className="preview-body" aria-hidden="true">
                <div className="preview-widget"><span className="widget-label">INVITE LINK</span><div className="widget-line" /><div className="widget-line short" /></div>
                <div className="preview-widget"><span className="widget-label">HOSTING REQUESTS</span><div className="widget-chips"><i /><i /><i /></div></div>
              </div>
              <p className="preview-caption">Check your own balance, invitation URL, claim status and hosting requests after signing in. No sample account figures shown.</p>
            </section>

            <section className="product-section reveal" id="services" data-reveal style={{ '--delay': '170ms' }}>
              <h2 className="section-title">A place for game worlds and Linux projects.</h2>
              <p className="section-subtitle" style={{ marginBottom: 10 }}>Hosting access is limited to plans configured by HelzerX and reviewed member requests.</p>
              <div className="product-grid">
                <article className="product-card"><span className="card-icon"><Layers /></span><h3>Minecraft Hosting</h3><p>Project hosting with multiple RAM options, high-performance CPU resources and NVMe storage.</p></article>
                <article className="product-card"><span className="card-icon"><Server /></span><h3>Linux Containers</h3><p>Eligible Proxmox LXC hosting with configured CPU and memory limits.</p></article>
                <article className="product-card"><span className="card-icon"><Users /></span><h3>Verified invites</h3><p>Invite genuine new members. Eligibility is checked before HZL is credited.</p></article>
                <article className="product-card"><span className="card-icon"><Zap /></span><h3>Boost claims</h3><p>Submit eligible Discord boosts for manual administrator review.</p></article>
              </div>
            </section>

            <section className="invite-milestones reveal" data-reveal style={{ '--delay': '210ms' }}>
              <div className="eyebrow">VERIFIED INVITE MILESTONES</div>
              <h2 className="section-title" style={{ marginTop: 6 }}>Support that adds up.</h2>
              <p className="section-subtitle">HZL rewards are credited only after eligible invites are verified.</p>
              <div className="milestone-list">
                {inviteMilestones.map(([count, amount]) => <div key={count}><span>{count} verified invites</span><b>{money(amount)} <small>HZL</small></b></div>)}
              </div>
              <p className="fine-print">Invite eligibility and attribution are checked by the website. Self-invites, duplicate or manipulated accounts do not qualify.</p>
            </section>
          </div>

          <div className="site-column">
            <section className="quick-row reveal" data-reveal style={{ '--delay': '60ms' }} aria-label="Program essentials">
              <article className="quick-card"><div className="quick-top"><span>HOSTING ACCESS</span><Layers /></div><b>Configured plans only</b><p>Availability depends on plans enabled by HelzerX administrators.</p></article>
              <article className="quick-card"><div className="quick-top"><span>HZL REWARDS</span><ShieldCheck /></div><b>For eligible members</b><p>Internal hosting credits only. No cash value or withdrawal.</p></article>
            </section>

            <section className="boost-pricing reveal" id="rewards" data-reveal style={{ '--delay': '100ms' }}>
              <div className="eyebrow">DISCORD BOOSTS · HZL BOOST REWARDS</div>
              <h2>Choose a claim tier.</h2>
              <p>Submit a claim for eligible active server boosts. Each claim remains pending until an authorized administrator reviews it.</p>
              <div className="tier-grid">
                {boostTiers.map(([count, amount], index) => (
                  <article className={index === 1 ? 'tier-card highlight' : 'tier-card'} key={count}>
                    <div><span className="tier-boosts">{count} {count === 1 ? 'boost' : 'boosts'}</span><b>{money(amount)}<small>HZL</small></b></div>
                    <div className="tier-foot">Claim pending admin verification</div>
                  </article>
                ))}
              </div>
              <div className="pending-note"><ShieldCheck /><span>Claims are not instant credits and HZL is not cash. Credits are added only after manual verification and approval.</span></div>
              <div style={{ marginTop: 11 }}><a href={loginUrl} className="button dark-button">Sign in to submit a claim <ArrowRight size={11} /></a></div>
            </section>

            <section className="feature-band reveal" data-reveal style={{ '--delay': '150ms' }}>
              <div className="feature-photo"><img src="/images/helzerx-network.jpg" alt="Close-up of Ethernet cables connected to a network switch" /></div>
              <div className="feature-copy">
                <div className="eyebrow">HOSTING, WITH CLEAR REQUIREMENTS</div>
                <h2>Pick a service that fits your project.</h2>
                <p>Only options configured for redemption appear in the member area.</p>
                <ul className="check-list">
                  <li><Check /> Minecraft plans include multiple RAM options, CPU resources and NVMe storage.</li>
                  <li><Check /> Linux hosting uses Proxmox LXC containers, not KVM virtual machines.</li>
                  <li><Check /> LXC requests require a valid SSH public key. Never submit a private key.</li>
                </ul>
              </div>
            </section>

            <section className="cta-panel reveal" id="eligibility" data-reveal style={{ '--delay': '190ms' }}>
              <div className="eyebrow">SUPPORT FIRST · REDEEM WHEN ELIGIBLE</div>
              <h2>Build alongside the community.</h2>
              <p>Connect a Discord account to view your verified HZL, share your invite link and request any hosting plan currently configured for redemption.</p>
              <div className="cta-actions">
                <a href={loginUrl} className="button primary"><MessageCircle size={11} /> Continue with Discord <ArrowRight size={11} /></a>
                <a href="https://discord.com" target="_blank" rel="noreferrer" className="button secondary">Visit Discord <ArrowUpRight size={10} /></a>
              </div>
            </section>

            <footer className="site-footer">
              <div className="footer-col footer-brand"><Brand /><p>Community-supported hosting for projects worth building.</p></div>
              <div className="footer-col"><b>Explore</b><a href="#services">Hosting services</a><a href="#rewards">Boost rewards</a><a href="#eligibility">Eligibility</a></div>
              <div className="footer-col"><b>Services</b><span>Minecraft hosting</span><span>Linux containers</span><span>HZL member rewards</span></div>
              <div className="footer-col"><b>Community</b><a href={loginUrl}>Member sign in</a><a href="https://discord.com" target="_blank" rel="noreferrer">Discord support <ExternalLink size={8} /></a><span>HZL has no cash value</span></div>
              <div className="copyright">© 2026 HelzerX Cloud · Hosting access and rewards depend on eligibility, review and configured options.</div>
            </footer>
          </div>
        </div>
        {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
      </main>
    </div>
  );
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

  useEffect(() => {
    if (loading) return undefined;
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return undefined;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [loading, !!me]);

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

  if (loading) return <div className="boot"><div className="boot-mark">HX</div><p>Preparing your HelzerX space</p><div className="boot-skeleton" aria-hidden="true"><i /><i /><i /></div><div className="loader-line"><i /></div></div>;

  if (!me) return <PublicLanding toast={toast} setToast={setToast} />;

  return (
    <div className="site-wrap dashboard-shell">
      <main className="site-shell">
        <div className="site-columns">
          <div className="site-column">
            <section className="dash-intro reveal" data-reveal style={{ '--delay': '0ms' }} id="overview">
              <div className="hero-top">
                <Brand />
                <div className="account">
                  <button className="icon-button" title="Refresh balance" aria-label="Refresh balance" onClick={refresh}><RefreshCw /></button>
                  {me.avatar ? <img className="avatar" src={me.avatar} alt="" /> : <span className="avatar fallback">{me.username.slice(0, 1).toUpperCase()}</span>}
                  <span className="account-name">{me.global_name || me.username}<small>Discord verified</small></span>
                  <button className="icon-button" onClick={logout} disabled={busy} title="Sign out" aria-label="Sign out"><LogOut /></button>
                  <button className="mobile-menu" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-label={mobile ? 'Close navigation' : 'Open navigation'}><Menu /></button>
                </div>
              </div>
              <nav className={mobile ? 'dash-nav open' : 'dash-nav'} aria-label="Member navigation">
                <a onClick={() => setMobile(false)} href="#overview">Overview</a>
                <a onClick={() => setMobile(false)} href="#earn">Earn HZL</a>
                <a onClick={() => setMobile(false)} href="#hosting">Hosting</a>
                <a onClick={() => setMobile(false)} href="#rules">Reward rules</a>
              </nav>
              <div className="hero-center">
                <div className="eyebrow"><span className="live-dot" /> MEMBER SPACE / HELZERX CLOUD</div>
                <h1>Make space for your next project.</h1>
                <p>See what is verified, what is pending and which hosting options are configured for members.</p>
              </div>
              <div className="hero-foot"><span><ShieldCheck /> Discord identity verified</span><span>HZL is a non-cash reward credit</span></div>
            </section>

            <section className="account-summary reveal" data-reveal style={{ '--delay': '50ms' }} aria-label="Rewards summary">
              <article className="stat-card balance-card"><span className="stat-label">AVAILABLE BALANCE</span><div className="balance-number">{money(rewards?.balance)} <small>HZL</small></div><div className="stat-foot"><span>{rewards?.connected ? 'Website rewards ledger' : 'Rewards service not connected'}</span><Coins /></div></article>
              <article className="stat-card"><span className="stat-label">VERIFIED INVITES</span><div className="stat-number">{money(rewards?.verifiedInvites)}</div><div className="stat-foot"><span>Verified members</span><Users /></div></article>
              <article className="stat-card"><span className="stat-label">ACTIVE BOOSTS</span><div className="stat-number">{money(rewards?.activeBoosts)}</div><div className="stat-foot"><span>Eligible boosts</span><Activity /></div></article>
            </section>
            {!rewards?.connected && <div className="status-note reveal" data-reveal><span className="status-symbol"><Activity /></span><div><b>Reward sync is waiting for setup</b><p>{rewards?.message || 'Your account is signed in. The HZL balance will be shown when the official rewards service is connected. This page will not invent or award unverified credits.'}</p></div><button onClick={refresh} aria-label="Refresh"><RefreshCw /></button></div>}

            <section className="dash-section reveal" data-reveal style={{ '--delay': '90ms' }} id="earn">
              <div className="eyebrow">YOUR PERSONAL INVITE LINK</div>
              <h2>Invite genuine new members.</h2>
              <p>New members must sign in with Discord and pass the configured community eligibility check. A new eligible account is attributed to one referrer only.</p>
              <div className="invite-url"><code>{invite?.referralUrl || 'Preparing your invite link…'}</code><button className="button secondary" onClick={copyInvite}><Copy size={11} /> Copy link</button></div>
              <div className="invite-total"><span>Verified invites credited</span><b>{money(invite?.verifiedInvites || 0)}</b></div>
              <div className="milestone-list">
                {inviteMilestones.map(([count, amount]) => <div key={count}><span>{count} verified invites</span><b>{money(amount)} <small>HZL</small></b></div>)}
              </div>
              <p className="fine-print">Milestone rewards are for verified eligible invites only. Self-invites, duplicate or manipulated accounts are not eligible.</p>
            </section>

            <section className="dash-section reveal" data-reveal style={{ '--delay': '130ms' }} id="hosting">
              <div className="eyebrow">HELZERX HOSTING SERVICES</div>
              <h2>What you can request.</h2>
              <p>Hosting options are shown for your account when configured by HelzerX administrators.</p>
              <div className="hosting-grid" style={{ marginTop: 10 }}>
                <article className="hosting-card"><div className="hosting-icon"><Layers /></div><span className="hosting-index">01 / GAME SERVERS</span><h3>Minecraft Hosting</h3><p>Build your world on hosting designed for Minecraft projects.</p><ul>{['Multiple RAM options', 'High-performance CPU resources', 'NVMe storage', 'Available locations'].map(x => <li key={x}><Check />{x}</li>)}</ul><div className="hosting-bottom"><span>Website HZL redemption</span><button onClick={() => document.getElementById('redeem')?.scrollIntoView({ behavior: 'smooth' })}>View configured plans <ArrowRight size={10} /></button></div></article>
                <article className="hosting-card"><div className="hosting-icon"><Server /></div><span className="hosting-index">02 / VIRTUAL SERVERS</span><h3>Linux Container Hosting</h3><p>Eligible Linux containers running on Proxmox. This is LXC hosting, not a KVM virtual machine.</p><ul>{['Isolated Linux container', 'Configured CPU and memory limits', 'NVMe-backed storage where available', 'SSH public-key access'].map(x => <li key={x}><Check />{x}</li>)}</ul><div className="hosting-bottom"><span>SSH public key required</span><button onClick={() => document.getElementById('redeem')?.scrollIntoView({ behavior: 'smooth' })}>View configured plans <ArrowRight size={10} /></button></div></article>
              </div>
            </section>
          </div>

          <div className="site-column">
            <section className="quick-row reveal" data-reveal style={{ '--delay': '40ms' }} aria-label="Member status">
              <article className="quick-card"><div className="quick-top"><span>ACCOUNT</span><ShieldCheck /></div><b>{me.global_name || me.username}</b><p>Discord identity verified</p></article>
              <article className="quick-card"><div className="quick-top"><span>REWARD LEDGER</span><Coins /></div><b>{rewards?.connected ? 'Connected' : 'Not connected'}</b><p>{rewards?.connected ? 'Balance from rewards service' : 'No unverified HZL is shown'}</p></article>
            </section>

            <section className="boost-pricing dark-panel reveal" data-reveal style={{ '--delay': '80ms' }}>
              <div className="eyebrow">BOOST REWARDS · WEBSITE CLAIM</div>
              <h2>Submit a boost claim.</h2>
              <p>Discord OAuth cannot independently prove active boosts. Claims remain pending until reviewed by an authorized administrator.</p>
              <label className="select-label" htmlFor="boost-count">Choose an HZL boost reward claim</label>
              <div className="boost-form">
                <select id="boost-count" value={boostCount} onChange={e => setBoostCount(e.target.value)}>{boostTiers.map(([n, v]) => <option key={n} value={n}>{n} boost{n > 1 ? 's' : ''} — {money(v)} HZL</option>)}</select>
                <button className="button dark-button" onClick={claimBoost} disabled={busy}>Submit claim <ArrowRight size={11} /></button>
              </div>
              <p className="fine-print">Claims are pending admin verification, not instant credits or cash. HZL is added only after approval.</p>
            </section>

            <section className="dash-section reveal" data-reveal style={{ '--delay': '120ms' }} id="redeem">
              <div className="eyebrow">REDEEM HZL · CONFIGURED OPTIONS ONLY</div>
              <h2>Hosting requests.</h2>
              <p>Only plans explicitly configured by HelzerX administrators appear here. Requests are reviewed before credits are deducted.</p>
              {hostingOptions.length ? <div className="hosting-grid" style={{ marginTop: 10 }}>{hostingOptions.map(option => <article className="hosting-card" key={option.id}>
                <div className="hosting-icon">{option.service === 'minecraft' ? <Layers /> : <Server />}</div>
                <span className="hosting-index">{option.service === 'minecraft' ? 'MINECRAFT HOSTING' : option.service === 'lxc' ? 'LINUX CONTAINER (LXC)' : 'HOSTING'} / HZL REDEMPTION</span>
                <h3>{option.name}</h3><p>{option.description || 'Eligible hosting reward plan.'}</p>
                <div className="hosting-bottom"><span>Cost <code>{money(option.cost)} HZL</code></span><button disabled={busy || Number(rewards?.balance || 0) < option.cost} onClick={() => requestHosting(option)}>{Number(rewards?.balance || 0) < option.cost ? 'Not enough HZL' : 'Request hosting'} <ArrowRight size={10} /></button></div>
              </article>)}</div> : <div className="status-note" style={{ marginTop: 10 }}><span className="status-symbol"><ShieldCheck /></span><div><b>No hosting plans configured yet</b><p>Hosting redemption is safely disabled until an administrator configures real plan IDs, service types and HZL prices. No sample prices are displayed.</p></div></div>}
              {hostingRequests.length > 0 && <div style={{ marginTop: 12 }}><div className="eyebrow">YOUR REQUEST HISTORY</div><div className="request-list">{hostingRequests.map(x => <div className="request-row" key={x.id}><span>{x.planName} · {x.provisioningStatus || x.status}{x.vmid ? ` · CT ${x.vmid}` : ''}{x.hostname ? ` · ${x.hostname}` : ''}</span><b>{money(x.cost)} HZL</b></div>)}</div></div>}
            </section>

            <section className="feature-band reveal" data-reveal style={{ '--delay': '160ms' }}>
              <div className="feature-photo"><img src="/images/helzerx-datacenter.jpg" alt="Monochrome server rack detail representing HelzerX hosting infrastructure" /></div>
              <div className="feature-copy"><div className="eyebrow">STATUS, NOT SURPRISES</div><h2>Every request has a next step.</h2><p>Follow review and provisioning messages in your hosting history.</p><ul className="check-list"><li><Check /> Boost submissions wait for admin review.</li><li><Check /> Hosting is limited to configured plans.</li><li><Check /> LXC uses a validated SSH public key.</li></ul></div>
            </section>

            <section className="dash-section reveal" data-reveal style={{ '--delay': '190ms' }} id="rules">
              <div className="eyebrow">CLEAR RULES · TRUST FIRST</div>
              <h2>HZL is for eligible hosting redemptions.</h2>
              <p>Internal HelzerX Cloud reward credit. It has no cash value and cannot be withdrawn or exchanged for money.</p>
              <div className="rules-mini">
                {['Only verified, eligible invites and server boosts count.', 'Self-invites, duplicate or fake accounts, bots and manipulation are not eligible.', 'Boosts must stay active for the required qualification period.', 'Suspicious activity may be reviewed before rewards or hosting are approved.'].map(x => <p key={x}><Check />{x}</p>)}
              </div>
              <p className="fine-print">Reward values, eligible services and qualification rules may change. No cash withdrawal or real-money value is provided.</p>
            </section>

            <section className="cta-panel reveal" data-reveal style={{ '--delay': '220ms' }}>
              <div className="eyebrow">NEED A HAND?</div><h2>Talk to the HelzerX community.</h2><p>Visit the official HelzerX Cloud Discord and open a support ticket.</p>
              <div className="cta-actions"><a className="button primary" href="https://discord.com" target="_blank" rel="noreferrer">Get support <ArrowUpRight size={10} /></a><button className="button secondary" onClick={refresh}><RefreshCw size={10} /> Refresh account</button></div>
            </section>

            <footer className="site-footer">
              <div className="footer-col footer-brand"><Brand /><p>Community-supported hosting for projects worth building.</p></div>
              <div className="footer-col"><b>Member space</b><a href="#overview">Overview</a><a href="#earn">Invite rewards</a><a href="#hosting">Hosting</a></div>
              <div className="footer-col"><b>Rules</b><a href="#rules">Eligibility</a><span>HZL has no cash value</span><span>Manual review applies</span></div>
              <div className="footer-col"><b>Account</b><button className="button secondary logout-hero" onClick={logout} disabled={busy}>Sign out <LogOut size={9} /></button><span>© 2026 HelzerX Cloud</span></div>
              <div className="copyright">Hosting access and rewards depend on eligibility, review and configured options.</div>
            </footer>
          </div>
        </div>
        {toast && <div className="toast" role="status">{toast}<button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
      </main>
    </div>
  );
}

export default App;
