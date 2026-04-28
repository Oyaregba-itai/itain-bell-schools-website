import { MapPin, Phone, Mail, Clock } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const Footer = () => {
  return (
    <footer id="contact" className="bg-foreground text-primary-foreground">
      <div className="container py-16 md:py-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src={schoolLogo} alt="School Logo" className="h-9 w-auto" />
              <span className="font-heading text-lg">Itain‑Bell Schools</span>
            </div>
            <p className="text-primary-foreground/60 text-sm leading-relaxed">
              Getting better every day in every way. Providing quality education since 2010.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/60">
              {["Home", "About Us", "Academics", "Admissions", "Facilities", "News & Events"].map(
                (link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-primary-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-heading text-lg mb-4">Programs</h4>
            <ul className="space-y-2.5 text-sm text-primary-foreground/60">
              {["Crèche", "Nursery", "Primary School", "After-School Clubs", "Holiday Camp"].map(
                (link) => (
                  <li key={link}>
                    <a href="#" className="hover:text-primary-foreground transition-colors">
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-lg mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/60">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>Lagos, Nigeria</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0" />
                <span>+234 (0) 000 000 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0" />
                <span>info@itainbellschool.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock size={16} className="shrink-0" />
                <span>Mon – Fri, 7:30 AM – 4:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 mt-12 pt-8 text-center text-sm text-primary-foreground/40">
          © {new Date().getFullYear()} Itain‑Bell Schools. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
