import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Images,
  Link2,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import styles from "./LandingExperience.module.css";

export type LandingVariant = "clarity" | "control" | "family";

const concepts = {
  clarity: {
    className: styles.clarity,
    eyebrow: "One clear marriage portfolio",
    headline: "One marriage portfolio. Always current. Shared on your terms.",
    lead: "Replace scattered PDFs, photos, horoscope files, and repeated messages with one mobile-friendly link. You decide what people see first—and who gets the complete view.",
    primary: "Create my portfolio",
    visualMode: "Balanced View",
    visualNote: "One link, always current",
    problemTitle: "Stop sending a new version every time something changes.",
    outcomeTitle: "Update once. Every family sees the current version.",
    outcomeBody: "Your story, photographs, family details, and horoscope stay together in a clear portfolio you can manage from one place.",
    controlTitle: "A complete introduction without giving up control.",
    controlBody: "Begin with the information you are comfortable sharing. When someone expresses interest, you decide whether they receive Full View access.",
    closingTitle: "Create it once. Keep every introduction clear.",
  },
  control: {
    className: styles.control,
    eyebrow: "Privacy is part of the introduction",
    headline: "Share your story without sharing everything at once.",
    lead: "Create a thoughtful marriage portfolio, choose the first view, and reveal private details only after you approve genuine interest.",
    primary: "Create a private portfolio",
    visualMode: "Private View",
    visualNote: "Full View needs your approval",
    problemTitle: "A forwarded PDF gives you no control after it leaves your phone.",
    outcomeTitle: "Keep the link. Change the access.",
    outcomeBody: "Nakshatra separates the first introduction from the complete portfolio, so sensitive details do not need to travel in every message.",
    controlTitle: "You decide what is visible—and when.",
    controlBody: "Share a useful first view publicly, review verified interest in your dashboard, and open or close Full View access from one place.",
    closingTitle: "Tell your story with privacy built in.",
  },
  family: {
    className: styles.family,
    eyebrow: "Made for individuals and families",
    headline: "One beautiful introduction. Easy for every family to open.",
    lead: "Bring the biodata, photographs, family background, and horoscope into one familiar link that reads comfortably on any phone.",
    primary: "Start my introduction",
    visualMode: "Family-ready view",
    visualNote: "Share directly on WhatsApp",
    problemTitle: "Important details should not get lost between files and family chats.",
    outcomeTitle: "Everything arrives together, in the right order.",
    outcomeBody: "A guided portfolio helps every family find the story, key details, photographs, and next step without downloading an app.",
    controlTitle: "Simple for elders. Thoughtful for everyone.",
    controlBody: "Comfortable type, clear sections, large actions, and a familiar browser experience make the introduction easier across generations.",
    closingTitle: "Give every family one clear place to begin.",
  },
} as const;

const problems = [
  { icon: FileText, title: "Outdated biodata", body: "A small edit creates another PDF to resend." },
  { icon: Images, title: "Details sent separately", body: "Photos and horoscope files disappear inside busy chats." },
  { icon: MessageCircle, title: "Repeated explanations", body: "Families ask for the same information in different places." },
] as const;

const steps = [
  { number: "01", title: "Create", body: "A guided editor helps you bring your story and important details together." },
  { number: "02", title: "Share", body: "Publish when ready and send the same mobile-friendly link anywhere." },
  { number: "03", title: "Approve", body: "Review verified interest and decide who can see the Full View." },
] as const;

const controls = [
  { icon: Link2, title: "One current link", body: "Update your portfolio without sending another file." },
  { icon: ShieldCheck, title: "Choose the first view", body: "Begin with a Balanced or Private introduction." },
  { icon: UserCheck, title: "Approve Full View", body: "You decide who receives the complete portfolio." },
  { icon: Smartphone, title: "Comfortable on phones", body: "No app download, pinching, or document hunting." },
] as const;

const plans = [
  { duration: "4 months", price: "₹1,600", rate: "₹400/month", recommended: false },
  { duration: "7 months", price: "₹2,450", rate: "₹350/month", recommended: true },
  { duration: "14 months", price: "₹4,200", rate: "₹300/month", recommended: false },
] as const;

const faqs = [
  { question: "Is Nakshatra a matchmaking website?", answer: "No. It helps you create and share your own marriage portfolio. There is no public profile feed." },
  { question: "Can I see the portfolio before paying?", answer: "Yes. Build and preview first. Choose a publishing period only when you are ready to share." },
  { question: "What can someone with my link see?", answer: "They see the first view you selected. The complete Full View is available only after you approve their interest." },
  { question: "Can I change or close access later?", answer: "Yes. Your portfolio stays under your account, and approved Full View access is time-limited and manageable from your dashboard." },
] as const;

