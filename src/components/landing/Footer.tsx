import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="relative border-t border-[color:var(--landing-border)] px-6 sm:px-10 pt-20 pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          <div className="md:col-span-5">
            <span
              className="text-[24px] sm:text-[28px] tracking-[0.18em] text-[color:var(--landing-text)] block mb-4"
              style={{ fontFamily: "var(--font-hkgrotesk)", fontWeight: 800 }}
            >
              NAKSHATRA
            </span>
            <p
              className="text-[15px] text-[color:var(--landing-text-dim)] max-w-sm leading-relaxed"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              Made with care for Indian families. The wedding biodata, on one
              link.
            </p>

            <NewsletterForm />
          </div>

          <FooterCol
            heading="Product"
            links={[
              { label: "Sample", href: "#sample" },
              { label: "Benefits", href: "#benefits" },
              { label: "FAQ", href: "#faq" },
            ]}
          />

          <FooterCol
            heading="Company"
            links={[
              { label: "About", href: "/about" },
              { label: "Contact", href: "mailto:hello@nakshatra.app" },
            ]}
          />

          <FooterCol
            heading="Legal"
            links={[
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
            ]}
          />
        </div>

        <div className="pt-8 border-t border-[color:var(--landing-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p
            className="text-[12px] tracking-[0.18em] uppercase text-[color:var(--landing-text-dim)]"
            style={{ fontFamily: "var(--font-ranade)" }}
          >
            © 2026 Nakshatra · All rights reserved
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com"
              aria-label="Instagram"
              className="w-9 h-9 rounded-full border border-[color:var(--landing-border)] flex items-center justify-center text-[color:var(--landing-text-dim)] hover:text-[color:var(--landing-accent)] hover:border-[color:var(--landing-accent)]/40 transition-colors"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a
              href="https://x.com"
              aria-label="X / Twitter"
              className="w-9 h-9 rounded-full border border-[color:var(--landing-border)] flex items-center justify-center text-[color:var(--landing-text-dim)] hover:text-[color:var(--landing-accent)] hover:border-[color:var(--landing-accent)]/40 transition-colors"
            >
              <XIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div className="md:col-span-2">
      <h4 className="landing-section-title mb-5">{heading}</h4>
      <ul className="space-y-3">
        {links.map(({ label, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="text-[14px] text-[color:var(--landing-text-dim)] hover:text-[color:var(--landing-accent)] transition-colors"
              style={{ fontFamily: "var(--font-ranade)" }}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
