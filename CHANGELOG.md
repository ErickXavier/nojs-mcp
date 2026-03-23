# Changelog

All notable changes to the **NoJS MCP** server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.10.0](https://github.com/ErickXavier/nojs-mcp/compare/v1.0.0...v1.10.0) — 2026-03-23

### Fixed

- Sync MCP knowledge and tools with framework source code: animation names, router API, key modifiers, fetch:error signature, cheatsheet entries
- Add missing `persist-fields`, `retry`, `retry-delay`, `persist-key` to directive knowledge
- Add 6 missing filters to filter knowledge
- Fix scaffold template animation names (`slideUp`/`slideDown` → `fadeInUp`/`fadeOutDown`)
- Fix `validModifiers` missing `delete`, `backspace`, `debounce`, `throttle`

### Added

- `prepare` script for `npx github:` install support
- LICENSE, CODE_OF_CONDUCT, SECURITY, CONTRIBUTING, GitHub issue/PR templates
- CHANGELOG

## [1.0.0](https://github.com/ErickXavier/nojs-mcp/releases/tag/v1.0.0) — 2026-03-20

### Added

- MCP server with `validate_template`, `explain_directive`, `scaffold_component`, `get_docs` tools
- Knowledge base: directives, filters, API, patterns, cheatsheet, and topic docs
- MCP resources for framework documentation
- Stdio transport for CLI and editor integration
- Published to npm as `@erickxavier/nojs-mcp`
