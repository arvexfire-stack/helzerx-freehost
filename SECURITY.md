# Security Policy — HelzerX Freehost

## Reporting a vulnerability

Please do not publish exploit details, credentials, personal data, or proof-of-concept payloads in public issues. Report suspected vulnerabilities privately to the project maintainers through a private channel and include:
- affected URL or file and a concise impact description;
- reproducible steps against systems you own or are explicitly authorized to test;
- timestamps and relevant request IDs, with cookies, tokens, and secrets removed.

Do not run denial-of-service tests, destructive tests, or access other users' data.

## Deployment security checklist

Before deploying security changes:
- review the diff and CI output;
- back up the persistent data directory and verify a restore procedure;
- confirm all required production environment variables exist and are stored outside Git;
- verify the origin service cannot be reached directly from the public Internet when Cloudflare Tunnel/WAF enforcement is expected;
- apply firewall changes only after confirming SSH, tunnel, monitoring, and recovery access;
- run smoke tests for login, logout, account pages, admin sign-in, and authorized admin actions.

## Operational notes

- Application-level in-memory rate limits are per process and reset on restart. They are defense-in-depth, not DDoS protection; use Cloudflare/WAF rate limiting and a shared limiter if running multiple instances.
- Never trust forwarded IP headers unless the origin is reachable only through known trusted proxies. Keep the origin firewall and tunnel configuration aligned with Express proxy settings.
- Content Security Policy is initially sent in report-only mode to avoid breaking the existing UI. Review browser reports before enforcing it.
- Rotate any credential that may have been exposed. Removing a secret from the current file does not remove it from Git history.
- Keep regular, access-controlled backups and periodically test restoration.
