import { ReactNode } from "react";
import Header from "./Header";
import { BottomNav } from "./BottomNav";
import Footer from "./Footer";
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
      <main className="flex-1">
        {children}
      </main>
      <div className={showBottomNav ? "pb-24 md:pb-0" : ""}>
        <Footer />
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
