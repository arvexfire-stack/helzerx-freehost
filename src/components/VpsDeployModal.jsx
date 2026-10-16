import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, KeyRound, LockKeyhole, Server, ShieldCheck, X, ChevronDown, RefreshCw, Eye, EyeOff } from 'lucide-react';
import './VpsDeployModal.css';

const money = n => new Intl.NumberFormat('en-US').format(Number(n) || 0);

function makePassword() {
  const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_'];
  const alphabet = groups.join('');
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const result = groups.map((group, index) => group[bytes[index] % group.length]);
  for (let i = result.length; i < 20; i++) result.push(alphabet[bytes[i] % alphabet.length]);
  for (let i = result.length - 1; i > 0; i--) {
    const j = bytes[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

export default function VpsDeployModal({ plan, nodes = [], osOptions = [], balance = 0, busy, onClose, onDeploy, onLoadTemplates }) {
  const [name, setName] = useState('');
  const [nodeId, setNodeId] = useState(nodes[0]?.id || '');
  const [osId, setOsId] = useState('');
  const [mode, setMode] = useState('auto');
  const [password, setPassword] = useState(makePassword());
  const [visible, setVisible] = useState(false);
  const [availableOs, setAvailableOs] = useState(osOptions);
  const [osLoading, setOsLoading] = useState(false);
  const [osError, setOsError] = useState('');

  useEffect(() => {
    if (!plan) return;
    setName('');
    setNodeId(nodes[0]?.id || '');
    setOsId('');
    setMode('auto');
    setPassword(makePassword());
    setVisible(false);
  }, [plan?.id]);

  useEffect(() => {
    if (!plan || !nodeId || typeof onLoadTemplates !== 'function') return;
    let cancelled = false;
    setOsLoading(true);
    setOsError('');
    setAvailableOs([]);
    setOsId('');
    onLoadTemplates(nodeId).then(items => {
      if (cancelled) return;
      const next = Array.isArray(items) ? items : [];
      setAvailableOs(next);
      setOsId(next[0]?.id || '');
      if (!next.length) setOsError('No LXC templates were found on this node. Upload or download a template in Proxmox first.');
    }).catch(error => {
      if (cancelled) return;
      setAvailableOs([]);
      setOsError(error?.message || 'Could not load operating systems from Proxmox.');
    }).finally(() => {
      if (!cancelled) setOsLoading(false);
    });
    return () => { cancelled = true; };
  }, [nodeId, plan?.id]);

  if (!plan) return null;
  const node = nodes.find(x => x.id === nodeId);
  const os = availableOs.find(x => x.id === osId);
  const cost = Number(plan.cost || 0) + Number(node?.surcharge || 0) + Number(os?.surcharge || 0);
  const validName = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(name) && name.length >= 2;
  const validPassword = mode === 'auto' || (password.length >= 10 && password.length <= 128);
  const canSubmit = Boolean(node && os && validName && validPassword && cost > 0 && Number(balance) >= cost && !busy && !osLoading);

  return <div className="vps-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section className="vps-deploy-modal" role="dialog" aria-modal="true" aria-labelledby="vps-modal-title">
      <div className="vps-modal-ambient" />
      <header className="vps-modal-header">
        <div className="vps-modal-kicker"><i className="vps-live-dot" /> HELZERX CLOUD <span className="vps-kicker-divider">/</span> SERVER CONFIGURATION</div>
        <button className="vps-modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        <h2 id="vps-modal-title">Build your <span>server.</span></h2>
        <p>Choose your configuration. We’ll handle the provisioning.</p>
      </header>
      <div className="vps-modal-layout">
        <div className="vps-config-fields">
          <label className="vps-field"><span>SERVER NAME <small>2–30 characters</small></span>
            <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0,30))} placeholder="my-first-vps" autoComplete="off" maxLength={30} />
            <small className={name && !validName ? 'vps-field-error' : 'vps-field-hint'}>{name && !validName ? 'Use 2–30 lowercase letters, numbers or hyphens.' : 'This will be your server hostname.'}</small>
          </label>
          <label className="vps-field"><span><Server size={13} /> PROXMOX NODE</span><div className="vps-select-wrap">
            <select value={nodeId} onChange={e => setNodeId(e.target.value)}>{nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}</select><ChevronDown size={15} /></div>
            {!nodes.length && <small className="vps-field-error">No nodes configured by the administrator.</small>}
          </label>
          <div className="vps-field"><span><HardDrive size={13} /> OPERATING SYSTEM <small>Live Proxmox templates</small></span><div className="vps-select-wrap">
            <select value={osId} onChange={e => setOsId(e.target.value)} disabled={osLoading || !availableOs.length}>
              {osLoading && <option value="">Reading Proxmox templates…</option>}
              {!osLoading && !availableOs.length && <option value="">No templates available</option>}
              {availableOs.map(o => <option key={o.id} value={o.id}>{o.label || o.id}{o.storage ? ' · ' + o.storage : ''}</option>)}
            </select><ChevronDown size={15} /></div>
            {osLoading && <small className="vps-field-hint"><RefreshCw size={11} className="vps-spin" /> Checking available templates on {node?.label || nodeId}…</small>}
            {!osLoading && osError && <small className="vps-field-error">{osError}</small>}
            {!osLoading && os && <small className="vps-field-hint">Template found in Proxmox storage: {os.storage || os.template}</small>}
          </div>
          <div className="vps-field"><span><KeyRound size={13} /> ROOT PASSWORD</span>
            <div className="vps-password-modes"><button type="button" className={mode === 'auto' ? 'selected' : ''} onClick={() => { setMode('auto'); setPassword(makePassword()); }}>Generate securely</button><button type="button" className={mode === 'custom' ? 'selected' : ''} onClick={() => setMode('custom')}>Set my own</button></div>
            <div className="vps-password-input"><input type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} readOnly={mode === 'auto'} autoComplete="new-password" placeholder="At least 10 characters" /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}</button>{mode === 'auto' && <button type="button" onClick={() => setPassword(makePassword())} aria-label="Generate another password"><RefreshCw size={14} /></button>}</div>
            {mode === 'custom' && <small className={validPassword ? 'vps-field-hint' : 'vps-field-error'}>Use 10–128 characters.</small>}
            <small className="vps-field-hint"><LockKeyhole size={11} /> Shown once after creation. Not saved in request history.</small>
          </div>
        </div>
        <aside className="vps-order-summary">
          <div className="vps-3d-server" aria-hidden="true">
            <div className="vps-server-shadow" />
            <div className="vps-server-rack">
              <div className="vps-rack-side" />
              <div className="vps-rack-top" />
              <div className="vps-rack-front">
                <div className="vps-rack-brand"><span>HX</span><i /></div>
                <div className="vps-rack-bay"><b /><span /><span /><i /><i /><i /><i /><i /><i /></div>
                <div className="vps-rack-bay"><b /><span /><span /><i /><i /><i /><i /><i /><i /></div>
                <div className="vps-rack-bay"><b /><span /><span /><i /><i /><i /><i /><i /><i /></div>
                <div className="vps-rack-bay"><b /><span /><span /><i /><i /><i /><i /><i /><i /></div>
                <div className="vps-rack-lower"><i /><i /><i /><span>HELZERX SYSTEMS</span></div>
              </div>
              <div className="vps-rack-foot foot-left" /><div className="vps-rack-foot foot-right" />
            </div>
            <div className="vps-server-orbit orbit-one" /><div className="vps-server-orbit orbit-two" />
          </div>
          <div className="vps-summary-label">YOUR CONFIGURATION</div><h3>{plan.name}</h3><p className="vps-summary-description">{plan.description || 'Linux virtual server'}</p>
          <div className="vps-spec-row"><Cpu size={14} /><span>CPU</span><b>{plan.resources?.cores || '—'} cores</b></div>
          <div className="vps-spec-row"><Activity size={14} /><span>Memory</span><b>{plan.resources?.memory ? (Math.round(plan.resources.memory / 102.4) / 10) + ' GB' : '—'}</b></div>
          <div className="vps-spec-row"><HardDrive size={14} /><span>Storage</span><b>{plan.resources?.disk || '—'} GB</b></div>
          <div className="vps-cost-breakdown"><div><span>Plan price</span><b>{money(plan.cost)} HZL</b></div>
            {Number(node?.surcharge || 0) > 0 && <div><span>Node fee</span><b>+{money(node.surcharge)} HZL</b></div>}
            {Number(os?.surcharge || 0) > 0 && <div><span>OS fee</span><b>+{money(os.surcharge)} HZL</b></div>}
            <div className="vps-total"><span>Total</span><b>{money(cost)} <small>HZL</small></b></div><div className="vps-balance"><span>Available balance</span><b>{money(balance)} HZL</b></div>
          </div>
          <button className="vps-deploy-submit" type="button" disabled={!canSubmit} onClick={() => onDeploy({ displayName:name, nodeId, osId, password, passwordMode:mode, cost })}>
            {busy ? <><Activity size={16} className="vps-spin" /> Creating server…</> : <><Server size={16} /> Deploy server <span>→</span></>}</button>
          {!validName && <small className="vps-submit-note">Enter a valid server name to continue.</small>}
          {Number(balance) < cost && <small className="vps-submit-note">You need {money(cost - Number(balance))} more HZL.</small>}
          {(!nodes.length) && <small className="vps-submit-note">Node configuration is missing.</small>}
          <div className="vps-trust-note"><ShieldCheck size={13} /> Secure configuration · HZL pricing shown before deployment</div>
        </aside>
      </div>
    </section>
  </div>;
}
