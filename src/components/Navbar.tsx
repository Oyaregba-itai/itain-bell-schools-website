import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const navLinks = [
  { label: "Home", href: "#" },
  { label: "About", href: "#about" },
  { label: "Academics", href: "#academics" },
  { label: "Admissions", href: "#admissions" },
  { label: "Facilities", href: "#facilities" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16 md:h-20">
        <a href="#" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center">
            <span className="text-primary-foreground font-heading text-lg">IB</span>
          </div>
          <span className="font-heading text-xl text-foreground">Itain‑Bell Schools</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg hero-gradient text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <LogIn size={16} /> Portal Login
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 text-foreground"
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-card border-t border-border px-6 py-4 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#admissions"
            className="block px-5 py-2.5 rounded-lg hero-gradient text-primary-foreground text-sm font-semibold text-center"
          >
            Apply Now
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
