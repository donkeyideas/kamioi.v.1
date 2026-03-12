import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public'
import { GlassCard } from '@/components/ui'
import { SEO } from '@/components/common/SEO.tsx'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BlogPost {
  id: number
  slug: string
  title: string
  content: string
  excerpt?: string | null
  featured_image?: string | null
  category?: string | null
  status: string
  author?: string | null
  created_at: string
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const POSTS_PER_PAGE = 9

const CATEGORY_GRADIENTS: Record<string, string> = {
  Investing: 'var(--gradient-primary, linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%))',
  Finance: 'var(--gradient-step2, linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%))',
  Education: 'var(--gradient-step3, linear-gradient(135deg, #06B6D4 0%, #10B981 100%))',
  Technology: 'var(--gradient-icon-pink, linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%))',
  Lifestyle: 'var(--gradient-icon-amber, linear-gradient(135deg, #F59E0B 0%, #EF4444 100%))',
  Savings: 'var(--gradient-icon-teal, linear-gradient(135deg, #10B981 0%, #3B82F6 100%))',
  Beginners: 'var(--gradient-icon-purple, linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%))',
}

function getGradient(category?: string | null): string {
  if (category && CATEGORY_GRADIENTS[category]) return CATEGORY_GRADIENTS[category]
  return 'var(--gradient-text, linear-gradient(135deg, #7C3AED 0%, #3B82F6 50%, #06B6D4 100%))'
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[-*_]{3,}/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getExcerpt(post: BlogPost, maxLen = 150): string {
  const text = post.excerpt || post.content
  const plain = stripMarkdown(text)
  if (plain.length <= maxLen) return plain
  return plain.slice(0, maxLen).trimEnd() + '...'
}

/* ------------------------------------------------------------------ */
/*  Blog post card                                                     */
/* ------------------------------------------------------------------ */

function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <GlassCard
        accent="purple"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          cursor: 'pointer',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Image / Gradient header */}
        <div
          style={{
            height: 200,
            background: getGradient(post.category),
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {post.featured_image && !post.featured_image.startsWith('http://localhost') ? (
            <img
              src={post.featured_image}
              alt={post.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span
                style={{
                  fontSize: 48,
                  opacity: 0.15,
                  fontWeight: 800,
                  color: '#fff',
                  textTransform: 'uppercase',
                  letterSpacing: 4,
                }}
              >
                {post.category || 'Kamioi'}
              </span>
            </div>
          )}
          {post.category && (
            <span
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                fontSize: 11,
                fontWeight: 600,
                color: '#fff',
                background: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(4px)',
                padding: '4px 10px',
                borderRadius: 6,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {post.category}
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <time
            dateTime={post.created_at}
            style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}
          >
            {formatDate(post.created_at)}
          </time>

          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.35,
              marginBottom: 12,
            }}
          >
            {post.title}
          </h2>

          <p
            style={{
              fontSize: 14,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              flex: 1,
              margin: '0 0 16px',
            }}
          >
            {getExcerpt(post)}
          </p>

          <span style={{ fontSize: 13, fontWeight: 600, color: '#06B6D4' }}>
            Read more &rarr;
          </span>
        </div>
      </GlassCard>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  const btnBase: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    minWidth: 40,
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    border: '1px solid var(--border-subtle)',
    background: 'var(--surface-card)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    transition: 'all 200ms ease',
  }

  const activeBtn: React.CSSProperties = {
    ...btnBase,
    background: 'var(--gradient-primary, linear-gradient(135deg, #7C3AED, #3B82F6))',
    color: '#fff',
    border: 'none',
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 48 }}>
      <button
        style={{ ...btnBase, padding: '0 12px', opacity: currentPage === 1 ? 0.4 : 1 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        &larr; Prev
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`dots-${i}`} style={{ ...btnBase, border: 'none', background: 'transparent', cursor: 'default' }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            style={p === currentPage ? activeBtn : btnBase}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        style={{ ...btnBase, padding: '0 12px', opacity: currentPage === totalPages ? 0.4 : 1 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next &rarr;
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    let cancelled = false

    async function fetchPosts() {
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('blog_posts')
          .select('id,slug,title,content,excerpt,featured_image,category,status,author,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(200)

        if (error) throw error
        if (!cancelled && data) {
          setPosts(data as unknown as BlogPost[])
        }
      } catch {
        if (!cancelled) {
          setError(true)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchPosts()
    return () => {
      cancelled = true
    }
  }, [])

  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)
  const startIdx = (currentPage - 1) * POSTS_PER_PAGE
  const visiblePosts = posts.slice(startIdx, startIdx + POSTS_PER_PAGE)

  function handlePageChange(page: number) {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <PublicLayout>
      <SEO
        title="Blog"
        description="Insights on investing, fintech, and building wealth from the Kamioi team."
        canonical="https://kamioi.com/blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kamioi.com/' },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://kamioi.com/blog' },
          ],
        }}
      />

      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 40px' }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 16,
              backgroundImage: 'var(--gradient-text, linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4))',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Kamioi Blog
          </h1>
          <p style={{ fontSize: 18, color: 'var(--text-secondary)', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
            Insights on investing, fintech, and building wealth.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <p style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 16 }}>
            Loading posts...
          </p>
        )}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <p style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)', fontSize: 16 }}>
            No blog posts yet. Check back soon.
          </p>
        )}

        {/* Grid */}
        {!loading && visiblePosts.length > 0 && (
          <>
            <div className="blog-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>

            {/* Page info */}
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
              Showing {startIdx + 1}–{Math.min(startIdx + POSTS_PER_PAGE, posts.length)} of {posts.length} posts
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>

      {/* Responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          .blog-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .blog-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </PublicLayout>
  )
}
