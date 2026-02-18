export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: number
          auth_id: string
          email: string
          name: string
          account_type: 'individual' | 'family' | 'business' | 'admin'
          account_number: string | null
          user_guid: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          phone: string | null
          round_up_amount: number
          subscription_id: string | null
          subscription_status: string | null
          trial_end_date: string | null
          subscription_tier: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      transactions: {
        Row: {
          id: number
          user_id: number
          date: string
          merchant: string
          amount: number
          category: string | null
          description: string | null
          investable: boolean
          round_up: number
          total_debit: number
          ticker: string | null
          shares: number | null
          price_per_share: number | null
          stock_price: number | null
          status: 'pending' | 'completed' | 'failed'
          fee: number
          transaction_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      portfolios: {
        Row: {
          id: number
          user_id: number
          ticker: string
          shares: number
          average_price: number
          current_price: number
          total_value: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['portfolios']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['portfolios']['Insert']>
      }
      goals: {
        Row: {
          id: number
          user_id: number
          title: string
          target_amount: number
          current_amount: number
          progress: number
          goal_type: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['goals']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['goals']['Insert']>
      }
      notifications: {
        Row: {
          id: number
          user_id: number
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
      llm_mappings: {
        Row: {
          id: number
          transaction_id: number | null
          merchant_name: string
          ticker: string | null
          category: string | null
          confidence: number | null
          status: string
          admin_approved: boolean | null
          ai_processed: boolean
          company_name: string | null
          user_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['llm_mappings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['llm_mappings']['Insert']>
      }
      ai_responses: {
        Row: {
          id: number
          mapping_id: number | null
          merchant_name: string | null
          category: string | null
          prompt: string | null
          raw_response: string | null
          parsed_response: string | null
          processing_time_ms: number | null
          model_version: string | null
          is_error: boolean
          admin_feedback: string | null
          admin_correct_ticker: string | null
          was_ai_correct: boolean | null
          feedback_notes: string | null
          feedback_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['ai_responses']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['ai_responses']['Insert']>
      }
      subscription_plans: {
        Row: {
          id: number
          name: string
          account_type: string
          tier: string
          price_monthly: number
          price_yearly: number
          features: string | null
          limits: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscription_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['subscription_plans']['Insert']>
      }
      user_subscriptions: {
        Row: {
          id: number
          user_id: number
          plan_id: number
          status: string
          billing_cycle: string
          current_period_start: string | null
          current_period_end: string | null
          next_billing_date: string | null
          amount: number
          auto_renewal: boolean
          renewal_attempts: number
          last_renewal_attempt: string | null
          payment_method_id: string | null
          cancellation_requested_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_subscriptions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>
      }
      user_settings: {
        Row: {
          id: number
          user_id: number
          setting_key: string
          setting_value: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_settings']['Insert']>
      }
      admin_settings: {
        Row: {
          id: number
          setting_key: string
          setting_value: string
          setting_type: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['admin_settings']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['admin_settings']['Insert']>
      }
      roundup_ledger: {
        Row: {
          id: number
          user_id: number
          transaction_id: number | null
          round_up_amount: number
          fee_amount: number
          status: string
          swept_at: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['roundup_ledger']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['roundup_ledger']['Insert']>
      }
      market_queue: {
        Row: {
          id: number
          transaction_id: number | null
          user_id: number
          ticker: string
          amount: number
          status: string
          created_at: string
          processed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['market_queue']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['market_queue']['Insert']>
      }
      system_events: {
        Row: {
          id: number
          event_type: string
          tenant_id: string | null
          tenant_type: string | null
          data: string | null
          correlation_id: string | null
          source: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['system_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['system_events']['Insert']>
      }
      advertisements: {
        Row: {
          id: number
          title: string
          subtitle: string | null
          description: string | null
          offer: string | null
          button_text: string | null
          link: string | null
          gradient: string | null
          target_dashboards: string
          start_date: string | null
          end_date: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['advertisements']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['advertisements']['Insert']>
      }
      statements: {
        Row: {
          id: number
          user_id: number
          type: string
          period: string
          date: string
          size: string | null
          format: string
          file_path: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['statements']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['statements']['Insert']>
      }
      api_balance: {
        Row: {
          id: number
          balance: number
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_balance']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['api_balance']['Insert']>
      }
      api_usage: {
        Row: {
          id: number
          endpoint: string | null
          model: string | null
          prompt_tokens: number | null
          completion_tokens: number | null
          total_tokens: number | null
          processing_time_ms: number | null
          cost: number | null
          success: boolean
          error_message: string | null
          request_data: string | null
          response_data: string | null
          user_id: number | null
          page_tab: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['api_usage']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['api_usage']['Insert']>
      }
      promo_codes: {
        Row: {
          id: number
          code: string
          description: string | null
          discount_type: string
          discount_value: number
          plan_id: number | null
          account_type: string | null
          max_uses: number | null
          current_uses: number
          valid_from: string | null
          valid_until: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['promo_codes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>
      }
      promo_code_usage: {
        Row: {
          id: number
          promo_code_id: number
          user_id: number
          subscription_id: number | null
          used_at: string
        }
        Insert: Omit<Database['public']['Tables']['promo_code_usage']['Row'], 'id' | 'used_at'>
        Update: Partial<Database['public']['Tables']['promo_code_usage']['Insert']>
      }
      renewal_queue: {
        Row: {
          id: number
          subscription_id: number
          scheduled_date: string
          status: string
          attempt_count: number
          error_message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['renewal_queue']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['renewal_queue']['Insert']>
      }
      renewal_history: {
        Row: {
          id: number
          subscription_id: number
          renewal_date: string
          amount: number
          status: string
          payment_method: string | null
          error_message: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['renewal_history']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['renewal_history']['Insert']>
      }
      subscription_analytics: {
        Row: {
          id: number
          plan_id: number
          metric_name: string
          metric_value: number
          date_recorded: string
        }
        Insert: Omit<Database['public']['Tables']['subscription_analytics']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['subscription_analytics']['Insert']>
      }
      subscription_changes: {
        Row: {
          id: number
          user_id: number
          from_plan_id: number | null
          to_plan_id: number | null
          change_type: string
          reason: string | null
          admin_notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['subscription_changes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['subscription_changes']['Insert']>
      }
      contact_messages: {
        Row: {
          id: number
          name: string
          email: string
          subject: string | null
          message: string
          status: string
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['contact_messages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['contact_messages']['Insert']>
      }
    }
  }
}
