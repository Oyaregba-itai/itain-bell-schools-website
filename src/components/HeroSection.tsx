import { useState, useEffect, useCallback } from "react";
import heroSchool from "@/assets/hero-school.jpg";
import heroClassroom from "@/assets/hero-classroom.jpg";
import heroSports from "@/assets/hero-sports.jpg";
import heroCampus from "@/assets/hero-campus.jpg";

const slides = [
  { src: heroSchool, alt: "Itain-Bell Schools campus" },
  { src: heroClassroom, alt: "Students learning in classroom" },
  { src: heroSports, alt: "Students playing sports" },
  { src: heroCampus, alt: "School building exterior" },
];

const HeroSection = () => {
  const [current, setCurrent] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrent(index);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [isTransitioning]);

  useEffect(() => {
    const timer = setInterval(() => {
      goTo((current + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [current, goTo]);

  return (
    <section className="relative pt-20 md:pt-24 overflow-hidden">
      {/* Slideshow background */}
      <div className="absolute inset-0">
        {slides.map((slide, i) => (
          <img
            key={slide.alt}
            src={slide.src}
            alt={slide.alt}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
            width={1920}
            height={1080}
            loading={i === 0 ? undefined : "lazy"}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/60 to-foreground/30" />
      </div>

      <div className="relative container py-24 md:py-36 lg:py-44">
        <div className="max-w-2xl space-y-6">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/20 text-secondary text-sm font-semibold backdrop-blur-sm border border-secondary/30">
            Welcome to Itain‑Bell Schools
          </span>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading text-primary-foreground leading-tight">
            Getting better every day in every way.
          </h1>

          <p className="text-lg text-primary-foreground/80 font-body max-w-xl">
            We provide a safe, happy environment where every child builds strong
            academic foundations and essential life skills.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a
              href="#admissions"
              className="px-7 py-3.5 rounded-lg hero-gradient text-primary-foreground font-semibold hover:opacity-90 transition-opacity shadow-elevated"
            >
              Apply Now
            </a>
            <a
              href="#contact"
              className="px-7 py-3.5 rounded-lg bg-primary-foreground/10 text-primary-foreground font-semibold backdrop-blur-sm border border-primary-foreground/20 hover:bg-primary-foreground/20 transition-colors"
            >
              Book a Visit
            </a>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-6">
            <div className="text-center">
              <div className="text-3xl font-heading text-primary-foreground">25+</div>
              <div className="text-sm text-primary-foreground/70">Clubs & Activities</div>
            </div>
            <div className="w-px bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-3xl font-heading text-primary-foreground">2010</div>
              <div className="text-sm text-primary-foreground/70">Year Established</div>
            </div>
            <div className="w-px bg-primary-foreground/20" />
            <div className="text-center">
              <div className="text-3xl font-heading text-primary-foreground">3:1</div>
              <div className="text-sm text-primary-foreground/70">Min. Child Ratio</div>
            </div>
          </div>
        </div>

        {/* Slideshow indicators */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === current
                  ? "bg-secondary w-8"
                  : "bg-primary-foreground/40 hover:bg-primary-foreground/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
