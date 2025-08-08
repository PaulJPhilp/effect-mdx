import { describe, it, expect } from "bun:test";
import { Effect, Exit } from "effect";
import { NodeFileSystem } from "@effect/platform-node";
import { FileSystem } from "@effect/platform";
import { MdxService } from "../src/service.ts";
import type { MdxServiceApi } from "../src/api.ts";

const provideNodeFs = <A, E = never, R = never>(
  eff: Effect.Effect<A, E, R>
): any => Effect.provide(eff as any, NodeFileSystem.layer) as any;

const withService = <A, E = never, R = never>(
  f: (svc: MdxServiceApi) => Effect.Effect<A, E, R>
): any => {
  const svc: any = MdxService as any;
  const scoped: any = svc?.scoped;
  const defLayer: any = svc?.Default;

  if (scoped) {
    return provideNodeFs(Effect.flatMap(scoped, f as any) as any);
  }

  if (defLayer) {
    return provideNodeFs(
      Effect.provide(Effect.flatMap(svc, f as any) as any, defLayer)
    );
  }

  // Last resort: access via tag without Default (should not happen for
  // a proper Effect.Service). This will likely fail at runtime if the
  // layer isn't provided, but keeps us within the Service pattern.
  return provideNodeFs(Effect.flatMap(svc, f as any) as any);
};

const readFixture = (name: string) =>
  provideNodeFs(
    Effect.flatMap(FileSystem.FileSystem, (fs) =>
      fs.readFileString(`test/fixtures/${name}`)
    )
  );

describe("MdxService", () => {
  it("readMdxAndFrontmatter: happy path", async () => {
    const result: any = await withService((svc) =>
      svc.readMdxAndFrontmatter("test/fixtures/valid.mdx")
    ).pipe(Effect.runPromise);

    expect(result.content.length).toBeGreaterThan(0);
    expect(result.mdxBody).toContain("# Hello");
    expect(result.frontmatter.provider).toBe("openai");
    expect(result.frontmatter.model).toBe("gpt-4o");
  });

  it("readMdxAndFrontmatter: missing file error", async () => {
    const exit = (await withService((svc) =>
      Effect.exit(
        svc.readMdxAndFrontmatter("test/fixtures/does-not-exist.mdx")
      )
    ).pipe(Effect.runPromise)) as any;

    expect(Exit.isFailure(exit as any)).toBe(true);
  });

  it("updateMdxContent: preserves body and updates fm", async () => {
    const original = `---\ntitle: Old\n---\n# Title\n\nBody.`;
    const updated = { title: "New", provider: "openai" } as const;

    const result = await withService((svc) =>
      Effect.succeed(svc.updateMdxContent(original, updated))
    ).pipe(Effect.runPromise);

    expect(result).toContain("title: New");
    expect(result).toContain("provider: openai");
    expect(result).toContain("# Title");
    expect(result).toContain("Body.");
  });

  it("parseMdxFile: returns attributes and body", async () => {
    const content = await readFixture("valid.mdx").pipe(
      Effect.runPromise
    );

    const parsed: any = await withService((svc) =>
      svc.parseMdxFile(content)
    ).pipe(Effect.runPromise);

    expect(parsed.body).toContain("# Hello");
    expect(parsed.attributes.provider).toBe("openai");
  });

  it("parseMdxFile: invalid frontmatter -> InvalidMdxFormatError", async () => {
    const bad = await readFixture("invalid-frontmatter.mdx").pipe(
      Effect.runPromise
    );

    const exit = (await withService((svc) =>
      Effect.exit(svc.parseMdxFile(bad))
    ).pipe(Effect.runPromise)) as any;

    expect(Exit.isFailure(exit as any)).toBe(true);
  });

  it("compileMdxToHtml: happy path", async () => {
    const content = await readFixture("valid.mdx").pipe(
      Effect.runPromise
    );

    const html = await withService((svc) =>
      svc.compileMdxToHtml(content)
    ).pipe(Effect.runPromise);

    expect(html).toContain("<h1>");
    expect(html).toContain("Hello");
    expect(html).toContain("<p>");
  });

  it("compileMdxToHtml: invalid fm -> error", async () => {
    const bad = await readFixture("invalid-frontmatter.mdx").pipe(
      Effect.runPromise
    );

    const exit = (await withService((svc) =>
      Effect.exit(svc.compileMdxToHtml(bad))
    ).pipe(Effect.runPromise)) as any;

    expect(Exit.isFailure(exit as any)).toBe(true);
  });

  it("compileForLlmUi: happy path", async () => {
    const content = await readFixture("valid.mdx").pipe(
      Effect.runPromise
    );

    const out: any = await withService((svc) =>
      svc.compileForLlmUi(content)
    ).pipe(Effect.runPromise);

    expect(out.rawMarkdown).toContain("# Hello");
    expect(out.frontmatter.provider).toBe("openai");
    expect(out.metadata.llmUiMode).toBe(true);
  });

  it("compileForLlmUi: invalid fm -> error", async () => {
    const bad = await readFixture("invalid-frontmatter.mdx").pipe(
      Effect.runPromise
    );

    const exit = (await withService((svc) =>
      Effect.exit(svc.compileForLlmUi(bad))
    ).pipe(Effect.runPromise)) as any;

    expect(Exit.isFailure(exit as any)).toBe(true);
  });

  it("validateMdxConfig: extracts known fields", async () => {
    const attributes = {
      provider: "openai",
      model: "gpt-4o",
      parameters: { temperature: 0.1 },
      extra: 1,
    } as const;

    const cfg: any = await withService((svc) =>
      svc.validateMdxConfig(attributes)
    ).pipe(Effect.runPromise);

    expect(cfg.provider).toBe("openai");
    expect(cfg.model).toBe("gpt-4o");
    expect(cfg.parameters).toEqual({ temperature: 0.1 });
  });

  it("extractParameters: builds typed map", async () => {
    const metadata = {
      parameters: {
        a: { type: "string", description: "A", required: true },
        b: { type: "number", default: 1 },
        c: { type: "boolean" },
        d: { type: "array" },
        e: { type: "object" },
        z: "ignore",
      },
    } as const;

    const params: any = await withService((svc) =>
      Effect.succeed(svc.extractParameters(metadata as any))
    ).pipe(Effect.runPromise);

    expect(params.a.type).toBe("string");
    expect(params.a.required).toBe(true);
    expect(params.b.type).toBe("number");
    expect(params.b.default).toBe(1);
    expect(params.c.type).toBe("boolean");
    expect(params.d.type).toBe("array");
    expect(params.e.type).toBe("object");
    expect(params.z).toBeUndefined();
  });

  it("parse/compile without frontmatter", async () => {
    const noFm = "# No FM\n\nJust text.";

    const parsed: any = await withService((svc) =>
      svc.parseMdxFile(noFm)
    ).pipe(Effect.runPromise);
    expect(parsed.attributes).toEqual({});

    const html = await withService((svc) =>
      svc.compileMdxToHtml(noFm)
    ).pipe(Effect.runPromise);
    expect(html).toContain("<p>");
  });
});
