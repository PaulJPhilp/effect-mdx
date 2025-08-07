/**
 * effect-mdx - A library for working with MDX using Effect
 */

import { Effect, pipe } from "effect";

/**
 * A simple example function that parses MDX content
 * @param content - The MDX content to parse
 * @returns An Effect that resolves to a success message
 */
export const parseMdx = (content: string) =>
  Effect.gen(function* () {
    // In a real implementation, this would parse the MDX content
    yield* Effect.logInfo(`Parsing MDX content: ${content}`);
    return `Successfully parsed MDX content with ${content.length} characters`;
  });

/**
 * An example of how to use the parseMdx function
 */
const example = () =>
  pipe(
    parseMdx("# Hello World\n\nThis is a sample MDX content"),
    Effect.tap((result) => Effect.logInfo(result)),
    Effect.catchAll((error) =>
      Effect.logError(`Failed to parse MDX: ${error}`)
    )
  );

// Export the main functions for use in other modules
export { Effect } from "effect";

// Run the example if this file is executed directly
if (import.meta.main) {
  Effect.runPromise(example());
}