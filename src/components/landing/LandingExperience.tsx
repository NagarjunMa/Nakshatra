import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  ChevronDown,
  FileText,
  Globe2,
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
    eyebrow: "A digital marriage portfolio",
    headline: "Share your introduction without losing control of it.",
    lead: "Your story, photographs, family details, and horoscope in one portfolio. Every family opens the same current link. Contact details stay private until you approve a viewer.",
    primary: "Create my portfolio",
    secondary: "View a sample portfolio",
    visualMode: "Standard introduction",
    visualNote: "Contact details protected",
  },
  control: {
    className: styles.control,
    eyebrow: "Privacy is part of the introduction",
    headline: "Share your story. Not your privacy.",
    lead: "Choose what a first-time viewer sees, keep contact details protected, and approve seven-day full portfolio access only when an introduction feels relevant.",
    primary: "Create my portfolio",
    secondary: "See how control works",
    visualMode: "Short introduction",
    visualNote: "Full portfolio needs approval",
  },
  story: {
    className: styles.story,
    eyebrow: "More than a list of facts",
    headline: "A biodata is a list. This is how you’re introduced.",
    lead: "Bring your story, photographs, family, and horoscope together in the way you would actually want someone to understand you. Not as another form or attachment.",
    primary: "Create my portfolio",
    secondary: "See the portfolio structure",
    visualMode: "Standard introduction",
    visualNote: "Story · Journey · Family · Gallery",
  },
} as const;

const problems = [
  { icon: FileText, title: "It goes out of date", body: "One small correction means sending a new file to everyone all over again." },
  { icon: Images, title: "It arrives in pieces", body: "Photographs and horoscope files get separated and lost inside long chats." },
  { icon: LockKeyhole, title: "You cannot take it back", body: "Once a file is forwarded, you have no way to know where it went or who still has it." },
] as const;

const steps = [
  { number: "01", title: "Create", body: "Add your story, family background, photographs, and horoscope in a guided form. Save as you go and finish in your own time." },
  { number: "02", title: "Preview and verify", body: "See exactly what each family will see before anyone else does. Complete a short identity check to add your verified badge." },
  { number: "03", title: "Share", body: "Publish when you are ready and send one link through WhatsApp, email, or wherever your family already talks." },
  { number: "04", title: "Approve", body: "Review interest requests in your dashboard and decide who sees your full portfolio." },
] as const;

const viewModes = [
  { icon: LockKeyhole, label: "First view", title: "Short introduction", body: "A brief introduction that keeps most details behind your approval." },
  { icon: ShieldCheck, label: "First view", title: "Standard introduction", body: "The details most families expect to see when they first read a portfolio." },
  { icon: UserCheck, label: "After approval", title: "Full portfolio", body: "Your complete portfolio, opened only for a viewer you have approved." },
] as const;

const trustFacts = [
  { icon: LockKeyhole, text: "Contact details are never in the first view." },
  { icon: BadgeCheck, text: "Viewers confirm their email before they can request more." },
  { icon: UserCheck, text: "You approve or set aside every request from your dashboard." },
  { icon: RefreshCw, text: "You can end someone's access at any time." },
] as const;

const familyBenefits = [
  { icon: Smartphone, title: "Clear on every phone", body: "Large, readable text and plain labels. Comfortable for parents and grandparents to read." },
  { icon: Globe2, title: "Nothing to install", body: "The link opens straight in a browser. There is no app to download and no account needed to read the first view." },
  { icon: BadgeCheck, title: "Identity check available", body: "Complete an identity check to add a verified badge before you share your portfolio." },
  { icon: RefreshCw, title: "Always current", body: "Change a detail, update your published portfolio, and the same link shows the current version." },
] as const;

