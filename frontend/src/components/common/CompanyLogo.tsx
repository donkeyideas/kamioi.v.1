/**
 * Shared company logo utility — maps merchant names and ticker symbols
 * to their domains, uses Google Favicon V2 API for reliable logo fetching.
 */

/* ---- Types ---- */

export interface CompanyInfo {
  domain: string
  website: string
}

/* ---- Lookup table (lowercase keys for case-insensitive matching) ---- */

const LOOKUP_RAW: Record<string, CompanyInfo> = {
  // By merchant name
  'starbucks': { domain: 'starbucks.com', website: 'https://www.starbucks.com' },
  'amazon': { domain: 'amazon.com', website: 'https://www.amazon.com' },
  'uber': { domain: 'uber.com', website: 'https://www.uber.com' },
  'walmart': { domain: 'walmart.com', website: 'https://www.walmart.com' },
  'netflix': { domain: 'netflix.com', website: 'https://www.netflix.com' },
  'spotify': { domain: 'spotify.com', website: 'https://www.spotify.com' },
  'target': { domain: 'target.com', website: 'https://www.target.com' },
  'chipotle': { domain: 'chipotle.com', website: 'https://www.chipotle.com' },
  'shell gas': { domain: 'shell.com', website: 'https://www.shell.com' },
  'shell': { domain: 'shell.com', website: 'https://www.shell.com' },
  'costco': { domain: 'costco.com', website: 'https://www.costco.com' },
  'trader joes': { domain: 'traderjoes.com', website: 'https://www.traderjoes.com' },
  "trader joe's": { domain: 'traderjoes.com', website: 'https://www.traderjoes.com' },
  'cvs pharmacy': { domain: 'cvs.com', website: 'https://www.cvs.com' },
  'cvs': { domain: 'cvs.com', website: 'https://www.cvs.com' },
  'home depot': { domain: 'homedepot.com', website: 'https://www.homedepot.com' },
  'lyft': { domain: 'lyft.com', website: 'https://www.lyft.com' },
  'whole foods': { domain: 'wholefoodsmarket.com', website: 'https://www.wholefoodsmarket.com' },
  'chick-fil-a': { domain: 'chick-fil-a.com', website: 'https://www.chick-fil-a.com' },
  'best buy': { domain: 'bestbuy.com', website: 'https://www.bestbuy.com' },
  'mcdonalds': { domain: 'mcdonalds.com', website: 'https://www.mcdonalds.com' },
  "mcdonald's": { domain: 'mcdonalds.com', website: 'https://www.mcdonalds.com' },
  'apple': { domain: 'apple.com', website: 'https://www.apple.com' },
  'doordash': { domain: 'doordash.com', website: 'https://www.doordash.com' },
  'walgreens': { domain: 'walgreens.com', website: 'https://www.walgreens.com' },
  'nike': { domain: 'nike.com', website: 'https://www.nike.com' },
  'chevron': { domain: 'chevron.com', website: 'https://www.chevron.com' },
  'kroger': { domain: 'kroger.com', website: 'https://www.kroger.com' },
  'panera bread': { domain: 'panerabread.com', website: 'https://www.panerabread.com' },
  'panera': { domain: 'panerabread.com', website: 'https://www.panerabread.com' },
  // Teller sandbox + common merchants
  'aldi': { domain: 'aldi.us', website: 'https://www.aldi.us' },
  'expedia': { domain: 'expedia.com', website: 'https://www.expedia.com' },
  'staples': { domain: 'staples.com', website: 'https://www.staples.com' },
  'american express': { domain: 'americanexpress.com', website: 'https://www.americanexpress.com' },
  'amex': { domain: 'americanexpress.com', website: 'https://www.americanexpress.com' },
  'ebay': { domain: 'ebay.com', website: 'https://www.ebay.com' },
  'paypal': { domain: 'paypal.com', website: 'https://www.paypal.com' },
  'venmo': { domain: 'venmo.com', website: 'https://www.venmo.com' },
  'grubhub': { domain: 'grubhub.com', website: 'https://www.grubhub.com' },
  'uber eats': { domain: 'ubereats.com', website: 'https://www.ubereats.com' },
  'instacart': { domain: 'instacart.com', website: 'https://www.instacart.com' },
  'lowes': { domain: 'lowes.com', website: 'https://www.lowes.com' },
  "lowe's": { domain: 'lowes.com', website: 'https://www.lowes.com' },
  'safeway': { domain: 'safeway.com', website: 'https://www.safeway.com' },
  'publix': { domain: 'publix.com', website: 'https://www.publix.com' },
  'wendys': { domain: 'wendys.com', website: 'https://www.wendys.com' },
  "wendy's": { domain: 'wendys.com', website: 'https://www.wendys.com' },
  'burger king': { domain: 'bk.com', website: 'https://www.bk.com' },
  'taco bell': { domain: 'tacobell.com', website: 'https://www.tacobell.com' },
  'subway': { domain: 'subway.com', website: 'https://www.subway.com' },
  'dominos': { domain: 'dominos.com', website: 'https://www.dominos.com' },
  "domino's": { domain: 'dominos.com', website: 'https://www.dominos.com' },
  'pizza hut': { domain: 'pizzahut.com', website: 'https://www.pizzahut.com' },
  'dunkin': { domain: 'dunkindonuts.com', website: 'https://www.dunkindonuts.com' },
  "dunkin'": { domain: 'dunkindonuts.com', website: 'https://www.dunkindonuts.com' },
  'gap': { domain: 'gap.com', website: 'https://www.gap.com' },
  'old navy': { domain: 'oldnavy.gap.com', website: 'https://oldnavy.gap.com' },
  'nordstrom': { domain: 'nordstrom.com', website: 'https://www.nordstrom.com' },
  'macys': { domain: 'macys.com', website: 'https://www.macys.com' },
  "macy's": { domain: 'macys.com', website: 'https://www.macys.com' },
  'tjmaxx': { domain: 'tjmaxx.com', website: 'https://www.tjmaxx.com' },
  't.j. maxx': { domain: 'tjmaxx.com', website: 'https://www.tjmaxx.com' },
  'ross': { domain: 'rossstores.com', website: 'https://www.rossstores.com' },
  'sephora': { domain: 'sephora.com', website: 'https://www.sephora.com' },
  'ulta': { domain: 'ulta.com', website: 'https://www.ulta.com' },
  'bath & body works': { domain: 'bathandbodyworks.com', website: 'https://www.bathandbodyworks.com' },
  'disney': { domain: 'disney.com', website: 'https://www.disney.com' },
  'hulu': { domain: 'hulu.com', website: 'https://www.hulu.com' },
  'youtube': { domain: 'youtube.com', website: 'https://www.youtube.com' },
  'google': { domain: 'google.com', website: 'https://www.google.com' },
  'microsoft': { domain: 'microsoft.com', website: 'https://www.microsoft.com' },
  'att': { domain: 'att.com', website: 'https://www.att.com' },
  'at&t': { domain: 'att.com', website: 'https://www.att.com' },
  'verizon': { domain: 'verizon.com', website: 'https://www.verizon.com' },
  't-mobile': { domain: 't-mobile.com', website: 'https://www.t-mobile.com' },
  'sprint': { domain: 'sprint.com', website: 'https://www.sprint.com' },
  // By ticker (keep as-is for ticker lookups)
  'nflx': { domain: 'netflix.com', website: 'https://www.netflix.com' },
  'nke': { domain: 'nike.com', website: 'https://www.nike.com' },
  'amzn': { domain: 'amazon.com', website: 'https://www.amazon.com' },
  'wmt': { domain: 'walmart.com', website: 'https://www.walmart.com' },
  'sbux': { domain: 'starbucks.com', website: 'https://www.starbucks.com' },
  'spot': { domain: 'spotify.com', website: 'https://www.spotify.com' },
  'tgt': { domain: 'target.com', website: 'https://www.target.com' },
  'cmg': { domain: 'chipotle.com', website: 'https://www.chipotle.com' },
  'shel': { domain: 'shell.com', website: 'https://www.shell.com' },
  'cost': { domain: 'costco.com', website: 'https://www.costco.com' },
  'hd': { domain: 'homedepot.com', website: 'https://www.homedepot.com' },
  'bby': { domain: 'bestbuy.com', website: 'https://www.bestbuy.com' },
  'mcd': { domain: 'mcdonalds.com', website: 'https://www.mcdonalds.com' },
  'aapl': { domain: 'apple.com', website: 'https://www.apple.com' },
  'dash': { domain: 'doordash.com', website: 'https://www.doordash.com' },
  'wba': { domain: 'walgreens.com', website: 'https://www.walgreens.com' },
  'cvx': { domain: 'chevron.com', website: 'https://www.chevron.com' },
  'kr': { domain: 'kroger.com', website: 'https://www.kroger.com' },
  'pnra': { domain: 'panerabread.com', website: 'https://www.panerabread.com' },
  'expe': { domain: 'expedia.com', website: 'https://www.expedia.com' },
  'pypl': { domain: 'paypal.com', website: 'https://www.paypal.com' },
}

/**
 * Case-insensitive lookup. Also exported for backward compatibility.
 * Proxied object that does case-insensitive key access.
 */
function findCompany(key: string): CompanyInfo | undefined {
  return LOOKUP_RAW[key.toLowerCase()]
}

export const COMPANY_LOOKUP: Record<string, CompanyInfo> = new Proxy({} as Record<string, CompanyInfo>, {
  get(_target, prop: string) {
    return findCompany(prop)
  },
  has(_target, prop: string) {
    return findCompany(prop) !== undefined
  },
})

/* ---- Helper: format ALL CAPS merchant names to Title Case ---- */

export function formatMerchantName(name: string): string {
  if (!name) return name
  // If ALL CAPS or all lowercase, convert to title case
  if (name === name.toUpperCase() || name === name.toLowerCase()) {
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }
  return name
}

/* ---- Helper: build Google Favicon V2 URL ---- */

export function getLogoUrl(key: string): string {
  const info = findCompany(key)
  if (!info) return ''
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${info.domain}&size=128`
}

/* ---- React component ---- */

export function CompanyLogo({ name, size = 20 }: { name: string; size?: number }) {
  const info = findCompany(name)
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
  const info = findCompany(name)
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
