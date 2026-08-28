import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Images,
  Link2,
  MessageCircle,
  PencilLine,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Nakshatra - Digital Marriage Portfolio",
  description:
    "Create and share your marriage introduction, photos, family details, and horoscope in one clear, mobile-friendly portfolio.",
};

const steps = [
  {
    number: "01",
    title: "Create your portfolio",
    body: "Add your story, personal details, photographs, family background, and horoscope in one guided form.",
  },
  {
    number: "02",
    title: "Preview and verify",
    body: "Review how it looks and complete identity verification when you are ready to publish.",
  },
  {
    number: "03",
    title: "Share one link",
    body: "Send your mobile-friendly portfolio through WhatsApp, email, or any channel your family prefers.",
  },
  {
    number: "04",
    title: "Review interest",
    body: "See introductions in your dashboard and decide who receives Full View access.",
  },
] as const;

const benefits = [
  {
    icon: Link2,
    title: "Everything together",
    body: "Your introduction, photographs, family details, and horoscope stay organised in one place.",
  },
  {
    icon: Smartphone,
    title: "Easy on every phone",
    body: "Clear text, familiar navigation, and comfortable reading for individuals and families.",
  },
  {
    icon: RefreshCw,
    title: "One link that stays current",
    body: "Update your portfolio without creating and sending another file.",
  },
  {
    icon: BadgeCheck,
    title: "Verified before publishing",
    body: "An identity check supports more genuine marriage introductions.",
  },
  {
    icon: MessageCircle,
    title: "Interest in one place",
    body: "Review introductions and take clear actions from your dashboard.",
  },
  {
    icon: UserCheck,
    title: "Share the right amount",
    body: "Choose the first view and approve Full View when you are comfortable.",
  },
] as const;

const indiaPlans = [
  {
    duration: "4 months",
    price: "₹1,600",
    rate: "₹400 per month",
    note: "A focused start",
    recommended: false,
  },
  {
    duration: "7 months",
    price: "₹2,450",
    rate: "₹350 per month",
    note: "Recommended for most families",
    recommended: true,
  },
  {
    duration: "14 months",
    price: "₹4,200",
    rate: "₹300 per month",
    note: "The longest access",
    recommended: false,
  },
] as const;

const internationalPlans = [
  { duration: "4 months", price: "$24", rate: "$6 per month" },
  { duration: "7 months", price: "$35", rate: "$5 per month" },
  { duration: "14 months", price: "$56", rate: "$4 per month" },
] as const;

const faqs = [
  {
    question: "Is Nakshatra a matchmaking website?",
    answer:
      "No. Nakshatra helps you create and share your own marriage portfolio. It does not provide a public matchmaking feed.",
  },
  {
    question: "Can I preview my portfolio before paying?",
    answer:
      "Yes. You can create and review your portfolio before choosing a publishing period.",
  },
  {
    question: "Can I update it after publishing?",
    answer:
      "Yes. Your updates appear on the same link, so you do not need to create or send another file.",
  },
  {
    question: "What can viewers see?",
    answer:
      "Viewers first see the mode you selected. Full View becomes available only after you approve their interest.",
  },
  {
    question: "Does everyone need to sign in?",
    answer:
      "No. Anyone with the link can open the first view. A viewer verifies their email inside the Show Interest form before sending a request.",
  },
  {
    question: "What does Identity Verified mean?",
    answer:
      "It confirms that the portfolio owner completed an identity check. It does not guarantee every detail entered in the portfolio.",
  },
  {
    question: "Will my plan renew automatically?",
    answer:
      "No. The plans shown here are one-time payments for the selected publishing period.",
  },
] as const;

const includedFeatures = [
  "Verified digital portfolio",
  "Unlimited updates and sharing",
  "Interest dashboard and Full View approval",
] as const;