const samplePortfolios = [
  { initials: "AR", name: "Ananya Rao", detail: "Product designer · Bengaluru", accent: "sea" },
  { initials: "AM", name: "Arjun Mehta", detail: "Architect · Pune", accent: "sand" },
  { initials: "MI", name: "Meera Iyer", detail: "Physician · Chennai", accent: "rose" },
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
  { question: "Is Nakshatra a matchmaking website?", answer: "No. Nakshatra does not suggest matches or search for people on your behalf. It gives you one clear portfolio to share with the families you choose." },
  { question: "Can I see my portfolio before I pay?", answer: "Yes. You can build your portfolio and preview every view for free. You only choose a plan when you are ready to publish." },
  { question: "Does someone need to sign in to open my link?", answer: "No. Anyone with your link can read your first view straight away. A viewer verifies their email before asking to see your full portfolio." },
  { question: "What does Identity Verified mean?", answer: "It means the portfolio owner successfully completed an identity check. It does not guarantee that every detail entered in the portfolio is accurate." },
  { question: "How long does approved access last?", answer: "Full portfolio access lasts for seven days. You can end it earlier or renew it from your dashboard." },
  { question: "Can someone find my portfolio by searching my name?", answer: "No. Nakshatra has no public portfolio directory, and portfolio pages tell search engines not to list them. Anyone who receives or is forwarded your link can still open its first view." },
  { question: "What happens when my plan ends?", answer: "Your shared link stops opening. Your saved portfolio remains in your account, and you can publish it again when you are ready." },
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
            <a href="#how">How it works</a><a href="#control">Your control</a><a href="#pricing">Pricing</a><a href="#questions">Questions</a>
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
              <a href={variant === "control" ? "#control" : "#samples"} className={styles.secondaryButton}>{concept.secondary}</a>
            </div>
            <p className={styles.heroNote}><Check aria-hidden="true" /> Create and preview before choosing a plan.</p>
          </div>
          <PortfolioPreview mode={concept.visualMode} note={concept.visualNote} variant={variant} />
        </section>

        <section id="why" className={styles.problemSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>A familiar problem</p><h2>The biodata file was never built for this.</h2></div>
          <div className={styles.problemGrid}>{problems.map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><div><h3>{title}</h3><p>{body}</p></div></article>)}</div>
        </section>

        <section id="control" className={styles.controlSection}>
          <div className={styles.controlIntro}>
            <p className={styles.eyebrow}>Your information, your decision</p><h2>One link does not mean everyone sees everything.</h2><p>You choose how much a new family sees when they first open your link. Contact details and personal information stay protected until you approve that viewer yourself.</p>
            <div className={styles.accessFlow} aria-label="Portfolio access flow"><span>First introduction</span><ArrowRight aria-hidden="true" /><span>Verified email request</span><ArrowRight aria-hidden="true" /><strong>Full portfolio</strong></div>
          </div>
          <div className={styles.controlGrid}>{viewModes.map(({ icon: Icon, label, title, body }) => <article key={title}><Icon aria-hidden="true" /><span>{label}</span><h3>{title}</h3><p>{body}</p></article>)}</div>
          <div className={styles.trustFacts}>{trustFacts.map(({ icon: Icon, text }) => <span key={text}><Icon aria-hidden="true" />{text}</span>)}</div>
        </section>

        <section id="how" className={styles.stepsSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>How it works</p><h2>Four steps from a blank page to a shared link.</h2></div>
          <div className={styles.stepsGrid}>{steps.map((step) => <article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </section>

        <section className={styles.familySection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Built for every family</p><h2>Easy to read on any phone, for any generation.</h2></div>
          <div className={styles.familyGrid}>{familyBenefits.map(({ icon: Icon, title, body }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>

        <section id="samples" className={styles.samplesSection}>
          <div className={styles.samplesHeading}><div className={styles.sectionHeading}><p className={styles.eyebrow}>See the format</p><h2>Every portfolio follows the same clear layout.</h2></div><p>There are no themes to choose between and no templates to compare. Every portfolio is presented in the same way, so families can read each one on its own terms.</p></div>
          <div className={styles.samplesGrid}>{samplePortfolios.map((sample) => <article key={sample.name} data-accent={sample.accent}><div className={styles.samplePortrait}>{sample.initials}</div><div><span>Sample portfolio</span><h3>{sample.name}</h3><p>{sample.detail}</p><small>Story · Journey · Family · Gallery</small></div></article>)}</div>
          <p className={styles.sampleNote}>Sample layouts. These are not real Nakshatra users.</p>
        </section>

        <section id="pricing" className={styles.pricingSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Simple, one-time pricing</p><h2>Build for free. Pay when you are ready to publish.</h2><p>Every plan includes the same portfolio, the same updates, and the same access controls. The only difference is how long your portfolio stays published. Plans do not renew automatically.</p></div>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => <article key={plan.duration} className={plan.recommended ? styles.recommendedPlan : undefined}>{plan.recommended && <span>Most chosen</span>}<h3>{plan.duration}</h3><strong>{plan.price}</strong><p>{plan.rate}</p><Link href="/signup">Start creating</Link></article>)}
          </div>
          <details className={styles.pricingDetails}><summary>Every plan includes <ChevronDown aria-hidden="true" /></summary><div><span><BadgeCheck aria-hidden="true" /> Identity verification and verified badge</span><span><RefreshCw aria-hidden="true" /> Unlimited updates on the same link</span><span><LockKeyhole aria-hidden="true" /> Interest requests and approval dashboard</span></div></details>
          <details className={styles.internationalPricing}>
            <summary>Outside India? View pricing in USD <ChevronDown aria-hidden="true" /></summary>
            <div>{internationalPlans.map((plan) => <span key={plan.duration}><strong>{plan.duration}</strong><b>{plan.price}</b><small>{plan.rate}</small></span>)}</div>
          </details>
          <p className={styles.planEndNote}>When your publishing period ends, the shared link stops opening. Your saved portfolio remains in your account, and you can publish it again when you are ready.</p>
        </section>

        <section id="questions" className={styles.faqSection}>
          <div className={styles.sectionHeading}><p className={styles.eyebrow}>Questions</p><h2>Know what happens before you begin.</h2></div>
          <div className={styles.faqList}>{faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<ChevronDown aria-hidden="true" /></summary><p>{faq.answer}</p></details>)}</div>
        </section>

        <section className={styles.finalCta}>
          <div><p className={styles.eyebrow}>Ready when you are</p><h2>Your introduction deserves more than another file.</h2><p>Create your portfolio privately, preview every view, and publish only when it feels right.</p></div>
          <div className={styles.finalAction}><Link href="/signup" className={styles.lightButton}>Create my portfolio <ArrowRight aria-hidden="true" /></Link><span>Free to create. Choose a plan when you publish.</span></div>
        </section>
      </main>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}><Sparkles aria-hidden="true" /><span>NAKSHATRA</span></Link><p>One clear portfolio for the introduction that matters most.</p>
        <div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><a href="#questions">Questions</a><Link href="/login">Sign in</Link></div>
      </footer>
    </div>
  );
}

function PortfolioPreview({ mode, note, variant }: { mode: string; note: string; variant: LandingVariant }) {
  const FloatingIcon = variant === "clarity" ? FileText : MessageCircle;
  const floatingTitle = variant === "clarity" ? "One link, always current" : variant === "control" ? "Access approved" : "Shared with family";
  const floatingBody = variant === "clarity" ? "Updates stay in one place" : variant === "story" ? "Opens in their browser" : "For one verified viewer";

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
