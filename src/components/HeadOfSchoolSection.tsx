import { Quote } from "lucide-react";
import headOfSchoolImg from "@/assets/head-of-school.jpg";

const HeadOfSchoolSection = () => (
  <section className="py-20 md:py-28 bg-muted/30">
    <div className="container">
      <div className="text-center max-w-xl mx-auto mb-14">
        <span className="text-secondary font-semibold text-sm uppercase tracking-wider">Our Leadership</span>
        <h2 className="text-3xl md:text-4xl font-heading text-foreground mt-3">
          Meet Our Head of School
        </h2>
      </div>

      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-3xl shadow-elevated overflow-hidden">
          <div className="grid md:grid-cols-5">
            {/* Photo */}
            <div className="md:col-span-2 relative">
              <img
                src={headOfSchoolImg}
                alt="Mrs Itai Joy Onize — Head of School"
                className="w-full h-72 md:h-full object-cover object-top"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent md:bg-gradient-to-r" />
            </div>

            {/* Content */}
            <div className="md:col-span-3 p-8 md:p-12 flex flex-col justify-center">
              <Quote size={36} className="text-primary/20 mb-4" />
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed italic mb-8">
                "At Itain-Bell Schools, we believe every child carries within them an extraordinary potential.
                Our mission is to create a nurturing environment where that potential is not just recognised
                but deliberately cultivated — through excellent teaching, compassionate care, and a
                curriculum that prepares children for life, not just examinations."
              </p>

              <div>
                <div className="w-12 h-1 hero-gradient rounded-full mb-4" />
                <p className="text-xl font-heading text-foreground">Mrs Itai Joy Onize</p>
                <p className="text-secondary font-semibold text-sm mt-1">Head of School & Administrator</p>
                <p className="text-muted-foreground text-sm mt-2">
                  Itain-Bell Schools, Oregun, Ikeja, Lagos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default HeadOfSchoolSection;
