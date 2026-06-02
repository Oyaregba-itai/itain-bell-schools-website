import activitiesImage from "@/assets/activities.jpg";

const AdmissionsCTA = () => {
  return (
    <section id="admissions" className="py-20 md:py-28">
      <div className="container">
        <div className="relative rounded-3xl overflow-hidden">
          <img
            src={activitiesImage}
            alt="Children enjoying school activities"
            className="w-full h-full object-cover absolute inset-0"
            loading="lazy"
            width={800}
            height={600}
          />
          <div className="absolute inset-0 hero-gradient opacity-85" />

          <div className="relative px-8 py-16 md:py-24 text-center max-w-2xl mx-auto">
            <span className="inline-block px-3 py-1 rounded-full bg-primary-foreground/15 text-primary-foreground text-sm font-medium mb-4">
              2025/2026 Admissions Open
            </span>
            <h2 className="text-3xl md:text-4xl font-heading text-primary-foreground mb-4">
              Give Your Child the Best Start
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-lg mx-auto">
              Crèche, Nursery and Primary places are available. Join our community of
              learners and start your child's journey today.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href="/admissions"
                className="px-8 py-3.5 rounded-lg bg-primary-foreground text-primary font-semibold hover:bg-primary-foreground/90 transition-colors"
              >
                Start Application
              </a>
              <a
                href="#contact"
                className="px-8 py-3.5 rounded-lg border border-primary-foreground/30 text-primary-foreground font-semibold hover:bg-primary-foreground/10 transition-colors"
              >
                Schedule a Tour
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdmissionsCTA;
