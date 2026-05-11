import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { ShaderBackground } from "@/components/landing/ShaderBackground";
import { SampleShowcase } from "@/components/landing/SampleShowcase";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Benefits } from "@/components/landing/Benefits";
import { Differentiation } from "@/components/landing/Differentiation";
import { Testimonials } from "@/components/landing/Testimonials";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "Nakshatra — Wedding Biodatas, On One Link",
  description:
    "Stop sending PDFs in WhatsApp groups. Fill our form, get a single shareable link, edit anytime. Designed in your rashi's colors and constellation. Built for Indian arranged marriages.",
  keywords: [
    "wedding biodata",
    "Indian biodata",
    "arranged marriage biodata",
    "online biodata",
    "rashi biodata",
    "WhatsApp biodata",
    "biodata maker",
    "shaadi biodata",
  ],
  openGraph: {
    title: "Nakshatra — Wedding Biodatas, On One Link",
    description:
      "Fill a form, get a shareable link, edit anytime. Designed in your rashi's colors. Built for Indian arranged marriages.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="landing-root">
      <ShaderBackground />
      <Header />
      <main>
        <Hero />
        <SampleShowcase />
        <HowItWorks />
        <Benefits />
        <Differentiation />
        <Testimonials />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
