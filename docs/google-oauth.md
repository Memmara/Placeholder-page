# Google OAuth setup

The Google client ID is stored in `.env.local`. The client secret shown in the supplied screenshot is intentionally not stored because it was exposed and must be reset.

## Google Cloud client settings

For local development add:

- Authorized JavaScript origin: `http://localhost:5173`
- Authorized redirect URI: `http://localhost:5173/api/auth/oauth/google/callback`

For production add:

- Authorized JavaScript origin: `https://memmara.com`
- Authorized redirect URI: `https://memmara.com/api/auth/oauth/google/callback`

Use `https://memmara.com` as the canonical origin. Configure Cloudflare to redirect `www.memmara.com` to the apex domain so OAuth cookies and callbacks stay on one origin.

While the consent screen is in Testing, add each permitted account under **Google Auth Platform → Audience → Test users**.

## Store the replacement secret

1. Reset the client secret in Google Cloud.
2. Run `Configure Google OAuth.cmd`.
3. Paste the new secret into the masked prompt.
4. Restart Memmara.

The helper writes the secret only to `.env.local`, which is excluded from Git. Do not put OAuth secrets in Vite variables, screenshots, source code or chat messages.
