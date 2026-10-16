import crypto from 'node:crypto';
import { Client } from 'ssh2';
const env = (key, fallback = '') => String(process.env[key] ?? fallback).trim();
export function proxmoxConfig() {
  return {
    enabled: env('PROXMOX_ENABLED').toLowerCase() === 'true',
    baseUrl: env('PROXMOX_API_URL').replace(/\/+$/, ''),
    node: env('PROXMOX_NODE', 'hlx-infra-02'),
    storage: env('PROXMOX_STORAGE', 'local'),
    bridge: env('PROXMOX_BRIDGE', 'vmbr0'),
    template: env('PROXMOX_TEMPLATE'),
    tokenId: env('PROXMOX_TOKEN_ID'),
    tokenSecret: env('PROXMOX_TOKEN_SECRET'),
    vmidMin: Number(env('PROXMOX_VMID_MIN', '2000')),
    vmidMax: Number(env('PROXMOX_VMID_MAX', '2999')),
    taskTimeoutMs: Number(env('PROXMOX_TASK_TIMEOUT_MS', '180000')),
    // DHCP must actually exist on the configured bridge; otherwise set a supported static
    // network plan before enabling provisioning.
    network: env('PROXMOX_NETWORK', 'dhcp').toLowerCase(),
    sshHost: env('PROXMOX_SSH_HOST'),
    sshPort: Number(env('PROXMOX_SSH_PORT', '22')),
    sshUsername: env('PROXMOX_SSH_USERNAME', 'helzerx-panel'),
    sshPrivateKey: env('PROXMOX_SSH_PRIVATE_KEY'),
    sshHostKeySha256: env('PROXMOX_SSH_HOST_KEY_SHA256').replace(/^SHA256:/, '')
  };
}
export function proxmoxReadiness() {
  const c = proxmoxConfig();
  const missing = [];
  if (!c.baseUrl) missing.push('PROXMOX_API_URL');
  if (!c.node) missing.push('PROXMOX_NODE');
  if (!c.storage) missing.push('PROXMOX_STORAGE');
  if (!c.bridge) missing.push('PROXMOX_BRIDGE');
  if (!c.tokenId) missing.push('PROXMOX_TOKEN_ID');
  if (!c.tokenSecret) missing.push('PROXMOX_TOKEN_SECRET');
  if (!Number.isInteger(c.vmidMin) || !Number.isInteger(c.vmidMax) || c.vmidMin < 100 || c.vmidMax < c.vmidMin) missing.push('PROXMOX_VMID_MIN/PROXMOX_VMID_MAX');
  if (!/^https:\/\//i.test(c.baseUrl)) missing.push('PROXMOX_API_URL must use HTTPS');
  return { enabled: c.enabled, ready: c.enabled && missing.length === 0, missing, network: c.network };
}
function apiUrl(c, endpoint) { return c.baseUrl + endpoint; }
async function api(c, method, endpoint, params) {
  const headers = {
    Authorization: 'PVEAPIToken=' + c.tokenId + '=' + c.tokenSecret,
    Accept: 'application/json'
  };
  const options = { method, headers, signal: AbortSignal.timeout(20000) };
  let target = apiUrl(c, endpoint);
  if (params && method === 'GET') {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    if ([...query].length) target += '?' + query.toString();
  } else if (params) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = body;
  }
  const response = await fetch(target, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors) {
    const message = payload?.errors ? JSON.stringify(payload.errors) : (payload?.message || 'Proxmox API request failed (' + response.status + ')');
    throw new Error(message.slice(0, 500));
  }
  return payload.data;
}
const enc = (v) => encodeURIComponent(String(v));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
let allocationQueue = Promise.resolve();
async function allocateVmid(c) {
  let release;
  const previous = allocationQueue;
  allocationQueue = new Promise(resolve => { release = resolve; });
  await previous;
  try {
    const resources = await api(c, 'GET', '/cluster/resources', { type: 'vm' });
    const occupied = new Set((Array.isArray(resources) ? resources : []).map(x => Number(x.vmid)));
    for (let id = c.vmidMin; id <= c.vmidMax; id++) if (!occupied.has(id)) return id;
    throw new Error('No free VMID remains in configured range ' + c.vmidMin + '-' + c.vmidMax + '.');
  } finally { release(); }
}

