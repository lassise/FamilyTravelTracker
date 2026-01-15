import { Globe, PlaneTakeoff, Sparkles, Map } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/family", label: "Countries", icon: Globe },
  { href: "/flights", label: "Flights", icon: PlaneTakeoff },
  { href: "/trips/new", label: "Plan Trip", icon: Sparkles },
  { href: "/family?tab=memories", label: "Memories", icon: Map },
];

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === "/trips" && location.pathname === "/trips") return true;
    if (path === "/trips/new" && location.pathname === "/trips/new") return true;
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-lg transition-all duration-200",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                active && "bg-primary/15"
              )}>
                <Icon className={cn(
                  "h-5 w-5 transition-transform",
                  active && "scale-110"
                )} />
              </div>
              <span className={cn(
                "text-[10px] font-medium leading-none",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
