# Claude Code Memory

@AGENTS.md

## Claude-Specific Notes

- Prefer small, end-to-end patches over speculative refactors.
- Use `npm run build` as the main verification step. The current `npm test` script is only a placeholder.
- Before expanding parser behavior, check whether a warning or unsupported placeholder is the safer outcome.
