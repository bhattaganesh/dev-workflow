# dev-workflow

One command to start your entire dev environment. Another to shut it all down.

```
work-start   →  Local WP + site, Chrome, Teams, VSCode — all up
work-end     →  everything closed gracefully
```

Works in **any terminal** — CMD, Git Bash, PowerShell, Terminal (Mac), Linux shell.  
Works on **any OS** — Windows, macOS, Linux.

---

## Setup (3 steps)

```bash
# 1. Clone
git clone https://github.com/bhattaganesh/dev-workflow.git
cd dev-workflow

# 2. Run the wizard — it finds your apps and asks a few questions
node setup.js

# 3. Done. Open a new terminal and try it
work-start
```

The wizard auto-detects your app paths and writes `config.json` for you.  
No manual JSON editing required.

---

## What the wizard asks

| Question | Example answer |
|---|---|
| Local WP path | auto-detected, just press Enter |
| Site names | `masteriiyo`, `my-other-site` … (one per line, blank to finish) |
| Chrome path | auto-detected, just press Enter |
| Include Teams? | `Y` |
| VSCode project paths | `/Users/you/projects/my-app` (one per line, blank to finish) |
| Install Oh My Zsh + autosuggestions? | `Y` — sets Zsh as VSCode default terminal too |

---

## How it works

```
work-start
  └── reads config.json
  └── for each app (in order): checks if already running → starts if not
  └── Local WP: starts app + triggers site via Local's built-in API
  └── saves ~/.dev-workflow-session.json

work-end
  └── reads session file → closes only what work-start opened
  └── runs in reverse order (VSCode → Teams → Chrome → Local WP + site)
  └── deletes session file
```

---

## Adding a new app

1. Create `apps/your-app.js`:

```js
export const name = 'Your App';
export const key  = 'your-app';

export async function start(config) {
  // launch the app
  return { key };   // return null to skip session tracking
}

export async function stop(session, config) {
  // close the app gracefully
}
```

2. Add `'your-app'` to `APP_KEYS` in `apps-registry.js`

That's it — no changes to the orchestrators needed.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `work-start: command not found` | Re-run `node setup.js` |
| `npm link` needs admin (Windows) | Run terminal as Administrator, then `node setup.js` again |
| `npm link` needs sudo (Mac/Linux) | `sudo npm link` or use nvm/fnm |
| App doesn't open | Re-run `node setup.js` and correct the path |
| Local WP site doesn't start | Site names must match exactly what's shown in the Local app (re-run `node setup.js` to correct them) |
| Zsh autosuggestions not working | Open a new terminal tab after setup — Oh My Zsh only activates in new sessions |
| `code` not found after VSCode install (Windows) | Open VSCode → Command Palette → "Shell Command: Install 'code' command in PATH" |

---

## License

MIT
