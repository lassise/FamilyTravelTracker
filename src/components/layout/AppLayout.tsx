import { ReactNode } from "react";
import Header from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const AppLayout = ({ children, showHeader = true }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {showHeader && <Header />}
      <main>{children}</main>
    </div>
  );
};

export default AppLayout;
