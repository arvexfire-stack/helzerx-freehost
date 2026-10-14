import React, { useEffect, useState } from 'react';
import { 
  Activity, ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, 
  Layers, LogOut, RefreshCw, Server, ShieldCheck, Users, 
  Wallet, Zap, Lock, Coins, Terminal, HardDrive, Cpu, X, ChevronRight,
  Shield, Globe, Sparkles
} from 'lucide-react';

const money = n => new Intl.NumberFormat('en-US').format(Number(n) || 0);
const referralParam = new URLSearchParams(window.location.search).get('ref');
const loginUrl = '/api/auth/discord' + (referralParam ? '?ref=' + encodeURIComponent(referralParam) : '');

const defaultInviteTiers = [
  [2, 200], [4, 600], [8, 900], [12, 1300], 
  [16, 1700], [24, 2400], [28, 2900], [34, 3400], 
  [38, 4000], [42, 4500]
];

const defaultBoostTiers = [
  [1, 2000], [2, 4000], [3, 4700], [4, 5000], [7, 6900], [10, 10000]
];

function Brand() {
  return (
    <a className="brand-link" href="/" aria-label="HelzerX Cloud home">
      helzerx<span className="brand-dot">.</span>
    </a>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [invite, setInvite] = useState(null);
  const [boostCount, setBoostCount] = useState('1');
  const [hostingOptions, setHostingOptions] = useState([]);
  const [hostingRequests, setHostingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('deploy'); // 'deploy' | 'servers' | 'invites' | 'boosts'
  const [sshModalOpen, setSshModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [sshPublicKey, setSshPublicKey] = useState('');
  const [viewPublicMode, setViewPublicMode] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const r = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) {
        setMe(null);
        setRewards(null);
        return;
      }
      const d = await r.json();
      setMe(d.user);
      setRewards(d.rewards);

      try {
        const [ir, hr, rr] = await Promise.all([
          fetch('/api/invites', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/hosting-options', { credentials: 'same-origin', cache: 'no-store' }),
          fetch('/api/hosting-requests', { credentials: 'same-origin', cache: 'no-store' })
        ]);
        if (ir.ok) setInvite(await ir.json());
        if (hr.ok) {
          const hd = await hr.json();
          setHostingOptions(Array.isArray(hd.options) ? hd.options : []);
        }
        if (rr.ok) {
          const rd = await rr.json();
          setHostingRequests(Array.isArray(rd.requests) ? rd.requests : []);
        }
      } catch (err) {
        console.error('Error loading sub-resources:', err);
      }
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const p = new URLSearchParams(window.location.search);
    const status = p.get('login');
    if (status) {
      const messages = {
        success: 'Discord account connected successfully. Welcome to your HelzerX Cloud panel.',
        cancelled: 'Discord login was cancelled.',
        failed: 'Discord login failed. Please try again.',
        'join-discord': 'Please join the official HelzerX Discord server first, then connect.'
      };
      setToast(messages[status] || '');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  async function logout() {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
      setMe(null);
      setRewards(null);
      setToast('You have been signed out.');
    } finally {
      setBusy(false);
    }
  }

  async function refreshAccount() {
    await loadData();
    setToast('Account balance and server status refreshed.');
  }

  async function copyInviteLink() {
    const url = invite?.referralUrl || `${window.location.origin}/?ref=${me?.id || ''}`;
    try {
      await navigator.clipboard.writeText(url);
      setToast('Your unique invite URL has been copied to clipboard.');
    } catch {
      setToast(url);
    }
  }

  async function submitBoostClaim() {
    setBusy(true);
    try {
      const r = await fetch('/api/boost-claims', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boosts: Number(boostCount) })
      });
      const d = await r.json();
      setToast(d.message || d.error || 'Claim submitted.');
      if (r.ok) {
        await loadData();
      }
    } catch {
      setToast('Could not submit boost claim. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleRequestClick(plan) {
    if (plan.service === 'lxc') {
      setSelectedPlan(plan);
      setSshModalOpen(true);
    } else {
      executeHostingRequest(plan, '');
    }
  }

  async function executeHostingRequest(plan, key) {
    setBusy(true);
    try {
      const r = await fetch('/api/hosting-requests', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: plan.service,
          planId: plan.id,
          sshPublicKey: key.trim()
        })
      });
      const d = await r.json();
      setToast(d.message || d.error || 'Request processed.');
      if (r.ok) {
        setSshModalOpen(false);
        setSshPublicKey('');
        await loadData();
        setActiveTab('servers');
      }
    } catch {
      setToast('Unable to submit hosting request. Please verify connection.');
    } finally {
      setBusy(false);
    }
  }

  // Pre-configured fallback display plans if admin has not yet injected custom JSON
  const catalogPlans = hostingOptions.length > 0 ? hostingOptions : [
    {
      id: 'minecraft-paper',
      service: 'minecraft',
      name: 'Paper MC · High Performance',
      cost: 600,
      description: 'Optimized Minecraft Paper instance with dedicated memory, NVMe flash arrays, and DDoS mitigation.'
    },
    {
      id: 'lxc-core-v1',
      service: 'lxc',
      name: 'Proxmox LXC · Linux Container',
      cost: 900,
      description: 'Dedicated isolated LXC container on Proxmox VE. Root console access authenticated via your SSH public key.'
    },
    {
      id: 'minecraft-purpur',
      service: 'minecraft',
      name: 'Purpur MC · Large World Cluster',
      cost: 1700,
      description: 'Expanded RAM quota and dedicated CPU threads for high-player-count SMP and modded communities.'
    }
  ];

  return (
    <div className="app-container">
      <div className="ambient-glow" />

      {/* Top Bar Contract (3 zones separated by gap) */}
      <header className="top-nav">
        {/* Zone 1: Wordmark */}
        <Brand />

        {/* Zone 2: Navigation Links */}
        <nav className="nav-links" aria-label="Main navigation">
          {me && !viewPublicMode ? (
            <>
              <a href="#overview" onClick={() => setActiveTab('deploy')} className={activeTab === 'deploy' ? 'active' : ''}>Deploy</a>
              <a href="#servers" onClick={() => setActiveTab('servers')} className={activeTab === 'servers' ? 'active' : ''}>My Servers ({hostingRequests.length})</a>
              <a href="#invites" onClick={() => setActiveTab('invites')} className={activeTab === 'invites' ? 'active' : ''}>Invite Hub</a>
              <a href="#boosts" onClick={() => setActiveTab('boosts')} className={activeTab === 'boosts' ? 'active' : ''}>Boost Rewards</a>
              <a href="#preview" onClick={() => setViewPublicMode(true)}>View Landing</a>
            </>
          ) : (
            <>
              <a href="#about">About</a>
              <a href="#services">Services</a>
              <a href="#rewards">HZL Rewards</a>
              <a href="#infrastructure">Infrastructure</a>
              <a href="/admin.html" target="_blank" rel="noreferrer">Admin Review</a>
            </>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="nav-actions">
          {me ? (
            <div className="user-chip">
              {me.avatar ? (
                <img src={me.avatar} alt={me.username} className="user-avatar" />
              ) : (
                <span className="user-avatar-fallback">{me.username.slice(0, 1).toUpperCase()}</span>
              )}
              <div className="user-details">
                <span className="user-name">{me.global_name || me.username}</span>
                <span className="user-badge">{money(rewards?.balance || 0)} HZL</span>
              </div>
              <button className="btn-icon" onClick={refreshAccount} title="Refresh balance" aria-label="Refresh balance">
                <RefreshCw size={13} />
              </button>
              <button className="btn-icon" onClick={logout} disabled={busy} title="Sign out" aria-label="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <a className="btn-pill primary" href={loginUrl}>
              Connect Discord <ArrowRight size={13} />
            </a>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      {me && !viewPublicMode ? (
        /* ================= MEMBER DASHBOARD ================= */
        <main className="page-content" style={{ gap: '48px' }}>
          <section className="dashboard-header" id="overview">
            <div className="dashboard-hero">
              <div className="dashboard-title-wrap">
                <h1>Member Cloud Console</h1>
                <p>Manage your verified HZL credits, deploy Minecraft and Proxmox LXC servers, and track infrastructure status.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-pill secondary sm" onClick={refreshAccount}>
                  <RefreshCw size={12} /> Sync Ledger
                </button>
                <a className="btn-pill primary sm" href="#deploy" onClick={() => setActiveTab('deploy')}>
                  Deploy Server <ArrowRight size={12} />
                </a>
              </div>
            </div>

            {/* Dashboard Navigation Tabs */}
            <div className="dashboard-tabs">
              <button 
                className={`tab-btn ${activeTab === 'deploy' ? 'active' : ''}`}
                onClick={() => setActiveTab('deploy')}
              >
                <Layers size={14} /> Hosting Catalog
              </button>
              <button 
                className={`tab-btn ${activeTab === 'servers' ? 'active' : ''}`}
                onClick={() => setActiveTab('servers')}
              >
                <Server size={14} /> My Containers & Servers ({hostingRequests.length})
              </button>
              <button 
                className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
                onClick={() => setActiveTab('invites')}
              >
                <Users size={14} /> Invite & Referral Hub
              </button>
              <button 
                className={`tab-btn ${activeTab === 'boosts' ? 'active' : ''}`}
                onClick={() => setActiveTab('boosts')}
              >
                <Zap size={14} /> Boost Claim Submission
              </button>
            </div>
          </section>

          {/* KPI Stats Strip */}
          <section className="stats-grid" aria-label="Account Overview Stats">
            <div className="stat-box highlight">
              <div className="stat-box-label">
                <span>Available Balance</span>
                <Coins size={14} color="var(--accent-gold)" />
              </div>
              <div className="stat-box-num">{money(rewards?.balance || 0)} <small style={{ fontSize: '15px', color: 'var(--accent-gold)' }}>HZL</small></div>
              <div className="stat-box-sub">{rewards?.connected ? 'Attributed on official ledger' : 'Ready for redemption'}</div>
            </div>

            <div className="stat-box">
              <div className="stat-box-label">
                <span>Verified Invites</span>
                <Users size={14} />
              </div>
              <div className="stat-box-num">{money(invite?.verifiedInvites ?? rewards?.verifiedInvites ?? 0)}</div>
              <div className="stat-box-sub">
                {invite?.pendingInvites ? `${invite.pendingInvites} pending review` : 'All claims verified'}
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-box-label">
                <span>Server Boosts</span>
                <Zap size={14} />
              </div>
              <div className="stat-box-num">{money(rewards?.activeBoosts || 0)}</div>
              <div className="stat-box-sub">Active community boosts</div>
            </div>

            <div className="stat-box">
              <div className="stat-box-label">
                <span>Active Servers</span>
                <Server size={14} />
              </div>
              <div className="stat-box-num">{hostingRequests.length}</div>
              <div className="stat-box-sub">Proxmox LXC & Minecraft</div>
            </div>
          </section>

          {/* TAB 1: DEPLOY HOSTING CATALOG */}
          {activeTab === 'deploy' && (
            <section className="services-section" id="deploy">
              <div className="services-head">
                <div>
                  <div className="section-label">Configured Redemptions</div>
                  <h2 className="services-title">Available Cloud Hosting Plans</h2>
                  <p className="services-sub">Redeem verified HZL for bare-metal Minecraft servers or Proxmox Linux containers. Credits are deducted only upon administrator review.</p>
                </div>
              </div>

              <div className="catalog-grid">
                {catalogPlans.map(plan => {
                  const canAfford = Number(rewards?.balance || 0) >= plan.cost;
                  return (
                    <article className="plan-card" key={plan.id}>
                      <div className="plan-top">
                        <span className="plan-service-tag">
                          {plan.service === 'lxc' ? 'PROXMOX LINUX CONTAINER' : 'MINECRAFT SERVER'}
                        </span>
                        <h3 className="plan-title">{plan.name}</h3>
                        <p className="plan-desc">{plan.description}</p>
                        <ul className="plan-features">
                          <li><Check size={13} /> {plan.service === 'lxc' ? 'Dedicated CPU & isolated RAM limits' : 'High-clock CPU cores & NVMe storage'}</li>
                          <li><Check size={13} /> {plan.service === 'lxc' ? 'SSH public-key root access' : 'Full paper/modded control & DDoS shield'}</li>
                          <li><Check size={13} /> Low-latency datacenter network fabric</li>
                        </ul>
                      </div>

                      <div className="plan-bottom">
                        <div className="plan-cost">
                          <span>Cost</span>
                          <b>{money(plan.cost)} <small style={{ fontSize: '12px', color: 'var(--accent-gold)' }}>HZL</small></b>
                        </div>
                        <button 
                          className="btn-pill primary sm"
                          disabled={busy || !canAfford}
                          onClick={() => handleRequestClick(plan)}
                          style={{ opacity: canAfford ? 1 : 0.55 }}
                        >
                          {!canAfford ? 'Need More HZL' : 'Request Server'} <ArrowRight size={12} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 2: MY SERVERS & REQUEST HISTORY */}
          {activeTab === 'servers' && (
            <section className="services-section" id="servers">
              <div className="table-panel">
                <div className="table-head">
                  <h3>Your Server Requests & Deployments</h3>
                  <button className="btn-pill secondary sm" onClick={refreshAccount}>
                    <RefreshCw size={12} /> Refresh Status
                  </button>
                </div>

                {hostingRequests.length === 0 ? (
                  <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Server size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '15px', color: '#fff', fontWeight: 600 }}>No hosting deployments yet</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>Choose a hosting plan from the catalog to request your first container or game server.</p>
                    <button 
                      className="btn-pill primary sm" 
                      style={{ marginTop: '16px' }}
                      onClick={() => setActiveTab('deploy')}
                    >
                      View Catalog <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div>
                    {hostingRequests.map(req => {
                      const isProvisioned = req.status === 'provisioned';
                      const isPending = req.status === 'pending';
                      const isError = req.status === 'provisioning-error';
                      return (
                        <div className="request-item" key={req.id}>
                          <div className="request-info">
                            <span className="request-title">{req.planName || req.service.toUpperCase()}</span>
                            <span className="request-meta">
                              ID: {req.id.slice(0, 8)}... · Cost: {money(req.cost)} HZL · Submitted: {new Date(req.createdAt).toLocaleDateString()}
                              {req.vmid ? ` · CT VMID: ${req.vmid}` : ''}
                              {req.hostname ? ` · Host: ${req.hostname}` : ''}
                            </span>
                            {req.error && (
                              <span style={{ color: '#e74c3c', fontSize: '11px', marginTop: '2px' }}>
                                Error: {req.error}
                              </span>
                            )}
                          </div>
                          <div>
                            <span className={`status-badge ${isProvisioned ? 'provisioned' : isPending ? 'pending' : isError ? 'error' : 'provisioning'}`}>
                              {isProvisioned ? <Check size={11} /> : isPending ? <Activity size={11} /> : <Server size={11} />}
                              {req.provisioningStatus || req.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 3: INVITE & REFERRAL HUB */}
          {activeTab === 'invites' && (
            <section className="rewards-section" id="invites">
              <div className="services-head">
                <div>
                  <div className="section-label">Community Expansion</div>
                  <h2 className="services-title">Personal Referral Program</h2>
                  <p className="services-sub">Share your invite link with builders and server owners. Once verified through Discord, HZL rewards are automatically credited to your balance.</p>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Your Unique Referral URL
                </span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input 
                    type="text" 
                    readOnly 
                    value={invite?.referralUrl || `${window.location.origin}/?ref=${me.id}`} 
                    style={{ flex: 1, minWidth: '280px', background: '#09090c', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                  />
                  <button className="btn-pill primary" onClick={copyInviteLink}>
                    <Copy size={13} /> Copy Link
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '24px', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <span>Verified: <b style={{ color: '#fff' }}>{invite?.verifiedInvites || 0}</b></span>
                  <span>Pending review: <b style={{ color: 'var(--accent-gold)' }}>{invite?.pendingInvites || 0}</b></span>
                </div>
              </div>

              <div className="section-label" style={{ marginTop: '16px' }}>Invite Milestone Schedule</div>
              <div className="tiers-grid">
                {(rewards?.inviteTiers || defaultInviteTiers).map(([count, amount]) => {
                  const achieved = (invite?.verifiedInvites || 0) >= count;
                  return (
                    <article className={`tier-card ${achieved ? 'featured' : ''}`} key={count}>
                      <div className="tier-header">
                        <span className="tier-badge">TIER {count}</span>
                        {achieved && <span style={{ color: '#2ecc71', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}><Check size={12} /> Achieved</span>}
                      </div>
                      <div className="tier-amount">
                        <span className="tier-number">{money(amount)}</span>
                        <span className="tier-unit">HZL</span>
                      </div>
                      <p className="tier-desc">Awarded after {count} verified genuine members join via your referral link.</p>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* TAB 4: BOOST CLAIMS */}
          {activeTab === 'boosts' && (
            <section className="rewards-section" id="boosts">
              <div className="services-head">
                <div>
                  <div className="section-label">Server Boosting</div>
                  <h2 className="services-title">Submit Discord Boost Claims</h2>
                  <p className="services-sub">Boost the official HelzerX Discord server to earn substantial HZL grants. Claims are verified manually by administrators.</p>
                </div>
              </div>

              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '36px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="form-group">
                  <label htmlFor="boost-tier-select">Select Your Active Server Boost Tier</label>
                  <select 
                    id="boost-tier-select"
                    value={boostCount} 
                    onChange={e => setBoostCount(e.target.value)}
                  >
                    {(rewards?.boostTiers || defaultBoostTiers).map(([count, amount]) => (
                      <option key={count} value={count}>
                        {count} Server Boost{count > 1 ? 's' : ''} — {money(amount)} HZL Reward
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Discord OAuth alone cannot automatically verify active booster permissions without privileged server bot scopes. Submitting here registers a pending claim for administrator verification.
                </div>

                <button 
                  className="btn-pill primary" 
                  onClick={submitBoostClaim} 
                  disabled={busy}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Zap size={13} /> Submit Boost Claim For Review
                </button>
              </div>

              <div className="section-label" style={{ marginTop: '16px' }}>Active Boost Rewards Schedule</div>
              <div className="tiers-grid">
                {(rewards?.boostTiers || defaultBoostTiers).map(([count, amount]) => (
                  <article className="tier-card" key={count}>
                    <div className="tier-header">
                      <span className="tier-badge">{count} BOOST{count > 1 ? 'S' : ''}</span>
                    </div>
                    <div className="tier-amount">
                      <span className="tier-number">{money(amount)}</span>
                      <span className="tier-unit">HZL</span>
                    </div>
                    <p className="tier-desc">Awarded when maintaining {count} active server boost{count > 1 ? 's' : ''} on the official Discord server.</p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>
      ) : (
        /* ================= PUBLIC LANDING EXPERIENCE (Exact match to reference image) ================= */
        <main className="page-content">
          {/* HERO SECTION */}
          <section className="hero-section" id="hero">
            <div className="hero-main-grid">
              <div className="hero-text-block">
                <div className="hero-kicker">
                  <ShieldCheck size={14} color="var(--accent-gold)" /> HelzerX Cloud Production Agency
                </div>
                <h1 className="hero-title">
                  THE COMMUNITY<br />
                  <span className="accent-text">CLOUD HOSTING</span><br />
                  ARCHITECTURE
                </h1>
                <p className="hero-description">
                  Enterprise Minecraft servers and isolated Proxmox Linux containers. High-frequency compute, NVMe flash arrays, and verified community rewards with zero out-of-pocket costs.
                </p>
                <div className="hero-cta-group">
                  <a className="btn-pill primary" href={loginUrl}>
                    Connect Discord <ArrowRight size={13} />
                  </a>
                  <a className="btn-pill secondary" href="#services">
                    Explore Services
                  </a>
                  {me && (
                    <button className="btn-pill secondary" onClick={() => setViewPublicMode(false)}>
                      Back to Console
                    </button>
                  )}
                </div>
              </div>

              {/* 3D Iridescent Glass Cylinder Visual Frame */}
              <div className="hero-visual-frame">
                <div className="hero-image-wrap">
                  <img 
                    src="/images/hero-glass.jpg" 
                    alt="3D floating iridescent glass cylinder with warm amber and violet caustics" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="hero-badge-overlay">
                    <Sparkles size={12} color="var(--accent-gold)" />
                    <span>Next-Gen Cloud Compute</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ABOUT SECTION (Matching the reference image layout) */}
          <section className="about-section" id="about">
            <div className="section-label">ABOUT</div>
            <div className="about-grid">
              <div className="about-narrative">
                <p>
                  HelzerX is a community-supported cloud hosting platform dedicated to empowering developers, gaming communities, and server administrators. We combine enterprise-grade Proxmox bare-metal virtualization with an attribution-verified rewards ledger.
                </p>
                <p>
                  Whether you are launching a high-concurrency Minecraft network or provisioning private Linux containers for automated workloads, our infrastructure delivers true isolated resources without financial barriers.
                </p>
              </div>

              <div className="about-metrics-wrap">
                <div className="about-metrics">
                  <div className="metric-item">
                    <span className="metric-val">99.9%</span>
                    <span className="metric-label">Uptime SLA</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-val">42+</span>
                    <span className="metric-label">Reward Tiers</span>
                  </div>
                  <div className="metric-item">
                    <span className="metric-val">0$</span>
                    <span className="metric-label">Out of Pocket</span>
                  </div>
                </div>
                {/* Floating 3D Accessory Torus Visual (Matching image) */}
                <div className="about-accessory-visual">
                  <img 
                    src="/images/accessory-torus.jpg" 
                    alt="3D dark metallic iridescent torus ring" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* OUR SERVICES BENTO GRID (Exact match to reference image) */}
          <section className="services-section" id="services">
            <div className="services-head">
              <div>
                <h2 className="services-title">OUR SERVICES</h2>
                <p className="services-sub">
                  Explore our array of hosting solutions, bare-metal game servers, and attribution rewards engineered to elevate your online presence.
                </p>
              </div>
              <a className="btn-pill secondary" href={loginUrl}>
                Get Access <ArrowRight size={13} />
              </a>
            </div>

            <div className="bento-grid">
              {/* Card 01 */}
              <article className="bento-card">
                <span className="bento-num">01</span>
                <div className="bento-content">
                  <h3>MINECRAFT CLOUD HOSTING</h3>
                  <p>High-clock Ryzen and EPYC cores with allocated RAM quotas, NVMe storage arrays, and low-latency BGP routing for Paper, Purpur, and Fabric worlds.</p>
                </div>
              </article>

              {/* Card 02 */}
              <article className="bento-card">
                <span className="bento-num">02</span>
                <div className="bento-content">
                  <h3>PROXMOX LINUX CONTAINERS (LXC)</h3>
                  <p>Production-ready isolated Linux containers with dedicated CPU thresholds, memory allocations, and SSH public key authentication for zero-credential vulnerability.</p>
                </div>
              </article>

              {/* Card 03 */}
              <article className="bento-card">
                <span className="bento-num">03</span>
                <div className="bento-content">
                  <h3>VERIFIED HZL REWARD LEDGER</h3>
                  <p>Transparent community rewards. Earn non-cash HZL credit by inviting genuine members and boosting the Discord server, reviewed manually by admins.</p>
                </div>
              </article>

              {/* Card 04 with 3D Ring asset inside the card (matching reference image) */}
              <article className="bento-card">
                <span className="bento-num">04</span>
                <div className="bento-content">
                  <h3>ENTERPRISE INFRASTRUCTURE</h3>
                  <p>Tier 3 datacenter presence with redundant power feeds, automated Proxmox virtualization clustering, and proactive DDoS edge filtering.</p>
                </div>
                <div className="bento-visual-corner">
                  <img 
                    src="/images/accessory-torus.jpg" 
                    alt="Iridescent torus ring asset" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </article>
            </div>
          </section>

          {/* SPECIAL OFFER SECTION (Matching reference image) */}
          <section className="special-offer-section" id="rewards">
            <div className="section-label">COMMUNITY PRIVILEGES</div>
            <h2 className="special-offer-title">
              SPECIAL ACCESS FOR<br />COMMUNITY SUPPORTERS
            </h2>
            <p className="special-offer-desc">
              Boost the official HelzerX Discord server or refer fellow builders to unlock verified HZL credits. Redeem for persistent compute without monthly invoices.
            </p>
            <a className="btn-pill primary" href={loginUrl}>
              Connect With Discord <ArrowRight size={13} />
            </a>
          </section>

          {/* INFRASTRUCTURE SPOTLIGHT SECTION */}
          <section className="services-section" id="infrastructure">
            <div className="services-head">
              <div>
                <div className="section-label">HARDWARE ARCHITECTURE</div>
                <h2 className="services-title">BUILT ON REAL HARDWARE</h2>
                <p className="services-sub">
                  No virtualized overselling. We deploy real nodes with high thermal headroom, ECC memory, and persistent SSD/NVMe volume protection.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', alignItems: 'center' }}>
              <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--card-border)', height: '340px' }}>
                <img 
                  src="/images/datacenter.jpg" 
                  alt="HelzerX datacenter racks with optical indicators" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <HardDrive size={16} color="var(--accent-gold)" />
                    <b style={{ color: '#fff', fontSize: '14px' }}>NVMe Flash Storage</b>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>High IOPS random access for Minecraft world saves and Linux container databases without disk bottlenecks.</p>
                </div>

                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Cpu size={16} color="var(--accent-gold)" />
                    <b style={{ color: '#fff', fontSize: '14px' }}>Proxmox VE Virtualization</b>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Kernel-level LXC isolation with zero virtualization hypervisor overhead for near-native compute speeds.</p>
                </div>

                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <Shield size={16} color="var(--accent-gold)" />
                    <b style={{ color: '#fff', fontSize: '14px' }}>SSH Key Access Only</b>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Strict asymmetric cryptography. Passwords are never sent across the wire or stored on disk.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* SSH Public Key Modal for LXC Container Requests */}
      {sshModalOpen && selectedPlan && (
        <div className="modal-overlay" onClick={() => setSshModalOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Deploy {selectedPlan.name}</h3>
              <button className="modal-close" onClick={() => setSshModalOpen(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Proxmox LXC containers enforce asymmetric public key security. Paste your SSH <b>public</b> key (e.g. from <code>~/.ssh/id_ed25519.pub</code>). Never submit a private key or password.
            </p>

            <div className="form-group">
              <label htmlFor="ssh-key-input">SSH Public Key</label>
              <textarea 
                id="ssh-key-input"
                rows={4}
                value={sshPublicKey}
                onChange={e => setSshPublicKey(e.target.value)}
                placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@machine"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
              />
            </div>

            <div className="modal-actions">
              <button className="btn-pill secondary sm" onClick={() => setSshModalOpen(false)}>
                Cancel
              </button>
              <button 
                className="btn-pill primary sm"
                disabled={busy || !sshPublicKey.trim().startsWith('ssh-')}
                onClick={() => executeHostingRequest(selectedPlan, sshPublicKey)}
              >
                Submit Request ({money(selectedPlan.cost)} HZL)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="toast-notice" role="status">
          <span>{toast}</span>
          <button className="toast-close" onClick={() => setToast('')} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Minimalist Site Footer */}
      <footer className="site-footer">
        <div className="footer-top">
          <Brand />
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#services">Services</a>
            <a href="#infrastructure">Infrastructure</a>
            <a href="#rewards">Rewards</a>
            <a href="/admin.html" target="_blank" rel="noreferrer">Admin Review Console</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 HelzerX Cloud · Verified community cloud infrastructure.</span>
          <span>HZL is an internal reward credit for eligible hosting redemptions with no cash value.</span>
        </div>
      </footer>
    </div>
  );
}
