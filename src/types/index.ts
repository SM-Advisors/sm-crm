// ============================================================
// ENUMS
// ============================================================

export type ContactCategory =
  | "prospect"
  | "client"
  | "center_of_influence"
  | "former_client"
  | "personal";

export type SalesStage =
  | "lead"
  | "qualified"
  | "discovery"
  | "proposal"
  | "negotiation"
  | "closed_won"
  | "closed_lost";

export type DeliveryStage =
  | "onboarding"
  | "in_progress"
  | "review"
  | "completed"
  | "on_hold";

export type InteractionType =
  | "email_sent"
  | "email_received"
  | "meeting"
  | "call"
  | "linkedin_message"
  | "text"
  | "note"
  | "agent_outreach";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partial"
  | "paid"
  | "overdue"
  | "voided";

export type AgentActionType =
  | "contact_surfaced"
  | "outreach_drafted"
  | "linkedin_post_drafted"
  | "research_performed"
  | "context_updated"
  | "follow_up_flagged";

export type AgentActionStatus = "pending" | "approved" | "sent" | "dismissed";

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  description: string | null;
  employee_count: string | null;
  annual_revenue: string | null;
  qb_customer_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  tags?: Tag[];
  contact_count?: number;
}

export interface Contact {
  id: string;
  company_id: string | null;
  first_name: string;
  last_name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  linkedin_url: string | null;
  description: string | null;
  source: string | null;
  referral_source: string | null;
  association_or_affiliation: string | null;
  email_opt_out: boolean;
  qb_contact_id: string | null;
  is_primary_contact: boolean;
  last_contacted_at: string | null;
  last_contact_type: InteractionType | null;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company | null;
  categories?: ContactCategory[];
  tags?: Tag[];
}

export interface ContactWithDetails extends Contact {
  company: Company | null;
  categories: ContactCategory[];
  tags: Tag[];
  interactions: Interaction[];
  sales_deals: SalesDeal[];
  delivery_engagements: DeliveryEngagement[];
  document_links: DocumentLink[];
  agent_context_notes: AgentContextNote[];
}

// ============================================================
// TAGS
// ============================================================

export interface Tag {
  id: string;
  name: string;
  color: string;
}

// ============================================================
// PIPELINES
// ============================================================

export interface SalesDeal {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  stage: SalesStage;
  stage_order: number;
  value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  actual_close_date: string | null;
  lost_reason: string | null;
  engagement_letter_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company | null;
  contact?: Contact | null;
}

export interface DeliveryEngagement {
  id: string;
  sales_deal_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  title: string;
  description: string | null;
  stage: DeliveryStage;
  stage_order: number;
  total_engagement_value: number;
  total_invoiced: number;
  total_paid: number;
  billing_progress: number;
  start_date: string | null;
  expected_end_date: string | null;
  actual_end_date: string | null;
  engagement_letter_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company | null;
  contact?: Contact | null;
  sales_deal?: SalesDeal | null;
  invoices?: Invoice[];
}

// ============================================================
// DOCUMENTS
// ============================================================

export interface DocumentLink {
  id: string;
  linkable_type: string;
  linkable_id: string;
  title: string;
  url: string;
  doc_type: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================
// INTERACTIONS
// ============================================================

export interface Interaction {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  deal_type: string | null;
  type: InteractionType;
  subject: string | null;
  summary: string | null;
  occurred_at: string;
  source: string;
  external_id: string | null;
  created_at: string;
  // Joined
  contact?: Contact | null;
}

// ============================================================
// INVOICES
// ============================================================

export interface Invoice {
  id: string;
  engagement_id: string | null;
  company_id: string | null;
  contact_id: string | null;
  qb_invoice_id: string | null;
  qb_customer_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  total_amount: number | null;   // QB sync column name
  balance_due: number | null;
  currency: string | null;
  qb_last_updated: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Derived (not in DB)
  // amount_paid = total_amount - balance_due
  // Joined
  company?: Company | null;
  engagement?: DeliveryEngagement | null;
  line_items?: InvoiceLineItem[];
  payments?: Payment[];
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  description: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  service_date: string | null;
  item_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  qb_payment_id: string | null;
  payment_date: string | null;
  amount: number | null;
  payment_method: string | null;
  reference_number: string | null;
  synced_at: string | null;
  created_at: string;
}

// ============================================================
// AGENT
// ============================================================

export interface AgentContextNote {
  id: string;
  contact_id: string | null;
  company_id: string | null;
  note: string;
  source: string;
  expires_at: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  run_date: string;
  reasoning_summary: string | null;
  contacts_surfaced: AgentSurfacedContact[] | null;
  linkedin_post_drafted: boolean;
  linkedin_post_content: string | null;
  api_calls_made: number;
  total_cost_estimate: number | null;
  error_log: string | null;
  created_at: string;
  // Joined
  actions?: AgentAction[];
}

export interface AgentSurfacedContact {
  contact_id: string;
  reason: string;
  research_performed: boolean;
  outreach_angle?: string;
}

export interface AgentAction {
  id: string;
  run_id: string | null;
  contact_id: string | null;
  action_type: AgentActionType;
  content: string | null;
  status: AgentActionStatus;
  dismiss_reason: string | null;
  was_edited: boolean;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  // Joined
  contact?: Contact | null;
}

export interface AgentConfig {
  id: string;
  config_key: string;
  config_value: Record<string, unknown>;
  description: string | null;
  updated_at: string;
}

// ============================================================
// SYNC STATUS
// ============================================================

export interface SyncStatus {
  id: string;
  service: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  records_synced: number | null;
  error_message: string | null;
  next_sync_at: string | null;
  updated_at: string;
}

// ============================================================
// USER PREFERENCES
// ============================================================

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: "light" | "dark";
  default_pipeline_view: string;
  notifications_enabled: boolean;
  email_signature: string | null;
  updated_at: string;
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface FilterConfig {
  key: string;
  type: "text" | "date" | "enum" | "number" | "boolean";
  value: string | string[] | [string, string] | null;
  operator?: "contains" | "equals" | "starts_with" | "is_empty" | "gt" | "lt" | "between" | "in";
}

export const SALES_STAGE_LABELS: Record<SalesStage, string> = {
  lead: "Lead",
  qualified: "Qualified",
  discovery: "Discovery",
  proposal: "Proposal",
  negotiation: "Negotiation",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

export const DELIVERY_STAGE_LABELS: Record<DeliveryStage, string> = {
  onboarding: "Onboarding",
  in_progress: "In Progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On Hold",
};

export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  email_sent: "Email Sent",
  email_received: "Email Received",
  meeting: "Meeting",
  call: "Call",
  linkedin_message: "LinkedIn",
  text: "Text",
  note: "Note",
  agent_outreach: "Agent Outreach",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  voided: "Voided",
};

export const CATEGORY_LABELS: Record<ContactCategory, string> = {
  prospect: "Prospect",
  client: "Client",
  center_of_influence: "COI",
  former_client: "Former Client",
  personal: "Personal",
};
