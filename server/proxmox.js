import crypto from 'node:crypto';

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
    network: env('PROXMOX_NETWORK', 'dhcp').toLowerCase()
  };
}
export function proxmoxReadiness() {
  const c = proxmoxConfig();
  const missing = [];
  if (!c.baseUrl) missing.push('PROXMOX_API_URL');
  if (!c.node) missing.push('PROXMOX_NODE');
  if (!c.storage) missing.push('PROXMOX_STORAGE');
  if (!c.bridge) missing.push('PROXMOX_BRIDGE');
  if (!c.template) missing.push('PROXMOX_TEMPLATE');
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
  if (params) {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') body.set(key, String(value));
    }
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    options.body = body;
  }
  const response = await fetch(apiUrl(c, endpoint), options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors) {
    const message = payload?.errors ? JSON.stringify(payload.errors) : (payload?.message || 'Proxmox API request failed (' + response.status + ')');
    throw new Error(message.slice(0, 500));
  }
  return payload.data;
}
const enc = (v) => encodeURIComponent(String(v));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function waitTask(c, upid) {
  const deadline = Date.now() + c.taskTimeoutMs;
  while (Date.now() < deadline) {
    const status = await api(c, 'GET', '/nodes/' + enc(c.node) + '/tasks/' + enc(upid) + '/status');
    if (status.status === 'stopped') {
      if (status.exitstatus !== 'OK') throw new Error('Proxmox task failed: ' + String(status.exitstatus || 'unknown').slice(0, 300));
      return status;
    }
    await delay(2000);
  }
  throw new Error('Proxmox task is still running; task ID retained for safe reconciliation: ' + upid);
}

export async function provisionLxc({ requestId, plan, username }) {
  const readiness = proxmoxReadiness();
  if (!readiness.ready) throw new Error('Proxmox provisioning is not enabled or configured. Missing: ' + readiness.missing.join(', '));
  const c = proxmoxConfig();
  if (!/^[a-z0-9][a-z0-9-]{1,30}$/i.test(String(plan.id || ''))) throw new Error('Invalid hosting plan ID.');
  const resources = plan.proxmox;
  if (!resources || !Number.isInteger(Number(resources.cores)) || Number(resources.cores) < 1 ||
      !Number.isInteger(Number(resources.memory)) || Number(resources.memory) < 256 ||
      !Number.isInteger(Number(resources.disk)) || Number(resources.disk) < 2) {
    throw new Error('This hosting plan has no valid Proxmox resource mapping (cores, memory MB, disk GB).');
  }
  if (c.network !== 'dhcp') throw new Error('Only DHCP network mode is currently supported by the provisioner. Configure a verified DHCP service or add static IP allocation before enabling.');
  const next = Number(await api(c, 'GET', '/cluster/nextid'));
  if (!Number.isInteger(next) || next < c.vmidMin || next > c.vmidMax) {
    throw new Error('Proxmox next VMID is outside the configured safe range ' + c.vmidMin + '-' + c.vmidMax + '. Configure a dedicated VMID range/pool before provisioning.');
  }
  const hostname = ('hx-' + String(requestId).replace(/[^a-z0-9]/gi, '').slice(0, 10) + '-' + next).toLowerCase().slice(0, 63);
  const password = crypto.randomBytes(24).toString('base64url') + 'aA1!';
  const net0 = 'name=eth0,bridge=' + c.bridge + ',ip=dhcp,ip6=auto';
  const upid = await api(c, 'POST', '/nodes/' + enc(c.node) + '/lxc', {
    vmid: next,
    ostemplate: c.template,
    hostname,
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
  await waitTask(c, upid);
  await api(c, 'POST', '/nodes/' + enc(c.node) + '/lxc/' + next + '/status/start');
  return { vmid: next, hostname, upid, status: 'provisioning' };
}
