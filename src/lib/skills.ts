export const SKILL_CATEGORIES = [
  { value: "communication", label: "Communication" },
  { value: "teamwork", label: "Teamwork & collaboration" },
  { value: "problem_solving", label: "Problem solving" },
  { value: "digital_technical", label: "Digital & technical" },
  { value: "customer_service", label: "Customer service" },
  { value: "organisation", label: "Organisation & time management" },
  { value: "leadership", label: "Leadership & initiative" },
  { value: "creativity", label: "Creativity" },
  { value: "industry_specific", label: "Industry-specific" },
] as const;

export const categoryLabel = (v: string) => SKILL_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export interface SkillVerification {
  id: string;
  placement_id: string;
  company_id: string;
  skill: string;
  category: string;
  example: string | null;
  verified_by: string;
  verifier_name: string;
  verified_at: string;
  show_on_profile: boolean;
}

export interface PublicVerifiedSkill {
  skill: string;
  category: string;
  example: string | null;
  company: string;
  verified_at: string;
}
