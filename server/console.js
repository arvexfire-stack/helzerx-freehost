import crypto from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { createLxcTerminalProxy } from './proxmox.js';

// Short-lived, single-use bearer tokens bridge an authenticated control-panel request
// to a Proxmox terminal. The browser never receives Proxmox API credentials.
const pending = new Map();
const TOKEN_TTL_MS = 30_000;
const MAX_PENDING = 200;

export async function issueLxcConsoleTicket({ instanceId, userId, vmid, node }) {
  const proxy = await createLxcTerminalProxy({ vmid, node });
  const now = Date.now();
  for (const [key, value] of pending) if (value.expiresAt <= now) pending.delete(key);
  if (pending.size >= MAX_PENDING) throw new Error('Too many pending console sessions. Try again shortly.');
  const token = crypto.randomBytes(32).toString('hex');
  pending.set(token, {
    instanceId: String(instanceId),
    userId: String(userId),
    proxy,
    expiresAt: now + TOKEN_TTL_MS
  });
  return {
    url: '/api/control/instances/' + encodeURIComponent(String(instanceId)) + '/console/socket?token=' + token
  };
}

function rejectUpgrade(socket, status, message) {
  if (socket.destroyed) return;
  const body = message + '\n';
  socket.write('HTTP/1.1 ' + status + '\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ' + Buffer.byteLength(body) + '\r\n\r\n' + body);
  socket.destroy();
}

export function attachConsoleWebSocket(server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url || '/', 'http://localhost'); }
    catch { return rejectUpgrade(socket, '400 Bad Request', 'Invalid WebSocket URL'); }
    const match = url.pathname.match(/^\/api\/control\/instances\/([^/]+)\/console\/socket$/);
    if (!match) return rejectUpgrade(socket, '404 Not Found', 'Unknown WebSocket endpoint');

    // Enforce same-origin browser use. The ticket remains the primary, single-use auth.
    const origin = req.headers.origin;
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.host) return rejectUpgrade(socket, '403 Forbidden', 'Origin not allowed');
      } catch { return rejectUpgrade(socket, '403 Forbidden', 'Origin not allowed'); }
    }

    const token = String(url.searchParams.get('token') || '');
    const entry = pending.get(token);
    if (!/^[a-f0-9]{64}$/.test(token) || !entry || entry.expiresAt <= Date.now()) {
      pending.delete(token);
      return rejectUpgrade(socket, '401 Unauthorized', 'Console ticket expired; launch the console again');
    }
    let instanceId;
    try { instanceId = decodeURIComponent(match[1]); } catch { return rejectUpgrade(socket, '400 Bad Request', 'Invalid instance ID'); }
    if (instanceId !== entry.instanceId) return rejectUpgrade(socket, '403 Forbidden', 'Console ticket does not match instance');
    pending.delete(token); // single-use even if the upstream connection fails

    wss.handleUpgrade(req, socket, head, browserSocket => {
      const p = entry.proxy;
      const upstreamUrl = new URL(p.baseUrl);
      upstreamUrl.protocol = upstreamUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      upstreamUrl.pathname = '/api2/json/nodes/' + encodeURIComponent(p.node) + '/lxc/' + encodeURIComponent(String(p.vmid)) + '/vncwebsocket';
      upstreamUrl.search = new URLSearchParams({ port: String(p.port), vncticket: p.ticket }).toString();
      const upstream = new WebSocket(upstreamUrl.toString(), 'binary', {
        rejectUnauthorized: process.env.PROXMOX_TLS_REJECT_UNAUTHORIZED !== 'false',
        handshakeTimeout: 10_000,
        maxPayload: 64 * 1024
      });
      let connected = false;
      let terminalReady = false;
      const queuedBrowserMessages = [];
      const closeBoth = (code = 1000, reason = 'Console closed') => {
        if (browserSocket.readyState === WebSocket.OPEN) browserSocket.close(code, reason);
        if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close(code, reason);
      };
      const timeout = setTimeout(() => {
        if (!connected || !terminalReady) closeBoth(1011, 'Proxmox console connection timed out');
      }, 12_000);
      upstream.on('unexpected-response', (_request, response) => {
        console.error('[console] Proxmox WebSocket handshake rejected:', {
          status: response.statusCode,
          statusMessage: response.statusMessage
        });
        response.resume();
        closeBoth(1011, 'Proxmox rejected the console connection');
      });
      upstream.on('open', () => {
        connected = true;
        if (!p.user || !p.ticket) return closeBoth(1011, 'Proxmox terminal authentication data is missing');
        // Proxmox xterm.js requires the API-authenticated user and termproxy ticket
        // as the first line on the WebSocket before it returns its OK handshake.
        upstream.send(p.user + ':' + p.ticket + '\n');
      });
      upstream.on('message', (data, isBinary) => {
        if (!terminalReady) {
          const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
          if (bytes.length < 2 || bytes[0] !== 79 || bytes[1] !== 75) {
            console.error('[console] Proxmox terminal authentication handshake failed.');
            return closeBoth(1008, 'Proxmox terminal authentication failed');
          }
          terminalReady = true;
          clearTimeout(timeout);
          const remainder = bytes.subarray(2);
          if (remainder.length && browserSocket.readyState === WebSocket.OPEN) browserSocket.send(remainder, { binary: true });
          for (const message of queuedBrowserMessages.splice(0)) {
            if (upstream.readyState === WebSocket.OPEN) upstream.send(message.data, { binary: message.isBinary });
          }
          return;
        }
        if (browserSocket.readyState === WebSocket.OPEN) browserSocket.send(data, { binary: isBinary });
      });
      browserSocket.on('message', (data, isBinary) => {
        if (upstream.readyState !== WebSocket.OPEN) return;
        if (terminalReady) upstream.send(data, { binary: isBinary });
        else if (queuedBrowserMessages.length < 64) queuedBrowserMessages.push({ data, isBinary });
      });
      browserSocket.on('close', () => {
        clearTimeout(timeout);
        if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
      });
      upstream.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (browserSocket.readyState === WebSocket.OPEN) browserSocket.close(code || 1011, reason?.toString().slice(0, 120) || 'Proxmox console disconnected');
      });
      upstream.on('error', error => {
        console.error('[console] Proxmox WebSocket failed:', String(error?.message || error).slice(0, 250));
        closeBoth(1011, 'Could not connect to Proxmox terminal');
      });
      browserSocket.on('error', () => {
        if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) upstream.close();
      });
      const keepalive = setInterval(() => {
        if (upstream.readyState === WebSocket.OPEN) upstream.ping();
      }, 25_000);
      upstream.on('close', () => clearInterval(keepalive));
      browserSocket.on('close', () => clearInterval(keepalive));
    });
  });
}
