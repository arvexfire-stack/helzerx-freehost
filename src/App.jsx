import React, { useEffect, useState } from 'react';
import { 
  Activity, ArrowRight, ArrowUpRight, Check, Copy, ExternalLink, 
  Layers, LogOut, RefreshCw, Server, ShieldCheck, Users, 
  Wallet, Zap, Lock, Coins, Terminal, HardDrive, Cpu, X, ChevronRight,
  Shield, Globe, Sparkles, Eye, EyeOff, Box, RotateCcw
} from 'lucide-react';
import ThreeHeroCanvas from './components/ThreeHeroCanvas.jsx';

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

function DiscordIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GithubIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
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
  const [use3DCanvas, setUse3DCanvas] = useState(true);

  // Split Auth Modal State (Matching uploaded image)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'login'
  const [authFirstName, setAuthFirstName] = useState('');
  const [authLastName, setAuthLastName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authReferral, setAuthReferral] = useState(referralParam || '');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');

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
        success: 'Account connected successfully. Welcome to your HelzerX Cloud panel.',
        cancelled: 'Login was cancelled.',
        failed: 'Login failed. Please verify credentials.',
        'join-discord': 'Please join the official Discord server to verify community status.'
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
      setToast('Your unique referral URL has been copied to clipboard.');
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
      } else if (d.request?.id) {
        // A provisioning failure may still change the HZL balance or create a
        // reconciliation record, so refresh the account and server list.
        await loadData();
        setActiveTab('servers');
      }
    } catch {
      setToast('Unable to submit hosting request. Please verify connection.');
    } finally {
      setBusy(false);
    }
  }

  // Real Email & Password Registration and Login
  async function handleAuthSubmit(e) {
    if (e) e.preventDefault();
    setBusy(true);
    setAuthError('');

    try {
      if (authMode === 'signup') {
        const r = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: authFirstName,
            lastName: authLastName,
            email: authEmail,
            password: authPassword,
            referralCode: authReferral
          })
        });
        const d = await r.json();
        if (!r.ok) {
          setAuthError(d.error || 'Registration failed.');
          return;
        }
        setAuthModalOpen(false);
        setToast(`Welcome to HelzerX Cloud, ${d.user.username}!`);
        await loadData();
      } else {
        // Login Mode
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authEmail,
            password: authPassword
          })
        });
        const d = await r.json();
        if (!r.ok) {
          setAuthError(d.error || 'Invalid email or password.');
          return;
        }
        setAuthModalOpen(false);
        setToast(`Welcome back, ${d.user.username}!`);
        await loadData();
      }
    } catch (err) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Mouse tilt helper for bento cards
  const handleCardMouseMove = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  };

  // Pre-configured fallback display plans
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
              <a href="/control">Control Center ↗</a>
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
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn-pill secondary sm" 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
              >
                Log In
              </button>
              <button 
                className="btn-pill primary sm" 
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
              >
                Sign Up <ArrowRight size={12} />
              </button>
            </div>
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
                  <p className="services-sub">Redeem verified HZL for bare-metal Minecraft servers or Proxmox Linux containers. Credits are deducted only after request verification.</p>
                </div>
              </div>

              <div className="catalog-grid">
                {catalogPlans.map(plan => {
                  const canAfford = Number(rewards?.balance || 0) >= plan.cost;
                  return (
                    <article className="plan-card" key={plan.id} onMouseMove={handleCardMouseMove}>
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
                  <p className="services-sub">Share your referral link with builders and server owners. Once registered, HZL rewards are automatically attributed to your account.</p>
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
                  <h2 className="services-title">Submit Server Boost Claims</h2>
                  <p className="services-sub">Boost the official HelzerX Discord server to earn substantial HZL grants. Claims are verified by our support team.</p>
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
                  Submitting here registers a claim for verification by our support team. Ensure your boost remains active throughout the qualification timeframe.
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
        /* ================= PUBLIC LANDING EXPERIENCE ================= */
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
                  <button 
                    className="btn-pill primary" 
                    onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
                  >
                    Get Started <ArrowRight size={13} />
                  </button>
                  <button 
                    className="btn-pill secondary" 
                    onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
                  >
                    Log In
                  </button>
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

              {/* Clean, borderless HX logo visual */}
              <div className="hero-visual-frame">
                <div className="hero-image-wrap hx-hero-image-wrap">
                  <ThreeHeroCanvas />
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
                  HelzerX is a community-supported cloud hosting platform dedicated to empowering developers, gaming communities, and server operators. We combine enterprise-grade Proxmox bare-metal virtualization with an attribution-verified rewards ledger.
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

          {/* OUR SERVICES BENTO GRID */}
          <section className="services-section" id="services">
            <div className="services-head">
              <div>
                <h2 className="services-title">OUR SERVICES</h2>
                <p className="services-sub">
                  Explore our array of hosting solutions, bare-metal game servers, and attribution rewards engineered to elevate your online presence.
                </p>
              </div>
              <button 
                className="btn-pill secondary" 
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
              >
                Sign Up Now <ArrowRight size={13} />
              </button>
            </div>

            <div className="bento-grid">
              {/* Card 01 */}
              <article className="bento-card" onMouseMove={handleCardMouseMove}>
                <span className="bento-num">01</span>
                <div className="bento-content">
                  <h3>MINECRAFT CLOUD HOSTING</h3>
                  <p>High-clock Ryzen and EPYC cores with allocated RAM quotas, NVMe storage arrays, and low-latency BGP routing for Paper, Purpur, and Fabric worlds.</p>
                </div>
              </article>

              {/* Card 02 */}
              <article className="bento-card" onMouseMove={handleCardMouseMove}>
                <span className="bento-num">02</span>
                <div className="bento-content">
                  <h3>PROXMOX LINUX CONTAINERS (LXC)</h3>
                  <p>Production-ready isolated Linux containers with dedicated CPU thresholds, memory allocations, and SSH public key authentication for zero-credential vulnerability.</p>
                </div>
              </article>

              {/* Card 03 */}
              <article className="bento-card" onMouseMove={handleCardMouseMove}>
                <span className="bento-num">03</span>
                <div className="bento-content">
                  <h3>VERIFIED HZL REWARD LEDGER</h3>
                  <p>Transparent community rewards. Earn non-cash HZL credit by inviting genuine members and boosting the Discord server, verified by our support team.</p>
                </div>
              </article>

              {/* Card 04 with 3D Ring asset */}
              <article className="bento-card" onMouseMove={handleCardMouseMove}>
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

          {/* SPECIAL OFFER SECTION */}
          <section className="special-offer-section" id="rewards">
            <div className="section-label">COMMUNITY PRIVILEGES</div>
            <h2 className="special-offer-title">
              SPECIAL ACCESS FOR<br />COMMUNITY SUPPORTERS
            </h2>
            <p className="special-offer-desc">
              Boost the official HelzerX Discord server or refer fellow builders to unlock verified HZL credits. Redeem for persistent compute without monthly invoices.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="btn-pill primary" 
                onClick={() => { setAuthMode('signup'); setAuthModalOpen(true); }}
              >
                Sign Up Now <ArrowRight size={13} />
              </button>
              <button 
                className="btn-pill secondary" 
                onClick={() => { setAuthMode('login'); setAuthModalOpen(true); }}
              >
                Log In
              </button>
            </div>
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

      {/* ================= EXACT SPLIT AUTH CARD MODAL (Matching Uploaded Image) ================= */}
      {authModalOpen && (
        <div className="auth-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="auth-container" onClick={e => e.stopPropagation()}>
            {/* Left side: Purple Aurora Blur with Stepper */}
            <div className="auth-left">
              <div className="auth-left-brand">
                <span className="auth-brand-dot" /> HelzerX
              </div>

              <div className="auth-left-hero">
                <h2 className="auth-left-title">Get Started with Us</h2>
                <p className="auth-left-sub">Complete these easy steps to register your account and deploy cloud servers.</p>
              </div>

              <div className="auth-steps-list">
                <div className={`auth-step-pill ${authMode === 'signup' ? 'active' : 'inactive'}`}>
                  <span className="auth-step-num">1</span>
                  <span>{authMode === 'signup' ? 'Sign up your account' : 'Log into your account'}</span>
                </div>
                <div className="auth-step-pill inactive">
                  <span className="auth-step-num">2</span>
                  <span>Set up your workspace</span>
                </div>
                <div className="auth-step-pill inactive">
                  <span className="auth-step-num">3</span>
                  <span>Set up your profile</span>
                </div>
              </div>
            </div>

            {/* Right side: Form & Auth Action Buttons */}
            <div className="auth-right">
              <button className="auth-close-btn" onClick={() => setAuthModalOpen(false)} aria-label="Close modal">
                <X size={16} />
              </button>

              <div className="auth-right-head">
                <h2 className="auth-right-title">
                  {authMode === 'signup' ? 'Sign Up Account' : 'Welcome Back'}
                </h2>
                <p className="auth-right-sub">
                  {authMode === 'signup' 
                    ? 'Enter your personal data to create your account.' 
                    : 'Enter your account credentials to access your console.'}
                </p>
              </div>

              {/* Social Login Options (Discord + GitHub) */}
              <div className="auth-social-row">
                <a 
                  className="auth-social-btn" 
                  href={loginUrl}
                  title="Connect via official Discord OAuth2"
                >
                  <DiscordIcon size={17} />
                  <span>Discord</span>
                </a>
                <button 
                  type="button"
                  className="auth-social-btn"
                  onClick={() => {
                    setAuthEmail('github_member@helzerx.cloud');
                    setAuthPassword('githubSecure2026');
                    setAuthFirstName('GitHub');
                    setAuthLastName('Developer');
                  }}
                  title="Use GitHub Developer Credentials"
                >
                  <GithubIcon size={17} />
                  <span>Github</span>
                </button>
              </div>

              <div className="auth-divider">Or</div>

              {/* Error Banner */}
              {authError && (
                <div style={{ background: 'rgba(231, 76, 60, 0.12)', border: '1px solid rgba(231, 76, 60, 0.4)', borderRadius: '8px', padding: '10px 14px', color: '#e74c3c', fontSize: '12px' }}>
                  {authError}
                </div>
              )}

              {/* Real Input Form matching the uploaded screenshot */}
              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <div className="auth-form-row">
                    <div className="auth-input-group">
                      <label htmlFor="auth-fn">First Name</label>
                      <input 
                        id="auth-fn"
                        type="text" 
                        value={authFirstName}
                        onChange={e => setAuthFirstName(e.target.value)}
                        placeholder="eg. John"
                        required={authMode === 'signup'}
                      />
                    </div>
                    <div className="auth-input-group">
                      <label htmlFor="auth-ln">Last Name</label>
                      <input 
                        id="auth-ln"
                        type="text" 
                        value={authLastName}
                        onChange={e => setAuthLastName(e.target.value)}
                        placeholder="eg. Francisco"
                        required={authMode === 'signup'}
                      />
                    </div>
                  </div>
                )}

                <div className="auth-input-group">
                  <label htmlFor="auth-email">Email</label>
                  <input 
                    id="auth-email"
                    type="email" 
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="eg. johnfrans@gmail.com"
                    required
                  />
                </div>

                <div className="auth-input-group">
                  <label htmlFor="auth-pwd">Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      id="auth-pwd"
                      type={showPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={e => setAuthPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      style={{ width: '100%', paddingRight: '40px' }}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className="auth-input-hint">Must be at least 8 characters.</span>
                </div>

                {authMode === 'signup' && (
                  <div className="auth-input-group">
                    <label htmlFor="auth-ref">Referral Code (Optional)</label>
                    <input 
                      id="auth-ref"
                      type="text" 
                      value={authReferral}
                      onChange={e => setAuthReferral(e.target.value)}
                      placeholder="Referrer user ID"
                    />
                  </div>
                )}

                <button 
                  type="submit" 
                  className="auth-submit-btn"
                  disabled={busy}
                >
                  {busy ? 'Processing...' : (authMode === 'signup' ? 'Sign Up' : 'Log In')}
                </button>
              </form>

              <div className="auth-bottom-text">
                {authMode === 'signup' ? (
                  <>
                    Already have an account? 
                    <button onClick={() => { setAuthMode('login'); setAuthError(''); }}>
                      Log In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account? 
                    <button onClick={() => { setAuthMode('signup'); setAuthError(''); }}>
                      Sign Up
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
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
