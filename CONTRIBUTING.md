# Contributing to NoJS MCP

Thank you for your interest in contributing to the NoJS MCP server! This guide will help you get started.

---

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing. We are committed to a welcoming and inclusive community.

---

## Getting Started

The NoJS MCP server is part of the No.JS ecosystem:

| Repository | Purpose |
| --- | --- |
| [no-js](https://github.com/ErickXavier/no-js) | Core framework (source of truth) |
| [nojs-lsp](https://github.com/ErickXavier/nojs-lsp) | VS Code language server extension |
| [nojs-mcp](https://github.com/ErickXavier/nojs-mcp) | MCP server for AI assistants |
| [nojs-skill](https://github.com/ErickXavier/nojs-skill) | AI skill for Claude Code and others |

---

## Development Setup

```bash
git clone https://github.com/ErickXavier/nojs-mcp.git
cd nojs-mcp
npm install

# Build
npm run build

# Run locally
node dist/index.js
```

---

## Project Structure

```plaintext
src/
├── index.ts              # MCP server entry point
├── knowledge.ts          # Knowledge base loader and types
└── tools/
    └── index.ts          # MCP tool implementations (validate, scaffold, explain)

knowledge/
├── directives.json       # Directive metadata (names, categories, syntax, examples)
├── filters.json          # Filter metadata (32 built-in filters)
├── api.json              # Public API reference
└── docs/                 # Markdown documentation (23 pages)
```

---

## Contribution Workflows

### Updating Knowledge Files

When the No.JS framework adds or changes directives, filters, or API:

- [ ] Update `knowledge/directives.json` with new/changed entries
- [ ] Update `knowledge/filters.json` if filters changed
- [ ] Update `knowledge/api.json` if API changed
- [ ] Update relevant docs in `knowledge/docs/`
- [ ] Update `src/tools/index.ts` if validation logic or scaffolds need changes

### Fixing a Bug

- [ ] Write a test or describe the reproduction steps
- [ ] Fix the bug
- [ ] Verify the build succeeds (`npm run build`)

### Adding a New Tool

- [ ] Add the tool handler in `src/tools/index.ts`
- [ ] Register it in the MCP server setup in `src/index.ts`
- [ ] Update README.md with the new tool

---

## Branch & Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Purpose |
| --- | --- |
| `feat` | New feature or tool |
| `fix` | Bug fix |
| `docs` | Documentation or knowledge file update |
| `chore` | Maintenance (deps, CI, tooling) |

Branch naming: `feat/`, `fix/`, `docs/`, `chore/` prefixes from `main`.

---

## Pull Request Guidelines

1. **One concern per PR** — don't mix unrelated changes
2. **Describe what and why** in the PR description
3. **Link related issues** with `Closes #123` or `Fixes #456`
4. **Ensure the build passes** before requesting review

---

## Version Management

- The MCP server version lives in `package.json`
- Knowledge files should track the No.JS framework version they document
- **Contributors should NOT bump versions** — maintainers handle releases

---

## Need Help?

- **Questions?** Open a [Discussion](https://github.com/ErickXavier/nojs-mcp/discussions)
- **Found a bug?** Open an [Issue](https://github.com/ErickXavier/nojs-mcp/issues)

We appreciate every contribution!
