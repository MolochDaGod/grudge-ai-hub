# Web VS Code on Legion — SSOT

**UI:** https://ai.grudge-studio.com/ (VS Code tab) · origin `grudaagent.vercel.app`  
**Do not** invent a second IDE brand. Coder stays `coder.grudge-studio.com`.

## What each tool is

| Tool | What you get | Where it runs | Legion use |
|------|----------------|---------------|------------|
| **Monaco** | Editor engine only (syntax, files in this SPA) | Browser on Legion | Default in-pane |
| **vscode.dev** | Microsoft web VS Code + GitHub | `https://vscode.dev/github/{org}/{repo}` | Open **tab** (CSP blocks iframe) |
| **github.dev** | GitHub’s web editor | `https://github.dev/{org}/{repo}` | Same as vscode.dev |
| **OpenVSCode Server** ([gitpod-io/openvscode-server](https://github.com/gitpod-io/openvscode-server)) | Full VS Code + terminal + extensions on a **machine** | Docker/binary on VPS/laptop | Set URL in VS Code tab; **not** a Worker |
| **Coder** | Vibe IDE + Puter FS | coder.grudge-studio.com | Separate product |

Workers **cannot** host OpenVSCode (needs Node + filesystem + websockets like desktop VS Code).

## OpenVSCode on the IONOS box (optional)

```bash
docker run -it --init -p 3000:3000 \
  -v /path/to/workspace:/home/workspace:cached \
  gitpod/openvscode-server
# then in Legion VS Code tab: Set OpenVSCode URL → https://your-host:3000
```

Use `--connection-token` in production. Prefer reverse-proxy HTTPS.

## Law

- GitHub browse/edit → vscode.dev tab  
- Local/VPS real terminal → OpenVSCode or GRUDA Studio / Coder  
- Fleet AI chat → Legion `/v1/*`  
- Player bag → Railway, never the IDE
