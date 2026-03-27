import { Building2, Waves, TreePine, MonitorPlay, Utensils, ShieldCheck } from "lucide-react";

const facilities = [
  {
    icon: Building2,
    title: "Modern Classrooms",
    description: "Spacious, air-conditioned classrooms fitted with interactive whiteboards and age-appropriate furniture.",
  },
  {
    icon: Waves,
    title: "Swimming Pool",
    description: "A supervised, child-friendly pool for swimming lessons and recreational activities.",
  },
  {
    icon: TreePine,
    title: "Outdoor Play Areas",
    description: "Secure playgrounds with soft-fall surfaces, climbing frames, sandpits and open green spaces.",
  },
  {
    icon: MonitorPlay,
    title: "ICT & STEAM Lab",
    description: "A dedicated computer lab and STEAM workshop with tablets, robotics kits and science equipment.",
  },
  {
    icon: Utensils,
    title: "School Kitchen & Dining",
    description: "Nutritious, freshly prepared meals daily with menus that cater to dietary needs and allergies.",
  },
  {
    icon: ShieldCheck,
    title: "Safety & Security",
    description: "24/7 CCTV monitoring, visitor management systems and trained security personnel on campus.",
  },
];

const FacilitiesSection = () => {
  return (
    <section id="facilities" className="py-20 md:py-28">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
            Our Campus
          </span>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">
            World-Class Facilities
          </h2>
          <p className="text-muted-foreground">
            Our campus is purpose-built to provide a safe, inspiring environment where
            children can learn, play and grow.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((fac) => (
            <div
              key={fac.title}
              className="bg-card rounded-2xl p-7 shadow-card hover:shadow-elevated transition-shadow group border border-border/50"
            >
              <div className="w-11 h-11 rounded-xl green-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <fac.icon className="text-primary-foreground" size={20} />
              </div>
              <h3 className="text-lg font-heading text-foreground mb-2">{fac.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{fac.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FacilitiesSection;
