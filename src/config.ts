import { Effect, Layer } from "effect";

/**
 * MDX processing configuration and layers.
 *
 * This module defines the `MdxPipelineConfig` shape and utilities to expose it
 * as an Effect.Service layer that other modules can depend on.
 */

/**
 * Configuration for the Unified/MDX processing pipeline.
 *
 * Plugin arrays are intentionally typed as `any` due to upstream type
 * variability across remark/rehype plugins and user-supplied tuples.
 */
export interface MdxPipelineConfig {
  readonly remarkPlugins: ReadonlyArray<any>;
  readonly rehypePlugins: ReadonlyArray<any>;
  readonly sanitize?: false | Record<string, unknown>;
  readonly slug?: boolean;
  readonly autolinkHeadings?: boolean;
}

/**
 * Effect.Service that provides access to the MDX pipeline configuration.
 */
export class MdxConfigService extends Effect.Service<MdxConfigService>()(
  "MdxConfigService",
  {
    scoped: Effect.succeed({
      /** Get the current pipeline configuration. */
      getConfig: (): MdxPipelineConfig => ({
        remarkPlugins: [],
        rehypePlugins: [],
        sanitize: false,
        slug: false,
        autolinkHeadings: false,
      })
    }),
    dependencies: [],
  }
) {}

/**
 * Build a configuration Layer from a concrete config object.
 */
export const makeMdxConfigLayer = (cfg: MdxPipelineConfig) =>
  Layer.succeed(
    MdxConfigService as any,
    ({ getConfig: () => cfg } as unknown as InstanceType<typeof MdxConfigService>)
  );

/**
 * Options for the docs preset helper. Callers pass concrete plugins to avoid
 * hard dependencies in this package.
 */
export interface DocsPresetOptions {
  readonly slug?: boolean;
  readonly autolink?: boolean | Record<string, unknown>;
  readonly sanitize?: false | Record<string, unknown>;
  readonly extraRemark?: ReadonlyArray<any>;
  readonly extraRehype?: ReadonlyArray<any>;
  // user-supplied plugins
  readonly remarkSlug?: any;
  readonly remarkAutolinkHeadings?: any; // can be [plugin, opts]
  readonly rehypeSanitize?: any; // can be [plugin, policy]
}

/**
 * Create a Layer configured for documentation-style rendering.
 */
export const docsPresetLayer = (opts: DocsPresetOptions = {}) => {
  const remark: any[] = [];
  const rehype: any[] = [];

  if (opts.slug !== false && opts.remarkSlug) remark.push(opts.remarkSlug);

  if (opts.autolink !== false && opts.remarkAutolinkHeadings) {
    if (opts.autolink && typeof opts.autolink === "object")
      remark.push([opts.remarkAutolinkHeadings, opts.autolink]);
    else remark.push(opts.remarkAutolinkHeadings);
  }

  if (opts.sanitize !== false && opts.rehypeSanitize) {
    if (opts.sanitize && typeof opts.sanitize === "object")
      rehype.push([opts.rehypeSanitize, opts.sanitize]);
    else rehype.push(opts.rehypeSanitize);
  }

  if (opts.extraRemark) remark.push(...opts.extraRemark);
  if (opts.extraRehype) rehype.push(...opts.extraRehype);

  return makeMdxConfigLayer({
    remarkPlugins: remark,
    rehypePlugins: rehype,
    sanitize: opts.sanitize ?? {},
    slug: opts.slug !== false,
    autolinkHeadings: opts.autolink !== false,
  });
};

/**
 * Default empty configuration layer.
 */
export const defaultMdxConfigLayer = makeMdxConfigLayer({
  remarkPlugins: [],
  rehypePlugins: [],
  sanitize: false,
  slug: false,
  autolinkHeadings: false,
});
