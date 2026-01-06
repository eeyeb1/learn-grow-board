import { Link } from "react-router-dom";
import { Briefcase, Heart } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    platform: [
      { label: "Find Experience", href: "/jobs" },
      { label: "Post a Role", href: "/post" },
      { label: "Companies", href: "/companies" },
      { label: "Resources", href: "/resources" },
    ],
    resources: [
      { label: "How It Works", href: "/how-it-works" },
      { label: "Success Stories", href: "/stories" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      { label: "Community Guidelines", href: "/guidelines" },
      { label: "Terms of Use", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  };

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl">ExpBoard</span>
            </Link>
            <p className="text-background/70 text-sm leading-relaxed mb-4">
              Connecting ambitious learners with companies offering real-world experience opportunities.
            </p>
            <p className="text-sm text-background/50 flex items-center gap-1">
              Made with <Heart className="w-3 h-3 text-secondary fill-secondary" /> for learners everywhere
            </p>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-display font-semibold mb-4">Platform</h4>
            <ul className="space-y-3">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-display font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-display font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-sm text-background/70 hover:text-background transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-background/50">
            © 2024 ExpBoard. All rights reserved.
          </p>
          <p className="text-xs text-background/40">
            All opportunities listed are unpaid, experience-based roles designed for learning.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
