# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to
Semantic Versioning.

## [Unreleased]

### Added
- **Gray-matter Compatibility**: Complete API compatibility with gray-matter library
  - Added `empty`, `isEmpty`, and `stringify` properties to parsed results
  - Implemented top-level `stringify()` method for converting data back to frontmatter
  - Added `excerptSeparator` option support for custom excerpt delimiters
  - Added `engines` option support for custom parsing/stringifying engines
- **Enhanced Frontmatter Support**:
  - Full support for YAML, JSON, and custom frontmatter formats
  - Custom excerpt separators (e.g., `<!-- more -->`)
  - Extensible engine system for additional formats (TOML, CoffeeScript, etc.)
- **Improved Type Safety**:
  - Extended `ParsedMdxAttributes` with all gray-matter compatible properties
  - Better type definitions for frontmatter options
- **Round-trip Operations**:
  - Parse-modify-stringify workflows now fully supported
  - Instance-level `stringify()` methods on parsed results

### Changed
- **API Extensions**: Enhanced service interfaces to support gray-matter compatibility
- **Option Mapping**: Improved option handling for camelCase/snake_case compatibility

## [0.2.2] - 2025-10-XX

- Bug fixes and minor improvements
- Internal refactoring for better maintainability

## [0.1.0] - 2025-08-08

- Initial public release
- Strict typing and Effect combinators
- Frontend and backend usage documented in README
- Exports map, ESM entry, and types prepared for npm
