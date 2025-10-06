# effect-mdx

A robust, type-safe, and purely functional library for processing MDX (Markdown with JSX) content, built with the Effect-TS ecosystem. `effect-mdx` provides a high-level API for parsing, compiling, and manipulating MDX files, ensuring that all operations are handled within Effect's powerful and composable asynchronous runtime.

<!-- Badges -->
[![npm version](https://img.shields.io/npm/v/effect-mdx)](https://www.npmjs.com/package/effect-mdx)

```bash
# Quick install
npm install effect-mdx
```

This library is designed for both backend and frontend use:

- Backend (Node): read MDX from the filesystem, parse frontmatter, and compile
  to HTML or JS/ESM. Provide `NodeFileSystem.layer` when using file I/O.
- Frontend (browser/edge runtimes): parse/compile MDX strings (no FS needed).
  Use `parseMdxFile`, `compileMdxToHtml`, or `compileMdx` directly on strings.

Use it for static sites, docs platforms, content pipelines, or interactive UIs
that render MDX on the client.

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

## Frontend Quick Start (no filesystem)

Use the service directly on strings in the browser/edge. You do not need
`NodeFileSystem.layer` when you are not reading from disk.

```ts
import { Effect, Exit } from "effect";
import { MdxService } from "effect-mdx";

const mdx = `---\nlayout: demo\n---\n\n# Hello from the browser`;

const program = Effect.gen(function* () {
  const svc = yield* MdxService;
  // Validate and split frontmatter/body first
  const parsed = yield* svc.parseMdxFile(mdx);
  // Compile body to HTML on the client
  const html = yield* svc.compileMdxToHtml(parsed.body);
  return { frontmatter: parsed.attributes, html };
}).pipe(Effect.provide(MdxService.Live));

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("frontmatter", exit.value.frontmatter);
    console.log("html", exit.value.html);
  } else {
    console.error(exit.cause);
  }
});
```

### MdxService

The `MdxService` provides the following methods:

| Method                        | Description                                                         | Returns                                                    |
| ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `readMdxAndFrontmatter(path)` | Read file, parse YAML frontmatter and body.                         | `Effect<ReadMdxAndFrontmatter, PlatformError | InvalidMdxFormatError>` |
| `updateMdxContent(content, fm)`| Reconstruct content with updated frontmatter.                       | `string`                                                   |
| `parseMdxFile(content)`       | Parse MDX string into attributes and body.                          | `Effect<ParsedMdxAttributes, InvalidMdxFormatError>`       |
| `compileMdxToHtml(content)`   | Compile body to HTML using remark/rehype.                           | `Effect<string, InvalidMdxFormatError>`                    |
| `compileForLlmUi(content)`    | Prepare data for LLM UI (raw markdown + sanitized frontmatter).     | `Effect<CompileForLlmUiResult, InvalidMdxFormatError>`     |
| `compileMdx(content, options)`| Compile true MDX with `@mdx-js/mdx` to JS/ESM.                      | `Effect<CompiledMdxResult, InvalidMdxFormatError>`         |
| `validateMdxConfig(attrs)`    | Extract common config fields from attributes.                        | `Effect<MdxConfigValidation, never>`                       |
| `extractParameters(metadata)` | Extract typed parameter definitions from metadata.                   | `Parameters`                                               |

### Key Types

- `ReadMdxAndFrontmatter`
- `ParsedMdxAttributes`
- `Frontmatter`
- `Metadata`
- `Parameters`
- `ParameterDefinition`
- `CompileForLlmUiResult`
- `CompiledMdxResult`
- `MdxCompileOptions`
- `MdxConfigValidation`

## True MDX Compilation Example

## LLM UI mode (what it’s for)

`compileForLlmUi()` prepares MDX for use in an "LLM UI"—a simple, typed data
shape that frontends can consume to build prompt editors, previews, or
playground-style experiences. It returns:

- `rawMarkdown`: the MDX body, ready for editors or previews
- `frontmatter`: sanitized, JSON-only metadata derived from YAML frontmatter
- `metadata: { llmUiMode: true }`: a marker indicating UI-focused usage

This shape avoids bundler/JSX concerns and keeps the payload minimal and safe
for client-side rendering.

```ts
import { Effect, Exit } from "effect";
import { MdxService } from "effect-mdx";

