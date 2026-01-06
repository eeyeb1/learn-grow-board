import { Card } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export interface CompanyCardProps {
  id: string;
  name: string;
  logo?: string;
  industry: string;
  openRoles: number;
  description: string;
}

const CompanyCard = ({
  id,
  name,
  logo,
  industry,
  openRoles,
  description,
}: CompanyCardProps) => {
  return (
    <Link to={`/companies/${id}`}>
      <Card className="p-6 hover:shadow-elevated transition-all duration-300 cursor-pointer group border-border/50 hover:border-primary/30 bg-card text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
          {logo ? (
            <img
              src={logo}
              alt={name}
              className="w-full h-full object-cover rounded-2xl"
            />
          ) : (
            <Building2 className="w-8 h-8 text-muted-foreground" />
          )}
        </div>

        {/* Company Name */}
        <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>

        {/* Industry */}
        <p className="text-sm text-muted-foreground mt-1">{industry}</p>

        {/* Description */}
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {description}
        </p>

        {/* Open Roles */}
        <div className="mt-4 pt-4 border-t border-border">
          <span className="text-sm font-medium text-primary">
            {openRoles} open {openRoles === 1 ? "role" : "roles"}
          </span>
        </div>
      </Card>
    </Link>
  );
};

export default CompanyCard;
