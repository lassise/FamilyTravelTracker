import { ReactNode } from "react";
import Header from "./Header";
import { BottomNav } from "./BottomNav";
import DemoBanner from "@/components/DemoBanner";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showBottomNav?: boolean;
}

const AppLayout = ({ children, showHeader = true, showBottomNav = true }: AppLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner userEmail={user?.email} />
      {showHeader && <Header />}
      <main className={showBottomNav ? "pb-20 md:pb-0" : ""}>{children}</main>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
