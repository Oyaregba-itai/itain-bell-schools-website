import { GraduationCap, BookOpen, Globe, FlaskConical, Languages, Trophy } from "lucide-react";

const programs = [
  {
    icon: GraduationCap,
    title: "Crèche (3 months – 2 years)",
    description: "A safe, stimulating environment for infants with play-based sensory development and a 3:1 child-to-adult ratio.",
  },
  {
    icon: BookOpen,
    title: "Nursery (2 – 5 years)",
    description: "Montessori-inspired early years programme building literacy, numeracy, creativity and social skills.",
  },
  {
    icon: Globe,
    title: "Primary School (5 – 11 years)",
    description: "A rigorous British–Nigerian curriculum covering English, Mathematics, Sciences, Social Studies and more.",
  },
  {
    icon: FlaskConical,
    title: "STEAM Programme",
    description: "Hands-on Science, Technology, Engineering, Art and Mathematics integrated across all year groups.",
  },
  {
    icon: Languages,
    title: "Languages & Culture",
    description: "French and Yoruba language instruction alongside cultural studies to develop global citizens.",
  },
  {
    icon: Trophy,
    title: "After-School & Clubs",
    description: "Over 25 enrichment clubs including chess, debate, coding, swimming, ballet and football.",
  },
];

const AcademicsSection = () => {
  return (
    <section id="academics" className="py-20 md:py-28 bg-muted/40">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
            Our Programmes
          </span>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">
            Academic Excellence at Every Stage
          </h2>
          <p className="text-muted-foreground">
            From crèche through primary school, our curriculum is designed to challenge,
            inspire and prepare every learner for the next step.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((prog) => (
            <div
              key={prog.title}
              className="bg-card rounded-2xl p-7 shadow-card hover:shadow-elevated transition-shadow group"
            >
              <div className="w-11 h-11 rounded-xl hero-gradient flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <prog.icon className="text-primary-foreground" size={20} />
              </div>
              <h3 className="text-lg font-heading text-foreground mb-2">{prog.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{prog.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AcademicsSection;
