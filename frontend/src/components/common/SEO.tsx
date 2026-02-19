import { useEffect } from 'react'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  noindex?: boolean
}

/**
 * SEO component that manages document head meta tags via useEffect.
 * Sets title, description, Open Graph, Twitter Card, canonical, and robots tags.
 * Cleans up created/modified meta tags on unmount.
 */
export function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} | Kamioi` : 'Kamioi'

    const metaTags: Array<{ property?: string; name?: string; content: string }> = []

    if (description) {
      metaTags.push({ name: 'description', content: description })
    }

    // Open Graph tags
    metaTags.push({ property: 'og:title', content: title ? `${title} | Kamioi` : 'Kamioi' })
    if (description) {
      metaTags.push({ property: 'og:description', content: description })
    }
    if (ogImage) {
      metaTags.push({ property: 'og:image', content: ogImage })
    }
    metaTags.push({ property: 'og:type', content: ogType })
    if (canonical) {
      metaTags.push({ property: 'og:url', content: canonical })
    }

    // Twitter Card tags
    metaTags.push({ name: 'twitter:card', content: 'summary_large_image' })
    metaTags.push({ name: 'twitter:title', content: title ? `${title} | Kamioi` : 'Kamioi' })
    if (description) {
      metaTags.push({ name: 'twitter:description', content: description })
    }

    // Robots
    if (noindex) {
      metaTags.push({ name: 'robots', content: 'noindex, nofollow' })
    }

    // Track elements we create/modify so we can clean up
    const createdElements: HTMLElement[] = []
    const modifiedElements: Array<{ el: HTMLElement; prevContent: string | null }> = []

    // Set or create meta tags
    for (const tag of metaTags) {
      const selector = tag.property
        ? `meta[property="${tag.property}"]`
        : `meta[name="${tag.name}"]`
      let el = document.querySelector<HTMLMetaElement>(selector)

      if (el) {
        modifiedElements.push({ el, prevContent: el.getAttribute('content') })
        el.setAttribute('content', tag.content)
      } else {
        el = document.createElement('meta')
        if (tag.property) {
          el.setAttribute('property', tag.property)
        }
        if (tag.name) {
          el.setAttribute('name', tag.name)
        }
        el.setAttribute('content', tag.content)
        document.head.appendChild(el)
        createdElements.push(el)
      }
    }

    // Canonical link
    let canonicalEl: HTMLLinkElement | null = null
    let prevCanonicalHref: string | null = null
    if (canonical) {
      canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (canonicalEl) {
        prevCanonicalHref = canonicalEl.getAttribute('href')
        canonicalEl.setAttribute('href', canonical)
      } else {
        canonicalEl = document.createElement('link')
        canonicalEl.setAttribute('rel', 'canonical')
        canonicalEl.setAttribute('href', canonical)
        document.head.appendChild(canonicalEl)
        createdElements.push(canonicalEl)
      }
    }

    return () => {
      document.title = previousTitle

      // Remove elements we created
      for (const el of createdElements) {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      }

      // Restore elements we modified
      for (const { el, prevContent } of modifiedElements) {
        if (prevContent !== null) {
          el.setAttribute('content', prevContent)
        }
      }

      // Restore canonical if we modified an existing one (not created)
      if (canonical && canonicalEl && prevCanonicalHref !== null && !createdElements.includes(canonicalEl)) {
        canonicalEl.setAttribute('href', prevCanonicalHref)
      }
    }
  }, [title, description, canonical, ogImage, ogType, noindex])

  return null
}