export function LandingExperience({ variant }: { variant: LandingVariant }) {
  const concept = concepts[variant];

  return (
    <div className={`${styles.page} ${concept.className}`} data-landing-variant={variant}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>

      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Nakshatra home">
          <Sparkles aria-hidden="true" /><span>NAKSHATRA</span>
        </Link>
        <nav className={styles.navigation} aria-label="Main navigation">
          <div className={styles.navigationLinks}>
            <a href="#why">Why it helps</a><a href="#how">How it works</a><a href="#control">Your control</a><a href="#pricing">Pricing</a><a href="#questions">Questions</a>
          </div>
          <Link href="/login" className={styles.signIn}>Sign in</Link>
          <Link href="/signup" className={styles.primaryButton}>Create portfolio</Link>
        </nav>
      </header>

      <main id="main-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{concept.eyebrow}</p>
            <h1>{concept.headline}</h1>
            <p className={styles.heroLead}>{concept.lead}</p>
            <div className={styles.heroActions}>
              <Link href="/signup" className={styles.primaryButton}>{concept.primary} <ArrowRight aria-hidden="true" /></Link>
              <a href="#how" className={styles.secondaryButton}>See how it works</a>
            </div>
            <p className={styles.heroNote}><Check aria-hidden="true" /> Create and preview before choosing a plan.</p>
          </div>
          <PortfolioPreview mode={concept.visualMode} note={concept.visualNote} variant={variant} />
        </section>

        <section className={styles.assuranceStrip} aria-label="Product summary">
          <div><strong>One organised portfolio</strong><span>Not a bundle of files</span></div>
          <div><strong>Made for every phone</strong><span>Nothing to install</span></div>
          <div><strong>Full View needs approval</strong><span>You stay in control</span></div>
        </section>

        <section id="why" className={styles.problemSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>The problem, made simpler</p><h2>{concept.problemTitle}</h2></div>
          <div className={styles.problemGrid}>
            <div className={styles.problemList}>
              {problems.map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></article>)}
            </div>
            <article className={styles.outcomeCard}>
              <RefreshCw aria-hidden="true" /><p className={styles.cardLabel}>With Nakshatra</p><h3>{concept.outcomeTitle}</h3><p>{concept.outcomeBody}</p>
              <Link href="/signup">Create the first version <ArrowRight aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section id="how" className={styles.stepsSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>How it works</p><h2>From blank page to shared introduction in three clear steps.</h2></div>
          <div className={styles.stepsGrid}>{steps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </section>

        <section id="control" className={styles.controlSection}>
          <div className={styles.controlIntro}>
            <p className={styles.eyebrow}>Your information, your decision</p><h2>{concept.controlTitle}</h2><p>{concept.controlBody}</p>
            <div className={styles.accessFlow} aria-label="Portfolio access flow"><span>First View</span><ArrowRight aria-hidden="true" /><span>Verified interest</span><ArrowRight aria-hidden="true" /><strong>Full View</strong></div>
          </div>
          <div className={styles.controlGrid}>{controls.map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>

        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Simple, one-time pricing</p><h2>Build first. Pay only when you are ready to publish.</h2><p>Every publishing period includes the same portfolio, updates, sharing, and access controls. Plans do not renew automatically.</p></div>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => <article key={plan.duration} className={plan.recommended ? styles.recommendedPlan : undefined}>{plan.recommended && <span>Most popular</span>}<h3>{plan.duration}</h3><strong>{plan.price}</strong><p>{plan.rate}</p><Link href="/signup">Start creating</Link></article>)}
          </div>
          <details className={styles.pricingDetails}><summary>What every plan includes <ChevronDown aria-hidden="true" /></summary><div><span><BadgeCheck aria-hidden="true" /> Identity-verified portfolio</span><span><RefreshCw aria-hidden="true" /> Unlimited updates</span><span><LockKeyhole aria-hidden="true" /> Full View approval controls</span></div></details>
        </section>

        <section id="questions" className={styles.faqSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Questions</p><h2>Know what happens before you begin.</h2></div>
          <div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta}>
          <div><p className={styles.eyebrow}>Ready when you are</p><h2>{concept.closingTitle}</h2><p>Start privately, preview everything, and publish only when it feels right.</p></div>
          <Link href="/signup" className={styles.lightButton}>Create my portfolio <ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}><Sparkles aria-hidden="true" /><span>NAKSHATRA</span></Link><p>A clearer, more considerate marriage introduction.</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/login">Sign in</Link></div>
      </footer>
    </div>
  );
}

function PortfolioPreview({ mode, note, variant }: { mode: string; note: string; variant: LandingVariant }) {
  return (
    <div className={styles.visual} aria-label="Example Nakshatra portfolio">
      <div className={styles.visualGlow} aria-hidden="true" />
      <div className={styles.floatingMessage}><MessageCircle aria-hidden="true" /><span><strong>{variant === "control" ? "Access approved" : "Shared with family"}</strong>{variant === "family" ? "Opens in their browser" : "One clear link"}</span></div>
      <article className={styles.portfolioCard}>
        <header><span><Sparkles aria-hidden="true" /> Nakshatra</span><span><ShieldCheck aria-hidden="true" /> {mode}</span></header>
        <div className={styles.portfolioBody}>
          <div className={styles.portrait}><span>AR</span></div>
          <div className={styles.introduction}><span className={styles.verified}><BadgeCheck aria-hidden="true" /> Identity Verified</span><p>A personal portfolio</p><h2>Ananya Rao</h2><strong>Product designer · Bengaluru</strong><p>Thoughtful, curious, close to family, and always learning.</p></div>
        </div>
        <footer><span>Story</span><span>Journey</span><span>Family</span><span>Gallery</span></footer>
      </article>
      <div className={styles.floatingNote}><RefreshCw aria-hidden="true" /> {note}</div>
    </div>
  );
}
