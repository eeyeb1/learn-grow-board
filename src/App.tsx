import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import ApplyJob from "./pages/ApplyJob";
import PostRole from "./pages/PostRole";
import SuccessStories from "./pages/SuccessStories";
import Resources from "./pages/Resources";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import Privacy from "./pages/Privacy";
import HowItWorks from "./pages/HowItWorks";
import Guidelines from "./pages/Guidelines";
import Terms from "./pages/Terms";
import About from "./pages/About";
import Archive from "./pages/Archive";
import Companies from "./pages/Companies";
import SavedPosts from "./pages/SavedPosts";
import NotFound from "./pages/NotFound";
import Settings from "./pages/Settings";
import ScrollToNavigation from "./components/ScrollToNavigation";
import Dashboard from "./pages/Dashboard";
import HourApprovals from "./pages/HourApprovals";
import ReferenceModeration from "./pages/ReferenceModeration";
import VerifyCertificate from "./pages/VerifyCertificate";
import PublicProfile from "./pages/PublicProfile";
import PlacementDetail from "./pages/PlacementDetail";
import EmployerAuth from "./pages/EmployerAuth";
import EmployerOnboarding from "./pages/EmployerOnboarding";
import EmployerWorkspace from "./pages/EmployerWorkspace";
import ResetPassword from "./pages/ResetPassword";
import CompanyVerificationReview from "./pages/CompanyVerificationReview";
import EmployeeEmail from "./pages/EmployeeEmail";
import PublicCompany from "./pages/PublicCompany";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToNavigation />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/jobs/:id/apply" element={<ApplyJob />} />
            <Route path="/post-role" element={<PostRole />} />
            <Route path="/employer/sign-in" element={<EmployerAuth />} />
            <Route path="/employer/register" element={<EmployerAuth />} />
            <Route path="/employer/forgot-password" element={<EmployerAuth />} />
            <Route path="/employer/onboarding" element={<EmployerOnboarding />} />
            <Route path="/employer/employee-details" element={<EmployeeEmail />} />
            <Route path="/employer/verify-work-email" element={<EmployeeEmail />} />
            <Route path="/employer/workspace" element={<EmployerWorkspace />} />
            <Route path="/employer/dashboard" element={<EmployerWorkspace />} />
            <Route path="/employer/employee" element={<EmployerWorkspace />} />
            <Route path="/employer/drafts" element={<EmployerWorkspace />} />
            <Route path="/employer/profile" element={<EmployerWorkspace />} />
            <Route path="/employer/status" element={<EmployerWorkspace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogDetail />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:companyId" element={<PublicCompany />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/about" element={<About />} />
            <Route path="/archive" element={<Archive />} />
            <Route path="/saved-posts" element={<SavedPosts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/:section" element={<Dashboard />} />
            <Route path="/hour-approvals" element={<HourApprovals />} />
            <Route path="/moderation/references" element={<ReferenceModeration />} />
            <Route path="/admin/companies" element={<CompanyVerificationReview />} />
            <Route path="/placements/:id" element={<PlacementDetail />} />
            <Route path="/verify" element={<VerifyCertificate />} />
            <Route path="/verify/:code" element={<VerifyCertificate />} />
            <Route path="/profile/:username" element={<PublicProfile />} />
            <Route path="/p/:username" element={<PublicProfile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
