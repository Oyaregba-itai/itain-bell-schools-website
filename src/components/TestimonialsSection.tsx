import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Mrs. Adeyemi",
    role: "Parent — Year 3",
    quote: "Itain-Bell has transformed my daughter's love for learning. The teachers are dedicated, the environment is safe, and the results speak for themselves.",
    stars: 5,
    initials: "MA",
    color: "bg-blue-100 text-blue-700",
  },
  {
    name: "Mr. Okonkwo",
    role: "Parent — Nursery",
    quote: "From the moment we visited the school, we knew it was the right choice. Our son has grown so much — academically and socially.",
    stars: 5,
    initials: "FO",
    color: "bg-green-100 text-green-700",
  },
  {
    name: "Mrs. Bakare",
    role: "Parent — Year 5",
    quote: "The British-Nigerian curriculum gives our children the best of both worlds. The staff genuinely care about every child's progress.",
    stars: 5,
    initials: "CB",
    color: "bg-purple-100 text-purple-700",
  },
];

const TestimonialsSection = () => (
  <section className="py-20 md:py-28 bg-muted/30">
    <div className="container">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">What Parents Say</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">Trusted by Families Across Lagos</h2>
        <p className="text-muted-foreground">Our parents' satisfaction and their children's growth are our greatest achievements.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {testimonials.map(t => (
          <div key={t.name} className="bg-card rounded-2xl p-7 shadow-card flex flex-col gap-4 hover:shadow-elevated transition-shadow">
            <div className="flex gap-1">
              {Array.from({ length: t.stars }).map((_, i) => (
                <Star key={i} size={16} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed flex-1">"{t.quote}"</p>
            <div className="flex items-center gap-3 pt-2 border-t border-border">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${t.color}`}>
                {t.initials}
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsSection;
