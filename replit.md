# HelzerX Free Hosting on Replit

## Run the app

Use the **Start application** workflow to run the development preview. It starts Vite on port 5000 and the Express API on port 8787; Vite forwards `/api` requests to Express.

For a production build, run `npm run build` and then `npm start`.

## Required configuration

- Discord sign-in needs `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, and `SESSION_SECRET` configured as Replit Secrets. Register `/api/auth/discord/callback` as the Discord OAuth redirect URI for the app's domain.
- The admin review page at `/admin.html` needs `ADMIN_REVIEW_KEY`. Enter it only in the page; it is held in memory and is not saved in the browser.
- Hosting reward plans are supplied through `HOSTING_REDEMPTION_OPTIONS`. Proxmox provisioning is disabled by default; verify access and networking before enabling it.

Keep secret values out of source files and chat.
