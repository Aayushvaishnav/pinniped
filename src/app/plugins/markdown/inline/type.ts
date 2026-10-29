import { MatchResult, MatchRule } from '../internal';

/**
 * Type for a function that parses inline markdown into HTML.
 *
 * @param text - The markdown text to be parsed.
 * @returns The parsed HTML.
 */
export type InlineMDParser = (text: string) => string;

/**
 * Type for a function that converts a match to output.
 *
 * @param parse - The inline markdown parser function.
 * @param match - The match result.
 * @returns The output string after processing the match.
 */
export type InlineMatchConverter = (parse: InlineMDParser, match: MatchResult) => string;

export type InlineMDMark =
  'bold' | 'italic' | 'underline' | 'strikeThrough' | 'code' | 'spoiler' | 'link' | 'escape';

/**
 * Describes where the syntax and content of a match are,
 * used to highlight markdown in the composer.
 */
export type InlineMDToken = {
  mark: InlineMDMark;
  open: number | ((match: MatchResult) => number); // length of opening syntax
  close: number | ((match: MatchResult) => number); // length of closing syntax
  raw?: boolean; // content is not parsed further
};

/**
 * Type representing a markdown rule that includes a matching pattern and HTML conversion.
 */
export type InlineMDRule = {
  match: MatchRule; // A function that matches a specific markdown pattern.
  html: InlineMatchConverter; // A function that converts the match to HTML.
  token: InlineMDToken;
};
