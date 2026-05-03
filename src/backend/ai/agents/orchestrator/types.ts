import { z } from "zod";

export type OrchestratorTaskType =
  | "resume_review"
  | "cover_letter_draft"
  | "email_draft"
  | "job_extract"
  | "role_analysis"
  | "email_status_inference"
  | "interview_feedback"
  | "resume_comment_response";

export type OrchestratorTaskStatus = "pending" | "running" | "complete" | "failed";

export type OrchestratorTask = {
  id: string;
  type: OrchestratorTaskType;
  status: OrchestratorTaskStatus;
  roleId?: string;
  payload?: Record<string, unknown>;
  error?: string;
};

export type OrchestratorState = {
  roleId: string | "global";
  pendingTasks: OrchestratorTask[];
};

export const JobPosting = z.object({
  // ── Core identifiers ────────────────────────────────────────────────────
  companyName: z.string().min(1),
  jobTitle: z.string().min(1),
  jobUrl: z.string().url().optional(),

  // ── Compensation ────────────────────────────────────────────────────────
  salaryMin: z.number().int().optional(),
  salaryMax: z.number().int().optional(),
  salaryCurrency: z.string().default("USD"),

  // ── Role details ────────────────────────────────────────────────────────
  responsibilities: z.array(z.string()).optional(),
  requiredQualifications: z.array(z.string()).optional(),
  preferredQualifications: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  preferredSkills: z.array(z.string()).optional(),

  // ── Location & work arrangement ─────────────────────────────────────────
  location: z.string().optional(),
  workplaceType: z.enum(["remote", "hybrid", "onsite"]).optional(),
  rtoPolicy: z.string().optional(),

  // ── Experience & education ──────────────────────────────────────────────
  yearsExperienceMin: z.number().optional(),
  yearsExperienceMax: z.number().optional(),
  educationRequirements: z.array(z.string()).optional(),

  // ── Organization ────────────────────────────────────────────────────────
  department: z.string().optional(),
  reportingTo: z.string().optional(),

  // ── Logistics ───────────────────────────────────────────────────────────
  travelRequirements: z.string().optional(),
  securityClearance: z.string().optional(),
  visaSponsorship: z.string().optional(),

  // ── Benefits & extras ───────────────────────────────────────────────────
  benefits: z.array(z.string()).optional(),
  additionalNotes: z.string().optional(),

  // ── Legacy / catch-all ──────────────────────────────────────────────────
  roleInstructions: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
