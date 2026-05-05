# dev-workflow

Cross-platform dev workflow automation. One command spins up your entire dev environment — Local WP (+ site auto-start), Chrome, Teams, and VSCode. Another shuts it all down gracefully.

Works in **CMD**, **Git Bash**, **PowerShell**, **Terminal (Mac)**, and any Linux shell.

```
work-start   →  boots everything
work-end     →  closes everything that was opened
```

---

## Requirements

- [Node.js](https://nodejs.org) ≥ 18
- Apps you want to automate installed on the machine

---

## Setup (any OS, one time)

```bash
git clone https://github.com/bhattaganesh/dev-workflow.git
cd dev-workflow
node setup.js
```

`setup.js` will:
1. Install npm dependencies
2. Create `config.json` from the template
3. Link `work-start` / `work-end` globally via `npm link`

Then edit `config.json` with your machine's app paths:

```bash
# Mac/Linux
open config.json

# Windows
notepad config.json
```

---

## Config

`config.json` is **gitignored** — it's yours, never committed.  
`config.example.json` is the template that's committed for everyone to copy.

```jsonc
{
  "apps": {
    "local-wp": {
      "enabled": true,
      "siteName": "your-site-name",       // name shown in Local WP
      "execPath": {
        "win32":  "C:/Program Files/Local/Local.exe",
        "darwin": "/Applications/Local.app",
        "linux":  ""
      }
    },
    "chrome": {
      "enabled": true,
      "execPath": {
        "win32":  "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "darwin": "/Applications/Google Chrome.app",
        "linux":  "google-chrome"
      }
    },
    "teams":  { "enabled": true },
    "vscode": {
      "enabled": true,
      "projects": [
        "/absolute/path/to/project-a",
        "/absolute/path/to/project-b"
      ]
    }
  }
}
```

Set `"enabled": false` to skip any app.

---

## Local WP — auto site start

Site start/stop uses [`local-cli`](https://www.npmjs.com/package/@getflywheel/local-cli). Install it once globally:

```bash
npm install -g @getflywheel/local-cli
```

Without it, `work-start` still opens the Local WP app — you just start the site manually. Everything else works fine.

---

## Adding a New App

1. Create `apps/your-app.js` — must export these four things:

```js
export const name = 'Your App';    // display label
export const key  = 'your-app';   // must match config.json key

export async function start(config) {
  // launch the app
  // return { key } on success, or null to skip session tracking
}

export async function stop(session, config) {
  // close the app gracefully
}
```

2. Add `'your-app'` to `APP_KEYS` in `apps-registry.js`

3. Add the app block to `config.example.json`

That's it. No changes to the orchestrators needed.

---

## How it works

```
work-start
  └── reads config.json
  └── loops APP_KEYS in order → calls start(config) on each module
  └── saves ~/.dev-workflow-session.json  (tracks what was opened)

work-end
  └── reads session.json  (only closes what work-start actually opened)
  └── loops APP_KEYS in reverse → calls stop(session, config)
  └── deletes session.json
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `work-start: command not found` | Re-run `node setup.js` or add the folder to your PATH |
| `npm link` needs sudo (Mac/Linux) | `sudo npm link` or use a Node version manager (nvm/fnm) |
| App doesn't open | Check the `execPath` in `config.json` for your OS |
| Local WP site doesn't auto-start | Install `local-cli`: `npm i -g @getflywheel/local-cli` |
| Wrong Teams version launched | Edit `apps/teams.js` — both new and classic Teams are handled |

---

## License

MIT
