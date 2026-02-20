import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PublicLayout } from '@/components/public'
import { GlassCard } from '@/components/ui'
import { SEO } from '@/components/common/SEO.tsx'
import { renderMarkdown } from '@/utils/markdown'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface BlogPostData {
  id: number
  slug: string
  title: string
  content: string
  author?: string | null
  category?: string | null
  read_time?: number | null
  status: string
  created_at: string
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

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const sectionStyle: React.CSSProperties = {
  maxWidth: 800,
  margin: '0 auto',
  padding: '80px 40px',
}

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  fontWeight: 600,
  color: '#06B6D4',
  textDecoration: 'none',
  marginBottom: 32,
}

const titleStyle: React.CSSProperties = {
  fontSize: 'clamp(28px, 5vw, 42px)',
  fontWeight: 800,
  lineHeight: 1.2,
  color: 'var(--text-primary)',
  marginBottom: 16,
}

const metaStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  fontSize: 14,
  color: 'var(--text-muted)',
  marginBottom: 40,
}

const contentStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.75,
  color: 'var(--text-secondary)',
}

const centerStyle: React.CSSProperties = {
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

/** Detect if content looks like HTML */
function isHTML(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str)
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const [post, setPost] = useState<BlogPostData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function fetchPost() {
      if (!slug) {
        setNotFound(true)
        setLoading(false)
        return
      }

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .single()

        if (error || !data) {
          if (!cancelled) setNotFound(true)
        } else if (!cancelled) {
          setPost(data as unknown as BlogPostData)
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void fetchPost()
    return () => {
      cancelled = true
    }
  }, [slug])

  /* Loading state */
  if (loading) {
    return (
      <PublicLayout>
        <SEO title="Loading..." />
        <section style={sectionStyle}>
          <p style={centerStyle}>Loading post...</p>
        </section>
      </PublicLayout>
    )
  }

  /* Not found state */
  if (notFound || !post) {
    return (
      <PublicLayout>
        <SEO title="Post Not Found" noindex />
        <section style={sectionStyle}>
          <div style={centerStyle}>
            <GlassCard accent="purple" style={{ display: 'inline-block', textAlign: 'center' }}>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: 12,
                }}
              >
                Post not found
              </h2>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  marginBottom: 20,
                }}
              >
                The blog post you are looking for does not exist or has been removed.
              </p>
              <Link
                to="/blog"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#06B6D4',
                  textDecoration: 'none',
                }}
              >
                Back to Blog
              </Link>
            </GlassCard>
          </div>
        </section>
      </PublicLayout>
    )
  }

  /* Post content */
  const htmlContent = isHTML(post.content)

  return (
    <PublicLayout>
      <SEO
        title={post.title}
        description={post.content.replace(/<[^>]*>/g, '').slice(0, 160)}
        canonical={`https://kamioi.com/blog/${post.slug}`}
        ogType="article"
      />

      {/* Featured image banner */}
      <div
        style={{
          width: '100%',
          maxWidth: 1200,
          margin: '0 auto',
          height: 280,
          background: getGradient(post.category),
          borderRadius: '0 0 16px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: 72,
            opacity: 0.1,
            fontWeight: 800,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 6,
          }}
        >
          {post.category || 'Kamioi'}
        </span>
        {post.category && (
          <span
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              padding: '6px 14px',
              borderRadius: 8,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {post.category}
          </span>
        )}
      </div>

      <section style={sectionStyle}>
        {/* Back link */}
        <Link to="/blog" style={backLinkStyle}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M10 12L6 8L10 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Blog
        </Link>

        {/* Title */}
        <h1 style={titleStyle}>{post.title}</h1>

        {/* Meta */}
        <div style={metaStyle}>
          {post.author && <span>{post.author}</span>}
          {post.author && <span style={{ opacity: 0.3 }}>|</span>}
          <time dateTime={post.created_at}>{formatDate(post.created_at)}</time>
          {post.read_time && post.read_time > 0 && (
            <>
              <span style={{ opacity: 0.3 }}>|</span>
              <span>{post.read_time} min read</span>
            </>
          )}
        </div>

        {/* Content */}
        {htmlContent ? (
          <div
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div
            style={contentStyle}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
        )}
      </section>
    </PublicLayout>
  )
}
