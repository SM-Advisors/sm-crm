export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["agent_action_type"]
          approved_at: string | null
          contact_id: string | null
          content: string | null
          created_at: string | null
          dismiss_reason: string | null
          id: string
          run_id: string | null
          sent_at: string | null
          status: string | null
          was_edited: boolean | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["agent_action_type"]
          approved_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          dismiss_reason?: string | null
          id?: string
          run_id?: string | null
          sent_at?: string | null
          status?: string | null
          was_edited?: boolean | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["agent_action_type"]
          approved_at?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string | null
          dismiss_reason?: string | null
          id?: string
          run_id?: string | null
          sent_at?: string | null
          status?: string | null
          was_edited?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_actions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_actions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_config: {
        Row: {
          config_key: string
          config_value: Json
          description: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          description?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_context_notes: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          note: string
          source: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          note: string
          source?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          note?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_context_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_context_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_research: {
        Row: {
          company_id: string | null
          contact_id: string | null
          id: string
          query: string
          researched_at: string | null
          results: string
          run_id: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          id?: string
          query: string
          researched_at?: string | null
          results: string
          run_id?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          id?: string
          query?: string
          researched_at?: string | null
          results?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_research_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_research_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_research_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          api_calls_made: number | null
          contacts_surfaced: Json | null
          created_at: string | null
          error_log: string | null
          id: string
          linkedin_post_content: string | null
          linkedin_post_drafted: boolean | null
          reasoning_summary: string | null
          run_date: string
          total_cost_estimate: number | null
        }
        Insert: {
          api_calls_made?: number | null
          contacts_surfaced?: Json | null
          created_at?: string | null
          error_log?: string | null
          id?: string
          linkedin_post_content?: string | null
          linkedin_post_drafted?: boolean | null
          reasoning_summary?: string | null
          run_date: string
          total_cost_estimate?: number | null
        }
        Update: {
          api_calls_made?: number | null
          contacts_surfaced?: Json | null
          created_at?: string | null
          error_log?: string | null
          id?: string
          linkedin_post_content?: string | null
          linkedin_post_drafted?: boolean | null
          reasoning_summary?: string | null
          run_date?: string
          total_cost_estimate?: number | null
        }
        Relationships: []
      }
      change_log: {
        Row: {
          action: string
          changed_by: string | null
          changes: Json | null
          created_at: string
          id: string
          record_id: string
          summary: string | null
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          record_id: string
          summary?: string | null
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changes?: Json | null
          created_at?: string
          id?: string
          record_id?: string
          summary?: string | null
          table_name?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          annual_revenue: string | null
          city: string | null
          created_at: string | null
          description: string | null
          employee_count: string | null
          id: string
          industry: string | null
          name: string
          phone: string | null
          qb_customer_id: string | null
          state: string | null
          updated_at: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          name: string
          phone?: string | null
          qb_customer_id?: string | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          annual_revenue?: string | null
          city?: string | null
          created_at?: string | null
          description?: string | null
          employee_count?: string | null
          id?: string
          industry?: string | null
          name?: string
          phone?: string | null
          qb_customer_id?: string | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      company_tags: {
        Row: {
          company_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_categories: {
        Row: {
          category: Database["public"]["Enums"]["contact_category"]
          contact_id: string | null
          id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["contact_category"]
          contact_id?: string | null
          id?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["contact_category"]
          contact_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_categories_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          association_or_affiliation: string | null
          city: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          email: string | null
          email_opt_out: boolean | null
          first_name: string
          id: string
          is_primary_contact: boolean | null
          last_contact_type:
            | Database["public"]["Enums"]["interaction_type"]
            | null
          last_contacted_at: string | null
          last_name: string
          linkedin_url: string | null
          mobile: string | null
          next_follow_up_at: string | null
          phone: string | null
          qb_contact_id: string | null
          referral_source: string | null
          reviewed_at: string | null
          source: string | null
          state: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          association_or_affiliation?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name: string
          id?: string
          is_primary_contact?: boolean | null
          last_contact_type?:
            | Database["public"]["Enums"]["interaction_type"]
            | null
          last_contacted_at?: string | null
          last_name: string
          linkedin_url?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          phone?: string | null
          qb_contact_id?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          source?: string | null
          state?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          association_or_affiliation?: string | null
          city?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name?: string
          id?: string
          is_primary_contact?: boolean | null
          last_contact_type?:
            | Database["public"]["Enums"]["interaction_type"]
            | null
          last_contacted_at?: string | null
          last_name?: string
          linkedin_url?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          phone?: string | null
          qb_contact_id?: string | null
          referral_source?: string | null
          reviewed_at?: string | null
          source?: string | null
          state?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_events: {
        Row: {
          created_at: string | null
          deal_id: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          processed: boolean | null
          processed_at: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          processed?: boolean | null
          processed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_transcripts: {
        Row: {
          created_at: string | null
          deal_id: string | null
          id: string
          source_url: string | null
          transcript_date: string | null
          transcript_duration: string | null
          transcript_text: string
          transcript_title: string | null
        }
        Insert: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          source_url?: string | null
          transcript_date?: string | null
          transcript_duration?: string | null
          transcript_text: string
          transcript_title?: string | null
        }
        Update: {
          created_at?: string | null
          deal_id?: string | null
          id?: string
          source_url?: string | null
          transcript_date?: string | null
          transcript_duration?: string | null
          transcript_text?: string
          transcript_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_transcripts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_engagements: {
        Row: {
          actual_end_date: string | null
          billing_progress: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          engagement_letter_url: string | null
          expected_end_date: string | null
          id: string
          notes: string | null
          sales_deal_id: string | null
          stage: Database["public"]["Enums"]["delivery_stage"]
          stage_order: number | null
          start_date: string | null
          title: string
          total_engagement_value: number
          total_invoiced: number | null
          total_paid: number | null
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          billing_progress?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          engagement_letter_url?: string | null
          expected_end_date?: string | null
          id?: string
          notes?: string | null
          sales_deal_id?: string | null
          stage?: Database["public"]["Enums"]["delivery_stage"]
          stage_order?: number | null
          start_date?: string | null
          title: string
          total_engagement_value?: number
          total_invoiced?: number | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          billing_progress?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          engagement_letter_url?: string | null
          expected_end_date?: string | null
          id?: string
          notes?: string | null
          sales_deal_id?: string | null
          stage?: Database["public"]["Enums"]["delivery_stage"]
          stage_order?: number | null
          start_date?: string | null
          title?: string
          total_engagement_value?: number
          total_invoiced?: number | null
          total_paid?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_engagements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_engagements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_engagements_sales_deal_id_fkey"
            columns: ["sales_deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      document_links: {
        Row: {
          created_at: string | null
          doc_type: string | null
          id: string
          linkable_id: string
          linkable_type: string
          notes: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string | null
          doc_type?: string | null
          id?: string
          linkable_id: string
          linkable_type: string
          notes?: string | null
          title: string
          url: string
        }
        Update: {
          created_at?: string | null
          doc_type?: string | null
          id?: string
          linkable_id?: string
          linkable_type?: string
          notes?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      engagement_letter_services: {
        Row: {
          category_name: string
          created_at: string
          description: string | null
          id: string
          service_name: string
          sort_order: number
          template_url: string | null
        }
        Insert: {
          category_name: string
          created_at?: string
          description?: string | null
          id?: string
          service_name: string
          sort_order?: number
          template_url?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string
          description?: string | null
          id?: string
          service_name?: string
          sort_order?: number
          template_url?: string | null
        }
        Relationships: []
      }
      engagement_letters: {
        Row: {
          company_id: string | null
          created_at: string
          executed_url: string | null
          id: string
          notes: string | null
          service_id: string | null
          signed_date: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          executed_url?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          signed_date?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          executed_url?: string | null
          id?: string
          notes?: string | null
          service_id?: string | null
          signed_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_letters_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "engagement_letter_services"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          deal_type: string | null
          external_id: string | null
          id: string
          occurred_at: string
          source: string | null
          subject: string | null
          summary: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deal_type?: string | null
          external_id?: string | null
          id?: string
          occurred_at: string
          source?: string | null
          subject?: string | null
          summary?: string | null
          type: Database["public"]["Enums"]["interaction_type"]
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deal_type?: string | null
          external_id?: string | null
          id?: string
          occurred_at?: string
          source?: string | null
          subject?: string | null
          summary?: string | null
          type?: Database["public"]["Enums"]["interaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          amount: number | null
          created_at: string | null
          description: string | null
          id: string
          invoice_id: string | null
          quantity: number | null
          service_date: string | null
          unit_price: number | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          service_date?: string | null
          unit_price?: number | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          invoice_id?: string | null
          quantity?: number | null
          service_date?: string | null
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          qb_customer_id: string
          qb_invoice_id: string
          qb_last_updated: string | null
          raw_data: Json | null
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          balance_due?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          qb_customer_id: string
          qb_invoice_id: string
          qb_last_updated?: string | null
          raw_data?: Json | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          balance_due?: number | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          qb_customer_id?: string
          qb_invoice_id?: string
          qb_last_updated?: string | null
          raw_data?: Json | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          company_id: string | null
          contact_id: string | null
          content: string
          created_at: string | null
          deal_id: string | null
          error_message: string | null
          id: string
          note_type: string
          processing_result: Json | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          content: string
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          note_type: string
          processing_result?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          content?: string
          created_at?: string | null
          deal_id?: string | null
          error_message?: string | null
          id?: string
          note_type?: string
          processing_result?: Json | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "sales_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          invoice_id: string | null
          payment_date: string | null
          payment_method: string | null
          qb_payment_id: string | null
          reference_number: string | null
          synced_at: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          qb_payment_id?: string | null
          reference_number?: string | null
          synced_at?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_date?: string | null
          payment_method?: string | null
          qb_payment_id?: string | null
          reference_number?: string | null
          synced_at?: string | null
        }
        Relationships: []
      }
      qb_customer_map: {
        Row: {
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          match_confidence: string | null
          match_method: string | null
          qb_company_name: string | null
          qb_customer_id: string
          qb_display_name: string | null
          qb_email: string | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          match_confidence?: string | null
          match_method?: string | null
          qb_company_name?: string | null
          qb_customer_id: string
          qb_display_name?: string | null
          qb_email?: string | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          match_confidence?: string | null
          match_method?: string | null
          qb_company_name?: string | null
          qb_customer_id?: string
          qb_display_name?: string | null
          qb_email?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qb_customer_map_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qb_customer_map_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      qb_sync_state: {
        Row: {
          created_at: string | null
          id: string
          is_running: boolean | null
          last_qb_updated_time: string | null
          last_sync_at: string
          lock_acquired_at: string | null
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_running?: boolean | null
          last_qb_updated_time?: string | null
          last_sync_at?: string
          lock_acquired_at?: string | null
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_running?: boolean | null
          last_qb_updated_time?: string | null
          last_sync_at?: string
          lock_acquired_at?: string | null
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sales_deals: {
        Row: {
          actual_close_date: string | null
          company_id: string | null
          contact_id: string | null
          contract_sent_date: string | null
          contract_status: string | null
          countersigned_date: string | null
          created_at: string | null
          description: string | null
          engagement_letter_url: string | null
          expected_close_date: string | null
          id: string
          lost_reason: string | null
          notes: string | null
          probability: number | null
          stage: Database["public"]["Enums"]["sales_stage"]
          stage_order: number | null
          title: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_sent_date?: string | null
          contract_status?: string | null
          countersigned_date?: string | null
          created_at?: string | null
          description?: string | null
          engagement_letter_url?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          stage_order?: number | null
          title: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          company_id?: string | null
          contact_id?: string | null
          contract_sent_date?: string | null
          contract_status?: string | null
          countersigned_date?: string | null
          created_at?: string | null
          description?: string | null
          engagement_letter_url?: string | null
          expected_close_date?: string | null
          id?: string
          lost_reason?: string | null
          notes?: string | null
          probability?: number | null
          stage?: Database["public"]["Enums"]["sales_stage"]
          stage_order?: number | null
          title?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_deals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_status: {
        Row: {
          error_message: string | null
          id: string
          last_sync_at: string | null
          last_sync_status: string | null
          next_sync_at: string | null
          records_synced: number | null
          service: string
          updated_at: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          next_sync_at?: string | null
          records_synced?: number | null
          service: string
          updated_at?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          last_sync_status?: string | null
          next_sync_at?: string | null
          records_synced?: number | null
          service?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          default_pipeline_view: string | null
          email_signature: string | null
          id: string
          notifications_enabled: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          default_pipeline_view?: string | null
          email_signature?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          default_pipeline_view?: string | null
          email_signature?: string | null
          id?: string
          notifications_enabled?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      billing_summary: {
        Row: {
          company_id: string | null
          contact_id: string | null
          days_since_last_invoice: number | null
          first_invoice_date: string | null
          last_invoice_date: string | null
          overdue_amount: number | null
          overdue_count: number | null
          total_invoices: number | null
          total_outstanding: number | null
          total_paid: number | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acquire_invoice_lock: {
        Args: never
        Returns: {
          last_qb_updated_time: string
          last_sync_at: string
        }[]
      }
      backfill_invoice_contacts: { Args: never; Returns: number }
      refresh_billing_summary: { Args: never; Returns: undefined }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      agent_action_type:
        | "contact_surfaced"
        | "outreach_drafted"
        | "linkedin_post_drafted"
        | "research_performed"
        | "context_updated"
        | "follow_up_flagged"
      contact_category:
        | "prospect"
        | "client"
        | "center_of_influence"
        | "former_client"
        | "personal"
      delivery_stage:
        | "onboarding"
        | "in_progress"
        | "review"
        | "completed"
        | "on_hold"
      interaction_type:
        | "email_sent"
        | "email_received"
        | "meeting"
        | "call"
        | "linkedin_message"
        | "text"
        | "note"
        | "agent_outreach"
        | "conference"
      invoice_status:
        | "draft"
        | "sent"
        | "viewed"
        | "partial"
        | "paid"
        | "overdue"
        | "voided"
      sales_stage:
        | "qualification"
        | "needs_analysis"
        | "proposal"
        | "cold_deal"
        | "closed_won"
        | "closed_lost"
        | "service_complete"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      agent_action_type: [
        "contact_surfaced",
        "outreach_drafted",
        "linkedin_post_drafted",
        "research_performed",
        "context_updated",
        "follow_up_flagged",
      ],
      contact_category: [
        "prospect",
        "client",
        "center_of_influence",
        "former_client",
        "personal",
      ],
      delivery_stage: [
        "onboarding",
        "in_progress",
        "review",
        "completed",
        "on_hold",
      ],
      interaction_type: [
        "email_sent",
        "email_received",
        "meeting",
        "call",
        "linkedin_message",
        "text",
        "note",
        "agent_outreach",
        "conference",
      ],
      invoice_status: [
        "draft",
        "sent",
        "viewed",
        "partial",
        "paid",
        "overdue",
        "voided",
      ],
      sales_stage: [
        "qualification",
        "needs_analysis",
        "proposal",
        "cold_deal",
        "closed_won",
        "closed_lost",
        "service_complete",
      ],
    },
  },
} as const
