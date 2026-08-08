# Contributing

Dev setup is in the [README](README.md). The binding project requirements,
including the writing style for all prose, live in [CLAUDE.md](CLAUDE.md).

Before every commit run:

```bash
npm run check
```

CI additionally enforces the jscpd duplication gate, the config schema sync
check (`npm run schema:check`), a production build, and the structured-data
smoke test.

The scope of this project is deliberately narrow. See the "Out of scope"
section of CLAUDE.md before proposing features. For anything larger than a
small fix, please open an issue first.

By contributing you agree that your contributions are licensed under the MIT
license of this repository.
