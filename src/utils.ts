import { minimatch } from 'minimatch';

/**
 * Check if a file matches any of the test patterns
 * @param filename - The filename to check
 * @param patterns - Array of glob patterns to match against
 * @returns true if the file matches any pattern, false otherwise
 */
export function isTestFile(filename: string, patterns: string[]): boolean {
  return patterns.some(pattern => minimatch(filename, pattern, { 
    matchBase: true,
    nocase: true 
  }));
}

/**
 * Parse comma-separated patterns into an array
 * @param input - Comma-separated string of patterns
 * @returns Array of trimmed patterns
 */
export function parsePatterns(input: string): string[] {
  return input
    .split(',')
    .map(p => p.trim())
    .filter(p => p.length > 0);
}
