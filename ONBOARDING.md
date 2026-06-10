# 🪔 Naman Puja — Beginner Onboarding Guide

A complete, from-zero guide to run the whole project and push your code.
**No prior setup assumed.** Works on **Mac** and **Windows**.

> You'll install 3 tools (Git, Docker, GitHub CLI), clone 4 repos, drop in one
> secrets file, and run a single command. ~20 minutes the first time.

---

## Step 0 — Get access (ask the owner)

1. Create a free **GitHub account** at https://github.com if you don't have one.
2. Send the owner your GitHub **username** and ask to be added as a
   **collaborator** on all four repos (needed to *push* code).
3. Ask the owner to privately send you the **`.env.docker`** secrets file
   (you'll need it in Step 4). Don't share it or commit it anywhere.

---

## Step 1 — Install the tools

### 🍎 On Mac

Open the **Terminal** app (Cmd+Space → type "Terminal").

```bash
# 1. Install Homebrew (a package manager). Paste this whole line:
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install Git and GitHub CLI
brew install git gh
```

Then install **Docker Desktop**: download from
https://www.docker.com/products/docker-desktop → open the `.dmg` → drag to
Applications → **launch it** and wait until the whale icon in the menu bar is
steady (not animating).

### 🪟 On Windows

Open **PowerShell** (Start → type "PowerShell").

```powershell
# Install Git and GitHub CLI
winget install --id Git.Git -e
winget install --id GitHub.cli -e
```

Then install **Docker Desktop**: download from
https://www.docker.com/products/docker-desktop → run the installer (it will set
up WSL2 if needed; reboot if asked) → **launch Docker Desktop** and wait until it
says "Docker Desktop is running".

> ✅ Verify everything is installed — run these; each should print a version:
> ```bash
> git --version
> gh --version
> docker --version
> ```

---

## Step 2 — Log in to GitHub (once)

```bash
gh auth login
```
Choose: **GitHub.com** → **HTTPS** → **Login with a web browser** → copy the
one-time code → it opens your browser → paste → Authorize. Done — now `git push`
will work without passwords.

---

## Step 3 — Get the code (clone all 4 repos as siblings)

The repos **must** sit next to each other in one folder.

```bash
# Make a project folder and go into it
mkdir ~/namanpuja
cd ~/namanpuja

# Clone all four repos
git clone https://github.com/PriyanshuGeTRekT/backend-namanpuja.git
git clone https://github.com/PriyanshuGeTRekT/frontend-namanpuja.git
git clone https://github.com/PriyanshuGeTRekT/adminpanel-namanpuja.git
git clone https://github.com/PriyanshuGeTRekT/crm-namanpuja.git
```

You should now have:
```
namanpuja/
├── backend-namanpuja/
├── frontend-namanpuja/
├── adminpanel-namanpuja/
└── crm-namanpuja/
```

---

## Step 4 — Add the secrets file

Put the **`.env.docker`** file the owner sent you into the **backend** folder:

```
namanpuja/backend-namanpuja/.env.docker
```

On Mac you can copy it from Downloads with:
```bash
cp ~/Downloads/.env.docker ~/namanpuja/backend-namanpuja/.env.docker
```
> This file holds the database password — keep it private, never commit it.
> (It's already gitignored, so git won't pick it up.)

---

## Step 5 — Run the whole project (one command)

Make sure **Docker Desktop is open and running**, then:

```bash
cd ~/namanpuja/backend-namanpuja
docker compose up --build
```

First run takes a few minutes (it downloads and builds everything). When it
settles, open these in your browser:

| What | URL | Login |
| --- | --- | --- |
| 🌐 Website | http://localhost:3000 | — |
| 🛠 Admin panel | http://localhost:5173 | admin@namanpuja.com / ChangeMe123! |
| 📇 CRM | http://localhost:5174 | admin@namanpuja.com / *(ask owner)* |
| 🔌 Backend API | http://localhost:4000/health | — |

Everyone shares the **same live database**, so the data is already there — no
setup needed.

**To stop:** press `Ctrl+C` in that terminal, or in another terminal run
`docker compose down`.

---

## Step 6 — Make a change and push it

Each folder is its **own** repo — you commit in the folder you changed.
Example: you edited the website (`frontend-namanpuja`).

```bash
cd ~/namanpuja/frontend-namanpuja

# 1. Start from the latest code
git checkout main
git pull

# 2. Make a branch for your change
git checkout -b my-change-description

# 3. ... edit files in VS Code ...

# 4. Stage, commit, push
git add -A
git commit -m "Describe what you changed"
git push -u origin my-change-description
```

Then open the repo on GitHub — it shows a **"Compare & pull request"** button.
Click it, add a title, and **Create pull request** so the owner can review and
merge. (The live site auto-deploys after merge.)

> Small fix and you have permission to push straight to main? You can skip the
> branch and `git push origin main` — but branches + PRs are the safe default.

---

## Daily routine (after the first setup)

```bash
# get everyone's latest changes (run in each repo folder you work in)
git pull

# start the project
cd ~/namanpuja/backend-namanpuja
docker compose up        # add --build only if dependencies changed
```

---

## 🆘 Troubleshooting

| Problem | Fix |
| --- | --- |
| `Cannot connect to the Docker daemon` | Docker Desktop isn't running — open it and wait for "running". |
| `port is already allocated` (3000/4000/5173/5174) | Something else uses that port. Stop it, or run `docker compose down` and retry. |
| `P1001: Can't reach database server at localhost:5433` | You're using an old/local `.env`. With this Docker setup you don't need one — make sure `.env.docker` is present and just run `docker compose up`. **Don't** run `npm run prisma:migrate`. |
| Website loads but no data | Backend still starting — wait ~30s, refresh. Check `http://localhost:4000/health` returns `ok`. |
| `git push` rejected / "permission denied" | You're not a collaborator yet (Step 0) or not logged in — rerun `gh auth login`. |
| Changes not showing | You edited the wrong repo folder, or forgot to `git pull` first. |

Stuck? Send the owner a screenshot of the red error text — that's usually enough
to diagnose it.
