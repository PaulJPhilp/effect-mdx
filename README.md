# effect-mdx

A library for working with MDX using the Effect ecosystem.

## Installation

```bash
bun add effect-mdx
```

## Usage

```typescript
import { Effect } from "effect";
import { parseMdx } from "effect-mdx";

const program = parseMdx("# Hello World");

Effect.runPromise(program).then(result => {
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
