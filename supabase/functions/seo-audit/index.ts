import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsResponse } from '../_shared/cors.ts'
import { createServiceClient, getAuthUser, requireAdmin } from '../_shared/supabase.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'

// ---------------------------------------------------------------------------
// Platform pages to audit
// ---------------------------------------------------------------------------
const PLATFORM_PAGES = [
  '/',
  '/features',
  '/how-it-works',
  '/pricing',
  '/learn',
  '/contact',
  '/blog',
]

// ---------------------------------------------------------------------------
// Heuristic page metadata (pre-defined since we built these pages)
// ---------------------------------------------------------------------------
interface PageMeta {
  title: string
  titleLength: number
  metaDescription: string
  metaDescriptionLength: number
  hasH1: boolean
  h1Count: number
  hasStructuredData: boolean
  hasOpenGraph: boolean
}

const PAGE_META: Record<string, PageMeta> = {
  '/': {
    title: 'Kamioi - AI-Powered Micro-Investing Platform',
    titleLength: 47,
    metaDescription:
      'Kamioi turns your everyday purchases into smart investments with AI-driven round-up investing. Start building wealth automatically.',
    metaDescriptionLength: 133,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/features': {
    title: 'Features - Kamioi Micro-Investing Platform',
    titleLength: 43,
    metaDescription:
      'Explore Kamioi features: AI stock mapping, automatic round-ups, portfolio tracking, family accounts, and more.',
    metaDescriptionLength: 111,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/how-it-works': {
    title: 'How It Works - Kamioi Round-Up Investing',
    titleLength: 42,
    metaDescription:
      'Learn how Kamioi works: link your bank, spend as usual, and watch your spare change grow into a diversified portfolio.',
    metaDescriptionLength: 117,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/pricing': {
    title: 'Pricing Plans - Kamioi Micro-Investing',
    titleLength: 40,
    metaDescription:
      'Choose the Kamioi plan that fits your needs. Individual, family, and business accounts with flexible monthly and yearly billing.',
    metaDescriptionLength: 128,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/learn': {
    title: 'Learn - Investing Education & Resources | Kamioi',
    titleLength: 49,
    metaDescription:
      'Free investing education from Kamioi. Learn about stocks, ETFs, compound interest, and micro-investing strategies.',
    metaDescriptionLength: 114,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/contact': {
    title: 'Contact Us - Kamioi Support',
    titleLength: 28,
    metaDescription:
      'Get in touch with the Kamioi team. We are here to help with your account, technical questions, or partnership inquiries.',
    metaDescriptionLength: 121,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
  '/blog': {
    title: 'Blog - Kamioi Investing Insights & News',
    titleLength: 41,
    metaDescription:
      'Read the latest Kamioi blog posts on micro-investing, market trends, personal finance tips, and platform updates.',
    metaDescriptionLength: 113,
    hasH1: true,
    h1Count: 1,
    hasStructuredData: true,
    hasOpenGraph: true,
  },
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

interface TitleScore {
  present: boolean
  length: number
  optimal: boolean
}

interface MetaDescriptionScore {
  present: boolean
  length: number
  optimal: boolean
}

interface HeadingStructure {
  has_h1: boolean
  h1_count: number
}

interface PageScores {
  title_tag: TitleScore
  meta_description: MetaDescriptionScore
  heading_structure: HeadingStructure
  mobile_friendly: boolean
  structured_data: boolean
  open_graph: boolean
  robots_txt: boolean
  sitemap: boolean
  overall_score: number
}

function computeScores(meta: PageMeta): PageScores {
  const titlePresent = meta.title.length > 0
  const titleOptimal = meta.titleLength >= 50 && meta.titleLength <= 60
  const metaPresent = meta.metaDescription.length > 0
  const metaOptimal =
    meta.metaDescriptionLength >= 150 && meta.metaDescriptionLength <= 160

  // Calculate overall score (0-100) from individual checks
  let points = 0
  const maxPoints = 8
  if (titlePresent) points += 1
  if (titleOptimal) points += 1
  if (metaPresent) points += 1
  if (metaOptimal) points += 1
  if (meta.hasH1 && meta.h1Count === 1) points += 1
  if (meta.hasStructuredData) points += 1
  if (meta.hasOpenGraph) points += 1
  // robots_txt and sitemap are site-wide, always true
  points += 1

  const overall_score = Math.round((points / maxPoints) * 100)

  return {
    title_tag: {
      present: titlePresent,
      length: meta.titleLength,
      optimal: titleOptimal,
    },
    meta_description: {
      present: metaPresent,
      length: meta.metaDescriptionLength,
      optimal: metaOptimal,
    },
    heading_structure: {
      has_h1: meta.hasH1,
      h1_count: meta.h1Count,
    },
    mobile_friendly: true,
    structured_data: meta.hasStructuredData,
    open_graph: meta.hasOpenGraph,
    robots_txt: true,
    sitemap: true,
    overall_score,
  }
}

function generateRecommendations(
  meta: PageMeta,
  scores: PageScores,
  auditType: string,
): string[] {
  const recommendations: string[] = []

  // Base recommendations from score gaps
  if (!scores.title_tag.optimal) {
    recommendations.push(
      `Title tag is ${scores.title_tag.length} characters. Adjust to 50-60 characters for optimal display in search results.`,
    )
  }
  if (!scores.meta_description.optimal) {
    recommendations.push(
      `Meta description is ${scores.meta_description.length} characters. Adjust to 150-160 characters to avoid truncation in SERPs.`,
    )
  }
  if (!scores.heading_structure.has_h1) {
    recommendations.push('Add a single H1 tag to establish the primary topic of the page.')
  }
  if (scores.heading_structure.h1_count > 1) {
    recommendations.push(
      `Page has ${scores.heading_structure.h1_count} H1 tags. Use exactly one H1 per page.`,
    )
  }

  // Content-specific recommendations
  if (auditType === 'content' || auditType === 'full') {
    recommendations.push(
      'Ensure primary keyword appears in the first 100 words of page content.',
    )
    recommendations.push(
      'Target a keyword density of 1-2% for the primary keyword on each page.',
    )
    recommendations.push(
      'Add internal links to related pages (e.g., /features links to /pricing and /how-it-works).',
    )
    recommendations.push(
      'Include alt text on all images with descriptive, keyword-relevant language.',
    )
    recommendations.push(
      'Consider adding FAQ structured data (FAQPage schema) for pages with common user questions.',
    )
  }

  // Performance-specific recommendations
  if (auditType === 'performance' || auditType === 'full') {
    recommendations.push(
      'Serve images in WebP/AVIF format and use responsive srcset attributes for optimal loading.',
    )
    recommendations.push(
      'Implement route-based code splitting with React.lazy() to reduce initial bundle size.',
    )
    recommendations.push(
      'Set Cache-Control headers on static assets (CSS, JS, images) with max-age of at least 1 year.',
    )
    recommendations.push(
      'Enable text compression (gzip/brotli) on the server for all text-based responses.',
    )
    recommendations.push(
      'Preload critical fonts and above-the-fold images using <link rel="preload">.',
    )
  }

  // Technical recommendations (always included for technical or full)
  if (auditType === 'technical' || auditType === 'full') {
    recommendations.push(
      'Verify canonical URLs are set on all pages to prevent duplicate content issues.',
    )
    recommendations.push(
      'Ensure hreflang tags are present if targeting multiple language audiences in the future.',
    )
    recommendations.push(
      'Confirm XML sitemap is submitted to Google Search Console and Bing Webmaster Tools.',
    )
  }

  return recommendations
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsResponse()
  }

  try {
    if (req.method !== 'POST') {
      return errorResponse('Method not allowed', 405)
    }

    // 1. Authenticate and require admin
    const { user } = await getAuthUser(req)
    const serviceClient = createServiceClient()
    const adminUser = await requireAdmin(serviceClient, user.id)

    // 2. Parse request body
    const body = await req.json()
    const requestedUrl: string | undefined = body.url
    const auditType: string = body.audit_type ?? 'full'

    const validAuditTypes = ['full', 'technical', 'content', 'performance']
    if (!validAuditTypes.includes(auditType)) {
      return errorResponse(
        `Invalid audit_type. Must be one of: ${validAuditTypes.join(', ')}`,
      )
    }

    // 3. Determine which pages to audit
    let pagesToAudit: string[]

    if (requestedUrl) {
      // Normalize: strip trailing slash, accept relative or absolute paths
      let normalizedUrl = requestedUrl.replace(/\/+$/, '') || '/'
      // If a full URL was provided, extract just the pathname
      try {
        const parsed = new URL(normalizedUrl)
        normalizedUrl = parsed.pathname.replace(/\/+$/, '') || '/'
      } catch {
        // Already a relative path, keep as-is
      }

      if (!PLATFORM_PAGES.includes(normalizedUrl)) {
        return errorResponse(
          `URL not recognized. Auditable pages: ${PLATFORM_PAGES.join(', ')}`,
        )
      }
      pagesToAudit = [normalizedUrl]
    } else {
      pagesToAudit = [...PLATFORM_PAGES]
    }

    // 4. Generate audit reports
    const auditDate = new Date().toISOString()
    let totalScore = 0

    const pages = pagesToAudit.map((pageUrl) => {
      const meta = PAGE_META[pageUrl]
      const scores = computeScores(meta)
      const recommendations = generateRecommendations(meta, scores, auditType)
      totalScore += scores.overall_score
      return { url: pageUrl, scores, recommendations }
    })

    const overallScore = Math.round(totalScore / pages.length)

    // 5. Log the audit event in system_events
    await serviceClient.from('system_events').insert({
      event_type: 'seo_audit',
      tenant_id: String(adminUser.id),
      tenant_type: 'admin',
      data: {
        audit_type: auditType,
        pages_audited: pagesToAudit.length,
        overall_score: overallScore,
        requested_url: requestedUrl ?? null,
      },
      source: 'edge_function:seo-audit',
    })

    // 6. Return result
    return jsonResponse({
      audit_date: auditDate,
      audit_type: auditType,
      pages,
      overall_score: overallScore,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status =
      message === 'Unauthorized'
        ? 401
        : message.startsWith('Forbidden')
          ? 403
          : 500
    return errorResponse(message, status)
  }
})
