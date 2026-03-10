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
      { label: 'Getting Started', to: '/getting-started' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Security', to: '/security' },
      { label: 'API Docs', to: '/api-docs' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy-policy' },
      { label: 'Terms of Service', to: '/terms-of-service' },
      { label: 'Cookie Policy', to: '/cookie-policy' },
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
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
              {content.app_store_url && (
                <a
                  href={content.app_store_url !== '#' ? content.app_store_url : undefined}
                  onClick={content.app_store_url === '#' ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                  target={content.app_store_url !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label="Download on the App Store"
                  style={{ opacity: content.app_store_url === '#' ? 0.4 : 0.7, transition: 'opacity 200ms', cursor: content.app_store_url === '#' ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (content.app_store_url !== '#') e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = content.app_store_url === '#' ? '0.4' : '0.7' }}
                >
                  <img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" style={{ display: 'block', height: '36px' }} />
                </a>
              )}
              {content.play_store_url && (
                <a
                  href={content.play_store_url !== '#' ? content.play_store_url : undefined}
                  onClick={content.play_store_url === '#' ? (e: React.MouseEvent) => e.preventDefault() : undefined}
                  target={content.play_store_url !== '#' ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  aria-label="Get it on Google Play"
                  style={{ opacity: content.play_store_url === '#' ? 0.4 : 0.7, transition: 'opacity 200ms', cursor: content.play_store_url === '#' ? 'default' : 'pointer' }}
                  onMouseEnter={e => { if (content.play_store_url !== '#') e.currentTarget.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = content.play_store_url === '#' ? '0.4' : '0.7' }}
                >
                  <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" style={{ display: 'block', height: '52px', marginTop: '-8px', marginBottom: '-8px' }} />
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
