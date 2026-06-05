import { Building2, Waves, TreePine, MonitorPlay, Utensils, ShieldCheck } from "lucide-react";

const facilities = [
  { icon: Building2,   title: "Modern Classrooms",      description: "Spacious, air-conditioned classrooms with interactive whiteboards and age-appropriate furniture.", iconBg: "bg-blue-50 dark:bg-blue-900/20", iconColor: "text-blue-600 dark:text-blue-400" },
  { icon: Waves,       title: "Swimming Pool",           description: "A supervised, child-friendly pool for swimming lessons and recreational activities.",                iconBg: "bg-cyan-50 dark:bg-cyan-900/20",  iconColor: "text-cyan-600 dark:text-cyan-400" },
  { icon: TreePine,    title: "Outdoor Play Areas",      description: "Secure playgrounds with soft-fall surfaces, climbing frames, sandpits and open green spaces.",      iconBg: "bg-emerald-50 dark:bg-emerald-900/20", iconColor: "text-emerald-600 dark:text-emerald-400" },
  { icon: MonitorPlay, title: "ICT & STEAM Lab",         description: "A dedicated computer lab with tablets, robotics kits and science equipment for hands-on learning.", iconBg: "bg-violet-50 dark:bg-violet-900/20", iconColor: "text-violet-600 dark:text-violet-400" },
  { icon: Utensils,    title: "Kitchen & Dining",        description: "Nutritious, freshly prepared meals daily with menus that cater to all dietary needs and allergies.",  iconBg: "bg-amber-50 dark:bg-amber-900/20",  iconColor: "text-amber-600 dark:text-amber-500" },
  { icon: ShieldCheck, title: "Safety & Security",       description: "24/7 CCTV monitoring, visitor management systems and trained security personnel on campus.",          iconBg: "bg-rose-50 dark:bg-rose-900/20",    iconColor: "text-rose-600 dark:text-rose-400" },
];

const FacilitiesSection = () => (
  <section id="facilities" className="py-20 md:py-28">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Our Campus</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">World-Class Facilities</h2>
        <p className="text-muted-foreground">
          Our campus is purpose-built to provide a safe, inspiring environment where children learn, play and grow.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {facilities.map(fac => (
          <div key={fac.title}
            className="bg-card rounded-2xl p-7 shadow-card hover:shadow-elevated transition-all border border-border/40 group">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${fac.iconBg} group-hover:scale-110 transition-transform`}>
              <fac.icon className={fac.iconColor} size={20} />
            </div>
            <h3 className="text-lg font-heading text-foreground mb-2">{fac.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{fac.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FacilitiesSection;
