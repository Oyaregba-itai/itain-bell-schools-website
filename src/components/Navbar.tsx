import { useState, useEffect } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import schoolLogo from "@/assets/school-logo.png";

const navLinks = [
  { label: "Home",       href: "#" },
  { label: "About",      href: "#about" },
  { label: "Academics",  href: "#academics" },
  { label: "Admissions", href: "#admissions" },
  { label: "Facilities", href: "#facilities" },
  { label: "Contact",    href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-card/95 backdrop-blur-md shadow-sm border-b border-border" : "bg-transparent"}`}>
      <div className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2.5 flex-shrink-0">
          <img src={schoolLogo} alt="Itain-Bell Schools" className="h-10 md:h-12 w-auto" />
          <span className={`font-heading text-lg md:text-xl transition-colors ${scrolled ? "text-foreground" : "text-white"}`}>
            Itain‑Bell Schools
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map(link => (
            <a key={link.label} href={link.href}
              className={`text-sm font-medium transition-colors hover:text-primary ${scrolled ? "text-muted-foreground" : "text-white/80 hover:text-white"}`}>
              {link.label}
            </a>
          ))}
          <Link to="/login"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg hero-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md">
            <LogIn size={15} /> Portal Login
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} aria-label="Toggle menu"
          className={`md:hidden p-2 rounded-lg transition-colors ${scrolled ? "text-foreground hover:bg-muted" : "text-white hover:bg-white/10"}`}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden bg-card border-t border-border shadow-lg">
          <div className="px-5 py-4 space-y-1">
            {navLinks.map(link => (
              <a key={link.label} href={link.href} onClick={() => setOpen(false)}
                className="flex items-center h-10 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted rounded-lg px-3 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <div className="px-5 pb-5 space-y-2.5 border-t border-border pt-4">
            <a href="#admissions" onClick={() => setOpen(false)}
              className="flex items-center justify-center h-11 rounded-xl bg-secondary/10 text-secondary text-sm font-semibold hover:bg-secondary/20 transition-colors">
              Apply for Admission
            </a>
            <Link to="/login" onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 h-11 rounded-xl hero-gradient text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              <LogIn size={15} /> Portal Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
