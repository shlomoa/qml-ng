# Remaining Gaps

This file now tracks only the roadmap work that is still materially incomplete on `main`.

Completed items have moved from planning into the codebase, tests, docs, and schematics.
Current references for shipped behavior live primarily in `AGENTS.md`, `README.md`, `docs/SCOPE.md`, `docs/VALIDATION.md`, and `docs/PERFORMANCE.md`.

## 1. Finish the remaining v1 control and interaction coverage

The parser, schema pipeline, renderer split, schematics, testing, diagnostics, strict mode, and migration/version metadata are all in place.
The main functional gap is the remaining high-value surface area that is still recognized conservatively but not rendered as first-class Angular/Material output.

Priority items:

- add a real mapping for `CheckBox` instead of leaving it under unsupported/placeholder output
- continue closing the gap between recognized QML controls and renderer coverage for common form and interaction primitives
- improve support for the still-partial v1 patterns called out in `docs/SCOPE.md`, especially where the parser already preserves enough structure to lower them safely

Definition of done:

- `docs/conversion-coverage.md` no longer lists `CheckBox` as unsupported
- renderer/import registry changes are wired through schema classification and Angular imports together
- tests and snapshots cover the newly supported control paths

## 2. Deepen layout fidelity beyond the current approximate subset

Layout lowering exists and already emits useful diagnostics, but more of the Qt Quick / Qt Quick Layouts behavior still needs container-aware resolution instead of best-effort approximation.

Priority items:

- improve `RowLayout`, `ColumnLayout`, `StackLayout`, and related container behavior beyond the current basic sizing hints
- expand anchor conflict handling for more parent/child and sibling-layout combinations
- preserve the current conservative approach: unsupported or ambiguous layout semantics should remain visible as diagnostics instead of being guessed

Definition of done:

- more layout cases move from rough approximation to explicit exact/approximate handling with deterministic diagnostics
- new layout behavior is covered by lowering tests and renderer snapshots
- larger curated files from `examples/FigmaVariants` and `examples/WebinarDemo` show fewer layout-related unsupported or misleading outputs

## 3. Complete the batch pipeline for true scale work

Batch conversion, timing metrics, caching, and incremental regeneration are implemented.
The remaining gap is making large-batch operation more memory-conscious and operationally smoother.

Priority items:

- stream or flush results instead of accumulating all rendered outputs in memory for the whole batch
- add progress reporting during long-running directory conversions
- add optional parallel/concurrent processing without losing deterministic output ordering
- keep stage timing and memory reporting aligned with the real execution model

Definition of done:

- batch runs no longer require retaining the full `FileConversionResult[]` payload for every file before writing results
- CLI and programmatic batch flows expose progress information for large directories
- performance documentation reports the streaming/concurrency behavior accurately

## 4. Continue pushing Node file access to the outer boundary

The repo is much closer to the desired compiler-plus-schematics shape, but some schematic entrypoints still read QML input directly from disk using `node:fs` and `node:path`.

Priority items:

- reduce direct filesystem access inside schematic-facing flows where Angular DevKit `Tree` or workspace-aware helpers can own the interaction
- keep path planning centralized in the existing workspace generation helpers rather than spreading raw path logic into entrypoints
- preserve the CLI as the acceptable place for boundary-level filesystem access

Definition of done:

- schematic entrypoints are primarily workspace-aware orchestration layers
- direct filesystem reads are limited to the CLI boundary and clearly isolated adapters
- Windows/Linux path behavior remains deterministic across schematics and CLI output

## 5. Keep the roadmap honest as coverage expands

This file should stay short.
When one of the gaps above is closed, remove it from `PLAN.md` and rely on the implementation docs/tests as the record of completion.
