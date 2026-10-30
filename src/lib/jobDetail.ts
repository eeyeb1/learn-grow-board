import type { Job } from "@/hooks/useJobs";
import type { JobDetail } from "@/data/jobDetails";

export const transformDbJobToDetail = (job: Job): JobDetail => ({
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
});

