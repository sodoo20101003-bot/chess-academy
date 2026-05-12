import Link from 'next/link';
import Image from 'next/image';

const links = {
  'Хичээл': [
    { label: 'Анхан шат', href: '/courses?cat=beginner' },
    { label: 'Дунд шат', href: '/courses?cat=intermediate' },
    { label: 'Ахисан шат', href: '/courses?cat=advanced' },
    { label: 'Endgame', href: '/courses?cat=endgame' },
  ],
  'Манай тухай': [
    { label: 'Бидний тухай', href: '/about' },
    { label: 'Багш нар', href: '/teachers' },
    { label: 'Карьер', href: '/careers' },
    { label: 'Холбогдох', href: '/contact' },
  ],
  'Дэмжлэг': [
    { label: 'Тусламжийн төв', href: '/help' },
    { label: 'Нөхцөл', href: '/terms' },
    { label: 'Нууцлал', href: '/privacy' },
    { label: 'Буцаалт', href: '/refund' },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/5 bg-ink-950">
      <div className="container mx-auto px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo-icon.svg" alt="" width={28} height={28} className="text-white" />
              <span className="font-display text-2xl font-medium text-white">
                GrandMaster<span className="italic font-light text-white/60">.mn</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm text-white/50 leading-relaxed">
              Монголын шилдэг онлайн шатрын академи. Их мастер багш нар, премиум хичээл, бодит ахиц.
            </p>
            <div className="mt-6 flex gap-3">
              {['facebook', 'instagram', 'youtube'].map((s) => (
                <a
                  key={s}
                  href="#"
                  className="h-10 w-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition"
                >
                  <span className="text-xs uppercase">{s[0]}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-semibold text-sm uppercase tracking-wider text-white/80 mb-4">
                {title}
              </h4>
              <ul className="space-y-2.5">
                {items.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/50 hover:text-white transition"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between gap-4 text-xs text-white/40">
          <p>© 2026 GrandMaster.mn. Бүх эрх хуулиар хамгаалагдсан.</p>
          <p>Made with ♥ in Ulaanbaatar</p>
        </div>
      </div>
    </footer>
  );
}
