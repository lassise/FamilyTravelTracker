import { Map, Sparkles, PlaneTakeoff, Wand2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/family?tab=countries", label: "Countries", icon: Map },
  { href: "/family?tab=memories", label: "Memories", icon: Sparkles },
  { href: "/flights", label: "Flights", icon: PlaneTakeoff },
  { href: "/trips/new", label: "AI Planner", icon: Wand2 },
];

export function BottomNav() {
  const location = useLocation();
  
  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    const currentPath = location.pathname;
    const currentSearch = location.search;
    
    if (path !== currentPath) return false;
    
    if (query) {
      return currentSearch.includes(query);
    }
    
    return !currentSearch.includes('tab=');
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-background/95 backdrop-blur-lg border-t border-border"
      style={{ 
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        position: 'fixed',
        willChange: 'transform',
      }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 py-2 px-1 rounded-lg transition-all duration-200 touch-manipulation",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground active:text-foreground"
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