const mdx = `---\nmodel: gpt-4o\nparameters: { temperature: 0.2 }\n---\n\n# Prompt`;

const program = Effect.gen(function* () {
  const svc = yield* MdxService;
  const out = yield* svc.compileForLlmUi(mdx);
  // { rawMarkdown, frontmatter, metadata: { llmUiMode: true } }
  return out;
}).pipe(Effect.provide(MdxService.Live));

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("raw", exit.value.rawMarkdown);
    console.log("fm", exit.value.frontmatter);
  } else {
    console.error(exit.cause);
  }
});
```

Minimal UI render (insert into DOM):

```html
<div>
  <h3>Frontmatter</h3>
  <pre id="fm"></pre>
  <h3>Markdown</h3>
  <textarea id="editor" rows="6" cols="60"></textarea>
</div>
<script type="module">
  import { Effect } from "effect";
  import { MdxService } from "effect-mdx";

  const mdx = `---\ntitle: Demo\n---\n\n# Hello`;

  const prog = Effect.gen(function* () {
    const svc = yield* MdxService;
    return yield* svc.compileForLlmUi(mdx);
  }).pipe(Effect.provide(MdxService.Live));

  Effect.runPromise(prog).then(({ rawMarkdown, frontmatter }) => {
    document.querySelector("#editor").value = rawMarkdown;
    document.querySelector("#fm").textContent = JSON.stringify(
      frontmatter,
      null,
      2
    );
  });
</script>
```

```ts
import { Effect, Exit } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { MdxService } from "effect-mdx";

const content = `---\ntitle: JSX demo\n---\n\nexport const Answer = 42\n\n# Hello <Badge text=\"MDX\" />\n`;

const program = Effect.gen(function* () {
  const svc = yield* MdxService;
  const out = yield* svc.compileMdx(content, {
    format: "mdx",
    outputFormat: "program",
  });
  return out;
}).pipe(Effect.provide(MdxService.Live), Effect.provide(NodeFileSystem.layer));

Effect.runPromiseExit(program).then((exit) => {
  if (Exit.isSuccess(exit)) {
    console.log("code length:", exit.value.code.length);
    console.log("frontmatter:", exit.value.frontmatter);
    console.log("messages:", exit.value.messages);
  } else {
    console.error(exit.cause);
  }
});
```

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

## Pipeline configuration (MdxConfigService)

You can configure the Markdown/MDX pipeline via the
`MdxConfigService` layer. This controls `remark`/`rehype` plugins used
by `compileMdxToHtml()` and serves as defaults for `compileMdx()`.

- **Defaults**: no extra plugins.
- **Override globally**: provide your own layer for `MdxConfigService`.
- **Per call**: pass `remarkPlugins`/`rehypePlugins` to `compileMdx()`.

Example: enable slugs, autolinked headings, and sanitization.

```ts
import { Effect, Layer } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import {
  MdxService,
  MdxConfigService,
  type MdxPipelineConfig,
} from "effect-mdx";
import remarkSlug from "remark-slug";
import remarkAutolinkHeadings from "remark-autolink-headings";
import rehypeSanitize from "rehype-sanitize";

const pipeline: MdxPipelineConfig = {
  remarkPlugins: [remarkSlug, [remarkAutolinkHeadings, { behavior: "wrap" }]],
  rehypePlugins: [[rehypeSanitize, {}]],
  sanitize: {},
  slug: true,
  autolinkHeadings: true,
};

const PipelineLayer = Layer.succeed(MdxConfigService, {
  getConfig: () => pipeline,
});

const program = Effect.gen(function* () {
  const svc = yield* MdxService;
  const html = yield* svc.compileMdxToHtml("# Hello");
  return html;
}).pipe(Effect.provide(PipelineLayer), Effect.provide(NodeFileSystem.layer));

// Per-call override for true MDX
const mdxProgram = Effect.gen(function* () {
  const svc = yield* MdxService;
  const out = yield* svc.compileMdx("# Hi <X/>", {
    remarkPlugins: [],
    rehypePlugins: [],
  });
  return out.code;
});
```

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
