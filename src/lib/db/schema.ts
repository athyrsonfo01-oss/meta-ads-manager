import {
  pgTable,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────
export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "pending",
  "approved",
  "rejected",
  "executed",
]);

export const suggestionTypeEnum = pgEnum("suggestion_type", [
  "pause_campaign",
  "activate_campaign",
  "increase_budget",
  "decrease_budget",
  "pause_adset",
  "activate_adset",
  "pause_ad",
  "activate_ad",
  "change_bid",
  "duplicate_adset",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
  "ACTIVE",
  "PAUSED",
  "DELETED",
  "ARCHIVED",
]);

// ─────────────────────────────────────────────
// USERS (NextAuth)
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  password: text("password"),
  role: text("role").default("user").notNull(), // 'admin' | 'user'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ─────────────────────────────────────────────
// CAMPANHAS (cache local do Meta)
// ─────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id: text("id").primaryKey(), // ID do Meta
  name: text("name").notNull(),
  status: text("status").notNull(),
  objective: text("objective"),
  dailyBudget: real("daily_budget"),
  lifetimeBudget: real("lifetime_budget"),
  startTime: timestamp("start_time"),
  stopTime: timestamp("stop_time"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const adSets = pgTable("ad_sets", {
  id: text("id").primaryKey(),
  campaignId: text("campaign_id").notNull().references(() => campaigns.id),
  name: text("name").notNull(),
  status: text("status").notNull(),
  dailyBudget: real("daily_budget"),
  lifetimeBudget: real("lifetime_budget"),
  optimizationGoal: text("optimization_goal"),
  billingEvent: text("billing_event"),
  bidAmount: real("bid_amount"),
  targeting: jsonb("targeting"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const ads = pgTable("ads", {
  id: text("id").primaryKey(),
  adSetId: text("ad_set_id").notNull().references(() => adSets.id),
  campaignId: text("campaign_id").notNull(),
  name: text("name").notNull(),
  status: text("status").notNull(),
  creative: jsonb("creative"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// MÉTRICAS DIÁRIAS
// ─────────────────────────────────────────────
export const dailyMetrics = pgTable("daily_metrics", {
  id: text("id").primaryKey(), // campaignId_date
  entityId: text("entity_id").notNull(), // id da campanha/adset/ad
  entityType: text("entity_type").notNull(), // 'campaign' | 'adset' | 'ad'
  date: text("date").notNull(), // YYYY-MM-DD
  spend: real("spend").default(0),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),   // cliques no link
  ctr: real("ctr").default(0),
  cpc: real("cpc").default(0),
  cpm: real("cpm").default(0),
  reach: integer("reach").default(0),
  // Eventos do Pixel
  pageView: integer("page_view").default(0),
  buttonClick: integer("button_click").default(0),
  leads: integer("leads").default(0),
  mqls: integer("mqls").default(0),
  // Calculados
  cpl: real("cpl").default(0),
  cpmql: real("cpmql").default(0),
  connectRate: real("connect_rate").default(0),
  lpConversionRate: real("lp_conversion_rate").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// PÚBLICOS
// ─────────────────────────────────────────────
export const audiences = pgTable("audiences", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // CUSTOM, LOOKALIKE, SAVED
  subtype: text("subtype"),
  approximateCount: integer("approximate_count"),
  description: text("description"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// PIXELS E EVENTOS
// ─────────────────────────────────────────────
export const pixels = pgTable("pixels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
});

export const pixelEvents = pgTable("pixel_events", {
  id: text("id").primaryKey(), // pixelId_eventName_date
  pixelId: text("pixel_id").notNull().references(() => pixels.id),
  eventName: text("event_name").notNull(),
  eventCount: integer("event_count").default(0),
  date: text("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// SUGESTÕES DE IA (Otimizações)
// ─────────────────────────────────────────────
export const aiSuggestions = pgTable("ai_suggestions", {
  id: text("id").primaryKey(),
  entityId: text("entity_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityName: text("entity_name").notNull(),
  type: suggestionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  reasoning: text("reasoning").notNull(), // por que a IA está sugerindo
  currentValue: text("current_value"),    // valor atual (ex: budget R$ 50)
  suggestedValue: text("suggested_value"), // valor sugerido (ex: budget R$ 75)
  impact: text("impact"),                 // impacto esperado
  status: suggestionStatusEnum("status").default("pending").notNull(),
  executedAt: timestamp("executed_at"),
  rejectedReason: text("rejected_reason"),
  reportId: text("report_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────
// RELATÓRIOS DE IA
// ─────────────────────────────────────────────
export const aiReports = pgTable("ai_reports", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // data de referência do relatório
  summary: text("summary").notNull(),           // resumo executivo
  highlights: jsonb("highlights").notNull(),    // pontos positivos
  concerns: jsonb("concerns").notNull(),        // pontos de atenção
  fullAnalysis: text("full_analysis").notNull(), // análise completa em markdown
  totalSpend: real("total_spend").default(0),
  totalLeads: integer("total_leads").default(0),
  totalMqls: integer("total_mqls").default(0),
  avgCpl: real("avg_cpl").default(0),
  avgCpmql: real("avg_cpmql").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
