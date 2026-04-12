# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-04-10

### Added

- **Versioning and Migration System**: Complete upgrade and migration strategy from day one
  - Schema versioning with `SCHEMA_VERSION` constant (current: 1.0)
  - Version metadata in all generated components (TypeScript, HTML, SCSS)
  - `VersionInfo` interface in schema tracking generator version, schema version, and generation timestamp
  - Deprecation tracking system with `DeprecationInfo` interface
  - Version comments in all generated files for easy identification

- **Migration Schematic**: New `migrate-qml-component` schematic for automated updates
  - Detects schema version from existing generated components
  - Automatically regenerates components when schema version changes
  - Supports `--force` flag for manual regeneration
  - Validates component existence and QML source availability
  - Provides clear migration status and diagnostics

- **Documentation**:
  - `VERSIONING.md`: Comprehensive versioning and migration strategy guide
  - `COMPATIBILITY.md`: Output compatibility policy and stability guarantees
  - Updated `README.md` with versioning information and migration examples

- **Generator Improvements**:
  - Automatic version metadata injection in converter
  - Runtime schema version validation
  - Structured deprecation tracking at node and document level

### Changed

- `UiDocument` interface now requires `version: VersionInfo` field
- `UiNode` interface now includes optional `deprecations` field
- Generated components include comprehensive version headers
- `collection.json` updated with new migration schematic

### Technical Details

**Schema Version**: 1.0
- Initial schema with UiBinding, UiEvent, UiLayout, UiNode, UiDocument
- Version tracking and deprecation support

**Generator Version**: 0.3.0
- Stable output format for TypeScript, HTML, and SCSS
- Version comments in all generated files
- Migration tooling for future updates

## [0.2.0] - Previous

- Initial Phase 3 implementation with expression lowering
- Handler support and layout resolver
- Angular Material renderer

## [0.1.0] - Initial

- QML tokenizer and parser
- Basic QML to Angular conversion