async function waitTask(c, upid, taskNode = c.node) {
  const deadline = Date.now() + c.taskTimeoutMs;
  while (Date.now() < deadline) {
    const status = await api(c, 'GET', '/nodes/' + enc(taskNode) + '/tasks/' + enc(upid) + '/status');
    if (status.status === 'stopped') {
      const exitstatus = String(status.exitstatus || 'unknown').trim();

      // Proxmox can report a completed task with warnings as "WARNINGS: N".
      // Treat only that exact warning-summary format as successful; real errors
      // and unknown exit statuses must still fail closed.
      const completedWithWarnings = /^WARNINGS:\s*\d+$/i.test(exitstatus);
      if (exitstatus !== 'OK' && !completedWithWarnings) {
        throw new Error('Proxmox task failed: ' + exitstatus.slice(0, 300));
      }

      if (completedWithWarnings) {
        console.warn('[Proxmox] Task completed with warnings:', {
          upid,
          exitstatus
        });
      }
      return status;
    }
    await delay(2000);
  }
  throw new Error('Proxmox task is still running; task ID retained for safe reconciliation: ' + upid);
}


function templateDisplayName(volid) {
  const file = String(volid).split('/').pop().replace(/\.(tar\.(gz|xz|zst)|tar)$/i, '').replace(/[_-]+/g, ' ');
  const distro = file.match(/(ubuntu|debian|alpine|rocky|alma(?:linux)?|centos|fedora|archlinux|opensuse|kali|devuan|oraclelinux)/i)?.[1] || '';
  const version = file.match(/(?:ubuntu|debian)[ -]?(20\d{2}\.\d{2}|\d{2}\.\d{2}|\d{2})/i)?.[1] || file.match(/(20\d{2}\.\d{2}|\d{2}\.\d{2}|\d+(?:\.\d+)?)/)?.[1] || '';
  const names = { ubuntu:'Ubuntu', debian:'Debian', alpine:'Alpine Linux', rocky:'Rocky Linux', alma:'AlmaLinux', almalinux:'AlmaLinux', centos:'CentOS', fedora:'Fedora', archlinux:'Arch Linux', opensuse:'openSUSE', kali:'Kali Linux', devuan:'Devuan', oraclelinux:'Oracle Linux' };
  const label = names[distro.toLowerCase()] || '';
  return (label ? label + (version ? ' ' + version : '') : file) + (label && /standard/i.test(file) ? ' Standard' : '');
}
export async function listLxcTemplates({ node } = {}) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox API is not ready: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  let configuredNodes = [];
  try { configuredNodes = JSON.parse(env('PROXMOX_NODES', '[]')); } catch {}
  const allowedNodes = Array.isArray(configuredNodes) && configuredNodes.length ? configuredNodes.map(x => String(x?.id || '')) : [c.node];
  const targetNode = String(node || c.node);
  if (!allowedNodes.includes(targetNode)) throw new Error('Selected Proxmox node is not allowlisted.');
  const stores = await api(c, 'GET', '/nodes/' + enc(targetNode) + '/storage');
  if (!Array.isArray(stores)) throw new Error('Could not list Proxmox storage for this node.');
  const candidates = stores.filter(x => x && typeof x.storage === 'string' && x.storage && (x.active === undefined || Boolean(x.active)) && (x.enabled === undefined || Boolean(x.enabled)));
  const contents = await Promise.all(candidates.map(async store => {
    try {
      const rows = await api(c, 'GET', '/nodes/' + enc(targetNode) + '/storage/' + enc(store.storage) + '/content', { content: 'vztmpl' });
      return (Array.isArray(rows) ? rows : []).filter(row => row && typeof row.volid === 'string' && row.volid.includes(':vztmpl/') && /\.tar\.(?:gz|xz|zst)$/i.test(row.volid)).map(row => ({ template: row.volid, storage: store.storage, size: Number(row.size) || 0 }));
    } catch { return []; }
  }));
  const configuredOs = [];
  try { configuredOs.push(...JSON.parse(env('PROXMOX_OS_OPTIONS', '[]'))); } catch {}
  const surchargeFor = template => {
    const match = configuredOs.find(x => String(x?.template || '') === template);
    return Number.isSafeInteger(Number(match?.surcharge)) && Number(match.surcharge) >= 0 ? Number(match.surcharge) : 0;
  };
  const unique = new Map();
  for (const row of contents.flat()) if (!unique.has(row.template)) unique.set(row.template, { id: row.template, template: row.template, label: templateDisplayName(row.template), storage: row.storage, size: row.size, surcharge: surchargeFor(row.template) });
  return [...unique.values()].sort((a,b) => a.label.localeCompare(b.label) || a.template.localeCompare(b.template));
}

