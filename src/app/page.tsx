import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  FileText,
  Images,
  LockKeyhole,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Nakshatra - One Digital Wedding Portfolio",
  description:
    "Bring your wedding profile, photos, family details, and horoscope together in one clear portfolio.",
};

const steps = [
  {
    number: "01",
    title: "Create your portfolio",
    body: "Add your story, profile details, photos, family background, and horoscope in one guided form.",
  },
  {
    number: "02",
    title: "Verify and publish",
    body: "Complete an identity check, choose a viewing mode, and review the portfolio before it goes live.",
  },
  {
    number: "03",
    title: "Share one link",
    body: "Send the same mobile-friendly link on WhatsApp, email, or wherever your family prefers.",
  },
  {
    number: "04",
    title: "Review interest",
    body: "A viewer introduces themselves in a short pop-up. You decide whether to approve the fuller view.",
  },
] as const;

const portfolioSections = ["Story", "Journey", "Family", "Interests"] as const;

export default function Home() {
  return (
    <div className="site-shell site-shell-v2">
      <header className="site-header site-header-v2">
        <Link href="/" className="site-brand site-brand-v2" aria-label="Nakshatra home">
          <Sparkles aria-hidden="true" />
          <span>NAKSHATRA</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#why-nakshatra">Why Nakshatra</a>
          <a href="#how-it-works">How it works</a>
          <a href="#viewing-modes">Viewing modes</a>
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="site-button site-button-primary">Create portfolio</Link>
        </nav>
      </header>

      <main>
        <section className="site-hero-v2">
          <div className="site-hero-copy-v2">
            <p className="site-eyebrow">One digital wedding portfolio</p>
            <h1>Your wedding story, clearly together.</h1>
            <p className="site-lead-v2">
              Create one clear portfolio for marriage introductions. Share it as a link,
              update it anytime, and decide when someone can see the fuller view.
            </p>
            <div className="site-actions-v2">
              <Link href="/signup" className="site-button site-button-primary">
                Create your portfolio <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#portfolio-example" className="site-text-link">
                See what families receive <ArrowRight aria-hidden="true" />
              </a>
            </div>
            <div className="site-hero-assurance" aria-label="Product highlights">
              <span><Check aria-hidden="true" /> Easy on every phone</span>
              <span><Check aria-hidden="true" /> No matchmaking feed</span>
              <span><Check aria-hidden="true" /> Update without making a new file</span>
            </div>
          </div>

          <div id="portfolio-example" className="site-portfolio-stage" aria-label="Example Nakshatra portfolio">
            <div className="site-portfolio-orbit" aria-hidden="true" />
            <article className="site-portfolio-window">
              <header className="site-portfolio-header">
                <span className="site-mini-brand"><Sparkles aria-hidden="true" /> Nakshatra</span>
                <span className="site-view-badge"><ShieldCheck aria-hidden="true" /> Balanced view</span>
              </header>
              <div className="site-portfolio-cover">
                <div className="site-portrait-placeholder" aria-hidden="true">
                  <span>AR</span>
                </div>
                <div className="site-portfolio-intro">
                  <span className="site-verified"><BadgeCheck aria-hidden="true" /> Identity verified</span>
                  <p>A personal portfolio</p>
                  <h2>Ananya Rao</h2>
                  <strong>Product designer · Bengaluru</strong>
                  <p>Thoughtful, curious, close to family, and always learning.</p>
                </div>
              </div>
              <footer className="site-portfolio-sections" aria-label="Example portfolio sections">
                {portfolioSections.map((section, index) => (
                  <span key={section}><small>0{index + 1}</small>{section}</span>
                ))}
              </footer>
            </article>
            <div className="site-floating-note site-floating-note-verified">
              <BadgeCheck aria-hidden="true" /> Verified before publishing
            </div>
            <div className="site-floating-note site-floating-note-link">
              <RefreshCw aria-hidden="true" /> One link, always current
            </div>
          </div>
        </section>

        <section className="site-proof-strip" aria-label="Nakshatra product principles">
          <div><strong>One portfolio</strong><span>Not a folder of separate files</span></div>
          <div><strong>One simple link</strong><span>Easy for families to open and share</span></div>
          <div><strong>Your decision</strong><span>You approve the fuller view</span></div>
        </section>

        <section id="why-nakshatra" className="site-story-section">
          <div className="site-section-heading-v2">
            <p className="site-eyebrow">Why Nakshatra</p>
            <h2>Leave the document bundle behind.</h2>
            <p>
              A wedding introduction often arrives as a profile document, separate photos,
              a horoscope, and several messages. Nakshatra brings them into one organised place.
            </p>
          </div>
          <div className="site-before-after">
            <div className="site-file-stack" aria-label="Traditional files and messages">
              <div><FileText aria-hidden="true" /><span><strong>Profile.pdf</strong><small>Another version after every change</small></span></div>
              <div><Images aria-hidden="true" /><span><strong>Photos</strong><small>Sent separately in chat</small></span></div>
              <div><MessageCircle aria-hidden="true" /><span><strong>Repeated messages</strong><small>Important details become hard to find</small></span></div>
            </div>
            <div className="site-change-arrow" aria-hidden="true"><ArrowRight /></div>
            <div className="site-one-place">
              <span className="site-one-place-icon"><Sparkles aria-hidden="true" /></span>
              <p>With Nakshatra</p>
              <h3>One complete, easy-to-read portfolio.</h3>
              <ul>
                <li><Check aria-hidden="true" /> Profile, photos, family details, and horoscope together</li>
                <li><Check aria-hidden="true" /> Clear sections that work well on a phone</li>
                <li><Check aria-hidden="true" /> One update changes the same shared link</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="site-process-section">
          <div className="site-section-heading-v2 site-section-heading-centered">
            <p className="site-eyebrow">How it works</p>
            <h2>From a guided form to one shareable link.</h2>
          </div>
          <div className="site-process-grid">
            {steps.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="viewing-modes" className="site-access-section">
          <div className="site-section-heading-v2">
            <p className="site-eyebrow">Viewing modes</p>
            <h2>Share clearly from the first view to approval.</h2>
            <p>
              Choose how the portfolio opens. Both modes use the same design and lead to the
              same Full Approved View when you accept an interest.
            </p>
          </div>
          <div className="site-access-flow">
            <article className="site-access-card is-balanced">
              <span className="site-recommended">Recommended</span>
              <ShieldCheck aria-hidden="true" />
              <p>First view</p>
              <h3>Balanced mode</h3>
              <p>A useful introduction with your story, journey, lifestyle, and selected background.</p>
            </article>
            <article className="site-access-card">
              <LockKeyhole aria-hidden="true" />
              <p>First view</p>
              <h3>Private mode</h3>
              <p>The same clear portfolio with fewer details shown before an introduction.</p>
            </article>
            <div className="site-flow-connector" aria-hidden="true"><ArrowRight /></div>
            <article className="site-access-card is-approved">
              <BadgeCheck aria-hidden="true" />
              <p>After you approve</p>
              <h3>Full Approved View</h3>
              <p>The fuller portfolio opens only for the person whose interest you accept.</p>
            </article>
          </div>
        </section>

        <section className="site-trust-section">
          <article>
            <div className="site-trust-icon"><BadgeCheck aria-hidden="true" /></div>
            <div>
              <p className="site-eyebrow">Identity check</p>
              <h2>A verified badge before the first publish.</h2>
              <p>
                Complete a short identity check when your portfolio is ready. A verified badge
                then appears on the published portfolio to support genuine introductions.
              </p>
              <small>The badge confirms the identity check, not every detail in the portfolio.</small>
            </div>
          </article>
          <article>
            <div className="site-trust-icon"><MessageCircle aria-hidden="true" /></div>
            <div>
              <p className="site-eyebrow">Interest request</p>
              <h2>A simple introduction, without leaving the portfolio.</h2>
              <p>
                A viewer selects Show interest, adds basic information in a pop-up, and returns
                to the portfolio after sending it. You review the request from your dashboard.
              </p>
            </div>
          </article>
        </section>

        <section className="site-final-v2">
          <div>
            <p className="site-eyebrow">Simple to create. Easy to share.</p>
            <h2>Start with one portfolio your family can use with confidence.</h2>
          </div>
          <Link href="/signup" className="site-button site-button-primary">
            Create your portfolio <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </main>

      <footer className="site-footer site-footer-v2">
        <Link href="/" className="site-brand site-brand-v2"><Sparkles aria-hidden="true" /> <span>NAKSHATRA</span></Link>
        <p>One clear digital wedding portfolio.</p>
        <Link href="/login">Sign in</Link>
      </footer>
    </div>
  );
}
