import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Briefcase, Menu, X, LogOut, FileText, User as UserIcon, ChevronDown, Settings } from "lucide-react";
import { useState } from "react";
import AuthModal from "./AuthModal";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, userType, signOut } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  // Base nav links (Archive removed - now in profile dropdown)
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/jobs", label: "Find Experience" },
    { href: "/success-stories", label: "Success Stories" },
    { href: "/resources", label: "Resources" },
  ];

  const isCompany = userType === "company";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-soft group-hover:shadow-card transition-shadow">
              <Briefcase className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">
              ExpBoard
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === link.href
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="max-w-[120px] truncate text-sm">
                      {user.user_metadata?.full_name || user.email?.split("@")[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background border border-border z-50">
                  <DropdownMenuItem asChild>
                    <Link to="/archive" className="flex items-center gap-2 cursor-pointer">
                      <FileText className="w-4 h-4" />
                      My Applications
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setAuthModalOpen(true)}>
                Sign In
              </Button>
            )}
            {/* Only show Post a Role for company users (not for applicants or when logged out) */}
            {isCompany && (
              <Link to="/post-role">
                <Button variant="hero" size="sm">
                  Post a Role
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.href
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link
                  to="/archive"
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === "/archive"
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <FileText className="w-4 h-4" />
                  My Applications
                </Link>
              )}
              <div className="flex flex-col gap-2 mt-4 px-4">
                {user ? (
                  <Button variant="ghost" className="justify-start" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button variant="ghost" className="justify-start" onClick={() => { setAuthModalOpen(true); setIsMenuOpen(false); }}>
                    Sign In
                  </Button>
                )}
                {isCompany && (
                  <Link to="/post-role" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="hero" className="w-full">Post a Role</Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </nav>
  );
};

export default Navbar;