export async function provisionLxc({ requestId, plan, username, sshPublicKey, node, template, hostname: requestedHostname, rootPassword }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox provisioning is not enabled or configured. Missing: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  let configuredNodes=[];try{configuredNodes=JSON.parse(env('PROXMOX_NODES','[]'))}catch{}
  const allowedNodes=Array.isArray(configuredNodes)&&configuredNodes.length?configuredNodes.map(x=>String(x?.id||'')):[c.node];
  const targetNode=String(node||c.node);
  if(!allowedNodes.includes(targetNode))throw new Error('Selected Proxmox node is not allowlisted.');
  const targetTemplate=String(template||c.template);
  const liveTemplates=await listLxcTemplates({node:targetNode});
  if(!liveTemplates.some(x=>x.template===targetTemplate))throw new Error('Selected OS template is not available on the selected Proxmox node. Refresh the OS list and try again.');
  const safeName=String(requestedHostname||'').trim().toLowerCase();
  if(safeName&&!/^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/.test(safeName))throw new Error('Invalid VPS hostname.');
  const password=String(rootPassword||'');
  if(password&&(password.length<10||password.length>128||/[\x00-\x1f\x7f]/.test(password)))throw new Error('Invalid root password.');
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/i.test(String(plan.id || ''))) throw new Error('Invalid hosting plan ID.');
  if (String(plan.service || '').toLowerCase() !== 'lxc') throw new Error('Only explicitly labelled LXC plans can be provisioned. KVM and game-server plans are not supported by this adapter.');
  const resources = plan.proxmox;
  if (!resources || !Number.isInteger(Number(resources.cores)) || Number(resources.cores) < 1 ||
      !Number.isInteger(Number(resources.memory)) || Number(resources.memory) < 256 ||
      !Number.isInteger(Number(resources.disk)) || Number(resources.disk) < 2) {
    throw new Error('This hosting plan has no valid Proxmox resource mapping (cores, memory MB, disk GB).');
  }
  if (c.network !== 'dhcp') throw new Error('Only DHCP network mode is currently supported by the provisioner. Configure a verified DHCP service or add static IP allocation before enabling.');
  const next = await allocateVmid(c);
  const hostname = safeName || ('hx-' + String(requestId).replace(/[^a-z0-9]/gi, '').slice(0, 10) + '-' + next).toLowerCase().slice(0, 63);
  let sshKeys = String(sshPublicKey || '').trim();
  let generatedSshPrivateKey = null;
  if (!sshKeys) {
    const pair = crypto.generateKeyPairSync('ed25519', {
      publicKeyEncoding: { type: 'spki', format: 'der' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const rawPublicKey = pair.publicKey.subarray(-32);
    const algorithm = Buffer.from('ssh-ed25519');
    const wire = Buffer.concat([
      Buffer.from([0, 0, 0, algorithm.length]), algorithm,
      Buffer.from([0, 0, 0, rawPublicKey.length]), rawPublicKey
    ]);
    sshKeys = 'ssh-ed25519 ' + wire.toString('base64') + ' helzerx-auto';
    generatedSshPrivateKey = pair.privateKey;
  }
  if (sshKeys.length > 2048 || !/^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521|sk-ssh-ed25519@openssh\.com|sk-ecdsa-sha2-nistp256@openssh\.com) [A-Za-z0-9+/=]+(?: .{0,256})?$/.test(sshKeys)) throw new Error('Provide a valid single SSH public key.');
  // Configure IPv4 DHCP only. Do not request IPv6 autoconfiguration unless the host network explicitly supports it.
  const net0 = 'name=eth0,bridge=' + c.bridge + ',ip=dhcp';
  try {
    const upid = await api(c, 'POST', '/nodes/' + enc(targetNode) + '/lxc', {
      vmid: next,
      ostemplate: targetTemplate,
      hostname,
      'ssh-public-keys': sshKeys,
      password,
      unprivileged: 1,
      onboot: 1,
      cores: Number(resources.cores),
      memory: Number(resources.memory),
      swap: Number(resources.swap ?? 512),
      rootfs: c.storage + ':' + Number(resources.disk),
      net0,
      start: 0,
      description: 'HelzerX Free Hosting request ' + String(requestId).slice(0, 80) + ' / user ' + String(username || '').slice(0, 80)
    });
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid task ID; manual reconciliation required.');
    await waitTask(c, upid, targetNode);
    const startTask = await api(c, 'POST', '/nodes/' + enc(targetNode) + '/lxc/' + next + '/status/start');
    if (typeof startTask !== 'string' || !startTask.startsWith('UPID:')) throw new Error('Container was created but Proxmox did not return a valid start task. Manual reconciliation required.');
    await waitTask(c, startTask, targetNode);
    return { vmid: next, hostname, node:targetNode, template:targetTemplate, upid, startTask, status: 'running', ...(generatedSshPrivateKey ? { generatedSshPrivateKey } : {}) };
  } catch (error) {
    // If the create task was attempted, retain the chosen VMID so the caller can
    // reserve HZL and reconcile the resource instead of risking duplicate creation.
    if (error && typeof error === 'object') error.vmid = next;
    throw error;
  }
}

/**
 * Read live status/configuration/snapshots for a managed LXC. Each read is independent so
 * a missing optional permission does not hide the other diagnostics.
 */
export async function inspectLxc({ vmid, node }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox management is not enabled or configured. Missing: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  const id = Number(vmid);
  let configuredNodes=[];try{configuredNodes=JSON.parse(env('PROXMOX_NODES','[]'))}catch{}
  const allowedNodes=Array.isArray(configuredNodes)&&configuredNodes.length?configuredNodes.map(x=>String(x?.id||'')):[c.node];
  const targetNode=String(node||c.node);
  if(!allowedNodes.includes(targetNode))throw new Error('Selected Proxmox node is not allowlisted.');
  if (!Number.isInteger(id) || id < c.vmidMin || id > c.vmidMax) throw new Error('Container ID is outside the configured HelzerX VMID range.');
  const base = '/nodes/' + enc(targetNode) + '/lxc/' + id;
  const result = { vmid:id, node:targetNode, terminalReady:Boolean(c.sshHost && c.sshPrivateKey && c.sshHostKeySha256), terminalReason:null };
  const reads = await Promise.allSettled([
    api(c, 'GET', base + '/status/current'),
    api(c, 'GET', base + '/config'),
    api(c, 'GET', base + '/snapshot')
  ]);
  if (reads[0].status === 'fulfilled') result.status = reads[0].value;
  else result.statusError = String(reads[0].reason?.message || 'Could not read status').slice(0, 300);
  if (reads[1].status === 'fulfilled') result.config = reads[1].value;
  else result.configError = String(reads[1].reason?.message || 'Could not read config').slice(0, 300);
  if (reads[2].status === 'fulfilled') result.snapshots = Array.isArray(reads[2].value) ? reads[2].value : [];
  else { result.snapshots = []; result.snapshotsError = String(reads[2].reason?.message || 'Could not read snapshots').slice(0, 300); }
  if (!result.terminalReady) result.terminalReason = 'Configure PROXMOX_SSH_HOST, PROXMOX_SSH_PRIVATE_KEY and PROXMOX_SSH_HOST_KEY_SHA256, plus the restricted pct-exec wrapper on the Proxmox host.';
  return result;
}

export async function createLxcTerminalProxy({ vmid, node, width = 120, height = 32 }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox API is not ready: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  const id = Number(vmid);
  let configuredNodes = [];
  try { configuredNodes = JSON.parse(env('PROXMOX_NODES', '[]')); } catch {}
  const allowedNodes = Array.isArray(configuredNodes) && configuredNodes.length
    ? configuredNodes.map(x => String(x?.id || ''))
    : [c.node];
  const targetNode = String(node || c.node);
  if (!allowedNodes.includes(targetNode)) throw new Error('Selected Proxmox node is not allowlisted.');
  if (!Number.isInteger(id) || id < c.vmidMin || id > c.vmidMax) throw new Error('Container ID is outside the configured HelzerX VMID range.');

  const base = '/nodes/' + enc(targetNode) + '/lxc/' + id;
  const status = await api(c, 'GET', base + '/status/current');
  if (status?.status !== 'running') throw new Error('Instance is not running. Start it before opening the console.');
  const cols = Math.max(40, Math.min(240, Number(width) || 120));
  const rows = Math.max(10, Math.min(80, Number(height) || 32));
  const session = await api(c, 'POST', base + '/termproxy', { width: cols, height: rows });
  const port = Number(session?.port);
  const ticket = String(session?.ticket || '');
  if (!Number.isInteger(port) || port < 1 || port > 65535 || !ticket || ticket.length > 2048) {
    throw new Error('Proxmox did not return a valid short-lived terminal ticket.');
  }
  return { baseUrl: c.baseUrl, node: targetNode, vmid: id, port, ticket };
}

export async function runLxcTerminal({ vmid, command, node }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox management is not enabled or configured.');
  const c = proxmoxConfig();
  const id = Number(vmid);
  let configuredNodes=[];try{configuredNodes=JSON.parse(env('PROXMOX_NODES','[]'))}catch{}
  const allowedNodes=Array.isArray(configuredNodes)&&configuredNodes.length?configuredNodes.map(x=>String(x?.id||'')):[c.node];
  const targetNode=String(node||c.node);
  if(!allowedNodes.includes(targetNode))throw new Error('Selected Proxmox node is not allowlisted.');
  if (!Number.isInteger(id) || id < c.vmidMin || id > c.vmidMax) throw new Error('Container ID is outside the configured HelzerX VMID range.');
  if (!c.sshHost || !c.sshPrivateKey || !c.sshHostKeySha256 || !Number.isInteger(c.sshPort) || c.sshPort < 1 || c.sshPort > 65535) {
    throw new Error('Terminal is not configured. Set the Proxmox SSH host, private key and verified SHA-256 host-key fingerprint.');
  }
  const text = String(command || '').trim();
  if (!text || text.length > 4000 || text.includes('\u0000')) throw new Error('Enter a command of 1–4000 characters.');
  // The SSH key must be restricted to a host-side wrapper that accepts only:
  // ct-exec <VMID> <base64-command>. No arbitrary host shell is exposed.
  const payload = Buffer.from(text, 'utf8').toString('base64');
  const remoteCommand = 'ct-exec ' + id + ' ' + payload;
  return await new Promise((resolve, reject) => {
    const client = new Client();
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      client.end();
      if (error) reject(error); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('Terminal command timed out after 60 seconds.')), 60000);
    client.on('ready', () => {
      client.exec(remoteCommand, { pty:false }, (error, stream) => {
        if (error) return finish(error);
        let stdout = '', stderr = '';
        stream.on('data', chunk => { stdout = (stdout + chunk.toString('utf8')).slice(-12000); });
        stream.stderr.on('data', chunk => { stderr = (stderr + chunk.toString('utf8')).slice(-4000); });
        stream.on('close', (code, signal) => {
          const output = (stdout + (stderr ? '\\n' + stderr : '')).slice(-15000);
          if (code !== 0) return finish(new Error(('Command exited with code ' + String(code ?? signal ?? 'unknown') + (output ? ': ' + output : '')).slice(0, 500)));
          finish(null, { output: output || '(Command completed with no output.)', exitCode:0 });
        });
      });
    });
    client.on('error', error => finish(new Error('Proxmox SSH connection failed: ' + String(error.message || 'connection error').slice(0, 250))));
    const expected = c.sshHostKeySha256;
    client.connect({
      host:c.sshHost, port:c.sshPort, username:c.sshUsername,
      privateKey:c.sshPrivateKey, readyTimeout:10000, keepaliveInterval:5000,
      hostHash:'sha256',
      hostVerifier: hash => { const actual=Buffer.from(String(hash)), fingerprint=Buffer.from(expected); return actual.length===fingerprint.length && crypto.timingSafeEqual(actual,fingerprint); }
    });
  });
}

