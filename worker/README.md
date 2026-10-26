# Discord staff avatars

The static website cannot look up Discord profile images by user ID on its own.
This Cloudflare Worker uses a Discord bot token stored as a Cloudflare secret to
look up the configured staff members and returns only their public avatar URLs.
The website refreshes avatars every five minutes and keeps its local images as
fallbacks.

## Deploy the Worker

1. Create a Discord application and bot in the Discord Developer Portal. Add the
   bot to the Subject of Ghoul server. Do not give it unnecessary permissions.
2. From the repository root, log in to Cloudflare and store the bot token as a
   Worker secret:

   ```powershell
   npx wrangler login
   npx wrangler secret put DISCORD_BOT_TOKEN
   ```

   Paste the token only into Wrangler's secure prompt. Never put it in the
   website, this repository, or a chat message.
3. Deploy the Worker:

   ```powershell
   npx wrangler deploy
   ```

   The Worker uses the server ID in `wrangler.toml` and allows only the staff
   user IDs listed in `worker/index.mjs`.
4. Copy the deployed Worker URL. In `HTML/index.html`, set the
   `discord-avatar-api` meta tag's `content` to the Worker URL followed by
   `/api/staff-avatars`, for example:

   ```html
   <meta name="discord-avatar-api" content="https://subject-of-ghouls-discord-avatars.YOUR-SUBDOMAIN.workers.dev/api/staff-avatars">
   ```

5. Publish the updated website. Avatar metadata is cached for five minutes;
   open pages also refresh on a five-minute interval. Each avatar image itself
   is loaded directly from Discord's CDN.

The page continues to use the checked-in avatar files until the Worker URL is
configured and reachable. If a Discord lookup fails, the Worker logs the
failure and the website keeps the existing local image.
