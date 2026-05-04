export function buildRoleMarkdown(opts: {
  companyName?: string | null;
  jobTitle?: string | null;
  jobUrl?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  roleInstructions?: string | null;
  metadata?: any;
}): string {
  let md = `# ${opts.jobTitle || "Role"} at ${opts.companyName || "Company"}\n\n`;

  if (opts.jobUrl) {
    md += `**URL:** ${opts.jobUrl}\n\n`;
  }

  if (opts.salaryMin || opts.salaryMax) {
    md += `**Salary:** ${opts.salaryMin || ""} - ${opts.salaryMax || ""} ${opts.salaryCurrency || "USD"}\n\n`;
  }

  if (opts.roleInstructions) {
    md += `## Instructions\n\n${opts.roleInstructions}\n\n`;
  }

  if (opts.metadata) {
    md += `## Metadata\n\n\`\`\`json\n${JSON.stringify(opts.metadata, null, 2)}\n\`\`\`\n\n`;
  }

  return md;
}
