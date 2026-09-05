import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Images,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import styles from "./LandingExperience.module.css";

export type LandingVariant = "clarity" | "control" | "story";

const concepts = {
  clarity: {
    className: styles.clarity,
    eyebrow: "One link instead of another file",
    headline: "Stop resending your biodata every time something changes.",
    lead: "One link replaces the PDF, scattered photos, horoscope files, and repeated WhatsApp forwards. Update it once—every family sees the same current portfolio.",
    primary: "Create my portfolio",
    secondary: "See what changes",
    visualMode: "Balanced View",
    visualNote: "One link, always current",
    problemTitle: "From scattered files to one clear introduction.",
    outcomeTitle: "Update once. Every family sees the current version.",
    outcomeBody: "Your story, photographs, family details, and horoscope stay together in a clear portfolio you can manage from one place.",
    controlTitle: "One link does not have to mean everyone sees everything.",
    controlBody: "Choose the first view, keep contact details protected, and approve Full View only after a viewer verifies their email and sends an interest request.",
    closingTitle: "Your story deserves better than another PDF.",
  },
  control: {
    className: styles.control,
    eyebrow: "Privacy is part of the introduction",
    headline: "Share your story. Not your privacy.",
    lead: "Choose what a first-time viewer sees, keep contact details protected, and approve seven-day Full View access only when an introduction feels relevant.",
    primary: "Create my portfolio",
    secondary: "See how control works",
    visualMode: "Private View",
    visualNote: "Full View needs your approval",
    problemTitle: "A forwarded PDF gives you no control after it leaves your phone.",
    outcomeTitle: "Keep the link. Change the access.",
    outcomeBody: "Nakshatra separates the first introduction from the complete portfolio, so sensitive details do not need to travel in every message.",
    controlTitle: "You decide what is visible—and when.",
    controlBody: "Share a useful first view with your link, review verified-email interest in your dashboard, and open or close Full View access from one place.",
    closingTitle: "Tell your story with privacy built in.",
  },
  story: {
    className: styles.story,
    eyebrow: "More than a list of facts",
    headline: "A biodata is a list. This is how you’re introduced.",
    lead: "Bring your story, photographs, family, and horoscope together in the way you would actually want someone to understand you—not as another form or attachment.",
    primary: "Create my portfolio",
    secondary: "See the portfolio structure",
    visualMode: "Balanced View",
    visualNote: "Story · Journey · Family · Gallery",
    problemTitle: "The best version of your story—not the flattest.",
    outcomeTitle: "A thoughtful introduction, not a document bundle.",
    outcomeBody: "Nakshatra gives your words, journey, family background, and photographs room to feel considered while keeping the information easy to follow.",
    controlTitle: "Beautifully presented without becoming publicly discoverable.",
    controlBody: "There is no public directory, score, or comparison feed. Your portfolio is found through the link you choose to share, and sensitive details remain controlled.",
    closingTitle: "Introduce the person, not just the particulars.",
  },
} as const;

const problems = [
  { icon: FileText, title: "Outdated biodata", body: "A small edit creates another PDF to resend." },
  { icon: Images, title: "Details sent separately", body: "Photos and horoscope files disappear inside busy chats." },
  { icon: MessageCircle, title: "Repeated explanations", body: "Families ask for the same information in different places." },
] as const;

const steps = [
  { number: "01", title: "Create", body: "Add your story, important details, photographs, family background, and horoscope." },
  { number: "02", title: "Preview & verify", body: "Review exactly what families will see. Complete an identity check to add a verified badge." },
  { number: "03", title: "Share", body: "Publish when ready and send the same mobile-friendly link through WhatsApp or email." },
  { number: "04", title: "Approve", body: "Review verified-email interest and decide who receives seven-day Full View access." },
] as const;

const viewModes = [
  { icon: ShieldCheck, label: "First view", title: "Balanced View", body: "A useful introduction with the details most families expect." },
  { icon: LockKeyhole, label: "First view", title: "Private View", body: "A shorter introduction that keeps more information behind approval." },
  { icon: UserCheck, label: "After approval", title: "Full View", body: "The complete portfolio for an approved viewer, available for seven days." },
] as const;

const trustFacts = [
  { icon: LockKeyhole, text: "Contact details stay out of the first view" },
  { icon: BadgeCheck, text: "Verified badge follows a successful identity check" },
  { icon: RefreshCw, text: "Close or renew Full View from your dashboard" },
  { icon: Smartphone, text: "Opens in a browser—no app to install" },
] as const;

const plans = [
  { duration: "4 months", price: "₹1,600", rate: "₹400/month", recommended: false },
  { duration: "7 months", price: "₹2,450", rate: "₹350/month", recommended: true },
  { duration: "14 months", price: "₹4,200", rate: "₹300/month", recommended: false },
] as const;

