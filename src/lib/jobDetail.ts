import type { Job } from "@/hooks/useJobs";
import type { JobDetail } from "@/data/jobDetails";

export const transformDbJobToDetail = (job: Job): JobDetail => {
  const details = job.opportunity_details && typeof job.opportunity_details === 'object' && !Array.isArray(job.opportunity_details)
    ? job.opportunity_details as Record<string, unknown>
    : {};
  const text = (key: string) => typeof details[key] === 'string' ? details[key] as string : undefined;
  const agePolicy = details.under_18_policy === 'safeguarded' || details.under_18_policy === 'adults_only' ? details.under_18_policy : undefined;

  return {
    id: job.id,
    title: job.title,
    company: job.company?.company_name || "Unknown Company",
    companyLogo: job.company?.logo_url || undefined,
    companyDescription: job.company?.company_description || "No description available",
    location: job.location || "Remote",
    locationType: job.location_type as "remote" | "on-site" | "hybrid",
    duration: job.duration || "Flexible",
    hoursPerWeek: job.hours_per_week || "Flexible",
    skillLevel: job.skill_level as "beginner" | "intermediate" | "advanced",
    industry: (job.industry || "tech") as "tech" | "design" | "marketing" | "business",
    skills: job.skills || [],
    postedAt: job.created_at,
    description: job.description,
    responsibilities: job.responsibilities || [],
    requirements: job.requirements || [],
    whatYouWillLearn: job.what_you_will_learn || [],
    mentorshipDetails: job.mentorship_details || "Mentorship details not specified",
    companyId: job.company_id,
    workplaceArrangements: text('workplace_arrangements'),
    safeguardingContact: text('safeguarding_contact'),
    paymentDetails: text('payment_details') ?? (job.category === 'shadowing' || job.category === 'learning_project' ? 'Unpaid educational experience' : undefined),
    expenseDetails: text('expense_details'),
    eligibility: text('eligibility'),
    under18Policy: agePolicy,
  };
};
