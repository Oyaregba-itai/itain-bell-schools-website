import { BookOpen, Shield, Globe, Music } from "lucide-react";
import classroomImage from "@/assets/classroom.jpg";

const features = [
  {
    icon: BookOpen,
    label: "Montessori Roots",
    title: "Early Years that Inspire",
    description:
      "Play‑based learning that develops social, emotional and cognitive skills from the earliest years.",
  },
  {
    icon: Shield,
    label: "Personalized Care",
    title: "Child to Adult Ratio",
    description:
      "From 3:1 for infants to 10:1 for older children — every student receives focused attention and safety.",
  },
  {
    icon: Globe,
    label: "British–Nigerian",
    title: "Strong Academic Pathway",
    description:
      "Blending the best of both curricula to ensure global readiness and well‑rounded development.",
  },
  {
    icon: Music,
    label: "Whole Child",
    title: "Beyond the Classroom",
    description:
      "Music, sports, STEAM, languages and leadership opportunities to nurture every talent.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="about" className="py-20 md:py-28 warm-overlay">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-secondary font-semibold text-sm uppercase tracking-wider">
            Why Itain‑Bell
          </span>
          <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3 mb-4">
            Where Every Child Thrives
          </h2>
          <p className="text-muted-foreground">
            Our approach combines Montessori principles with a rigorous British–Nigerian curriculum,
            creating well‑rounded learners prepared for the future.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feat) => (
            <div
              key={feat.title}
              className="bg-card rounded-2xl p-8 shadow-card hover:shadow-elevated transition-shadow group"
            >
              <div className="w-12 h-12 rounded-xl hero-gradient flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <feat.icon className="text-primary-foreground" size={22} />
              </div>
              <span className="text-secondary font-semibold text-xs uppercase tracking-wider">
                {feat.label}
              </span>
              <h3 className="text-xl font-heading text-foreground mt-1 mb-3">{feat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feat.description}</p>
            </div>
          ))}
        </div>

        {/* Image accent */}
        <div className="mt-12 rounded-2xl overflow-hidden shadow-elevated">
          <img
            src={classroomImage}
            alt="Students learning in classroom"
            className="w-full h-64 md:h-80 object-cover"
            loading="lazy"
            width={800}
            height={600}
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
