import { ReactNode } from "react";
import Header from "./Header";
import DemoBanner from "@/components/DemoBanner";
import { useAuth } from "@/hooks/useAuth";

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const AppLayout = ({ children, showHeader = true }: AppLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <DemoBanner userEmail={user?.email} />
      {showHeader && <Header />}
      <main>{children}</main>
    </div>
  );
};

export default AppLayout;
