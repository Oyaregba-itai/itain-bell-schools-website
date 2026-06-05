import { GraduationCap, BookOpen, Globe, FlaskConical, Languages, Trophy } from "lucide-react";

const programs = [
  { icon: GraduationCap, title: "Crèche",          subtitle: "3 months – 2 years", description: "A safe, stimulating environment with play-based sensory development and a 3:1 child-to-adult ratio.", color: "from-pink-500 to-rose-600" },
  { icon: BookOpen,      title: "Nursery",          subtitle: "2 – 5 years",        description: "Montessori-inspired early years building literacy, numeracy, creativity and social skills.",              color: "from-violet-500 to-purple-600" },
  { icon: Globe,         title: "Primary School",   subtitle: "5 – 11 years",       description: "A rigorous British–Nigerian curriculum covering English, Mathematics, Sciences and more.",                color: "from-blue-500 to-indigo-600" },
  { icon: FlaskConical,  title: "STEAM Programme",  subtitle: "All year groups",     description: "Hands-on Science, Technology, Engineering, Art and Maths integrated across all classes.",               color: "from-cyan-500 to-teal-600" },
  { icon: Languages,     title: "Languages",        subtitle: "French & Yoruba",     description: "French and Yoruba instruction alongside cultural studies to develop global citizens.",                   color: "from-emerald-500 to-green-600" },
  { icon: Trophy,        title: "Clubs & Activities", subtitle: "25+ options",       description: "Chess, debate, coding, swimming, ballet and football — something for every child.",                      color: "from-amber-500 to-orange-600" },
];

const AcademicsSection = () => (
  <section id="academics" className="py-20 md:py-28 bg-muted/40">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Our Programmes</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">Academic Excellence at Every Stage</h2>
        <p className="text-muted-foreground">
          From crèche through primary school, our curriculum is designed to challenge, inspire and prepare every learner.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map(prog => (
          <div key={prog.title}
            className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all group">
            <div className={`h-2 bg-gradient-to-r ${prog.color}`} />
            <div className="p-7">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${prog.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <prog.icon className="text-white" size={20} />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{prog.subtitle}</p>
              <h3 className="text-lg font-heading text-foreground mb-2">{prog.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{prog.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default AcademicsSection;
