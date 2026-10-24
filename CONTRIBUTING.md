# Contributing to Juxt

Thanks for helping.

1. Open an issue before large changes, so we can agree on the shape first.
2. Keep skills short (under 500 lines) and scripts dependency-free (bash and git; python3 optional).
3. Run before opening a pull request:
   - `claude plugin validate plugins/juxt --strict`
   - `bash tools/sync-agent-skills.sh` (keeps the portable copy in sync)
   - `claude plugin eval plugins/juxt` for behaviour changes, and paste the summary table in the PR.
4. Sign off every commit (`git commit -s`) to certify the Developer Certificate of Origin (https://developercertificate.org).

Language changes go through a short RFC: an issue titled `RFC: <change>` with the motivation, the syntax, and an example program.
