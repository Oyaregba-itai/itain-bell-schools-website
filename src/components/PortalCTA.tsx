import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, Shield, ArrowRight } from "lucide-react";

const portals = [
  { icon: GraduationCap, label: "Parents", desc: "Track your child's results, upcoming events and school announcements in one place.", color: "bg-green-50 text-green-700 dark:bg-green-900/20" },
  { icon: BookOpen, label: "Teachers", desc: "Upload results, manage your class roster and communicate with parents seamlessly.", color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20" },
  { icon: Shield, label: "Admin", desc: "Full school management — students, staff, results, admissions and reports.", color: "bg-purple-50 text-purple-700 dark:bg-purple-900/20" },
];

const PortalCTA = () => (
  <section className="py-20 md:py-28">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Digital School Portal</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">Everything in One Place</h2>
        <p className="text-muted-foreground">Our school portal keeps parents, teachers and administrators connected — results, messages, events and more.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {portals.map(p => (
          <div key={p.label} className="bg-card rounded-2xl p-7 shadow-card hover:shadow-elevated transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${p.color}`}>
              <p.icon size={22} />
            </div>
            <h3 className="font-heading text-lg text-foreground mb-2">{p.label} Portal</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link to="/login"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl hero-gradient text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-elevated">
          Access the Portal <ArrowRight size={18} />
        </Link>
        <p className="text-xs text-muted-foreground mt-3">Accounts are created by the school administrator. Contact us to get started.</p>
      </div>
    </div>
  </section>
);

export default PortalCTA;