export async function manageLxcSnapshot({ vmid, action, name, node }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox management is not enabled or configured.');
  const c = proxmoxConfig();
  const id = Number(vmid);
  let configuredNodes=[];try{configuredNodes=JSON.parse(env('PROXMOX_NODES','[]'))}catch{}
  const allowedNodes=Array.isArray(configuredNodes)&&configuredNodes.length?configuredNodes.map(x=>String(x?.id||'')):[c.node];
  const targetNode=String(node||c.node);
  if(!allowedNodes.includes(targetNode))throw new Error('Selected Proxmox node is not allowlisted.');
  if (!Number.isInteger(id) || id < c.vmidMin || id > c.vmidMax) throw new Error('Container ID is outside the configured HelzerX VMID range.');
  const base = '/nodes/' + enc(targetNode) + '/lxc/' + id + '/snapshot';
  if (action === 'create') {
    const snap = String(name || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(snap)) throw new Error('Snapshot name must be 1–40 letters, numbers, underscores or hyphens.');
    const upid = await api(c, 'POST', base, { snapname:snap, description:'Created from HelzerX admin control panel' });
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid snapshot task ID.');
    await waitTask(c, upid, targetNode);
    return { vmid:id, action, name:snap, upid };
  }
  if (action === 'delete') {
    const snap = String(name || '').trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(snap) || snap === 'current') throw new Error('Invalid snapshot name.');
    const upid = await api(c, 'DELETE', base + '/' + enc(snap));
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid snapshot deletion task ID.');
    await waitTask(c, upid, targetNode);
    return { vmid:id, action, name:snap, upid };
  }
  throw new Error('Unsupported snapshot action.');
}

