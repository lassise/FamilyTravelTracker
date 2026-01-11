import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

interface DemoBannerProps {
  userEmail?: string | null;
}

const DEMO_EMAIL = "demo@familyonthefly.app";

const DemoBanner = ({ userEmail }: DemoBannerProps) => {
  const navigate = useNavigate();
  
  const isDemo = userEmail === DEMO_EMAIL;

  if (!isDemo) return null;

  return (
    <div className="bg-gradient-to-r from-primary to-secondary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 py-2.5 text-sm">
          <Sparkles className="h-4 w-4 flex-shrink-0" />
          <span>You're viewing sample data.</span>
          <button
            onClick={() => navigate("/auth?mode=signup")}
            className="font-semibold underline underline-offset-2 hover:no-underline transition-all"
          >
            Create your free account
          </button>
          <span>to track your own adventures!</span>
        </div>
      </div>
    </div>
  );
};

export default DemoBanner;
