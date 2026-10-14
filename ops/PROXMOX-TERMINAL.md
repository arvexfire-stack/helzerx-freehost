# HelzerX Proxmox terminal setup

The admin terminal runs **one command at a time inside a managed LXC container**. It does not expose a shell on the Proxmox host. It remains disabled until SSH is explicitly configured and the Proxmox host fingerprint is verified.

## 1. Create a dedicated SSH key on the HelzerX application server

Generate an Ed25519 key pair for the service. Store the private key securely and never commit it to GitHub.

```bash
sudo install -d -m 700 /etc/helzerx
sudo ssh-keygen -t ed25519 -N '' -f /etc/helzerx/proxmox-panel
sudo chmod 600 /etc/helzerx/proxmox-panel
sudo cat /etc/helzerx/proxmox-panel.pub
```

Copy the displayed **public key** for the next step. Keep the private key on the application server.

## 2. Install the restricted command wrapper on the Proxmox host

Copy `ops/helzerx-pct-exec` from this repository to the Proxmox host, then run:

```bash
sudo install -o root -g root -m 0755 helzerx-pct-exec /usr/local/sbin/helzerx-pct-exec
sudo useradd --create-home --shell /bin/bash helzerx-panel 2>/dev/null || true
sudo passwd -l helzerx-panel
sudo install -d -o helzerx-panel -g helzerx-panel -m 0700 /home/helzerx-panel/.ssh
```

Create a sudo rule that only permits the Proxmox container execution command:

```bash
echo 'helzerx-panel ALL=(root) NOPASSWD: /usr/sbin/pct exec *' | sudo tee /etc/sudoers.d/helzerx-panel
sudo chmod 0440 /etc/sudoers.d/helzerx-panel
sudo visudo -cf /etc/sudoers.d/helzerx-panel
```

Add the public key from step 1 to `/home/helzerx-panel/.ssh/authorized_keys`. Prefix the key with this forced-command restriction (replace the example key with the real public key):

```text
command="/usr/local/sbin/helzerx-pct-exec",restrict ssh-ed25519 AAAA... helzerx-admin-terminal
```

Then set ownership and permissions:

```bash
sudo chown helzerx-panel:helzerx-panel /home/helzerx-panel/.ssh/authorized_keys
sudo chmod 0600 /home/helzerx-panel/.ssh/authorized_keys
```

The wrapper deliberately restricts container IDs to **2000–2999**. If your configured `PROXMOX_VMID_MIN` / `PROXMOX_VMID_MAX` range differs, update the constants in the wrapper first. Keep the SSH account dedicated to this single forced-command key.

## 3. Verify the Proxmox SSH host fingerprint

From the application server, obtain the fingerprint:

```bash
ssh-keyscan -p 22 PROXMOX_HOST 2>/dev/null | ssh-keygen -lf -
```

Verify the fingerprint against the host's trusted console / known-good host key before using it. Set `PROXMOX_SSH_HOST_KEY_SHA256` to the SHA-256 fingerprint (the app accepts it with or without the `SHA256:` prefix).

## 4. Add private settings to the app's .env

Set these values in the **server's private environment file** (never in GitHub or browser JavaScript):

```dotenv
PROXMOX_SSH_HOST=your-proxmox-host-or-ip
PROXMOX_SSH_PORT=22
PROXMOX_SSH_USERNAME=helzerx-panel
PROXMOX_SSH_PRIVATE_KEY="-----BEGIN OPENSSH PRIVATE KEY-----
PASTE_THE_PRIVATE_KEY_CONTENT_HERE
-----END OPENSSH PRIVATE KEY-----"
PROXMOX_SSH_HOST_KEY_SHA256=verified_SHA256_fingerprint_without_prefix
```

Use the actual private key file content. Keep the environment file restricted (for example, owner root and mode 0600), and ensure the HelzerX service can read it. Restart the service after configuration.

## Notes

- The browser calls authenticated admin APIs only; all terminal calls require the existing staff session and an audit reason.
- Commands run as root **inside the selected LXC** and are limited to 4,000 characters and 60 seconds. Do not run commands you do not understand.
- This is a non-interactive command terminal, not a persistent TTY. Programs such as `nano`, `top`, or interactive installers are not supported.
- The Proxmox API token should have only the LXC permissions needed for status, configuration, power actions, snapshots, and deletion. Never place a Proxmox token or SSH private key in frontend code.
