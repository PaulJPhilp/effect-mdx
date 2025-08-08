# effect-mdx

A robust, type-safe, and purely functional library for processing MDX (Markdown with JSX) content, built with the Effect-TS ecosystem. `effect-mdx` provides a high-level API for parsing, compiling, and manipulating MDX files, ensuring that all operations are handled within Effect's powerful and composable asynchronous runtime.

This library is designed for developers who want to leverage the full power of Effect for content-driven applications, such as static site generators, documentation platforms, or any system that consumes MDX.

## Features

- ✅ **Purely Functional**: Built entirely with Effect-TS for robust error handling and composition.
- 🧱 **Service-Based Architecture**: Uses Effect's `Service` pattern for easy testing and dependency management.
- 📝 **Frontmatter-Aware**: First-class support for parsing and validating YAML frontmatter.
- ⚙️ **Extensible Compilation**: Leverages the `unified` ecosystem (`remark`, `rehype`) for flexible MDX processing.
- 🚨 **Typed Errors**: Custom, typed errors (`InvalidMdxFormatError`) for predictable failure modes.

## Installation

To get started, add `effect-mdx` to your project using your preferred package manager:

```bash
bun add effect-mdx
# or
npm install effect-mdx
# or
yarn add effect-mdx
```

## Core Concepts

The central piece of this library is the `MdxService`, an Effect `Service` that encapsulates all MDX processing logic. To use it, you access its methods through the `MdxService` tag and provide its `Live` layer to your Effect program's context.

The `MdxService` depends on `@effect/platform-node`'s `NodeFileSystem`, so you must provide `NodeFileSystem.layer` alongside `MdxService.Live`.

## Quick Start: Reading and Compiling an MDX File

Here is a complete example of how to read an MDX file from the filesystem, parse its contents, and compile it to HTML.

```typescript
import { Effect, Exit } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { MdxService, MdxServiceApi } from "effect-mdx";

// 1. Define your program using Effect.gen for a clean, imperative style.
const program = Effect.gen(function* () {
  // 2. Access the MdxService from the context.
  const mdx = yield* MdxService;

  const filePath = "path/to/your/file.mdx";

  // 3. Use the service's methods.
  console.log(`Reading file: ${filePath}`);
  const { attributes, body } = yield* mdx.readMdxAndFrontmatter(filePath);
  console.log("Frontmatter:", attributes);

  console.log("\nCompiling body to HTML...");
  const html = yield* mdx.compileMdxToHtml(body);
  console.log("Compiled HTML:", html);

  return { attributes, html };
});

// 4. Provide the necessary layers to run the program.
const runnable = program.pipe(
  Effect.provide(MdxService.Live),
  Effect.provide(NodeFileSystem.layer)
);

// 5. Execute the effect and handle the result.
Effect.runPromiseExit(runnable).then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("\n✅ Program completed successfully!");
  } else {
    console.error("\n❌ Program failed:", exit.cause);
  }
});
```

## API Reference

### MdxService

The `MdxService` provides the following methods:

| Method                        | Description                                                                                             | Returns                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `readMdxAndFrontmatter(path)` | Reads an MDX file from `path`, parses its frontmatter, and returns both.                                | `Effect<MdxFile, FileNotFoundError>`      |
| `updateMdxContent(file)`      | Takes an `MdxFile` object and returns the full string content with updated frontmatter.                 | `Effect<string>`                        |
| `parseMdxFile(content)`       | Parses a raw string of MDX content into frontmatter and body.                                           | `Effect<MdxFile, InvalidMdxFormatError>`  |
| `compileMdxToHtml(content)`   | Compiles the body of MDX content to an HTML string. Validates frontmatter first.                        | `Effect<string, InvalidMdxFormatError>`  |
| `compileForLlmUi(content)`    | Prepares MDX content for LLM UI consumption by returning raw markdown and frontmatter.                  | `Effect<LlmUiOutput, InvalidMdxFormatError>` |
| `validateMdxConfig(attrs)`    | Validates a frontmatter object against a known `MdxConfig` schema.                                      | `Effect<MdxConfig>`                     |
| `extractParameters(attrs)`    | Extracts a typed map of `Parameter` objects from a frontmatter object.                                  | `Effect<Record<string, Parameter>>`     |

### Key Types

-   `MdxFile`: `{ attributes: Record<string, unknown>; body: string }`
-   `MdxConfig`: A structured configuration object derived from frontmatter.
-   `Parameter`: A typed representation of a parameter defined in frontmatter.
-   `LlmUiOutput`: `{ rawMarkdown: string; frontmatter: Record<string, unknown>; metadata: { llmUiMode: true } }`

### Custom Errors

-   `InvalidMdxFormatError`: A `Data.TaggedError` raised when frontmatter is malformed or MDX content fails to compile. Contains `reason` and `cause` fields.

## Providing the Service Layer

To use `MdxService`, you must provide its live implementation, `MdxService.Live`, to your Effect context. Since it interacts with the filesystem, it has a dependency on `NodeFileSystem`.

```typescript
import { Effect } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { MdxService } from "effect-mdx";

const myEffect = Effect.gen(function* () {
  const mdx = yield* MdxService;
  // ... use mdx service
});

// Provide both layers
const executable = myEffect.pipe(
  Effect.provide(MdxService.Live),
  Effect.provide(NodeFileSystem.layer)
);
```

This modular approach allows you to easily swap the live implementation with a test version in your unit tests, as shown in this project's own test suite.

## Contributing

Contributions are welcome! This project follows a standard fork-and-pull-request workflow. Please follow these steps to contribute:

1.  **Fork the Repository**: Create your own fork of the project on GitHub.
2.  **Clone Your Fork**: Clone your fork to your local machine.
    ```bash
    git clone https://github.com/YOUR_USERNAME/effect-mdx.git
    ```
3.  **Install Dependencies**: This project uses `bun` for package management.
    ```bash
    bun install
    ```
4.  **Create a Branch**: Create a new branch for your feature or bug fix.
    ```bash
    git checkout -b my-new-feature
    ```
5.  **Make Changes**: Implement your changes and add any necessary tests.
6.  **Run Tests**: Ensure all tests pass before submitting your changes.
    ```bash
    bun test
    ```
7.  **Push and Create a Pull Request**: Push your branch to your fork and open a pull request against the main `effect-mdx` repository.
  console.log(result);
});
```

## Development

### Install dependencies

```bash
bun install
```

### Build

```bash
bun run build
```

### Run tests

```bash
bun test
```

## License

MIT
