import { ReactNode } from "react";
import Header from "./Header";
import { BottomNav } from "./BottomNav";
import DemoBanner from "@/components/DemoBanner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

const AppLayout = ({ children, showHeader = true, showBottomNav = true }: AppLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoBanner userEmail={user?.email} />
      {showHeader && <Header />}
      <main 
        className={cn(
          "flex-1",
          showBottomNav && "pb-24 md:pb-0" // Extra padding for bottom nav + safe area
        )}
      >
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
