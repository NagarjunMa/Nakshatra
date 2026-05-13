import Link from "next/link";

export function Header() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 sm:h-20 flex items-center justify-between px-6 sm:px-10 backdrop-blur-md bg-[#0a0b14]/70 border-b border-[color:var(--landing-border)]">
      <Link href="/" className="flex items-center gap-2 group">
        <span
          className="text-[18px] sm:text-[20px] tracking-[0.18em] text-white"
          style={{ fontFamily: "var(--font-hkgrotesk)", fontWeight: 800 }}
        >
          NAKSHATRA
        </span>
      </Link>

      <nav className="hidden md:flex items-center gap-10">
        <a
          href="#sample"
          className="text-[12px] font-medium tracking-[0.28em] uppercase text-white/90 hover:text-[color:var(--landing-accent)] transition-colors"
          style={{ fontFamily: "var(--font-ranade)" }}
        >
          Sample
        </a>
        <a
          href="#faq"
          className="text-[12px] font-medium tracking-[0.28em] uppercase text-white/90 hover:text-[color:var(--landing-accent)] transition-colors"
          style={{ fontFamily: "var(--font-ranade)" }}
        >
          FAQ
        </a>
        <Link
          href="/login"
          className="text-[12px] font-medium tracking-[0.28em] uppercase px-4 py-2 rounded-full border border-[color:var(--landing-accent)]/60 text-[color:var(--landing-accent)] hover:bg-[color:var(--landing-accent)] hover:text-[#0a0b14] transition-colors"
          style={{ fontFamily: "var(--font-ranade)" }}
        >
          Login
        </Link>
      </nav>

      <Link
        href="/signup"
        className="md:hidden text-[12px] font-medium tracking-[0.28em] uppercase text-[color:var(--landing-accent)]"
        style={{ fontFamily: "var(--font-ranade)" }}
      >
        Begin
      </Link>
    </header>
  );
}
