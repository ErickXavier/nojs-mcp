# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in the NoJS MCP server, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please email **<contact@no-js.dev>** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The affected version(s)
- Any potential impact assessment

### What to expect

- **Acknowledgment** within 48 hours of your report
- **Status update** within 7 days with an assessment and expected timeline
- **Fix and disclosure** coordinated with you before any public announcement

### Scope

The following are in scope:

- Information disclosure via MCP tool responses
- Path traversal in knowledge file loading
- Injection attacks via tool input parameters
- Denial of service via malformed requests

### Out of scope

- Vulnerabilities in the No.JS framework itself (report those to the [framework repo](https://github.com/ErickXavier/no-js))
- Issues in the MCP protocol or client implementations
- Social engineering attacks
