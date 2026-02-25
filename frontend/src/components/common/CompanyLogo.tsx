/**
 * Shared company logo utility — maps merchant names and ticker symbols
 * to their domains, uses Google Favicon V2 API for reliable logo fetching.
 */

/* ---- Types ---- */

export interface CompanyInfo {
  domain: string
  website: string
}

/* ---- Lookup table (merchant names + tickers → domain/website) ---- */

export const COMPANY_LOOKUP: Record<string, CompanyInfo> = {
  // By merchant name
  'Starbucks': { domain: 'starbucks.com', website: 'https://www.starbucks.com' },
  'Amazon': { domain: 'amazon.com', website: 'https://www.amazon.com' },
  'Uber': { domain: 'uber.com', website: 'https://www.uber.com' },
  'Walmart': { domain: 'walmart.com', website: 'https://www.walmart.com' },
  'Netflix': { domain: 'netflix.com', website: 'https://www.netflix.com' },
  'Spotify': { domain: 'spotify.com', website: 'https://www.spotify.com' },
  'Target': { domain: 'target.com', website: 'https://www.target.com' },
  'Chipotle': { domain: 'chipotle.com', website: 'https://www.chipotle.com' },
  'Shell Gas': { domain: 'shell.com', website: 'https://www.shell.com' },
  'Costco': { domain: 'costco.com', website: 'https://www.costco.com' },
  'Trader Joes': { domain: 'traderjoes.com', website: 'https://www.traderjoes.com' },
  'CVS Pharmacy': { domain: 'cvs.com', website: 'https://www.cvs.com' },
  'Home Depot': { domain: 'homedepot.com', website: 'https://www.homedepot.com' },
  'Lyft': { domain: 'lyft.com', website: 'https://www.lyft.com' },
  'Whole Foods': { domain: 'wholefoodsmarket.com', website: 'https://www.wholefoodsmarket.com' },
  'Chick-fil-A': { domain: 'chick-fil-a.com', website: 'https://www.chick-fil-a.com' },
  'Best Buy': { domain: 'bestbuy.com', website: 'https://www.bestbuy.com' },
  'McDonalds': { domain: 'mcdonalds.com', website: 'https://www.mcdonalds.com' },
  'Apple': { domain: 'apple.com', website: 'https://www.apple.com' },
  'DoorDash': { domain: 'doordash.com', website: 'https://www.doordash.com' },
  'Walgreens': { domain: 'walgreens.com', website: 'https://www.walgreens.com' },
  'Nike': { domain: 'nike.com', website: 'https://www.nike.com' },
  'Chevron': { domain: 'chevron.com', website: 'https://www.chevron.com' },
  'Kroger': { domain: 'kroger.com', website: 'https://www.kroger.com' },
  'Panera Bread': { domain: 'panerabread.com', website: 'https://www.panerabread.com' },
  // By ticker
  'NFLX': { domain: 'netflix.com', website: 'https://www.netflix.com' },
  'NKE': { domain: 'nike.com', website: 'https://www.nike.com' },
  'AMZN': { domain: 'amazon.com', website: 'https://www.amazon.com' },
  'WMT': { domain: 'walmart.com', website: 'https://www.walmart.com' },
  'SBUX': { domain: 'starbucks.com', website: 'https://www.starbucks.com' },
  'UBER': { domain: 'uber.com', website: 'https://www.uber.com' },
  'SPOT': { domain: 'spotify.com', website: 'https://www.spotify.com' },
  'TGT': { domain: 'target.com', website: 'https://www.target.com' },
  'CMG': { domain: 'chipotle.com', website: 'https://www.chipotle.com' },
  'SHEL': { domain: 'shell.com', website: 'https://www.shell.com' },
  'COST': { domain: 'costco.com', website: 'https://www.costco.com' },
  'CVS': { domain: 'cvs.com', website: 'https://www.cvs.com' },
  'HD': { domain: 'homedepot.com', website: 'https://www.homedepot.com' },
  'LYFT': { domain: 'lyft.com', website: 'https://www.lyft.com' },
  'BBY': { domain: 'bestbuy.com', website: 'https://www.bestbuy.com' },
  'MCD': { domain: 'mcdonalds.com', website: 'https://www.mcdonalds.com' },
  'AAPL': { domain: 'apple.com', website: 'https://www.apple.com' },
  'DASH': { domain: 'doordash.com', website: 'https://www.doordash.com' },
  'WBA': { domain: 'walgreens.com', website: 'https://www.walgreens.com' },
  'CVX': { domain: 'chevron.com', website: 'https://www.chevron.com' },
  'KR': { domain: 'kroger.com', website: 'https://www.kroger.com' },
  'PNRA': { domain: 'panerabread.com', website: 'https://www.panerabread.com' },
}

/* ---- Helper: build Google Favicon V2 URL ---- */

export function getLogoUrl(key: string): string {
  const info = COMPANY_LOOKUP[key]
  if (!info) return ''
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${info.domain}&size=128`
}

/* ---- React component ---- */

export function CompanyLogo({ name, size = 20 }: { name: string; size?: number }) {
  const info = COMPANY_LOOKUP[name]
  if (!info) return null
  const primaryUrl = `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${info.domain}&size=128`
  const fallbackUrl = `https://icons.duckduckgo.com/ip3/${info.domain}.ico`
  return (
    <img
      src={primaryUrl}
      alt={name}
      width={size}
      height={size}
      style={{
        borderRadius: '4px',
        objectFit: 'contain',
        flexShrink: 0,
      }}
      loading="lazy"
      onError={(e) => {
        const img = e.target as HTMLImageElement
        if (img.src !== fallbackUrl) {
          img.src = fallbackUrl
        } else {
          img.style.display = 'none'
        }
      }}
    />
  )
}

/* ---- Helper: wrap content in a link to company website ---- */

export function CompanyLink({
  name,
  children,
}: {
  name: string
  children: React.ReactNode
}) {
  const info = COMPANY_LOOKUP[name]
  if (!info) return <>{children}</>
  return (
    <a
      href={info.website}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {children}
    </a>
  )
}
