/**
 * @fileoverview Role Podcast Prompt Builder
 *
 * Generates prompts for creating role-based podcast content.
 */

/**
 * Build a prompt for generating role-specific podcast content
 *
 * @param params - Parameters for building the podcast prompt
 * @returns Generated prompt string
 */
export function buildRolePodcastPrompt(params: {
  roleTitle?: string;
  companyName?: string;
  bullets?: string[];
}): string {
  const { roleTitle = "the role", companyName = "the company", bullets = [] } = params;

  return `Create an engaging podcast-style discussion about ${roleTitle} at ${companyName}.

Key points to cover:
${bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")}

Make it conversational, insightful, and engaging for listeners interested in this career opportunity.`;
}
