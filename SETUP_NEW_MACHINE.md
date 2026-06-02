# TourIt — Setup on a New Machine

This document explains everything you need to get the TourIt project running on
a second (or any) computer. All source code is on GitHub; the only thing that
does NOT live there is your `.env.local` secrets file, which you must copy
manually.

---

## Status at the time this was written

| Thing | Where it lives | Action needed |
|---|---|---|
| All source code | GitHub (`spinola501/tourit`) | Clone the repo |
| `node_modules` | NOT on GitHub (too large) | Run `npm install` |
| `.env.local` | NOT on GitHub (secrets!) | Copy from this machine |
| Build artefacts (`.next/`) | NOT on GitHub | Rebuilt automatically |
| Vercel deployment | Vercel cloud — already live | Nothing, it auto-deploys |

---

## Step 1 — Copy your secrets file BEFORE switching machines

`.env.local` (inside `web/`) is the file that connects your app to every
external service. Without it the app will start but immediately crash on any
database or API call.

**Keys it contains:**

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
TAVILY_API_KEY
ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID_EN
CLOUDFLARE_ACCOUNT_ID / R2 keys / R2 bucket
NEXT_PUBLIC_APP_URL
ADMIN_SECRET
```

**How to transfer it securely (pick one):**

- **Option A — Password manager**: Open the file, paste its full contents into
  a secure note in Bitwarden / 1Password / etc. On the new machine, paste it
  back into `web/.env.local`.
- **Option B — USB drive or LAN copy**: Copy the file directly. Do NOT email it
  or paste it into any chat app.
- **Option C — Private GitHub Gist (delete after use)**: Create a *secret* gist
  on github.com, paste the file, open it on the new machine, delete the gist
  immediately.

The `.env.local.example` file already in the repo shows the correct key names
and where to find replacement values if you ever lose the secrets.

---

## Step 2 — Install prerequisites on the new machine

| Tool | Required version | Where to get it |
|---|---|---|
| Node.js | v24 LTS | https://nodejs.org (choose "Current" or use nvm) |
| npm | v11+ | Comes with Node |
| Git | any recent | https://git-scm.com |
| VS Code | any recent | https://code.visualstudio.com |
| Claude Code extension | latest | VS Code marketplace: "Claude Code" by Anthropic |

To check versions after install:
```bash
node --version   # should say v24.x.x
npm --version    # should say 11.x.x
git --version
```

---

## Step 3 — Clone the repository

```bash
git clone https://github.com/spinola501/tourit.git
cd tourit
```

**GitHub authentication on a new machine:**

Do NOT embed your GitHub token in the remote URL. Instead, use one of these:

- **Option A (easiest) — GitHub CLI**:
  ```bash
  # Install from https://cli.github.com
  gh auth login
  # Follow the browser-based flow. After this, all git commands work.
  ```
- **Option B — Personal Access Token via credential manager**:
  ```bash
  git config --global credential.helper manager
  # Next time you push/pull, Windows will pop up a login dialog.
  # Enter your GitHub username and a PAT as the password.
  # Windows Credential Manager saves it — you won't be asked again.
  ```

---

## Step 4 — Install dependencies

```bash
cd tourit/web
npm install
```

This will recreate the `node_modules` folder (~500 MB). It takes a minute or two.

---

## Step 5 — Create your `.env.local` file

Paste the contents you saved in Step 1 into a new file at `web/.env.local`.

Change this one line for local development:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

(On Vercel the production value is set in the Vercel dashboard — you don't need
to change it back before pushing.)

---

## Step 6 — Start the development server

```bash
cd tourit/web
npm run dev
```

Open http://localhost:3000 in a browser. The home page should load and show
cities from Supabase.

---

## Step 7 — Configure Claude Code (optional but recommended)

Open the project folder in VS Code:
```bash
code "C:\path\to\tourit"
```

The file `web/CLAUDE.md` already contains project context for Claude Code — it
will be read automatically when you open the project with Claude Code.

---

## Day-to-day workflow across machines

1. **Before stopping work on machine A**: commit and push everything.
   ```bash
   git add -A
   git commit -m "..."
   git push
   ```
2. **On machine B**: pull before starting.
   ```bash
   git pull
   ```
3. **`.env.local` never changes** unless you rotate a key. If you rotate a key,
   update it on every machine manually.

---

## Deployment (Vercel)

The live site at tourit.es deploys automatically from the `master` branch.
You do NOT need to do anything extra for deployments — just push to `master`.

Vercel environment variables are stored in the Vercel dashboard
(Settings → Environment Variables), not in `.env.local`. Those are already
configured and do not need to be transferred when changing machines.

---

## If something doesn't work

| Symptom | Likely cause | Fix |
|---|---|---|
| `Module not found` errors | `node_modules` missing | Run `npm install` |
| 401 / 403 from Supabase | Wrong or missing `.env.local` | Check file contents |
| 404 on all pages | Build issue | Run `npm run build` to see errors |
| `git push` asks for password | Auth not configured | Follow Step 3 auth setup |
| Claude Code not reading context | Wrong folder opened | Open the `tourit/` root, not `web/` |
