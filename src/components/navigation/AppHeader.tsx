import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import WalletAuthButton from "@/components/auth/WalletAuthButton";

export const AppHeader = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/app/dashboard" },
    { label: "Trades", href: "/app/trades" },
    { label: "Traders", href: "/app/traders" },
    { label: "Contacts", href: "/app/contacts" },
    { label: "Settings", href: "/app/settings" }
  ];

  const handleNavClick = (href: string) => {
    navigate(href);
    setIsMobileMenuOpen(false);
  };

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "bg-background/95 backdrop-blur-lg border-b border-border shadow-lg"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <button onClick={() => navigate('/app/dashboard')}>
              <h2 className="text-2xl font-bold text-foreground">
                OTC<span className="text-primary">ping</span>
              </h2>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  "text-foreground hover:text-primary transition-colors duration-200 font-medium",
                  location.pathname === item.href && "text-primary"
                )}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Desktop Auth */}
          <div className="hidden lg:flex items-center">
            <WalletAuthButton />
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 text-foreground hover:text-primary transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6 text-primary" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-background/95 backdrop-blur-lg border-b border-border shadow-lg">
            <nav className="flex flex-col space-y-4 p-6">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.href)}
                  className={cn(
                    "text-left text-foreground hover:text-primary transition-colors duration-200 font-medium py-2",
                    location.pathname === item.href && "text-primary"
                  )}
                >
                  {item.label}
                </button>
              ))}
              
              <div className="pt-4 border-t border-border">
                <WalletAuthButton />
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};