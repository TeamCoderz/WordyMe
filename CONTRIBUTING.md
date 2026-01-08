# Contributing to WordyMe

**Welcome, and thank you for your interest in contributing to WordyMe!**

We're thrilled to have you here. Whether you're a first-time contributor or an experienced developer, your contributions make a real difference. This project exists because of people like you who take the time to improve it.

**Every contribution matters** — from fixing a typo to implementing a major feature. We value all forms of contribution and treat every contributor with respect and appreciation.

### Why Contribute?

- **Learn and grow** — Work with modern technologies like React 19, TypeScript, and Turborepo
- **Build your portfolio** — Meaningful open source contributions that showcase your skills
- **Join a community** — Connect with developers who share your passion
- **Make an impact** — Help students worldwide manage their educational information better

> **Before you start:** Please search [existing issues](../../issues) and [pull requests](../../pulls) to see if someone else is working on something similar.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Questions](#questions)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Commit Convention](#commit-convention)
- [Getting Help](#getting-help)

---

## Code of Conduct

Be **welcoming, inclusive, and respectful**. We don't tolerate harassment or exclusionary behavior. Report violations to maintainers.

---

## Questions

If you have questions about implementation details or need help:

- Use [GitHub Discussions](../../discussions) for general questions
- Search existing issues before creating a new one
- Issues identified as questions will be redirected to Discussions

---

## How to Contribute

| Type | Description |
|------|-------------|
| **Bug Reports** | [Open an issue](../../issues/new) with reproduction steps, expected vs. actual behavior, and environment details |
| **Feature Requests** | [Open an issue](../../issues/new) describing the feature, the problem it solves, and implementation ideas |
| **Documentation** | Fix typos, add examples, improve clarity, translate content |
| **Code Review** | Review open PRs — fresh eyes catch bugs |
| **Design** | UI/UX feedback, accessibility improvements |

---

## Development Setup

### Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) 9.0.0

### Getting Started

```bash
# 1. Fork and clone the repository
git clone https://github.com/<your-username>/WordyMe.git
cd WordyMe

# 2. Add upstream remote (this points to the original repo, so you can sync updates)
git remote add upstream https://github.com/TeamCoderz/WordyMe.git

# 3. Install dependencies
pnpm install

# 4. Set up environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env

# 5. Start development servers
pnpm dev

# 6. Create a feature branch
git checkout -b feature/your-feature-name
```

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed instructions, or [DOCKER.md](DOCKER.md) for Docker setup.

---

## Project Structure

This is a **Turborepo monorepo** with the following packages:

| Package | Description |
|---------|-------------|
| `apps/web` | React 19 frontend (Vite, TanStack Router) |
| `apps/backend` | Express.js API (Drizzle ORM, libSQL) |
| `packages/editor` | Lexical rich text editor |
| `packages/ui` | Shared UI components |
| `packages/sdk` | API client SDK |
| `packages/types` | TypeScript type definitions |
| `packages/lib` | Shared utilities |
| `packages/shared` | Shared business logic |

### Commands

```bash
pnpm dev                        # Start all services
pnpm dev --filter=web           # Frontend only
pnpm dev --filter=@repo/backend # Backend only
pnpm build                      # Production build
pnpm lint                       # Run linter
pnpm check-types                # Type check
pnpm format                     # Format with Prettier
```

### Database Changes

```bash
cd apps/backend
pnpm drizzle-kit generate  # Generate migration
pnpm drizzle-kit migrate   # Apply migration
```

---

## Testing

**Test thoroughly before opening a PR.** Untested code wastes everyone's time and may be closed without review.

### Before Submitting

- [ ] Manually verify your changes work as expected
- [ ] Test edge cases and error scenarios
- [ ] Run `pnpm lint` — must pass with no errors
- [ ] Run `pnpm check-types` — must pass with no errors
- [ ] Run `pnpm build` — must complete successfully
- [ ] Verify you haven't broken existing functionality
- [ ] Test in multiple browsers (for UI changes)

---

## Pull Request Process

### Before Opening a PR

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**
   ```bash
   pnpm lint && pnpm check-types && pnpm build
   ```

3. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

### PR Guidelines

- Fill out the PR description completely
- Link related issues (e.g., `Fixes #123`)
- Include screenshots for UI changes
- Keep PRs focused — one feature or fix per PR
- Respond to review feedback promptly
- Don't force-push after review has started (unless asked)

### Requirements

| Requirement | Verification |
|-------------|--------------|
| Passes lint | `pnpm lint` |
| Passes type check | `pnpm check-types` |
| Builds successfully | `pnpm build` |
| Tested manually | Your verification |
| Clear commit messages | See [Commit Convention](#commit-convention) |

---

## Commit Convention

We follow [Conventional Commits](https://conventionalcommits.org/). Please use the format:

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding or updating tests |
| `build` | Build system or dependencies |
| `ci` | CI configuration |
| `chore` | Other changes |

### Examples

```
feat(editor): add keyboard shortcuts for toolbar
fix(auth): resolve session expiration issue
docs(api): update authentication examples
refactor(sdk): simplify error handling
```

### Branch Naming

Use descriptive prefixes: `feature/`, `fix/`, `docs/`, `refactor/`

---

## Issue Labels

| Label | Description |
|-------|-------------|
| `good first issue` | Great for newcomers |
| `help wanted` | Extra help needed |
| `bug` | Something's broken |
| `enhancement` | Feature request |
| `documentation` | Docs improvement |

---

## Getting Help

- [GitHub Discussions](../../discussions) — Questions and ideas
- [GitHub Issues](../../issues) — Bug reports
- Security issues — Report privately to maintainers

---

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

---

**Thank you for contributing to WordyMe!**
