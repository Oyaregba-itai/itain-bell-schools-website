import { Link } from "react-router-dom";
import { GraduationCap, BookOpen, Shield, ArrowRight } from "lucide-react";

const portals = [
  {
    icon: GraduationCap,
    label: "Parents",
    desc: "Track your child's results, report cards, upcoming events and school announcements in one place.",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  {
    icon: BookOpen,
    label: "Teachers",
    desc: "Upload results, manage your class roster, review report cards and communicate with parents.",
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
  },
  {
    icon: Shield,
    label: "Administrators",
    desc: "Full school management — students, staff, results, admissions, announcements and reports.",
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
  },
];

const PortalCTA = () => (
  <section className="py-20 md:py-28 bg-muted/40">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Digital School Portal</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">Everything in One Place</h2>
        <p className="text-muted-foreground">
          Our secure online portal keeps parents, teachers and administrators connected — anytime, anywhere.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-10">
        {portals.map(p => (
          <div key={p.label}
            className={`bg-card rounded-2xl p-7 shadow-card hover:shadow-elevated transition-all border ${p.border} group`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${p.iconBg} group-hover:scale-110 transition-transform`}>
              <p.icon size={22} className={p.iconColor} />
            </div>
            <h3 className="font-heading text-lg text-foreground mb-2">{p.label} Portal</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center">
        <Link to="/login"
          className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl hero-gradient text-white font-semibold text-base hover:opacity-90 transition-opacity shadow-elevated">
          Access the Portal <ArrowRight size={18} />
        </Link>
        <p className="text-xs text-muted-foreground mt-3">Accounts are provided by the school. Contact us to get started.</p>
      </div>
    </div>
  </section>
);

export default PortalCTA;