export default function Home() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Nakshatra home">
          <Sparkles aria-hidden="true" />
          <span>NAKSHATRA</span>
        </Link>

        <nav className={styles.navigation} aria-label="Main navigation">
          <div className={styles.navigationLinks}>
            <a href="#why-it-helps">Why it helps</a>
            <a href="#how-it-works">How it works</a>
            <a href="#benefits">What you get</a>
            <a href="#pricing">Pricing</a>
            <a href="#questions">Questions</a>
          </div>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
          <Link href="/signup" className={styles.primaryButton}>Create portfolio</Link>
        </nav>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A digital marriage portfolio</p>
            <h1>Create and share your marriage portfolio in one clear link.</h1>
            <p className={styles.heroLead}>
              Bring your introduction, photos, family details, and horoscope together in a
              portfolio that works beautifully on every phone. Update it anytime and share the
              same link with families.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryButton}>
                Create my portfolio <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#sample-portfolio" className={styles.secondaryButton}>
                View a sample portfolio
              </a>
            </div>
            <p className={styles.heroNote}><Check aria-hidden="true" /> Build and preview before you pay.</p>
          </div>

          <div id="sample-portfolio" className={styles.heroVisual} aria-label="Example Nakshatra portfolio">
            <div className={styles.visualGlow} aria-hidden="true" />
            <div className={styles.shareMessage} aria-hidden="true">
              <MessageCircle />
              <span><strong>Shared on WhatsApp</strong>One clear link for the family</span>
            </div>
            <article className={styles.portfolioPreview}>
              <header className={styles.previewHeader}>
                <span><Sparkles aria-hidden="true" /> Nakshatra</span>
                <span><ShieldCheck aria-hidden="true" /> Balanced View</span>
              </header>
              <div className={styles.previewBody}>
                <div className={styles.previewPortrait} aria-label="Portrait placeholder">
                  <span>AR</span>
                </div>
                <div className={styles.previewIntroduction}>
                  <span className={styles.verifiedBadge}><BadgeCheck aria-hidden="true" /> Identity Verified</span>
                  <p>A personal portfolio</p>
                  <h2>Ananya Rao</h2>
                  <strong>Product designer · Bengaluru</strong>
                  <p>Thoughtful, curious, close to family, and always learning.</p>
                </div>
              </div>
              <footer className={styles.previewFooter}>
                <span><small>01</small>Story</span>
                <span><small>02</small>Journey</span>
                <span><small>03</small>Family</span>
                <span><small>04</small>Gallery</span>
              </footer>
            </article>
            <div className={styles.currentLinkNote} aria-hidden="true">
              <RefreshCw /> One link, always current
            </div>
          </div>
        </section>

        <section className={styles.assuranceStrip} aria-label="Product highlights">
          <div><strong>One portfolio</strong><span>Not a folder of separate files</span></div>
          <div><strong>Made for every phone</strong><span>Simple for individuals and families</span></div>
          <div><strong>Your decision</strong><span>You approve the Full View</span></div>
        </section>

        <section id="why-it-helps" className={styles.problemSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>A familiar problem</p>
            <h2>Marriage introductions should not feel like managing files.</h2>
            <p>
              A profile document, separate photographs, horoscope images, and repeated WhatsApp
              messages quickly become difficult to manage.
            </p>
          </div>

          <div className={styles.problemLayout}>
            <div className={styles.fileStack} aria-label="Common marriage introduction files">
              <div><FileText aria-hidden="true" /><span><strong>Profile-final-3.pdf</strong><small>Another version after every change</small></span></div>
              <div><Images aria-hidden="true" /><span><strong>12 separate photos</strong><small>Mixed into an active family chat</small></span></div>
              <div><MessageCircle aria-hidden="true" /><span><strong>Repeated messages</strong><small>Important details become hard to find</small></span></div>
            </div>
            <div className={styles.painPoints}>
              <p><span>01</span>The PDF becomes outdated after every change.</p>
              <p><span>02</span>Photographs and important details are sent separately.</p>
              <p><span>03</span>Different families may receive different versions.</p>
              <p><span>04</span>The same information must be explained repeatedly.</p>
              <strong>At a time when clarity and trust matter, scattered information creates unnecessary confusion.</strong>
            </div>
          </div>
        </section>

        <section className={styles.transformationSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>A clearer way</p>
            <h2>From scattered files to one clear introduction.</h2>
          </div>
          <div className={styles.comparison}>
            <article className={styles.beforeCard}>
              <p>Before</p>
              <h3>Files and messages everywhere</h3>
              <ul>
                <li>PDF, photos, and horoscope sent separately</li>
                <li>A new file after every update</li>
                <li>Important details lost in chat</li>
                <li>Difficult to read on a phone</li>
              </ul>
            </article>
            <div className={styles.comparisonArrow} aria-hidden="true"><ArrowRight /></div>
            <article className={styles.afterCard}>
              <p>With Nakshatra</p>
              <h3>One portfolio everyone can follow</h3>
              <ul>
                <li><Check aria-hidden="true" /> Everything organised in one place</li>
                <li><Check aria-hidden="true" /> Updates appear on the same link</li>
                <li><Check aria-hidden="true" /> Designed for comfortable mobile reading</li>
                <li><Check aria-hidden="true" /> Interest requests stay in your dashboard</li>
              </ul>
            </article>
          </div>
          <p className={styles.transformationClose}>Create it once. Keep it current. Share it whenever your family needs it.</p>
        </section>

        <section id="how-it-works" className={styles.processSection}>
          <div className={`${styles.sectionHeading} ${styles.centeredHeading}`}>
            <p className={styles.eyebrow}>How it works</p>
            <h2>From a guided form to a shareable portfolio.</h2>
            <p>No design experience is needed. Each step tells you what to add next.</p>
          </div>
          <div className={styles.processGrid}>
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="benefits" className={styles.benefitsSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>What you get</p>
            <h2>Everything your family needs, without the document bundle.</h2>
          </div>
          <div className={styles.benefitsGrid}>
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <article key={benefit.title}>
                  <span className={styles.benefitIcon}><Icon aria-hidden="true" /></span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className={styles.viewingSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Viewing options</p>
            <h2>Choose what people see first.</h2>
            <p>Every option uses the same clear portfolio design. You decide how the introduction begins.</p>
          </div>
          <div className={styles.viewingGrid}>
            <article className={styles.recommendedView}>
              <span className={styles.recommendedLabel}>Recommended</span>
              <ShieldCheck aria-hidden="true" />
              <p>First view</p>
              <h3>Balanced View</h3>
              <p>A useful first introduction containing the details most families expect.</p>
            </article>
            <article>
              <PencilLine aria-hidden="true" />
              <p>First view</p>
              <h3>Private View</h3>
              <p>A shorter introduction for people who prefer to begin with fewer details.</p>
            </article>
            <article className={styles.fullViewCard}>
              <BadgeCheck aria-hidden="true" />
              <p>After approval</p>
              <h3>Full View</h3>
              <p>The complete portfolio becomes available after you approve an interest.</p>
            </article>
          </div>
        </section>

        <section className={styles.productProofSection} aria-labelledby="proof-heading">
          <div>
            <p className={styles.eyebrow}>See what families receive</p>
            <h2 id="proof-heading">A complete introduction that still feels easy to read.</h2>
            <p>
              Instead of asking people to open several files, share one organised portfolio with
              familiar sections and clear next steps.
            </p>
            <ul>
              <li><Check aria-hidden="true" /> Opens directly in the browser</li>
              <li><Check aria-hidden="true" /> No app download required</li>
              <li><Check aria-hidden="true" /> Works from the same WhatsApp link</li>
            </ul>
            <a href="#sample-portfolio" className={styles.textLink}>Return to the sample <ArrowRight aria-hidden="true" /></a>
          </div>
          <div className={styles.proofPhone} aria-hidden="true">
            <div className={styles.proofPhoneTop}><span /><span>Balanced View</span></div>
            <p>A personal portfolio</p>
            <h3>Ananya Rao</h3>
            <strong>Product designer · Bengaluru</strong>
            <div className={styles.proofRows}>
              <span><small>Story</small>A thoughtful introduction</span>
              <span><small>Journey</small>Education and career</span>
              <span><small>Family</small>Background and values</span>
              <span><small>Gallery</small>Selected photographs</span>
            </div>
          </div>
        </section>

        <section id="pricing" className={styles.pricingSection}>
          <div className={`${styles.sectionHeading} ${styles.centeredHeading}`}>
            <p className={styles.eyebrow}>Simple pricing</p>
            <h2>One portfolio. One-time payment.</h2>
            <p>Every plan includes the same features. Choose how long you want your published portfolio to remain active.</p>
          </div>

          <div className={styles.pricingGrid}>
            {indiaPlans.map((plan) => (
              <article key={plan.duration} className={plan.recommended ? styles.recommendedPlan : undefined}>
                {plan.recommended && <span className={styles.planBadge}>Recommended</span>}
                <p>{plan.note}</p>
                <h3>{plan.duration}</h3>
                <div className={styles.planPrice}>{plan.price}<small>one-time</small></div>
                <p className={styles.planRate}>{plan.rate}</p>
                <ul>
                  {includedFeatures.map((feature) => <li key={feature}><Check aria-hidden="true" />{feature}</li>)}
                </ul>
                <Link href="/signup" className={plan.recommended ? styles.primaryButton : styles.secondaryButton}>
                  Choose {plan.duration}
                </Link>
              </article>
            ))}
          </div>

          <details className={styles.internationalPricing}>
            <summary>Outside India? View pricing in USD <ChevronDown aria-hidden="true" /></summary>
            <div>
              {internationalPlans.map((plan) => (
                <article key={plan.duration}>
                  <span>{plan.duration}</span>
                  <strong>{plan.price}</strong>
                  <small>{plan.rate}</small>
                </article>
              ))}
            </div>
          </details>
          <p className={styles.pricingNote}>Plans do not renew automatically.</p>
        </section>

        <section id="questions" className={styles.faqSection}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Common questions</p>
            <h2>Clear answers before you begin.</h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}<ChevronDown aria-hidden="true" /></summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.finalCta}>
          <div>
            <p className={styles.eyebrow}>Ready when you are</p>
            <h2>Replace the document bundle with one clear portfolio.</h2>
            <p>Create it once, update it anytime, and share the same link with every family.</p>
          </div>
          <div>
            <Link href="/signup" className={styles.lightButton}>
              Create my portfolio <ArrowRight aria-hidden="true" />
            </Link>
            <small>Start creating now. Choose a plan when you are ready to publish.</small>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}><Sparkles aria-hidden="true" /><span>NAKSHATRA</span></Link>
        <p>One clear digital marriage portfolio.</p>
        <div><Link href="/login">Sign in</Link><a href="#questions">Questions</a></div>
      </footer>
    </div>
  );
}
