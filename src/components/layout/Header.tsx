import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import { Logo } from "@/components/common/Logo";
import {
  Plus,
  Menu,
  User,
  LogOut,
  Settings,
  Map,
  Luggage,
  Globe,
  PlaneTakeoff,
  Bell,
  Sparkles,
  Plane,
  Crown
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";

const Header = () => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    navigate("/auth");
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Primary nav - main features (premium = paid feature)
  const primaryLinks = [
    { href: "/", label: "Dashboard", icon: Globe, premium: false },
    { href: "/family", label: "Travel Tracker", icon: Map, premium: false },
    { href: "/flights", label: "Flights", icon: PlaneTakeoff, premium: true },
    { href: "/trips/new", label: "AI Travel Planner", icon: Sparkles, premium: true },
  ];

  // Trip planning links
  const tripPlanningLinks = [
    { href: "/saved-flights", label: "Saved Flights", icon: Bell, premium: true },
    { href: "/explore", label: "Explore Destinations", icon: Map, premium: false },
  ];

  // Profile links
  const profileLinks = [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-gradient-hero flex items-center justify-center">
            <Plane className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg text-foreground">
            Family Travel Tracker
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive(link.href)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
            >
              {link.label}
              {link.premium && <Crown className="h-4 w-4 text-amber-500" />}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Hamburger Menu - Combined menu for all screens */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                {user ? (
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-background rounded-full flex items-center justify-center">
                      <Menu className="h-2 w-2 text-muted-foreground" />
                    </div>
                  </div>
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader className="text-left pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-hero flex items-center justify-center">
                    <Plane className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span>Family Travel Tracker</span>
                </SheetTitle>
              </SheetHeader>

              {user && (
                <div className="flex items-center gap-3 py-4 border-b border-border">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(profile?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">
                      {profile?.full_name || "User"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.email}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-1 py-4">
                {/* Primary Nav Links */}
                <p className="text-xs font-medium text-muted-foreground px-3 mb-1">Explore</p>
                {primaryLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <button
                      key={link.href}
                      onClick={() => handleNavigate(link.href)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isActive(link.href)
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="flex-1 text-left">{link.label}</span>
                      {link.premium && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                    </button>
                  );
                })}

                {user && (
                  <>
                    <Separator className="my-3" />

                    {/* Trip Planning Links */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-1">Trip Planning</p>
                    {tripPlanningLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.href}
                          onClick={() => handleNavigate(link.href)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isActive(link.href)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1 text-left">{link.label}</span>
                          {link.premium && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
                        </button>
                      );
                    })}

                    <Separator className="my-3" />

                    {/* Profile Links */}
                    <p className="text-xs font-medium text-muted-foreground px-3 mb-1">Account</p>
                    {profileLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <button
                          key={link.href}
                          onClick={() => handleNavigate(link.href)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left ${isActive(link.href)
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            }`}
                        >
                          <Icon className="h-5 w-5" />
                          {link.label}
                        </button>
                      );
                    })}

                    <Separator className="my-3" />

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 w-full text-left"
                    >
                      <LogOut className="h-5 w-5" />
                      Sign out
                    </button>
                  </>
                )}

                {!user && (
                  <>
                    <Separator className="my-3" />
                    <Button
                      onClick={() => handleNavigate("/auth")}
                      className="w-full"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
