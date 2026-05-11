import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 sm:h-20 flex items-center justify-between px-6 sm:px-10 backdrop-blur-md bg-[#1e202c]/40 border-b border-[color:var(--landing-border)]">
      <Link href="/" className="flex items-center gap-2 group">
        <span
          className="text-[18px] sm:text-[20px] tracking-[0.18em]"
          style={{ fontFamily: "var(--font-harmond)", fontWeight: 800 }}
        >
          NAKSHATRA
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-10">
        <a
          href="#sample"
          className="text-[11px] tracking-[0.28em] uppercase text-[color:var(--landing-text-dim)] hover:text-[color:var(--landing-accent)] transition-colors"
        >
          Sample
        </a>
        <a
          href="#faq"
          className="text-[11px] tracking-[0.28em] uppercase text-[color:var(--landing-text-dim)] hover:text-[color:var(--landing-accent)] transition-colors"
        >
          FAQ
        </a>
        <Link
          href="/login"
          className="text-[11px] tracking-[0.28em] uppercase text-[color:var(--landing-accent)] hover:text-white transition-colors"
        >
          Login
        </Link>
      </nav>

      <Link
        href="/signup"
        className="md:hidden text-[11px] tracking-[0.28em] uppercase text-[color:var(--landing-accent)]"
      >
        Begin
      </Link>
    </header>
  );
}
