import { Effect, Layer } from "effect";
import type { Pluggable } from "unified";

/**
 * MDX processing configuration and layers.
 *
 * This module defines the `MdxPipelineConfig` shape and utilities to expose it
 * as an Effect.Service layer that other modules can depend on.
 */

/**
 * Configuration for the Unified/MDX processing pipeline.
 *
 * Plugin arrays use the `Pluggable` type from unified to ensure type safety
 * while supporting both plugin functions and [plugin, options] tuples.
 */
export interface MdxPipelineConfig {
  readonly remarkPlugins: ReadonlyArray<Pluggable>;
  readonly rehypePlugins: ReadonlyArray<Pluggable>;
  readonly sanitize?: false | Record<string, unknown>;
  readonly slug?: boolean;
  readonly autolinkHeadings?: boolean;
}

/**
 * Effect.Service that provides access to the MDX pipeline configuration.
 */
export interface MdxConfigServiceSchema {
  readonly getConfig: () => MdxPipelineConfig;
}

export class MdxConfigService extends Effect.Service<MdxConfigServiceSchema>()("MdxConfigService", {
  succeed: {
    /** Get the current pipeline configuration. */
    getConfig: (): MdxPipelineConfig => ({
      remarkPlugins: [],
      rehypePlugins: [],
      sanitize: false,
      slug: false,
      autolinkHeadings: false,
    }),
  },
}) {}

/**
 * Build a configuration Layer from a concrete config object.
 */
export const makeMdxConfigLayer = (cfg: MdxPipelineConfig) =>
  Layer.succeed(
    MdxConfigService,
    { getConfig: () => cfg }
  );

/**
 * Options for the docs preset helper. Callers pass concrete plugins to avoid
 * hard dependencies in this package.
 */
export interface DocsPresetOptions {
  readonly slug?: boolean;
  readonly autolink?: boolean | Record<string, unknown>;
  readonly sanitize?: false | Record<string, unknown>;
  readonly extraRemark?: ReadonlyArray<Pluggable>;
  readonly extraRehype?: ReadonlyArray<Pluggable>;
  // user-supplied plugins
  readonly remarkSlug?: Pluggable;
  readonly remarkAutolinkHeadings?: Pluggable; // can be [plugin, opts]
  readonly rehypeSanitize?: Pluggable; // can be [plugin, policy]
}

/**
 * Create a Layer configured for documentation-style rendering.
 */
export const docsPresetLayer = (opts: DocsPresetOptions = {}) => {
  const remark: Pluggable[] = [];
  const rehype: Pluggable[] = [];

  if (opts.slug !== false && opts.remarkSlug) remark.push(opts.remarkSlug as Pluggable);

  if (opts.autolink !== false && opts.remarkAutolinkHeadings) {
    if (opts.autolink && typeof opts.autolink === "object")
      remark.push([opts.remarkAutolinkHeadings, opts.autolink] as Pluggable);
    else remark.push(opts.remarkAutolinkHeadings as Pluggable);
  }

  if (opts.sanitize !== false && opts.rehypeSanitize) {
    if (opts.sanitize && typeof opts.sanitize === "object")
      rehype.push([opts.rehypeSanitize, opts.sanitize] as Pluggable);
    else rehype.push(opts.rehypeSanitize as Pluggable);
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
export const defaultMdxConfigLayer = MdxConfigService.Default;
