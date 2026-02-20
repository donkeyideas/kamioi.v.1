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
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '80px 40px',
}

const heroStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 56,
}

const h1Style: React.CSSProperties = {
  fontSize: 'clamp(32px, 5vw, 48px)',
  fontWeight: 800,
  lineHeight: 1.15,
  marginBottom: 16,
  background: 'linear-gradient(135deg, #7C3AED, #3B82F6, #06B6D4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const subtitleStyle: React.CSSProperties = {
  fontSize: 18,
  color: 'var(--text-secondary)',
  maxWidth: 520,
  margin: '0 auto',
  lineHeight: 1.6,
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: 24,
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Investing: 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)',
  Finance: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
  Education: 'linear-gradient(135deg, #06B6D4 0%, #10B981 100%)',
  Technology: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  Lifestyle: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
  Savings: 'linear-gradient(135deg, #10B981 0%, #3B82F6 100%)',
  Beginners: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
}

function getGradient(category?: string | null): string {
  if (category && CATEGORY_GRADIENTS[category]) return CATEGORY_GRADIENTS[category]
  return 'linear-gradient(135deg, #7C3AED 0%, #3B82F6 50%, #06B6D4 100%)'
}

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text-muted)',
  fontSize: 16,
}

const loadingStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '60px 20px',
  color: 'var(--text-muted)',
  fontSize: 16,
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
    .replace(/^#{1,6}\s+/gm, '')        // headings
    .replace(/\*\*(.+?)\*\*/g, '$1')    // bold
    .replace(/\*(.+?)\*/g, '$1')        // italic
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/`([^`]+)`/g, '$1')        // inline code
    .replace(/^[-*]\s+/gm, '')          // list bullets
    .replace(/^\d+\.\s+/gm, '')         // ordered lists
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/```[\s\S]*?```/g, '')     // code blocks
    .replace(/[-*_]{3,}/g, '')          // horizontal rules
    .replace(/<[^>]*>/g, '')            // HTML tags
    .replace(/\n+/g, ' ')              // newlines to spaces
    .replace(/\s+/g, ' ')              // collapse spaces
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
            height: 180,
            background: getGradient(post.category),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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
          {/* Date */}
          <time
            dateTime={post.created_at}
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            {formatDate(post.created_at)}
          </time>

          {/* Title */}
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

          {/* Excerpt */}
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

          {/* Read more */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#06B6D4',
            }}
          >
            Read more &rarr;
          </span>
        </div>
      </GlassCard>
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Blog() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [, setError] = useState(false)

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
          .limit(50)

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

  return (
    <PublicLayout>
      <SEO
        title="Blog"
        description="Insights on investing, fintech, and building wealth from the Kamioi team."
      />

      <section style={sectionStyle}>
        {/* Hero */}
        <div style={heroStyle}>
          <h1 style={h1Style}>Kamioi Blog</h1>
          <p style={subtitleStyle}>
            Insights on investing, fintech, and building wealth.
          </p>
        </div>

        {/* Loading */}
        {loading && <p style={loadingStyle}>Loading posts...</p>}

        {/* Empty state */}
        {!loading && posts.length === 0 && (
          <p style={emptyStyle}>No blog posts yet. Check back soon.</p>
        )}

        {/* Grid */}
        {!loading && posts.length > 0 && (
          <div style={gridStyle} className="blog-grid">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
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
