# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`effect-mdx` is a type-safe, functional library for processing MDX (Markdown with JSX) using the Effect-TS ecosystem. It provides a service-based architecture for parsing, compiling, and manipulating MDX files with robust error handling.

## Commands

### Development
- **Build**: `bun run build` - Compiles TypeScript to dist/ using tsconfig.build.json
- **Test**: `bun test` - Runs all test files using Bun's built-in test runner
- **Clean**: `bun run clean` - Removes dist/ directory
- **Dev**: `bun run dev` - Runs src/index.ts directly

### Package Management
Use `bun` for all package management operations:
- Install dependencies: `bun install`
- Run scripts: `bun run <script>`
- **Never** use npm, pnpm, yarn, or node commands

## Architecture

### Service-Based Design
The library is built around Effect's Service pattern. The core `MdxService` (src/service.ts) encapsulates all MDX processing logic and must be provided via Effect layers:

```typescript
const program = Effect.gen(function* () {
  const mdx = yield* MdxService;
  // Use mdx service methods
}).pipe(
  Effect.provide(MdxService.Live),
  Effect.provide(NodeFileSystem.layer) // Only needed for filesystem operations
);
```

### Key Services

1. **MdxService** (src/service.ts)
   - Core service with 8 main methods for MDX processing
   - Depends on `FileSystem` (from @effect/platform) and `MdxConfigService`
   - Methods return `Effect<Success, Error, Requirements>` types

2. **MdxConfigService** (src/config.ts)
   - Configures remark/rehype plugin pipeline
   - Can be overridden globally or per-call
   - Default: no plugins, use `docsPresetLayer()` or `makeMdxConfigLayer()` to customize

### Core Types (src/types.ts)

- **Metadata**: JSONObject - Sanitized, JSON-only data
- **Frontmatter**: Metadata with optional testing fields (expectedOutput, expectedError, needsReview)
- **ParsedMdxFile**: Full file with content, frontmatter, and body
- **CompiledMdxResult**: Result of true MDX compilation to JS/ESM
- **CompileForLlmUiResult**: Simple shape for UI consumption (rawMarkdown + frontmatter + metadata)

### Error Handling

All operations use typed errors:
- **InvalidMdxFormatError** (src/errors.ts): `Data.TaggedError` with reason and cause fields
- Raised for malformed frontmatter, invalid MDX, or compilation failures
- Always handled within Effect context (no throwing)

### Module Structure

- **src/index.ts**: Public API surface - exports all types, services, schemas, guards
- **src/service.ts**: MdxService implementation with 8 core methods
- **src/config.ts**: MdxConfigService and pipeline configuration
- **src/types.ts**: All TypeScript types and interfaces
- **src/schemas.ts**: Effect Schema definitions for validation
- **src/guards.ts**: Type guard utilities
- **src/utils.ts**: Pure utility functions (sanitization, frontmatter validation)
- **src/errors.ts**: Custom error types

### Processing Modes

1. **HTML Mode**: `compileMdxToHtml(content)` - Markdown → HTML using remark/rehype
2. **True MDX Mode**: `compileMdx(content, options)` - MDX → JS/ESM using @mdx-js/mdx
3. **LLM UI Mode**: `compileForLlmUi(content)` - Extract raw markdown + metadata for UIs

### Frontmatter Handling

- Uses `gray-matter` to parse YAML frontmatter
- Validates frontmatter structure with Effect Schema
- Sanitizes to JSON-only Metadata (removes functions, undefined, symbols)
- Testing utilities: `expectedOutput`, `expectedError`, `needsReview` fields

## TypeScript Configuration

- **Development** (tsconfig.json): bundler mode, noEmit: true, strict typing
- **Build** (tsconfig.build.json): NodeNext module resolution, emits to dist/
- Both configs enforce strict mode and noUncheckedIndexedAccess

## Testing

- Uses Bun's test runner (import from "bun:test")
- Comprehensive test suite in test/ directory
- Tests cover: service methods, edge cases, errors, guards, schemas, config, utils
- Run with: `bun test`

## Dependencies

### Peer Dependencies (must be installed by consumers)
- effect ^3.17.14
- @effect/platform ^0.90.0
- @effect/platform-node ^0.94.1 (optional - only needed for filesystem operations)

### Direct Dependencies
- @mdx-js/mdx: True MDX compilation
- gray-matter: YAML frontmatter parsing
- unified ecosystem: remark-parse, remark-rehype, remark-gfm, rehype-stringify
- yaml: YAML processing

## Important Patterns

1. **Always use Effect.gen** for async operations
2. **Provide layers in correct order**: MdxService.Live → NodeFileSystem.layer
3. **Frontend usage**: Skip NodeFileSystem.layer when not using filesystem methods
4. **Error handling**: All methods return Effect types - use Effect.mapError for transformation
5. **Plugin configuration**: Override MdxConfigService layer for custom remark/rehype plugins
6. **Type safety**: Use provided schemas and guards from src/schemas.ts and src/guards.ts