const internationalPlans = [
  { duration: "4 months", price: "$24", rate: "$6/month" },
  { duration: "7 months", price: "$35", rate: "$5/month" },
  { duration: "14 months", price: "$56", rate: "$4/month" },
] as const;

const faqs = [
  { question: "Is Nakshatra a matchmaking website?", answer: "No. It helps you create and share your own marriage portfolio. There is no public profile feed." },
  { question: "Does someone need to sign in to open my link?", answer: "No. Anyone with the link can open the first view you selected. To request Full View, a viewer verifies their email before the interest request is sent." },
  { question: "What does Identity Verified mean?", answer: "It means the portfolio owner successfully completed an identity check. It does not guarantee that every detail entered in the portfolio is accurate." },
  { question: "How long does approved Full View access last?", answer: "An approval creates seven-day access for that verified viewer. You can close it early or renew it from your dashboard." },
  { question: "Can someone find my portfolio by searching my name?", answer: "Nakshatra has no public profile directory, and portfolio pages tell search engines not to index them. Anyone who receives or is forwarded your link can still open its first view." },
  { question: "Can I see the portfolio before paying?", answer: "Yes. Build and preview first. Choose a publishing period only when you are ready to share." },
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
              <a href="#why" className={styles.secondaryButton}>{concept.secondary}</a>
            </div>
            <p className={styles.heroNote}><Check aria-hidden="true" /> Create and preview before choosing a plan.</p>
          </div>
          <PortfolioPreview mode={concept.visualMode} note={concept.visualNote} variant={variant} />
        </section>

        <section id="why" className={styles.problemSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>A familiar problem, solved</p><h2>{concept.problemTitle}</h2></div>
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
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>How it works</p><h2>From a guided form to a shareable portfolio.</h2></div>
          <div className={styles.stepsGrid}>{steps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </section>

        <section id="control" className={styles.controlSection}>
          <div className={styles.controlIntro}>
            <p className={styles.eyebrow}>Your information, your decision</p><h2>{concept.controlTitle}</h2><p>{concept.controlBody}</p>
            <div className={styles.accessFlow} aria-label="Portfolio access flow"><span>First View</span><ArrowRight aria-hidden="true" /><span>Verified-email interest</span><ArrowRight aria-hidden="true" /><strong>7-day Full View</strong></div>
          </div>
          <div className={styles.controlGrid}>{viewModes.map(({ icon: Icon, label, title, body }) => <article key={title}><Icon aria-hidden="true" /><span>{label}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
          <div className={styles.trustFacts}>{trustFacts.map(({ icon: Icon, text }) => <span key={text}><Icon aria-hidden="true" />{text}</span>)}</div>
        </section>

        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Simple, one-time pricing</p><h2>Build first. Pay only when you are ready to publish.</h2><p>Every publishing period includes the same portfolio, updates, sharing, and access controls. Plans do not renew automatically.</p></div>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => <article key={plan.duration} className={plan.recommended ? styles.recommendedPlan : undefined}>{plan.recommended && <span>Most popular</span>}<h3>{plan.duration}</h3><strong>{plan.price}</strong><p>{plan.rate}</p><Link href="/signup">Start creating</Link></article>)}
          </div>
          <details className={styles.pricingDetails}><summary>What every plan includes <ChevronDown aria-hidden="true" /></summary><div><span><BadgeCheck aria-hidden="true" /> Identity verification and verified badge</span><span><RefreshCw aria-hidden="true" /> Unlimited updates</span><span><LockKeyhole aria-hidden="true" /> Full View approval controls</span></div></details>
          <details className={styles.internationalPricing}>
            <summary>Outside India? View pricing in USD <ChevronDown aria-hidden="true" /></summary>
            <div>{internationalPlans.map((plan) => <span key={plan.duration}><strong>{plan.duration}</strong><b>{plan.price}</b><small>{plan.rate}</small></span>)}</div>
          </details>
        </section>

        <section id="questions" className={styles.faqSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Questions</p><h2>Know what happens before you begin.</h2></div>
          <div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta}>
          <div><p className={styles.eyebrow}>Ready when you are</p><h2>{concept.closingTitle}</h2><p>Create privately, preview everything, and publish only when you are ready.</p></div>
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
  const FloatingIcon = variant === "clarity" ? FileText : MessageCircle;
  const floatingTitle = variant === "clarity" ? "Profile_final_v3.pdf" : variant === "control" ? "Access approved" : "Shared with family";
  const floatingBody = variant === "clarity" ? "Outdated after one change" : variant === "story" ? "Opens in their browser" : "For one verified viewer";

  return (
    <div className={styles.visual} aria-label="Example Nakshatra portfolio">
      <div className={styles.visualGlow} aria-hidden="true" />
      <div className={styles.floatingMessage}><FloatingIcon aria-hidden="true" /><span><strong>{floatingTitle}</strong>{floatingBody}</span></div>
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
