'use client';

import { HeroSection } from './hero-section';
import { SocialProofSection } from './social-proof-section';
import { FeatureSection } from './feature-section';
import { DeveloperSection } from './developer-section';
import { HowItWorksSection } from './how-it-works-section';
import { TestimonialsSection } from './testimonials-section';
import { PricingSection } from './pricing-section';
import { FAQAccordion } from './faq-accordion';
import { FinalCTASection } from './final-cta-section';

export function LandingContent() {
  return (
    <>
      <HeroSection />
      <SocialProofSection />
      <FeatureSection />
      <DeveloperSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQAccordion />
      <FinalCTASection />
    </>
  );
}
