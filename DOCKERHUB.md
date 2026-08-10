# WordyMe

**A lightweight personal wiki you can self-host anywhere. Even on your Raspberry Pi.**

WordyMe is a self-hosted personal wiki and note-taking app: rich documents with diagram (Mermaid), math (KaTeX) and music-notation support, organized into spaces, with revision history, favorites and real-time updates.

- **One container, one port.** The web app and API are served from the same origin — no separate frontend, no reverse-proxy gymnastics required.
- **`linux/amd64` and `linux/arm64`** in every tag. Runs on a normal server, an Apple Silicon Mac, or a Raspberry Pi 4/5.
- **Hardened by default.** Runs as a non-root user, ships with a built-in health check, handles `SIGTERM` cleanly (shutdown in under a second), and every release is vulnerability-scanned before it is published — a fixable HIGH or CRITICAL finding blocks the release. The scan runs against the `amd64` image; its findings are based on package versions, which are the same in both architectures.
- **SBOM and provenance attestations** attached to every image manifest.
- Your data lives in one volume: a single SQLite database plus uploaded files.

## Quick start

```console
curl -O https://raw.githubusercontent.com/TeamCoderz/WordyMe/main/docker-compose.public.yml
[ -e .env ] || ( umask 077; echo "BETTER_AUTH_SECRET=$(openssl rand -base64 32)" > .env )
docker compose -f docker-compose.public.yml up -d
```

Then open **http://localhost:8080** and create the first account.

Or with plain `docker run`:

```console
docker run -d \
  -p 8080:8080 \
  -e BETTER_AUTH_SECRET="$(openssl rand -base64 32)" \
  -v wordyme-storage:/app/storage \
  teamcoderz/wordyme:latest
```

`BETTER_AUTH_SECRET` is the only required setting — it signs session cookies and deliberately has no default.

**Reaching it from another machine** — a Pi or NAS on your LAN, a VPS by domain, a Tailscale address — needs no extra configuration. The app accepts whichever address the request arrives on, so `http://192.168.1.50:8080` works as-is. This is not "trust anyone": the browser's `Origin` still has to match the `Host` it sent, so a page on another site cannot act on your session.

**Serving over HTTPS** behind a reverse proxy needs two settings, and the first matters:

```console
  -e BETTER_AUTH_URL=https://notes.example.com \
  -e TRUST_PROXY=1 \
```

`BETTER_AUTH_URL` is what marks session cookies `Secure`; the container is spoken to over plain HTTP by the proxy and cannot detect TLS by itself. `TRUST_PROXY` makes login rate limiting see the real client rather than the proxy. The app logs a one-time hint if it notices forwarded HTTPS traffic without these set.

## Tags

| Tag            | Moves?               | Use when                                 |
| -------------- | -------------------- | ---------------------------------------- |
| `latest`       | Every stable release | You want updates when you re-pull        |
| `1.2.3`        | Never                | You want to upgrade deliberately         |
| `1.2`          | Within a minor line  | You want patches but not feature changes |
| `sha-<commit>` | Never                | You need to pin an exact build           |

Pre-releases (for example `1.3.0-beta.1`) are published but never tagged `latest`.

## Also on GHCR

The same image is published to GitHub Container Registry, which does not rate-limit pulls of public images:

```console
docker pull ghcr.io/teamcoderz/wordyme:latest
```

Docker Hub allows 100 unauthenticated pulls per 6 hours per IP address — a budget shared by everyone behind the same office or campus NAT. If that could bite you, prefer GHCR.

## Configuration, upgrades and backups

The full guide — every environment variable, running behind a reverse proxy, upgrading from the older two-container layout, and safe backup/restore of the database — lives in the repository:

**https://github.com/TeamCoderz/WordyMe/blob/main/DOCKER.md**

## Source and license

WordyMe is free software, licensed under **AGPL-3.0**. The complete corresponding source for every image is at:

**https://github.com/TeamCoderz/WordyMe**

Each image also carries an `org.opencontainers.image.source` label pointing at the repository. Bug reports and contributions are welcome via GitHub issues.

---

Maintained by **TeamCoderz Ltd**. WordyMe™ is a trademark of TeamCoderz Ltd.
