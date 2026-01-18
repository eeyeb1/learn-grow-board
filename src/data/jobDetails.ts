export interface JobDetail {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  companyDescription: string;
  companyWebsite?: string;
  location: string;
  locationType: "remote" | "on-site" | "hybrid";
  duration: string;
  hoursPerWeek: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  industry: "tech" | "design" | "marketing" | "business";
  skills: string[];
  applicants?: number;
  postedAt: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  whatYouWillLearn: string[];
  mentorshipDetails: string;
}

export const jobDetails: Record<string, JobDetail> = {
  "1": {
    id: "1",
    title: "Junior Frontend Developer",
    company: "TechStart Studio",
    companyDescription: "TechStart Studio is a dynamic web development agency focused on building modern, scalable applications. We're passionate about mentoring the next generation of developers and helping them build real-world skills.",
    companyWebsite: "https://techstartstudio.com",
    location: "San Francisco, CA",
    locationType: "remote",
    duration: "3 months",
    hoursPerWeek: "10-15 hours",
    skillLevel: "beginner",
    industry: "tech",
    skills: ["React", "JavaScript", "CSS", "Git"],
    applicants: 12,
    postedAt: "3 days ago",
    description: "Join our development team to gain hands-on experience building production-ready web applications. You'll work alongside senior developers who are committed to helping you grow your skills and portfolio.",
    responsibilities: [
      "Build and maintain React components for client projects",
      "Collaborate with designers to implement pixel-perfect UIs",
      "Participate in code reviews and learn best practices",
      "Write clean, maintainable code following our style guide",
      "Contribute to team discussions and sprint planning"
    ],
    requirements: [
      "Basic understanding of HTML, CSS, and JavaScript",
      "Familiarity with React (personal projects count!)",
      "Eagerness to learn and receive feedback",
      "Good communication skills",
      "Available for 10-15 hours per week"
    ],
    whatYouWillLearn: [
      "Professional React development workflows",
      "Git and version control best practices",
      "Working in an agile development environment",
      "Code review processes and collaboration",
      "Building production-ready applications"
    ],
    mentorshipDetails: "You'll be paired with a senior developer who will provide weekly 1-on-1 mentorship sessions, code reviews, and career guidance. We're committed to your growth!"
  },
  "2": {
    id: "2",
    title: "UI/UX Design Intern",
    company: "Creative Minds Agency",
    companyDescription: "Creative Minds is an award-winning design agency that helps brands tell their story through compelling visual experiences. We believe in nurturing creative talent and providing real project experience.",
    companyWebsite: "https://creativeminds.agency",
    location: "New York, NY",
    locationType: "hybrid",
    duration: "2 months",
    hoursPerWeek: "15-20 hours",
    skillLevel: "beginner",
    industry: "design",
    skills: ["Figma", "User Research", "Prototyping", "Adobe XD"],
    applicants: 24,
    postedAt: "1 week ago",
    description: "Work with our design team on real client projects and learn the complete design process from research to final delivery. Perfect for aspiring designers looking to build their portfolio.",
    responsibilities: [
      "Assist in creating wireframes and prototypes",
      "Conduct user research and usability testing",
      "Design UI components following brand guidelines",
      "Present design concepts to the team",
      "Organize and maintain design files and assets"
    ],
    requirements: [
      "Basic proficiency in Figma or similar design tools",
      "Understanding of design principles",
      "Creative mindset with attention to detail",
      "Ability to receive and apply constructive feedback",
      "Portfolio with 2-3 personal projects (school projects welcome)"
    ],
    whatYouWillLearn: [
      "Professional design workflows and processes",
      "Client communication and presentation skills",
      "User research methodologies",
      "Design system creation and maintenance",
      "Collaboration with developers"
    ],
    mentorshipDetails: "Our lead designer will guide you through each project phase, providing detailed feedback and teaching industry-standard practices used by top agencies."
  },
  "3": {
    id: "3",
    title: "Social Media Marketing Assistant",
    company: "GrowthHub Digital",
    companyDescription: "GrowthHub Digital is a data-driven marketing agency helping startups and scale-ups achieve rapid growth through innovative marketing strategies.",
    companyWebsite: "https://growthhub.digital",
    location: "Austin, TX",
    locationType: "remote",
    duration: "1 month",
    hoursPerWeek: "8-10 hours",
    skillLevel: "beginner",
    industry: "marketing",
    skills: ["Content Creation", "Analytics", "Copywriting"],
    applicants: 18,
    postedAt: "2 days ago",
    description: "Help manage social media accounts for exciting startup clients while learning the fundamentals of digital marketing and content strategy.",
    responsibilities: [
      "Create engaging social media content",
      "Schedule and publish posts across platforms",
      "Monitor engagement and compile weekly reports",
      "Research trending topics and hashtags",
      "Assist with content calendar planning"
    ],
    requirements: [
      "Active presence on major social platforms",
      "Strong writing skills",
      "Basic understanding of social media analytics",
      "Creative thinking and trend awareness",
      "Reliable and organized"
    ],
    whatYouWillLearn: [
      "Social media strategy development",
      "Content creation best practices",
      "Analytics and performance tracking",
      "Community management",
      "Brand voice and messaging"
    ],
    mentorshipDetails: "Weekly strategy sessions with our marketing lead, plus access to our internal training resources and marketing courses."
  },
  "4": {
    id: "4",
    title: "Junior Data Analyst",
    company: "DataFlow Labs",
    companyDescription: "DataFlow Labs specializes in helping businesses make data-driven decisions through advanced analytics and visualization solutions.",
    companyWebsite: "https://dataflowlabs.com",
    location: "Seattle, WA",
    locationType: "on-site",
    duration: "6+ months",
    hoursPerWeek: "20 hours",
    skillLevel: "intermediate",
    industry: "tech",
    skills: ["Python", "SQL", "Excel", "Data Visualization", "Statistics"],
    applicants: 8,
    postedAt: "5 days ago",
    description: "Dive deep into real datasets and learn how to extract meaningful insights that drive business decisions. Work on actual client projects under expert guidance.",
    responsibilities: [
      "Clean and preprocess datasets for analysis",
      "Create visualizations and dashboards",
      "Write SQL queries to extract data",
      "Assist in building analytical models",
      "Document findings and present to stakeholders"
    ],
    requirements: [
      "Intermediate Python or R skills",
      "Basic SQL knowledge",
      "Understanding of statistics fundamentals",
      "Problem-solving mindset",
      "Coursework or projects in data analysis"
    ],
    whatYouWillLearn: [
      "Advanced SQL and database management",
      "Data cleaning and preprocessing techniques",
      "Statistical analysis methods",
      "Dashboard creation with Tableau/Power BI",
      "Communicating insights to non-technical audiences"
    ],
    mentorshipDetails: "Pair programming sessions with senior analysts, weekly learning modules, and the opportunity to lead a small analytical project."
  },
  "5": {
    id: "5",
    title: "Content Writer",
    company: "WordCraft Media",
    companyDescription: "WordCraft Media is a content marketing agency that helps brands connect with their audiences through compelling storytelling and strategic content.",
    companyWebsite: "https://wordcraftmedia.com",
    location: "Remote",
    locationType: "remote",
    duration: "Ongoing",
    hoursPerWeek: "5-10 hours",
    skillLevel: "beginner",
    industry: "marketing",
    skills: ["Writing", "SEO", "Research"],
    applicants: 32,
    postedAt: "1 day ago",
    description: "Write blog posts, articles, and web copy for diverse clients while learning content marketing strategies and SEO best practices.",
    responsibilities: [
      "Write blog posts and articles on assigned topics",
      "Research and fact-check content",
      "Optimize content for SEO",
      "Edit and proofread before submission",
      "Meet weekly content deadlines"
    ],
    requirements: [
      "Strong English writing skills",
      "Ability to research and synthesize information",
      "Basic understanding of SEO concepts",
      "Reliable and deadline-oriented",
      "Writing samples or portfolio"
    ],
    whatYouWillLearn: [
      "SEO writing and optimization",
      "Content strategy fundamentals",
      "Editorial processes and workflows",
      "Writing for different industries and audiences",
      "Building a professional writing portfolio"
    ],
    mentorshipDetails: "Each piece receives detailed editorial feedback. Monthly calls with our content director to discuss your growth and career goals."
  },
  "6": {
    id: "6",
    title: "Business Development Intern",
    company: "LaunchPad Ventures",
    companyDescription: "LaunchPad Ventures is an early-stage VC firm that invests in innovative startups and helps them scale. We offer a unique look into the world of venture capital.",
    companyWebsite: "https://launchpadvc.com",
    location: "Chicago, IL",
    locationType: "hybrid",
    duration: "3 months",
    hoursPerWeek: "12-15 hours",
    skillLevel: "intermediate",
    industry: "business",
    skills: ["Sales", "CRM", "Communication", "Market Research"],
    applicants: 15,
    postedAt: "4 days ago",
    description: "Get exposure to the venture capital world while developing business development and market research skills. Work directly with our investment team.",
    responsibilities: [
      "Research potential investment opportunities",
      "Assist in due diligence processes",
      "Maintain and update CRM database",
      "Prepare market analysis reports",
      "Support portfolio company outreach"
    ],
    requirements: [
      "Business or related field background",
      "Strong analytical and research skills",
      "Excellent written and verbal communication",
      "Proficiency in Excel and Google Sheets",
      "Interest in startups and venture capital"
    ],
    whatYouWillLearn: [
      "Venture capital investment process",
      "Market research and analysis techniques",
      "CRM and database management",
      "Professional networking skills",
      "Startup evaluation frameworks"
    ],
    mentorshipDetails: "Shadow our partners in meetings, receive guidance from associates, and participate in our weekly investment committee discussions."
  }
};