/**
 * Manage only a container that has already been associated with a persisted hosting request.
 * This adapter intentionally supports LXC actions only; it never sends QEMU/KVM operations.
 */
export async function manageLxc({ vmid, action, node }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox management is not enabled or configured. Missing: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  const id = Number(vmid);
  let configuredNodes=[];try{configuredNodes=JSON.parse(env('PROXMOX_NODES','[]'))}catch{}
  const allowedNodes=Array.isArray(configuredNodes)&&configuredNodes.length?configuredNodes.map(x=>String(x?.id||'')):[c.node];
  const targetNode=String(node||c.node);
  if(!allowedNodes.includes(targetNode))throw new Error('Selected Proxmox node is not allowlisted.');
  if (!Number.isInteger(id) || id < c.vmidMin || id > c.vmidMax) throw new Error('Container ID is outside the configured HelzerX VMID range.');
  if (!['start','stop','reboot','suspend','resume','delete'].includes(action)) throw new Error('Unsupported container action.');
  const base = '/nodes/' + enc(targetNode) + '/lxc/' + id;
  const current = await api(c, 'GET', base + '/status/current');
  if (action === 'start' || action === 'resume') {
    if (current.status === 'running') return { vmid:id, status:'running' };
    const upid = await api(c, 'POST', base + '/status/start');
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid start task ID.');
    await waitTask(c, upid, targetNode);
    return { vmid:id, status:'running', upid };
  }
  if (action === 'stop' || action === 'suspend') {
    if (current.status === 'stopped') return { vmid:id, status:'stopped' };
    const upid = await api(c, 'POST', base + '/status/stop');
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid stop task ID.');
    await waitTask(c, upid, targetNode);
    return { vmid:id, status:'stopped', upid };
  }
  if (action === 'reboot') {
    if (current.status !== 'running') throw new Error('Start the container before requesting a reboot.');
    const upid = await api(c, 'POST', base + '/status/reboot');
    if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid reboot task ID.');
    await waitTask(c, upid, targetNode);
    return { vmid:id, status:'running', upid };
  }
  if (current.status === 'running') {
    const stopTask = await api(c, 'POST', base + '/status/stop');
    if (typeof stopTask !== 'string' || !stopTask.startsWith('UPID:')) throw new Error('Proxmox did not return a valid stop task ID before deletion.');
    await waitTask(c, stopTask);
  }
  const upid = await api(c, 'DELETE', base);
  if (typeof upid !== 'string' || !upid.startsWith('UPID:')) throw new Error('Proxmox did not return a valid delete task ID.');
  await waitTask(c, upid, targetNode);
  return { vmid:id, status:'deleted', upid };
}
