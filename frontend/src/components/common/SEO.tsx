import { useEffect } from 'react'
import { useSeoSettings } from '@/hooks/useSeoSettings'

interface SEOProps {
  title?: string
  description?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  noindex?: boolean
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * SEO component that manages document head meta tags via useEffect.
 * Reads global defaults from admin SEO settings (site title, description, OG image, etc.).
 * Per-page props override the global defaults.
 */
export function SEO({
  title,
  description,
  canonical,
  ogImage,
  ogType = 'website',
  noindex = false,
  jsonLd,
}: SEOProps) {
  const { seoSettings } = useSeoSettings()

  const siteName = seoSettings.site_title || 'Kamioi'
  const resolvedDescription = description || seoSettings.meta_description
  const resolvedOgImage = ogImage || seoSettings.og_image_url
  const twitterHandle = seoSettings.twitter_handle
  const keywords = seoSettings.keywords

  useEffect(() => {
    const previousTitle = document.title
    document.title = title ? `${title} | ${siteName}` : siteName

    const metaTags: Array<{ property?: string; name?: string; content: string }> = []

    if (resolvedDescription) {
      metaTags.push({ name: 'description', content: resolvedDescription })
    }

    if (keywords) {
      metaTags.push({ name: 'keywords', content: keywords })
    }

    // Open Graph tags
    metaTags.push({ property: 'og:title', content: title ? `${title} | ${siteName}` : siteName })
    if (resolvedDescription) {
      metaTags.push({ property: 'og:description', content: resolvedDescription })
    }
    if (resolvedOgImage) {
      metaTags.push({ property: 'og:image', content: resolvedOgImage })
    }
    metaTags.push({ property: 'og:type', content: ogType })
    if (canonical) {
      metaTags.push({ property: 'og:url', content: canonical })
    }
    metaTags.push({ property: 'og:site_name', content: siteName })

    // Twitter Card tags
    metaTags.push({ name: 'twitter:card', content: 'summary_large_image' })
    metaTags.push({ name: 'twitter:title', content: title ? `${title} | ${siteName}` : siteName })
    if (resolvedDescription) {
      metaTags.push({ name: 'twitter:description', content: resolvedDescription })
    }
    if (resolvedOgImage) {
      metaTags.push({ name: 'twitter:image', content: resolvedOgImage })
    }
    if (twitterHandle) {
      const handle = twitterHandle.startsWith('@') ? twitterHandle : `@${twitterHandle}`
      metaTags.push({ name: 'twitter:site', content: handle })
      metaTags.push({ name: 'twitter:creator', content: handle })
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

    // JSON-LD structured data
    if (jsonLd) {
      const schemas = Array.isArray(jsonLd) ? jsonLd : [jsonLd]
      for (const schema of schemas) {
        const script = document.createElement('script')
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify(schema)
        script.setAttribute('data-seo-jsonld', 'true')
        document.head.appendChild(script)
        createdElements.push(script)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, resolvedDescription, canonical, resolvedOgImage, ogType, noindex, siteName, twitterHandle, keywords, JSON.stringify(jsonLd)])

  return null
}
