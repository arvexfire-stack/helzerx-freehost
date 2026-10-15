import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, KeyRound, LockKeyhole, Server, ShieldCheck, Sparkles, X, ChevronDown } from 'lucide-react';
import './VpsDeployModal.css';
const money = n => new Intl.NumberFormat('en-US').format(Number(n) || 0);
function makePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_';
  const bytes = new Uint8Array(20); crypto.getRandomValues(bytes);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
export default function VpsDeployModal({ plan, nodes = [], osOptions = [], balance = 0, busy, onClose, onDeploy }) {
  const [name, setName] = useState('');
  const [nodeId, setNodeId] = useState(nodes[0]?.id || '');
  const [osId, setOsId] = useState(osOptions[0]?.id || '');
  const [mode, setMode] = useState('auto');
  const [password, setPassword] = useState(makePassword());
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (!nodeId && nodes[0]) setNodeId(nodes[0].id); if (!osId && osOptions[0]) setOsId(osOptions[0].id); }, [nodes, osOptions, nodeId, osId]);
  useEffect(() => { if (plan) { setName(''); setNodeId(nodes[0]?.id || ''); setOsId(osOptions[0]?.id || ''); setMode('auto'); setPassword(makePassword()); setVisible(false); } }, [plan?.id]);
  if (!plan) return null;
  const node = nodes.find(x => x.id === nodeId);
  const os = osOptions.find(x => x.id === osId);
  const cost = Number(plan.cost || 0) + Number(node?.surcharge || 0) + Number(os?.surcharge || 0);
  const validName = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(name) && name.length >= 2;
  const validPassword = mode === 'auto' || (password.length >= 10 && password.length <= 128);
  const canSubmit = Boolean(node && os && validName && validPassword && cost > 0 && Number(balance) >= cost && !busy);
  return <div className="vps-modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <section className="vps-deploy-modal" role="dialog" aria-modal="true" aria-labelledby="vps-modal-title">
      <div className="vps-modal-glow" />
      <header className="vps-modal-header">
        <div className="vps-modal-kicker"><i className="vps-live-dot" /> HELZERX CLOUD · INSTANT PROVISIONING</div>
        <button className="vps-modal-close" type="button" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        <h2 id="vps-modal-title">Configure your <span>VPS.</span></h2>
        <p>Choose your server name, node, operating system and root password.</p>
      </header>
      <div className="vps-modal-layout">
        <div className="vps-config-fields">
          <label className="vps-field"><span>VPS NAME <small>2–30 characters</small></span>
            <input value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0,30))} placeholder="my-first-vps" autoComplete="off" maxLength={30} />
            <small className={name && !validName ? 'vps-field-error' : 'vps-field-hint'}>{name && !validName ? 'Use 2–30 lowercase letters/numbers/hyphens.' : 'Used as the server hostname.'}</small>
          </label>
          <label className="vps-field"><span><Server size={13} /> NODE SELECTION</span><div className="vps-select-wrap">
            <select value={nodeId} onChange={e => setNodeId(e.target.value)}>{nodes.map(n => <option key={n.id} value={n.id}>{n.label || n.id}</option>)}</select><ChevronDown size={15} /></div>
            {!nodes.length && <small className="vps-field-error">No nodes configured by the administrator.</small>}
          </label>
          <label className="vps-field"><span>OPERATING SYSTEM</span><div className="vps-select-wrap">
            <select value={osId} onChange={e => setOsId(e.target.value)}>{osOptions.map(o => <option key={o.id} value={o.id}>{o.label || o.id}</option>)}</select><ChevronDown size={15} /></div>
            {!osOptions.length && <small className="vps-field-error">No OS templates configured by the administrator.</small>}
          </label>
          <div className="vps-field"><span><KeyRound size={13} /> ROOT PASSWORD</span>
            <div className="vps-password-modes"><button type="button" className={mode === 'auto' ? 'selected' : ''} onClick={() => { setMode('auto'); setPassword(makePassword()); }}>Auto-generate</button><button type="button" className={mode === 'custom' ? 'selected' : ''} onClick={() => setMode('custom')}>Choose my own</button></div>
            <div className="vps-password-input"><input type={visible ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} readOnly={mode === 'auto'} autoComplete="new-password" placeholder="At least 10 characters" /><button type="button" onClick={() => setVisible(v => !v)}>{visible ? 'Hide' : 'Show'}</button></div>
            {mode === 'custom' && <small className={validPassword ? 'vps-field-hint' : 'vps-field-error'}>Password must be 10–128 characters.</small>}
            <small className="vps-field-hint"><LockKeyhole size={11} /> Password is not saved in the request history.</small>
          </div>
        </div>
        <aside className="vps-order-summary">
          <div className="vps-3d-server" aria-hidden="true"><div className="vps-server-shadow" /><div className="vps-server-unit unit-back"><i /><i /><i /></div><div className="vps-server-unit unit-mid"><i /><i /><i /></div><div className="vps-server-unit unit-front"><i /><i /><i /></div><div className="vps-server-base" /><div className="vps-server-orbit orbit-one" /><div className="vps-server-orbit orbit-two" /></div>
          <div className="vps-summary-label">DEPLOYMENT SUMMARY</div><h3>{plan.name}</h3><p className="vps-summary-description">{plan.description || 'Linux VPS container'}</p>
          <div className="vps-spec-row"><Cpu size={14} /><span>CPU</span><b>{plan.resources?.cores || '—'} cores</b></div>
          <div className="vps-spec-row"><Activity size={14} /><span>Memory</span><b>{plan.resources?.memory ? (Math.round(plan.resources.memory / 102.4) / 10) + ' GB' : '—'}</b></div>
          <div className="vps-spec-row"><HardDrive size={14} /><span>Storage</span><b>{plan.resources?.disk || '—'} GB</b></div>
          <div className="vps-cost-breakdown"><div><span>Base plan</span><b>{money(plan.cost)} HZL</b></div>
            {Number(node?.surcharge || 0) > 0 && <div><span>Node surcharge</span><b>+{money(node.surcharge)} HZL</b></div>}
            {Number(os?.surcharge || 0) > 0 && <div><span>OS surcharge</span><b>+{money(os.surcharge)} HZL</b></div>}
            <div className="vps-total"><span>Total cost</span><b>{money(cost)} <small>HZL</small></b></div><div className="vps-balance"><span>Your balance</span><b>{money(balance)} HZL</b></div>
          </div>
          <button className="vps-deploy-submit" type="button" disabled={!canSubmit} onClick={() => onDeploy({ displayName:name, nodeId, osId, password, passwordMode:mode, cost })}>
            {busy ? <><Activity size={16} className="vps-spin" /> Provisioning…</> : <><Sparkles size={16} /> Deploy VPS <span>→</span></>}</button>
          {!validName && <small className="vps-submit-note">Enter a valid VPS name to continue.</small>}
          {Number(balance) < cost && <small className="vps-submit-note">You need {money(cost - Number(balance))} more HZL.</small>}
          {(!nodes.length || !osOptions.length) && <small className="vps-submit-note">Deployment options are not configured yet.</small>}
          <div className="vps-trust-note"><ShieldCheck size={13} /> HZL is charged only when provisioning starts.</div>
        </aside>
      </div>
    </section>
  </div>;
}
