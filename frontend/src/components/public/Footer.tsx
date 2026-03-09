import { Link } from 'react-router-dom'
import { useHomeContent } from '@/hooks/useHomeContent'

interface FooterColumn {
  title: string
  links: FooterLink[]
}

interface FooterLink {
  label: string
  to: string
  external?: boolean
}

const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Press', to: '/press' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Product',
    links: [
      { label: 'Features', to: '/features' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'How It Works', to: '/how-it-works' },
      { label: 'Blog', to: '/blog' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Getting Started', to: '/learn' },
      { label: 'FAQ', to: '/learn#faq' },
      { label: 'Security', to: '/learn#security' },
      { label: 'API Docs', to: '#', external: true },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '#', external: true },
      { label: 'Terms of Service', to: '#', external: true },
      { label: 'Cookie Policy', to: '#', external: true },
    ],
  },
]

interface SocialLink {
  label: string
  href: string
  icon: 'twitter' | 'linkedin' | 'github'
}

const SOCIAL_LINKS: SocialLink[] = [
  { label: 'Twitter', href: 'https://twitter.com', icon: 'twitter' },
  { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'linkedin' },
  { label: 'GitHub', href: 'https://github.com', icon: 'github' },
]

function SocialIcon({ icon }: { icon: SocialLink['icon'] }) {
  switch (icon) {
    case 'twitter':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
        </svg>
      )
    case 'linkedin':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      )
    case 'github':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
        </svg>
      )
  }
}

/**
 * Footer - Public page footer with 4-column link layout, gradient top border,
 * copyright bar, and social links.
 */
export function Footer() {
  const currentYear = new Date().getFullYear()
  const { content } = useHomeContent()

  return (
    <footer className="aurora-footer" role="contentinfo">
      <div className="aurora-footer__inner">
        {/* Brand section */}
        <div className="aurora-footer__brand">
          <Link to="/" className="aurora-footer__logo" aria-label="Kamioi home">
            {content.footer_company || 'Kamioi'}
          </Link>
          <p className="aurora-footer__tagline">
            {content.footer_tagline || 'AI-powered micro-investing. Round up your purchases and watch your wealth grow.'}
          </p>
          {/* App download badges */}
          {(content.app_store_url || content.play_store_url) && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              {content.app_store_url && (
                <a href={content.app_store_url} target="_blank" rel="noopener noreferrer" aria-label="Download on the App Store" style={{ opacity: 0.8, transition: 'opacity 200ms' }} onMouseEnter={e => { e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.8' }}>
                  <svg width="120" height="40" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="180" height="60" rx="10" fill="#000"/>
                    <text x="65" y="22" fill="#fff" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="400">Download on the</text>
                    <text x="65" y="40" fill="#fff" fontSize="17" fontFamily="system-ui, sans-serif" fontWeight="600">App Store</text>
                    <g transform="translate(18, 12)" fill="#fff"><path d="M28.9 27.5c-.1 3.1 2.5 4.6 2.6 4.6-.1.3-0.4 1.4-1.3 2.7-.8 1.2-1.6 2.3-2.9 2.4-1.3.1-1.7-.7-3.1-.7-1.5 0-1.9.7-3.1.8-1.2 0-2.2-1.3-3-2.5-1.6-2.4-2.9-6.8-1.2-9.7.8-1.5 2.3-2.4 3.9-2.4 1.2 0 2.4.8 3.1.8.8 0 2.2-1 3.7-.9.6 0 2.4.3 3.5 2-0.1.1-2.1 1.2-2.2 3.9zM26.1 20.9c.7-.8 1.1-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"/></g>
                  </svg>
                </a>
              )}
              {content.play_store_url && (
                <a href={content.play_store_url} target="_blank" rel="noopener noreferrer" aria-label="Get it on Google Play" style={{ opacity: 0.8, transition: 'opacity 200ms' }} onMouseEnter={e => { e.currentTarget.style.opacity = '1' }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.8' }}>
                  <svg width="120" height="40" viewBox="0 0 180 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="180" height="60" rx="10" fill="#000"/>
                    <text x="65" y="22" fill="#fff" fontSize="9" fontFamily="system-ui, sans-serif" fontWeight="400">GET IT ON</text>
                    <text x="65" y="40" fill="#fff" fontSize="16" fontFamily="system-ui, sans-serif" fontWeight="600">Google Play</text>
                    <g transform="translate(16, 13)"><path d="M4 2.5l16.5 12.5L4 27.5V2.5z" fill="#34A853"/><path d="M4 2.5l20 12.5-3.5 2.7L4 7.5V2.5z" fill="#FBBC04"/><path d="M4 27.5l16.5-10.2-3.5-2.7L4 22.5v5z" fill="#EA4335"/><path d="M20.5 15L24 17.5 20.5 20l-3.5-2.5 3.5-2.5z" fill="#4285F4"/></g>
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Link columns */}
        <div className="aurora-footer__columns">
          {FOOTER_COLUMNS.map(column => (
            <div key={column.title} className="aurora-footer__column">
              <h3 className="aurora-footer__column-title">{column.title}</h3>
              <ul className="aurora-footer__column-links">
                {column.links.map(link => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.to}
                        className="aurora-footer__link"
                        rel="noopener noreferrer"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link to={link.to} className="aurora-footer__link">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="aurora-footer__bottom">
        <p className="aurora-footer__copyright">
          {currentYear} {content.footer_copyright || 'Kamioi. All rights reserved.'}
        </p>
        <div className="aurora-footer__social">
          {SOCIAL_LINKS.map(social => (
            <a
              key={social.label}
              href={social.href}
              className="aurora-footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
            >
              <SocialIcon icon={social.icon} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
