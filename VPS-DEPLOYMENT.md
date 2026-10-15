# VPS self-service deployment configuration

The dashboard's **Deploy VPS** flow supports an LXC plan, a user-selected hostname, an allowlisted Proxmox node, an allowlisted OS template, and either a user-chosen root password or a browser-generated random password. Passwords are sent only with the create request and are not written to hosting-request records. The successful response shows the root password once. A generated SSH key is also returned once.

## Required server setup

Run the app on Node.js **22.5 or newer**. Configure the following on the VPS in the application's private `.env` file; never commit real tokens/passwords into GitHub.

- `PROXMOX_ENABLED=true`
- `PROXMOX_API_URL=https://<your-proxmox-host>:8006/api2/json`
- `PROXMOX_NODE=<exact-node-name-from-Proxmox>`
- `PROXMOX_NODES=[{"id":"<exact-node-name-from-Proxmox>","label":"Node 1","surcharge":0}]`
- `PROXMOX_OS_OPTIONS=[{"id":"debian12","label":"Debian 12","template":"local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst","surcharge":0}]`
- `PROXMOX_STORAGE=<storage that supports rootfs, e.g. local-lvm or local>`
- `PROXMOX_BRIDGE=<bridge available to the containers, e.g. vmbr0>`
- `PROXMOX_NETWORK=dhcp` only when that bridge really has a working DHCP service
- `PROXMOX_TOKEN_ID=<user@realm!token-name>`
- `PROXMOX_TOKEN_SECRET=<secret>`
- `PROXMOX_VMID_MIN=2000` and `PROXMOX_VMID_MAX=2999` (use a range reserved exclusively for this app)
- `PROXMOX_TEMPLATE=<same real template path as a configured OS option>` may be used as the single-template fallback.

The JSON values above are examples only. Replace the node names, template file, storage, bridge and VMID range with values that actually exist in your Proxmox installation. Every node ID must exactly match a Proxmox node name. Each OS template must be present in the selected Proxmox storage. Do not enable redemption until you have verified the API token's least-privilege permissions, template access, storage, bridge and DHCP behavior.

### Configure a plan

In the admin panel, create/enable a plan with:
- service type `lxc`
- a positive integer HZL cost
- a Proxmox resource mapping: `cores` (integer >= 1), `memory` (integer MB >= 256), and `disk` (integer GB >= 2)
- a unique plan ID using letters, numbers and hyphens.

The price shown in the deployment modal is the plan cost plus the selected node and OS surcharges. The backend recalculates the same amount, validates all selections against server-side allowlists, and checks the current balance again before provisioning.

## Deploy and verify on the application VPS

```bash
cd /opt/helzerx-freehost
node -v
git pull --ff-only origin main
npm install
npm test
npm run build
systemctl restart helzerx-freehost.service
systemctl status helzerx-freehost.service --no-pager -l
```

Check the port configured in `.env` (do not print the whole file, because it contains secrets), then call the health endpoint, for example `curl -fsS http://127.0.0.1:8787/api/health` if `PORT=8787`.

## Safety notes

- A failed operation before VMID allocation refunds the full computed HZL price. If Proxmox may have created a resource, the request is retained for reconciliation instead of allowing a duplicate deployment.
- Passwords and private SSH keys are not stored in the request history; save the one-time credentials before closing the modal.
- This provisioner currently supports LXC containers, not full KVM virtual machines.
- The code changes do not prove that your particular Proxmox template/network/token works. Test with a low-cost plan and a reserved VMID range before opening self-service deployment to all users.
