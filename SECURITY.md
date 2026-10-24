# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 0.1.x | ✅ |

## Reporting a vulnerability

Please do **not** open a public issue for security problems.

Report privately through GitHub: go to the **Security** tab of this repository and choose **Report a vulnerability**. Include the affected version, steps to reproduce, and the impact you expect.

We aim to acknowledge reports within 3 business days and to share a fix plan within 10 business days. We credit reporters in the release notes unless you ask us not to.

## Scope

- The Claude Code plugin in `plugins/juxt/` (skills, subagent and scripts)
- The portable Agent Skills copy in `agent-skills/juxt/`
- The website in `docs/`

The scripts run locally with bash and git and make no network calls of their own. Model calls are made by your agent host under its own security model.
