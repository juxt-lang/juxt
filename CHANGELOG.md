# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.5.0] - 2026-10-25

### Added
- JavaScript API: `require('juxt-lang')` exports `lint`, `toIR` and `parse`.
- `examples/ratelimit-team.juxt`: a full team program (agents, typed handoffs, A2A, policy, limits, tiers, eval).

### Fixed
- Linter: two-word keywords followed by a name, such as `remote agent billing:`, are recognised.

## [0.4.4] - 2026-10-25

### Changed
- README: results of the real-project test (Snipe-IT clone).

## [0.4.3] - 2026-10-25

### Changed
- `php2shell` program, after a live test on a real open-source project: the scout now inspects every Dockerfile, compose file, Helm chart, k8s manifest, CI workflow and the host; PHP installed from distro packages (apt, apk, dnf) counts, with backported fixes checked against the distro's security tracker; the receipt is printed only when every verify check passes, otherwise the agent lists what is left.

## [0.4.2] - 2026-10-25

### Fixed
- Windows: finds agent CLIs in npm's global folder and native install folders, not only on PATH.
- `--agent <name>` always tries to start that agent, and falls back to a paste-in line if it can't.
- Clearer next steps when no agent command-line tool is installed.

## [0.4.1] - 2026-10-25

### Fixed
- `npx juxt-lang php2shell` now finds and starts the AI agent on Windows (uses `where` and launches `.cmd` agent shims through the shell).

## [0.4.0] - 2026-10-25

### Added
- `npx juxt-lang php2shell`: one command that writes the fix program, sets up Juxt for your agent and starts it (Claude Code, Codex, Gemini CLI or Cursor). Options: `--agent`, `--print`, `--no-launch`.

## [0.3.0] - 2026-10-25

### Changed
- `php2shell` recipe is now a full Juxt program: four agents (scout, planner, patcher, verifier) in a pipeline with typed handoffs, an approval gate, policy, limits, observability and a receipt. It runs when pasted into any AI agent, with no install.

### Added
- Help for teams patching many servers; GitHub Sponsor button and npm `funding` link to the contact page.

## [0.2.1] - 2026-10-24

### Changed
- README: exact commands to run the PHP2Shell fix from your AI or a terminal (Claude Code, Codex, Gemini CLI, Cursor, no-Node servers).

## [0.2.0] - 2026-10-24

### Added
- `juxt fix <recipe>`: ready-made fix programs. First recipe: `npx juxt-lang fix php2shell` for CVE-2026-109618 and CVE-2026-109619. The agent finds every web-serving PHP, asks before changing anything, updates, restarts and verifies.
- `examples/php2shell.juxt`.

## [0.1.2] - 2026-10-24

### Added
- Contact details in the package metadata and README: business enquiries to Amit, support to the project inbox.

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

[0.5.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.5.0
[0.4.4]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.4
[0.4.3]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.3
[0.4.2]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.2
[0.4.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.1
[0.4.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.4.0
[0.3.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.3.0
[0.2.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.2.1
[0.2.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.2.0
[0.1.2]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.2
[0.1.1]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.1
[0.1.0]: https://github.com/juxt-lang/juxt/releases/tag/v0.1.0
