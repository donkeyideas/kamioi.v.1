import type { ReactNode } from 'react'
import { AuroraBackground } from '@/components/layout/AuroraBackground.tsx'
import { PublicNav } from './PublicNav.tsx'
import { Footer } from './Footer.tsx'

interface PublicLayoutProps {
  children: ReactNode
}

/**
 * PublicLayout - Wrapper for all public (non-dashboard) pages.
 * Renders the aurora animated background, sticky navigation bar,
 * scrollable main content area, and the site footer.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <>
      <AuroraBackground />
      <div className="aurora-public-layout">
        <PublicNav />
        <main className="aurora-public-layout__main">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}

/**
 * Default export for convenience — allows both
 * `import PublicLayout` and `import { PublicLayout }` usage.
 */
export default PublicLayout
