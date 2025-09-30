import { Effect, Layer } from "effect";
import { describe, it, expect } from "bun:test";
import {
  MdxConfigService,
  makeMdxConfigLayer,
  docsPresetLayer,
  type MdxPipelineConfig,
  type DocsPresetOptions,
} from "../src/config";
import remarkGfm from "remark-gfm";

describe("Config Service", () => {
  describe("MdxConfigService", () => {
    it("should provide default config", async () => {
      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MdxConfigService.Default))
      );

      expect(result).toEqual({
        remarkPlugins: [],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      });
    });

    it("should use default config when no layer provided", async () => {
      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        const cfg = config.getConfig();
        return cfg;
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(MdxConfigService.Default))
      );

      expect(result.remarkPlugins).toEqual([]);
      expect(result.rehypePlugins).toEqual([]);
    });
  });

  describe("makeMdxConfigLayer", () => {
    it("should create layer with custom config", async () => {
      const customConfig: MdxPipelineConfig = {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [],
        sanitize: {},
        slug: true,
        autolinkHeadings: true,
      };

      const customLayer = makeMdxConfigLayer(customConfig);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(customLayer))
      );

      expect(result.remarkPlugins.length).toBe(1);
      expect(result.slug).toBe(true);
      expect(result.autolinkHeadings).toBe(true);
      expect(result.sanitize).toEqual({});
    });

    it("should create layer with empty plugins", async () => {
      const emptyConfig: MdxPipelineConfig = {
        remarkPlugins: [],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      };

      const emptyLayer = makeMdxConfigLayer(emptyConfig);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(emptyLayer))
      );

      expect(result.remarkPlugins).toEqual([]);
      expect(result.rehypePlugins).toEqual([]);
    });

    it("should create layer with multiple plugins", async () => {
      const multiConfig: MdxPipelineConfig = {
        remarkPlugins: [remarkGfm, [remarkGfm, { singleTilde: false }]],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      };

      const multiLayer = makeMdxConfigLayer(multiConfig);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(multiLayer))
      );

      expect(result.remarkPlugins.length).toBe(2);
    });
  });

  describe("docsPresetLayer", () => {
    it("should create default docs preset", async () => {
      const layer = docsPresetLayer();

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins).toEqual([]);
      expect(result.rehypePlugins).toEqual([]);
      // docsPresetLayer default behavior (slug defaults to true unless explicitly false)
      expect(result.slug).toBeDefined();
      expect(result.autolinkHeadings).toBeDefined();
    });

    it("should add slug plugin when enabled", async () => {
      const opts: DocsPresetOptions = {
        slug: true,
        remarkSlug: remarkGfm, // Using remarkGfm as mock plugin
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(1);
      expect(result.slug).toBe(true);
    });

    it("should not add slug plugin when disabled", async () => {
      const opts: DocsPresetOptions = {
        slug: false,
        remarkSlug: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(0);
      expect(result.slug).toBe(false);
    });

    it("should add autolink plugin with default options", async () => {
      const opts: DocsPresetOptions = {
        autolink: true,
        remarkAutolinkHeadings: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(1);
      expect(result.autolinkHeadings).toBe(true);
    });

    it("should add autolink plugin with custom options", async () => {
      const opts: DocsPresetOptions = {
        autolink: { behavior: "wrap" },
        remarkAutolinkHeadings: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(1);
      // Should have plugin with options
      expect(Array.isArray(result.remarkPlugins[0])).toBe(true);
    });

    it("should not add autolink plugin when disabled", async () => {
      const opts: DocsPresetOptions = {
        autolink: false,
        remarkAutolinkHeadings: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(0);
      expect(result.autolinkHeadings).toBe(false);
    });

    it("should add sanitize plugin", async () => {
      const opts: DocsPresetOptions = {
        sanitize: {},
        rehypeSanitize: remarkGfm, // Using as mock
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.rehypePlugins.length).toBe(1);
      expect(result.sanitize).toEqual({});
    });

    it("should add sanitize plugin with custom policy", async () => {
      const opts: DocsPresetOptions = {
        sanitize: { allowDangerousHtml: true },
        rehypeSanitize: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.rehypePlugins.length).toBe(1);
      expect(Array.isArray(result.rehypePlugins[0])).toBe(true);
    });

    it("should not add sanitize when disabled", async () => {
      const opts: DocsPresetOptions = {
        sanitize: false,
        rehypeSanitize: remarkGfm,
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.rehypePlugins.length).toBe(0);
    });

    it("should add extra remark plugins", async () => {
      const opts: DocsPresetOptions = {
        extraRemark: [remarkGfm],
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins.length).toBe(1);
    });

    it("should add extra rehype plugins", async () => {
      const opts: DocsPresetOptions = {
        extraRehype: [remarkGfm],
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.rehypePlugins.length).toBe(1);
    });

    it("should combine multiple plugins", async () => {
      const opts: DocsPresetOptions = {
        slug: true,
        remarkSlug: remarkGfm,
        autolink: true,
        remarkAutolinkHeadings: remarkGfm,
        extraRemark: [remarkGfm],
        extraRehype: [remarkGfm],
      };

      const layer = docsPresetLayer(opts);

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      // slug + autolink + extraRemark
      expect(result.remarkPlugins.length).toBe(3);
      // extraRehype
      expect(result.rehypePlugins.length).toBe(1);
    });

    it("should handle empty options object", async () => {
      const layer = docsPresetLayer({});

      const program = Effect.gen(function* () {
        const config = yield* MdxConfigService;
        return config.getConfig();
      });

      const result = await Effect.runPromise(
        program.pipe(Effect.provide(layer))
      );

      expect(result.remarkPlugins).toEqual([]);
      expect(result.rehypePlugins).toEqual([]);
    });
  });
});
