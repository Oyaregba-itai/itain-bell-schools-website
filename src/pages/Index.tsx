import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AcademicsSection from "@/components/AcademicsSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import AdmissionsCTA from "@/components/AdmissionsCTA";
import PortalCTA from "@/components/PortalCTA";
import FacilitiesSection from "@/components/FacilitiesSection";
import EventsSection from "@/components/EventsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <AcademicsSection />
      <TestimonialsSection />
      <AdmissionsCTA />
      <PortalCTA />
      <FacilitiesSection />
      <EventsSection />
      <Footer />
    </div>
  );
};

export default Index;
