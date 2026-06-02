import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import AcademicsSection from "@/components/AcademicsSection";
import AdmissionsCTA from "@/components/AdmissionsCTA";
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
      <AdmissionsCTA />
      <FacilitiesSection />
      <EventsSection />
      <Footer />
    </div>
  );
};

export default Index;
