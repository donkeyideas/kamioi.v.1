"""
Blog Data Migration Script
Pulls blog posts from the old Kamioi Render PostgreSQL database
and inserts them into the new Supabase blog_posts table.

Usage:
  1. Set environment variables:
     OLD_DATABASE_URL=postgresql://...  (Render DB connection string)
     SUPABASE_URL=https://oihrbeyprqqoahocswgk.supabase.co
     SUPABASE_SERVICE_KEY=eyJ...  (service_role key)

  2. Install dependencies:
     pip install psycopg2-binary supabase

  3. Run:
     python 005_migrate_blogs.py
"""

import os
import sys
import json
from datetime import datetime, date
import psycopg2
import psycopg2.extras
from supabase import create_client


def serialize_value(val):
    """Convert Python datetime/date to ISO string for JSON serialization."""
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    return val


def get_old_db_connection():
    """Connect to old Render PostgreSQL database."""
    url = os.environ.get('OLD_DATABASE_URL')
    if not url:
        print('ERROR: OLD_DATABASE_URL environment variable is required.')
        print('Find it in Render dashboard > your database > Connection > External URL')
        sys.exit(1)
    return psycopg2.connect(url)


def get_supabase_client():
    """Connect to new Supabase project."""
    url = os.environ.get('SUPABASE_URL', 'https://oihrbeyprqqoahocswgk.supabase.co')
    key = os.environ.get('SUPABASE_SERVICE_KEY')
    if not key:
        print('ERROR: SUPABASE_SERVICE_KEY environment variable is required.')
        print('This is the service_role key from Supabase Settings > API.')
        sys.exit(1)
    return create_client(url, key)


def fetch_old_blog_posts(conn):
    """Fetch all blog posts from old database."""
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT
            title, slug, content, excerpt, featured_image,
            status, author_name, category, tags,
            seo_title, seo_description, seo_keywords,
            meta_robots, canonical_url,
            og_title, og_description, og_image,
            schema_markup,
            ai_seo_score, ai_seo_suggestions,
            read_time, word_count, views,
            published_at, created_at, updated_at
        FROM blog_posts
        ORDER BY created_at ASC
    """)
    rows = cur.fetchall()
    cur.close()
    return rows


def transform_post(old_post):
    """Transform old DB row into new Supabase format."""
    tags = old_post.get('tags')
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except (json.JSONDecodeError, TypeError):
            tags = []
    elif tags is None:
        tags = []

    ai_suggestions = old_post.get('ai_seo_suggestions')
    if isinstance(ai_suggestions, str):
        try:
            ai_suggestions = json.loads(ai_suggestions)
        except (json.JSONDecodeError, TypeError):
            ai_suggestions = []
    elif ai_suggestions is None:
        ai_suggestions = []

    return {
        'title': old_post['title'],
        'slug': old_post['slug'],
        'content': old_post.get('content'),
        'excerpt': old_post.get('excerpt'),
        'featured_image': old_post.get('featured_image'),
        'status': old_post.get('status', 'draft'),
        'author': old_post.get('author_name', 'Kamioi Team'),
        'category': old_post.get('category'),
        'tags': tags,
        'seo_title': old_post.get('seo_title'),
        'seo_description': old_post.get('seo_description'),
        'seo_keywords': old_post.get('seo_keywords'),
        'meta_robots': old_post.get('meta_robots', 'index,follow'),
        'canonical_url': old_post.get('canonical_url'),
        'og_title': old_post.get('og_title'),
        'og_description': old_post.get('og_description'),
        'og_image': old_post.get('og_image'),
        'schema_markup': json.dumps(old_post.get('schema_markup')) if isinstance(old_post.get('schema_markup'), dict) else old_post.get('schema_markup'),
        'ai_seo_score': old_post.get('ai_seo_score', 0),
        'ai_seo_suggestions': ai_suggestions,
        'read_time': old_post.get('read_time', 0),
        'word_count': old_post.get('word_count', 0),
        'views': old_post.get('views', 0),
        'published_at': serialize_value(old_post.get('published_at')),
        'created_at': serialize_value(old_post.get('created_at')),
        'updated_at': serialize_value(old_post.get('updated_at')),
    }


def migrate():
    print('--- Kamioi Blog Migration ---')
    print()

    # Connect to old DB
    print('Connecting to old Render database...')
    old_conn = get_old_db_connection()
    print('Connected.')

    # Connect to Supabase
    print('Connecting to Supabase...')
    supabase = get_supabase_client()
    print('Connected.')

    # Fetch old posts
    print('Fetching blog posts from old database...')
    old_posts = fetch_old_blog_posts(old_conn)
    print(f'Found {len(old_posts)} blog posts.')

    if len(old_posts) == 0:
        print('No blog posts to migrate.')
        old_conn.close()
        return

    # Transform and insert
    success = 0
    failed = 0
    skipped = 0

    for post in old_posts:
        transformed = transform_post(post)

        # Check if slug already exists in Supabase
        existing = supabase.table('blog_posts').select('id').eq('slug', transformed['slug']).execute()
        if existing.data and len(existing.data) > 0:
            print(f'  SKIP (already exists): {transformed["title"][:60]}')
            skipped += 1
            continue

        try:
            result = supabase.table('blog_posts').insert(transformed).execute()
            if result.data:
                print(f'  OK: {transformed["title"][:60]}')
                success += 1
            else:
                print(f'  FAIL: {transformed["title"][:60]}')
                failed += 1
        except Exception as e:
            print(f'  ERROR: {transformed["title"][:60]} - {e}')
            failed += 1

    old_conn.close()

    print()
    print('--- Migration Complete ---')
    print(f'  Total:   {len(old_posts)}')
    print(f'  Success: {success}')
    print(f'  Skipped: {skipped}')
    print(f'  Failed:  {failed}')


if __name__ == '__main__':
    migrate()
