# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.1] - 2026-10-24

### Added
- `NOTICE` file with attribution (created by Amit N), bundled in the npm package.
- Trademark policy (`TRADEMARKS.md`) and content licence (`LICENSE-CONTENT.md`) for the name, logo, site and book.

### Changed
- Website moved to https://juxt-lang.github.io/.

## [0.1.0] - 2026-10-24

First public preview.

### Added

- **Juxt mode**: say "use juxt" (or run `/juxt:use`) and a request is compiled into a `.juxt` program with objective, rules, contract, OPEN questions and verify checks before any code is written.
- **Reviewer subagent** that checks results against every `MUST`.
- `/juxt:digest`: repo changes by area from git, cached per commit.
- `/juxt:status`: cited status drafts for team, director and exec audiences.
- `/juxt:hosts`: discovery of the host's native skills, commands, subagents and MCP servers.
- `/juxt:init` and `/juxt:receipts`.
- Portable Agent Skills copy for Codex and other `SKILL.md` hosts.
- `juxt-lang` npm CLI (`npx juxt-lang init | lint | ir | digest | facts | hosts`).
- Language summary (3.4), example programs, eval suite and website.

[0.1.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.1
[0.1.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.0
