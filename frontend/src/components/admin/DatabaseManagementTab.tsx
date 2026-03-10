import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import { logSystemEvent } from '@/utils/logSystemEvent';
import { KpiCard, GlassCard, Table, Badge, Button, Tabs, Select, Modal } from '@/components/ui';
import type { Column, TabItem, SelectOption } from '@/components/ui';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TableInfo {
  name: string;
  count: number | null;
  loading: boolean;
  error: boolean;
}

interface AdminSettingRow {
  id: number;
  setting_key: string;
  setting_value: string | null;
  setting_type: string | null;
  description: string | null;
  created_at: string;
}

interface SystemEventRow {
  id: number;
  event_type: string | null;
  tenant_id: string | null;
  tenant_type: string | null;
  data: Record<string, unknown> | null;
  correlation_id: string | null;
  source: string | null;
  created_at: string;
}

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  description: string;
}

interface QualityCheck {
  name: string;
  count: number | null;
  loading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const KNOWN_TABLES: string[] = [
  'users',
  'transactions',
  'portfolios',
  'goals',
  'notifications',
  'llm_mappings',
  'ai_responses',
  'subscription_plans',
  'user_subscriptions',
  'admin_settings',
  'system_events',
  'api_usage',
  'api_balance',
  'roundup_ledger',
  'market_queue',
  'contact_messages',
  'advertisements',
  'promo_codes',
  'promo_code_usage',
  'renewal_queue',
  'renewal_history',
  'subscription_analytics',
  'subscription_changes',
  'statements',
  'user_settings',
  'blog_posts',
  'teller_enrollments',
  'teller_accounts',
  'category_map',
  'receipts',
  'receipt_allocations',
  'social_media_posts',
];

const TABLE_SCHEMAS: Record<string, SchemaColumn[]> = {
  users: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'auth_id', type: 'uuid', nullable: true, description: 'Supabase Auth user ID' },
    { name: 'email', type: 'varchar(255)', nullable: false, description: 'User email address' },
    { name: 'name', type: 'varchar(255)', nullable: true, description: 'Full name' },
    { name: 'account_type', type: 'varchar(20)', nullable: true, description: 'individual, family, business, admin' },
    { name: 'account_id', type: 'varchar(11)', nullable: true, description: 'Unique account identifier' },
    { name: 'account_number', type: 'varchar(50)', nullable: true, description: 'Bank account number' },
    { name: 'city', type: 'varchar(100)', nullable: true, description: 'City' },
    { name: 'state', type: 'varchar(50)', nullable: true, description: 'State' },
    { name: 'zip_code', type: 'varchar(20)', nullable: true, description: 'Zip code' },
    { name: 'phone', type: 'varchar(20)', nullable: true, description: 'Phone number' },
    { name: 'round_up_amount', type: 'decimal', nullable: true, description: 'Round-up amount (default $1.00)' },
    { name: 'subscription_tier', type: 'varchar(50)', nullable: true, description: 'Current subscription tier' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Account creation date' },
    { name: 'updated_at', type: 'timestamp', nullable: false, description: 'Last updated' },
  ],
  transactions: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'date', type: 'date', nullable: true, description: 'Transaction date' },
    { name: 'merchant', type: 'varchar(255)', nullable: true, description: 'Merchant name' },
    { name: 'amount', type: 'decimal', nullable: true, description: 'Transaction amount' },
    { name: 'category', type: 'varchar(100)', nullable: true, description: 'Spending category' },
    { name: 'description', type: 'text', nullable: true, description: 'Transaction description' },
    { name: 'investable', type: 'boolean', nullable: true, description: 'Eligible for round-up' },
    { name: 'round_up', type: 'decimal', nullable: true, description: 'Round-up amount' },
    { name: 'ticker', type: 'varchar(10)', nullable: true, description: 'Mapped stock ticker' },
    { name: 'shares', type: 'decimal', nullable: true, description: 'Shares purchased' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'pending, mapped, completed, failed' },
    { name: 'transaction_type', type: 'varchar(20)', nullable: true, description: 'bank or receipt' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Record creation date' },
  ],
  portfolios: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'ticker', type: 'varchar(10)', nullable: true, description: 'Stock ticker symbol' },
    { name: 'shares', type: 'decimal', nullable: true, description: 'Shares owned' },
    { name: 'average_price', type: 'decimal', nullable: true, description: 'Average purchase price' },
    { name: 'current_price', type: 'decimal', nullable: true, description: 'Current market price' },
    { name: 'total_value', type: 'decimal', nullable: true, description: 'Current total value' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Record creation date' },
    { name: 'updated_at', type: 'timestamp', nullable: false, description: 'Last updated' },
  ],
  goals: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'title', type: 'varchar(255)', nullable: true, description: 'Goal title' },
    { name: 'target_amount', type: 'decimal', nullable: true, description: 'Target amount' },
    { name: 'current_amount', type: 'decimal', nullable: true, description: 'Current progress amount' },
    { name: 'progress', type: 'decimal', nullable: true, description: 'Progress percentage' },
    { name: 'goal_type', type: 'varchar(50)', nullable: true, description: 'Goal type (personal)' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  notifications: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'title', type: 'varchar(255)', nullable: true, description: 'Notification title' },
    { name: 'message', type: 'text', nullable: true, description: 'Notification body' },
    { name: 'type', type: 'varchar(20)', nullable: true, description: 'info, warning, success, error' },
    { name: 'read', type: 'boolean', nullable: true, description: 'Read status' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Sent at' },
  ],
  llm_mappings: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'transaction_id', type: 'int', nullable: true, description: 'FK to transactions' },
    { name: 'merchant_name', type: 'varchar(255)', nullable: true, description: 'Merchant name' },
    { name: 'ticker', type: 'varchar(10)', nullable: true, description: 'Mapped stock ticker' },
    { name: 'category', type: 'varchar(100)', nullable: true, description: 'Merchant category' },
    { name: 'confidence', type: 'decimal', nullable: true, description: 'AI confidence score' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'pending, approved, rejected' },
    { name: 'admin_approved', type: 'boolean', nullable: true, description: 'Admin approval flag' },
    { name: 'ai_processed', type: 'boolean', nullable: true, description: 'AI processing flag' },
    { name: 'company_name', type: 'varchar(255)', nullable: true, description: 'Resolved company name' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  ai_responses: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'mapping_id', type: 'int', nullable: true, description: 'FK to llm_mappings' },
    { name: 'merchant_name', type: 'varchar(255)', nullable: true, description: 'Merchant name' },
    { name: 'prompt', type: 'text', nullable: true, description: 'AI prompt sent' },
    { name: 'raw_response', type: 'text', nullable: true, description: 'Raw AI response' },
    { name: 'parsed_response', type: 'text', nullable: true, description: 'Parsed AI response' },
    { name: 'processing_time_ms', type: 'int', nullable: true, description: 'Processing time (ms)' },
    { name: 'model_version', type: 'varchar(50)', nullable: true, description: 'AI model version' },
    { name: 'is_error', type: 'boolean', nullable: true, description: 'Error flag' },
    { name: 'was_ai_correct', type: 'boolean', nullable: true, description: 'Admin feedback: correct?' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Call timestamp' },
  ],
  subscription_plans: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'name', type: 'varchar(100)', nullable: false, description: 'Plan name' },
    { name: 'account_type', type: 'varchar(20)', nullable: true, description: 'individual, family, business' },
    { name: 'tier', type: 'varchar(50)', nullable: true, description: 'Pricing tier' },
    { name: 'price_monthly', type: 'decimal', nullable: true, description: 'Monthly price' },
    { name: 'price_yearly', type: 'decimal', nullable: true, description: 'Yearly price' },
    { name: 'features', type: 'jsonb', nullable: true, description: 'Feature list (JSON)' },
    { name: 'limits', type: 'jsonb', nullable: true, description: 'Usage limits (JSON)' },
    { name: 'is_active', type: 'boolean', nullable: true, description: 'Active flag' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  user_subscriptions: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'plan_id', type: 'int', nullable: true, description: 'FK to subscription_plans' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'active, cancelled, expired' },
    { name: 'billing_cycle', type: 'varchar(20)', nullable: true, description: 'monthly or yearly' },
    { name: 'current_period_start', type: 'timestamp', nullable: true, description: 'Current period start' },
    { name: 'current_period_end', type: 'timestamp', nullable: true, description: 'Current period end' },
    { name: 'next_billing_date', type: 'timestamp', nullable: true, description: 'Next billing date' },
    { name: 'amount', type: 'decimal', nullable: true, description: 'Subscription amount' },
    { name: 'auto_renewal', type: 'boolean', nullable: true, description: 'Auto-renewal flag' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  admin_settings: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'setting_key', type: 'varchar(100)', nullable: false, description: 'Setting key (unique)' },
    { name: 'setting_value', type: 'text', nullable: true, description: 'Setting value' },
    { name: 'setting_type', type: 'varchar(50)', nullable: true, description: 'Category (seo, social, etc.)' },
    { name: 'description', type: 'text', nullable: true, description: 'Human-readable description' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
    { name: 'updated_at', type: 'timestamp', nullable: false, description: 'Last updated' },
  ],
  system_events: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'event_type', type: 'varchar(100)', nullable: false, description: 'Event type' },
    { name: 'tenant_id', type: 'varchar(100)', nullable: true, description: 'Tenant identifier' },
    { name: 'tenant_type', type: 'varchar(50)', nullable: true, description: 'Tenant type' },
    { name: 'data', type: 'jsonb', nullable: true, description: 'Event data payload' },
    { name: 'correlation_id', type: 'varchar(100)', nullable: true, description: 'Correlation ID' },
    { name: 'source', type: 'varchar(100)', nullable: true, description: 'Event source' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Event timestamp' },
  ],
  api_usage: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'endpoint', type: 'varchar(255)', nullable: true, description: 'API endpoint called' },
    { name: 'model', type: 'varchar(100)', nullable: true, description: 'AI model used' },
    { name: 'prompt_tokens', type: 'int', nullable: true, description: 'Input tokens' },
    { name: 'completion_tokens', type: 'int', nullable: true, description: 'Output tokens' },
    { name: 'total_tokens', type: 'int', nullable: true, description: 'Total tokens consumed' },
    { name: 'processing_time_ms', type: 'int', nullable: true, description: 'Processing time (ms)' },
    { name: 'cost', type: 'decimal', nullable: true, description: 'Cost in USD' },
    { name: 'success', type: 'boolean', nullable: false, description: 'Success flag' },
    { name: 'error_message', type: 'text', nullable: true, description: 'Error message if failed' },
    { name: 'user_id', type: 'int', nullable: true, description: 'User who triggered the call' },
    { name: 'page_tab', type: 'varchar(100)', nullable: true, description: 'UI page/tab context' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Call timestamp' },
  ],
  api_balance: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'balance', type: 'decimal', nullable: true, description: 'Remaining AI API credit' },
    { name: 'updated_at', type: 'timestamp', nullable: false, description: 'Last updated' },
  ],
  roundup_ledger: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'transaction_id', type: 'int', nullable: true, description: 'FK to transactions' },
    { name: 'round_up_amount', type: 'decimal', nullable: true, description: 'Round-up amount' },
    { name: 'fee_amount', type: 'decimal', nullable: true, description: 'Fee amount' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'pending or swept' },
    { name: 'swept_at', type: 'timestamp', nullable: true, description: 'When swept into investment' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  market_queue: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'transaction_id', type: 'int', nullable: true, description: 'FK to transactions' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'ticker', type: 'varchar(10)', nullable: true, description: 'Stock ticker' },
    { name: 'amount', type: 'decimal', nullable: true, description: 'Purchase amount' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'queued, executed, failed' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Queued at' },
    { name: 'processed_at', type: 'timestamp', nullable: true, description: 'Executed at' },
  ],
  contact_messages: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'name', type: 'varchar(255)', nullable: true, description: 'Sender name' },
    { name: 'email', type: 'varchar(255)', nullable: true, description: 'Sender email' },
    { name: 'subject', type: 'varchar(255)', nullable: true, description: 'Message subject' },
    { name: 'message', type: 'text', nullable: true, description: 'Message body' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'unread, read, replied' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Sent at' },
  ],
  advertisements: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'title', type: 'varchar(255)', nullable: true, description: 'Ad title' },
    { name: 'subtitle', type: 'varchar(255)', nullable: true, description: 'Ad subtitle' },
    { name: 'description', type: 'text', nullable: true, description: 'Ad description' },
    { name: 'offer', type: 'varchar(255)', nullable: true, description: 'Offer text' },
    { name: 'button_text', type: 'varchar(100)', nullable: true, description: 'CTA button text' },
    { name: 'link', type: 'varchar(500)', nullable: true, description: 'Link URL' },
    { name: 'target_dashboards', type: 'varchar(100)', nullable: true, description: 'Target dashboards' },
    { name: 'is_active', type: 'boolean', nullable: true, description: 'Active flag' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  promo_codes: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'code', type: 'varchar(50)', nullable: false, description: 'Promo code (unique)' },
    { name: 'description', type: 'text', nullable: true, description: 'Description' },
    { name: 'discount_type', type: 'varchar(20)', nullable: true, description: 'free_months, percentage, etc.' },
    { name: 'discount_value', type: 'decimal', nullable: true, description: 'Discount value' },
    { name: 'plan_id', type: 'int', nullable: true, description: 'FK to subscription_plans' },
    { name: 'max_uses', type: 'int', nullable: true, description: 'Maximum redemptions' },
    { name: 'current_uses', type: 'int', nullable: true, description: 'Current redemptions' },
    { name: 'is_active', type: 'boolean', nullable: true, description: 'Active flag' },
    { name: 'valid_from', type: 'timestamp', nullable: true, description: 'Valid from date' },
    { name: 'valid_until', type: 'timestamp', nullable: true, description: 'Expiry date' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  promo_code_usage: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'promo_code_id', type: 'int', nullable: true, description: 'FK to promo_codes' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'subscription_id', type: 'int', nullable: true, description: 'FK to user_subscriptions' },
    { name: 'used_at', type: 'timestamp', nullable: false, description: 'Redemption date' },
  ],
  renewal_queue: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'subscription_id', type: 'int', nullable: true, description: 'FK to user_subscriptions' },
    { name: 'scheduled_date', type: 'date', nullable: true, description: 'Scheduled renewal date' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'pending, processed, failed' },
    { name: 'attempt_count', type: 'int', nullable: true, description: 'Retry attempts' },
    { name: 'error_message', type: 'text', nullable: true, description: 'Error message' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  renewal_history: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'subscription_id', type: 'int', nullable: true, description: 'FK to user_subscriptions' },
    { name: 'renewal_date', type: 'timestamp', nullable: true, description: 'Renewal date' },
    { name: 'amount', type: 'decimal', nullable: true, description: 'Renewal amount' },
    { name: 'status', type: 'varchar(20)', nullable: true, description: 'success, failed' },
    { name: 'payment_method', type: 'varchar(100)', nullable: true, description: 'Payment method' },
    { name: 'error_message', type: 'text', nullable: true, description: 'Error if failed' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Record date' },
  ],
  subscription_analytics: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'plan_id', type: 'int', nullable: true, description: 'FK to subscription_plans' },
    { name: 'metric_name', type: 'varchar(100)', nullable: false, description: 'Metric name' },
    { name: 'metric_value', type: 'decimal', nullable: true, description: 'Metric value' },
    { name: 'date_recorded', type: 'date', nullable: true, description: 'Date recorded' },
  ],
  subscription_changes: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'from_plan_id', type: 'int', nullable: true, description: 'Previous plan' },
    { name: 'to_plan_id', type: 'int', nullable: true, description: 'New plan' },
    { name: 'change_type', type: 'varchar(50)', nullable: true, description: 'upgrade, downgrade, cancel' },
    { name: 'reason', type: 'text', nullable: true, description: 'Reason for change' },
    { name: 'admin_notes', type: 'text', nullable: true, description: 'Admin notes' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Change date' },
  ],
  statements: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'type', type: 'varchar(50)', nullable: true, description: 'Statement type' },
    { name: 'period', type: 'varchar(50)', nullable: true, description: 'Period covered' },
    { name: 'date', type: 'date', nullable: true, description: 'Statement date' },
    { name: 'size', type: 'varchar(20)', nullable: true, description: 'File size' },
    { name: 'format', type: 'varchar(10)', nullable: true, description: 'File format (PDF)' },
    { name: 'file_path', type: 'text', nullable: true, description: 'Storage path' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  user_settings: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'setting_key', type: 'varchar(100)', nullable: false, description: 'Setting key' },
    { name: 'setting_value', type: 'text', nullable: true, description: 'Setting value' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
    { name: 'updated_at', type: 'timestamp', nullable: false, description: 'Last updated' },
  ],
  blog_posts: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'title', type: 'varchar(500)', nullable: false, description: 'Post title' },
    { name: 'slug', type: 'varchar(500)', nullable: false, description: 'URL slug (unique)' },
    { name: 'content', type: 'text', nullable: true, description: 'Post content (markdown)' },
    { name: 'excerpt', type: 'text', nullable: true, description: 'Short excerpt' },
    { name: 'featured_image', type: 'text', nullable: true, description: 'Featured image URL' },
    { name: 'status', type: 'varchar(50)', nullable: true, description: 'draft or published' },
    { name: 'author', type: 'varchar(255)', nullable: true, description: 'Author name' },
    { name: 'category', type: 'varchar(100)', nullable: true, description: 'Post category' },
    { name: 'tags', type: 'jsonb', nullable: true, description: 'Tags array (JSON)' },
    { name: 'seo_title', type: 'varchar(500)', nullable: true, description: 'SEO title override' },
    { name: 'ai_seo_score', type: 'int', nullable: true, description: 'AI SEO score (0-100)' },
    { name: 'word_count', type: 'int', nullable: true, description: 'Word count' },
    { name: 'views', type: 'int', nullable: true, description: 'View count' },
    { name: 'published_at', type: 'timestamp', nullable: true, description: 'Publish date' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  teller_enrollments: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'enrollment_id', type: 'varchar(100)', nullable: false, description: 'Teller enrollment ID' },
    { name: 'access_token', type: 'varchar(255)', nullable: false, description: 'Teller access token' },
    { name: 'institution_name', type: 'varchar(255)', nullable: true, description: 'Bank name' },
    { name: 'is_active', type: 'boolean', nullable: true, description: 'Active flag' },
    { name: 'last_synced_at', type: 'timestamp', nullable: true, description: 'Last sync time' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  teller_accounts: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'enrollment_id', type: 'int', nullable: true, description: 'FK to teller_enrollments' },
    { name: 'user_id', type: 'int', nullable: true, description: 'FK to users' },
    { name: 'teller_account_id', type: 'varchar(100)', nullable: false, description: 'Teller account ID' },
    { name: 'account_name', type: 'varchar(255)', nullable: true, description: 'Account name' },
    { name: 'account_type', type: 'varchar(50)', nullable: true, description: 'checking, savings, credit' },
    { name: 'balance_available', type: 'decimal', nullable: true, description: 'Available balance' },
    { name: 'balance_ledger', type: 'decimal', nullable: true, description: 'Ledger balance' },
    { name: 'last_four', type: 'varchar(4)', nullable: true, description: 'Last 4 digits' },
    { name: 'is_active', type: 'boolean', nullable: true, description: 'Active flag' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  category_map: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'source_category', type: 'varchar(100)', nullable: false, description: 'Bank category' },
    { name: 'kamioi_category', type: 'varchar(50)', nullable: false, description: 'Mapped Kamioi category' },
  ],
  receipts: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'user_id', type: 'int', nullable: false, description: 'FK to users' },
    { name: 'filename', type: 'text', nullable: false, description: 'Original filename' },
    { name: 'storage_path', type: 'text', nullable: false, description: 'Supabase Storage path' },
    { name: 'file_type', type: 'text', nullable: false, description: 'MIME type' },
    { name: 'status', type: 'text', nullable: false, description: 'uploaded, processing, parsed, completed, failed' },
    { name: 'ai_provider', type: 'text', nullable: true, description: 'deepseek, claude, or openai' },
    { name: 'parsed_data', type: 'jsonb', nullable: true, description: 'AI-extracted receipt data' },
    { name: 'allocation_data', type: 'jsonb', nullable: true, description: 'Stock allocation data' },
    { name: 'round_up_amount', type: 'decimal', nullable: true, description: 'Total round-up' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Upload date' },
  ],
  receipt_allocations: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'receipt_id', type: 'int', nullable: false, description: 'FK to receipts' },
    { name: 'transaction_id', type: 'int', nullable: true, description: 'FK to transactions' },
    { name: 'stock_symbol', type: 'varchar(10)', nullable: false, description: 'Stock ticker' },
    { name: 'stock_name', type: 'text', nullable: true, description: 'Company name' },
    { name: 'allocation_amount', type: 'decimal', nullable: false, description: 'Allocated amount' },
    { name: 'allocation_percentage', type: 'decimal', nullable: false, description: 'Allocation %' },
    { name: 'confidence', type: 'decimal', nullable: true, description: 'AI confidence (0-1)' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
  social_media_posts: [
    { name: 'id', type: 'serial', nullable: false, description: 'Primary key' },
    { name: 'platform', type: 'text', nullable: false, description: 'twitter, linkedin, facebook, etc.' },
    { name: 'content', type: 'text', nullable: false, description: 'Post content' },
    { name: 'status', type: 'text', nullable: true, description: 'draft, scheduled, published' },
    { name: 'scheduled_for', type: 'timestamp', nullable: true, description: 'Scheduled publish time' },
    { name: 'published_at', type: 'timestamp', nullable: true, description: 'Actual publish time' },
    { name: 'engagement_data', type: 'jsonb', nullable: true, description: 'Likes, shares, etc.' },
    { name: 'created_at', type: 'timestamp', nullable: false, description: 'Creation date' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Convert snake_case setting keys to Title Case labels */
function formatSettingKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Mask sensitive values (API keys, secrets, tokens) */
function maskSensitiveValue(key: string, value: string | null): string {
  if (!value) return '--';
  const sensitive = /(api_key|secret|token|password|pixel_id)/i;
  if (sensitive.test(key) && value.length > 8) {
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  Tab 1: Tables                                                      */
/* ------------------------------------------------------------------ */

function TablesContent() {
  const [tables, setTables] = useState<TableInfo[]>(
    KNOWN_TABLES.map((name) => ({ name, count: null, loading: true, error: false })),
  );

  useEffect(() => {
    async function fetchCounts() {
      const results = await Promise.all(
        KNOWN_TABLES.map(async (tableName) => {
          try {
            const { count, error } = await supabaseAdmin
              .from(tableName)
              .select('*', { count: 'exact', head: true });

            if (error) {
              return { name: tableName, count: null, loading: false, error: true };
            }
            return { name: tableName, count: count ?? 0, loading: false, error: false };
          } catch {
            return { name: tableName, count: null, loading: false, error: true };
          }
        }),
      );
      setTables(results);
    }

    fetchCounts();
  }, []);

  const totalTables = useMemo(() => KNOWN_TABLES.length, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <KpiCard label="Total Tables" value={totalTables} accent="purple" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        {tables.map((table) => (
          <GlassCard key={table.name} padding="20px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatSettingKey(table.name)}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {table.loading ? (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Counting...
                  </span>
                ) : table.error ? (
                  <Badge variant="warning">N/A</Badge>
                ) : (
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    {(table.count ?? 0).toLocaleString()} rows
                  </span>
                )}
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 2: Schema Browser                                              */
/* ------------------------------------------------------------------ */

function SchemaBrowserContent() {
  const [selectedTable, setSelectedTable] = useState('');

  const tableOptions: SelectOption[] = useMemo(
    () =>
      Object.keys(TABLE_SCHEMAS).map((name) => ({
        value: name,
        label: formatSettingKey(name),
      })),
    [],
  );

  const schemaColumns: Column<SchemaColumn>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Column Name',
        sortable: true,
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
            {formatSettingKey(row.name)}
          </span>
        ),
      },
      {
        key: 'type',
        header: 'Data Type',
        sortable: true,
        width: '130px',
        render: (row) => (
          <Badge variant="purple">{row.type}</Badge>
        ),
      },
      {
        key: 'nullable',
        header: 'Nullable',
        width: '100px',
        render: (row) => (
          <Badge variant={row.nullable ? 'warning' : 'success'}>
            {row.nullable ? 'Yes' : 'No'}
          </Badge>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.description}
          </span>
        ),
      },
    ],
    [],
  );

  const currentSchema = selectedTable ? (TABLE_SCHEMAS[selectedTable] ?? []) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Schema Browser
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '16px' }}>
          Schema browser shows table structure and column definitions.
        </p>
        <div style={{ maxWidth: '300px' }}>
          <Select
            label="Select Table"
            options={tableOptions}
            placeholder="Choose a table..."
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
          />
        </div>
      </GlassCard>

      {selectedTable && currentSchema.length > 0 && (
        <GlassCard padding="0">
          <div style={{ padding: '20px 20px 0 20px' }}>
            <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {formatSettingKey(selectedTable)}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              {currentSchema.length} columns
            </p>
          </div>
          <Table<SchemaColumn>
            columns={schemaColumns}
            data={currentSchema}
            loading={false}
            emptyMessage="No schema information available"
            pageSize={20}
            rowKey={(row) => row.name}
          />
        </GlassCard>
      )}

      {selectedTable && currentSchema.length === 0 && (
        <GlassCard padding="28px">
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            Schema information not available for this table. Check database.ts type definitions.
          </p>
        </GlassCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 3: Data Quality                                                */
/* ------------------------------------------------------------------ */

function DataQualityContent() {
  const [checks, setChecks] = useState<QualityCheck[]>([
    { name: 'Users without email', count: null, loading: false },
    { name: 'Transactions without merchant', count: null, loading: false },
    { name: 'Subscriptions without plan', count: null, loading: false },
    { name: 'Mappings without ticker', count: null, loading: false },
  ]);
  const [hasRun, setHasRun] = useState(false);

  const runChecks = useCallback(async () => {
    setChecks((prev) => prev.map((c) => ({ ...c, loading: true, count: null })));
    setHasRun(true);

    try {
      const [usersResult, txResult, subsResult, mappingsResult] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('id', { count: 'exact', head: true })
          .is('email', null),
        supabaseAdmin
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .is('merchant', null),
        supabaseAdmin
          .from('user_subscriptions')
          .select('id', { count: 'exact', head: true })
          .is('plan_id', null),
        supabaseAdmin
          .from('llm_mappings')
          .select('id', { count: 'exact', head: true })
          .is('ticker', null),
      ]);

      setChecks([
        { name: 'Users without email', count: usersResult.count ?? 0, loading: false },
        { name: 'Transactions without merchant', count: txResult.count ?? 0, loading: false },
        { name: 'Subscriptions without plan', count: subsResult.count ?? 0, loading: false },
        { name: 'Mappings without ticker', count: mappingsResult.count ?? 0, loading: false },
      ]);
    } catch {
      setChecks((prev) => prev.map((c) => ({ ...c, loading: false })));
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Button onClick={runChecks}>Run Checks</Button>
        {!hasRun && (
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Click "Run Checks" to analyze data quality
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {checks.map((check) => (
          <GlassCard key={check.name} padding="24px">
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px' }}>
              {check.name}
            </p>
            {check.loading ? (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Checking...</span>
            ) : check.count !== null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {check.count.toLocaleString()}
                </span>
                <Badge variant={check.count === 0 ? 'success' : 'warning'}>
                  {check.count === 0 ? 'Clean' : 'Review'}
                </Badge>
              </div>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Not checked yet
              </span>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 4: Backups                                                     */
/* ------------------------------------------------------------------ */

function BackupsContent() {
  const [showDumpInfo, setShowDumpInfo] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="blue" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Backup Strategy
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Backups are managed by Supabase — verify status in your Supabase Dashboard &gt; Database &gt; Backups
        </p>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Supabase provides automatic daily backups and optional Point-in-Time Recovery (PITR) depending on your plan.
        </p>
      </GlassCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Free Plan
          </p>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Daily backups, 7-day retention</span>
        </GlassCard>

        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Pro Plan
          </p>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Daily backups + PITR, 30-day retention</span>
        </GlassCard>

        <GlassCard padding="24px">
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Recovery
          </p>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Restore via Supabase Dashboard</span>
        </GlassCard>
      </div>

      <GlassCard padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Manual Export
        </p>
        <Button variant="secondary" onClick={() => setShowDumpInfo(true)}>
          Export SQL Dump
        </Button>
        {showDumpInfo && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--surface-input)',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              supabase db dump --project-ref your-project-ref &gt; backup.sql
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              This requires the Supabase CLI to be installed locally.
            </p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 5: Maintenance                                                 */
/* ------------------------------------------------------------------ */

function MaintenanceContent() {
  const [settings, setSettings] = useState<AdminSettingRow[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [vacuumInfo, setVacuumInfo] = useState(false);
  const [reindexInfo, setReindexInfo] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const start = performance.now();
        const { data, error } = await supabaseAdmin
          .from('admin_settings')
          .select('*')
          .order('setting_key', { ascending: true })
          .limit(100);

        const latency = Math.round(performance.now() - start);
        setDbLatencyMs(latency);

        if (error) {
          setSettings([]);
          setDbConnected(false);
          return;
        }
        setSettings((data ?? []) as AdminSettingRow[]);
        setDbConnected(true);
      } catch {
        setSettings([]);
        setDbConnected(false);
      } finally {
        setLoadingSettings(false);
      }
    }

    fetchSettings();
  }, []);

  const handleClearOldEvents = useCallback(async () => {
    setClearing(true);
    setClearMessage('');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { error } = await supabaseAdmin
        .from('system_events')
        .delete()
        .lt('created_at', ninetyDaysAgo.toISOString());

      if (error) {
        setClearMessage(`Error: ${error.message}`);
      } else {
        logSystemEvent('old_events_cleared', 'DatabaseMaintenance', { older_than_days: 90 });
        setClearMessage('Old events cleared successfully.');
      }
    } catch {
      setClearMessage('Failed to clear old events.');
    } finally {
      setClearing(false);
      setClearConfirm(false);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Admin Settings */}
      <GlassCard padding="24px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Admin Settings
        </p>
        {loadingSettings ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Loading settings...</p>
        ) : settings.length === 0 ? (
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>No admin settings configured yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {settings.map((setting) => (
              <div
                key={setting.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--border-divider)',
                }}
              >
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {formatSettingKey(setting.setting_key)}
                  </p>
                  {setting.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {setting.description}
                    </p>
                  )}
                </div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)', maxWidth: '400px', textAlign: 'right', wordBreak: 'break-word' }}>
                  {maskSensitiveValue(setting.setting_key, setting.setting_value)}
                </p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Database Health */}
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Database Health
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
              Connection Status
            </span>
            {dbConnected === null ? (
              <Badge variant="info">Checking...</Badge>
            ) : dbConnected ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="danger">Disconnected</Badge>
            )}
          </div>
          {dbLatencyMs !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
                Latency
              </span>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{dbLatencyMs} ms</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '140px' }}>
              Provider
            </span>
            <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Supabase PostgreSQL</span>
          </div>
        </div>
      </GlassCard>

      {/* Maintenance Tasks */}
      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Maintenance Tasks
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <Button variant="secondary" onClick={() => setVacuumInfo(!vacuumInfo)}>
              Vacuum Analyze
            </Button>
            {vacuumInfo && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--surface-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  VACUUM ANALYZE;
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Run via Supabase SQL Editor
                </p>
              </div>
            )}
          </div>

          <div>
            <Button variant="secondary" onClick={() => setReindexInfo(!reindexInfo)}>
              Reindex
            </Button>
            {reindexInfo && (
              <div style={{ marginTop: '8px', padding: '10px 14px', background: 'var(--surface-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                  REINDEX DATABASE;
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Run via Supabase SQL Editor
                </p>
              </div>
            )}
          </div>

          <div>
            <Button variant="danger" onClick={() => setClearConfirm(true)}>
              Clear Old Events
            </Button>
            {clearMessage && (
              <p style={{
                fontSize: '13px',
                color: clearMessage.includes('Error') || clearMessage.includes('Failed') ? '#EF4444' : '#34D399',
                marginTop: '8px',
              }}>
                {clearMessage}
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      <Modal
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        title="Confirm Clear Old Events"
        size="sm"
      >
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.6 }}>
          This will permanently delete all system events older than 90 days. This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={() => setClearConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleClearOldEvents} loading={clearing}>
            Delete Old Events
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab 6: Security                                                    */
/* ------------------------------------------------------------------ */

function SecurityContent() {
  const [loading, setLoading] = useState(true);
  const [auditEvents, setAuditEvents] = useState<SystemEventRow[]>([]);

  useEffect(() => {
    async function fetchAuditEvents() {
      try {
        const { data } = await supabaseAdmin
          .from('system_events')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);

        setAuditEvents((data ?? []) as SystemEventRow[]);
      } catch {
        console.error('Failed to fetch audit events');
      } finally {
        setLoading(false);
      }
    }

    fetchAuditEvents();
  }, []);

  const rlsTables = ['users', 'transactions', 'portfolios', 'goals', 'notifications', 'user_subscriptions'];

  const auditColumns: Column<SystemEventRow>[] = useMemo(
    () => [
      {
        key: 'event_type',
        header: 'Event Type',
        sortable: true,
        width: '180px',
        render: (row) => <Badge variant="info">{row.event_type ?? 'Unknown'}</Badge>,
      },
      {
        key: 'source',
        header: 'Source',
        sortable: true,
        width: '120px',
        render: (row) => (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {row.source ?? '--'}
          </span>
        ),
      },
      {
        key: 'data',
        header: 'Data',
        render: (row) => {
          const text = row.data ? JSON.stringify(row.data) : '--';
          return (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {text.length > 80 ? `${text.substring(0, 80)}...` : text}
            </span>
          );
        },
      },
      {
        key: 'correlation_id',
        header: 'Correlation ID',
        width: '140px',
        render: (row) => (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            {row.correlation_id ? row.correlation_id.substring(0, 12) : '--'}
          </span>
        ),
      },
      {
        key: 'created_at',
        header: 'Created At',
        sortable: true,
        width: '140px',
        render: (row) => formatDate(row.created_at),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <GlassCard accent="teal" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Row Level Security (RLS)
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Expected configuration — verify in Supabase Dashboard &gt; Authentication &gt; Policies
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rlsTables.map((table) => (
            <div key={table} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-primary)', minWidth: '180px', fontFamily: 'monospace' }}>
                {table}
              </span>
              <Badge variant="success">Enabled</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard accent="purple" padding="28px">
        <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Access Control
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Platform security architecture
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Service Role
            </span>
            <Badge variant="warning">Restricted -- server-side only</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Anon Key
            </span>
            <Badge variant="info">Public -- RLS enforced</Badge>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', minWidth: '120px' }}>
              Auth
            </span>
            <Badge variant="success">Supabase Auth</Badge>
          </div>
        </div>
      </GlassCard>

      <GlassCard accent="blue" padding="0">
        <div style={{ padding: '20px 20px 0 20px' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Audit Log
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Recent system events (last 20)
          </p>
        </div>
        <Table<SystemEventRow>
          columns={auditColumns}
          data={auditEvents}
          loading={loading}
          emptyMessage="No audit events found"
          pageSize={10}
          rowKey={(row) => row.id}
        />
      </GlassCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function DatabaseManagementTab() {
  const tabs: TabItem[] = useMemo(
    () => [
      { key: 'tables', label: 'Tables', content: <TablesContent /> },
      { key: 'schema', label: 'Schema Browser', content: <SchemaBrowserContent /> },
      { key: 'data-quality', label: 'Data Quality', content: <DataQualityContent /> },
      { key: 'backups', label: 'Backups', content: <BackupsContent /> },
      { key: 'maintenance', label: 'Maintenance', content: <MaintenanceContent /> },
      { key: 'security', label: 'Security', content: <SecurityContent /> },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Tabs tabs={tabs} defaultTab="tables" />
    </div>
  );
}

export default DatabaseManagementTab;
