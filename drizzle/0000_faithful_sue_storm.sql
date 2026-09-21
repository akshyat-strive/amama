CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "staff_chat_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"from_id" text NOT NULL,
	"from_name" text NOT NULL,
	"from_role" text NOT NULL,
	"text" text NOT NULL,
	"mentions" text[] DEFAULT '{}' NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"entity_type" text DEFAULT '' NOT NULL,
	"date_of_birth" jsonb,
	"company_name" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"business_type" text DEFAULT '' NOT NULL,
	"import_licence" text DEFAULT '' NOT NULL,
	"sourcing" text[] DEFAULT '{}' NOT NULL,
	"annual_volume" text DEFAULT '' NOT NULL,
	"incoterm" text DEFAULT '' NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"reviewer_note" text,
	"reviewed_by_admin_id" uuid,
	"reviewed_by_name" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seller_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"entity_type" text DEFAULT '' NOT NULL,
	"seller_sub_type" text DEFAULT '' NOT NULL,
	"date_of_birth" jsonb,
	"farm_name" text DEFAULT '' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"region" text DEFAULT '' NOT NULL,
	"farm_size" text DEFAULT '' NOT NULL,
	"producer_type" text DEFAULT '' NOT NULL,
	"produce" text[] DEFAULT '{}' NOT NULL,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"review_status" text DEFAULT 'draft' NOT NULL,
	"reviewer_note" text,
	"reviewed_by_admin_id" uuid,
	"reviewed_by_name" text,
	"submitted_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submission_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"storage_key" text NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"from_party" text NOT NULL,
	"from_name" text,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"diff" jsonb,
	"card" jsonb,
	"visible_to" text[]
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"buyer_id" uuid NOT NULL,
	"buyer_name" text NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_name" text NOT NULL,
	"listing_id" text NOT NULL,
	"listing_title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kam_thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"person_id" uuid NOT NULL,
	"from_kam" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_name" text NOT NULL,
	"crop_id" text NOT NULL,
	"variety" text NOT NULL,
	"grade" text NOT NULL,
	"quantity_mt" double precision NOT NULL,
	"price_per_tonne_usd" double precision NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"description" text NOT NULL,
	"photo" text NOT NULL,
	"pin_x" double precision DEFAULT 50 NOT NULL,
	"pin_y" double precision DEFAULT 50 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"moderation_status" text DEFAULT 'unverified' NOT NULL,
	"moderation_note" text,
	"moderated_by" text,
	"moderated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"person_id" uuid NOT NULL,
	"listing_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_assignment_history" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"kam_id" text NOT NULL,
	"kam_name" text NOT NULL,
	"assigned_by" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_stage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"stage" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"listing_title" text NOT NULL,
	"buyer_id" uuid NOT NULL,
	"buyer_name" text NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_name" text NOT NULL,
	"status" text NOT NULL,
	"proposed_by" text NOT NULL,
	"agreed_price_per_tonne_usd" double precision NOT NULL,
	"agreed_quantity_mt" double precision NOT NULL,
	"proposed_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"decline_reason" text,
	"order_stage" text,
	"stage" text,
	"assigned_kam_id" text,
	"assigned_kam_name" text,
	"costing" jsonb NOT NULL,
	"contracting" jsonb NOT NULL,
	"compliance" jsonb NOT NULL,
	"payment" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "negotiation_rounds" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"by" text NOT NULL,
	"by_name" text NOT NULL,
	"price_per_tonne_usd" double precision NOT NULL,
	"quantity_mt" double precision NOT NULL,
	"incoterm" text,
	"delivery_window" text,
	"note" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text DEFAULT 'pending' NOT NULL,
	"outcome_by" text,
	"outcome_at" timestamp with time zone,
	"outcome_note" text
);
--> statement-breakpoint
CREATE TABLE "round_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"round_id" text NOT NULL,
	"by" text NOT NULL,
	"by_name" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipment_events" (
	"id" text PRIMARY KEY NOT NULL,
	"shipment_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text NOT NULL,
	"location" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" text PRIMARY KEY NOT NULL,
	"deal_id" text NOT NULL,
	"mode" text NOT NULL,
	"carrier" text NOT NULL,
	"document_number" text NOT NULL,
	"status" text NOT NULL,
	"origin" text,
	"destination" text,
	"current_location" text,
	"eta" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contract_amendments" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"raised_by" text NOT NULL,
	"raised_by_name" text NOT NULL,
	"text" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "contract_stage_history" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"stage" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"by" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" text PRIMARY KEY NOT NULL,
	"reference" text NOT NULL,
	"deal_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"listing_title" text NOT NULL,
	"buyer_id" uuid NOT NULL,
	"buyer_name" text NOT NULL,
	"seller_id" uuid NOT NULL,
	"seller_name" text NOT NULL,
	"kam_id" text NOT NULL,
	"kam_name" text NOT NULL,
	"stage" text NOT NULL,
	"terms" jsonb NOT NULL,
	"draft_body" text,
	"draft_version" integer DEFAULT 0 NOT NULL,
	"approvals" jsonb NOT NULL,
	"signatures" jsonb NOT NULL,
	"shipment_dates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requested_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"label" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"help" text
);
--> statement-breakpoint
CREATE TABLE "term_sheet_fields" (
	"id" text PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"label" text NOT NULL,
	"type" text NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"help" text,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "term_sheet_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"contract_id" text NOT NULL,
	"party" text NOT NULL,
	"title" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"submitted_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"name" text NOT NULL,
	"size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "app_users" ADD CONSTRAINT "app_users_id_user_id_fk" FOREIGN KEY ("id") REFERENCES "neon_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_profiles" ADD CONSTRAINT "admin_profiles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_profiles" ADD CONSTRAINT "buyer_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submission_documents" ADD CONSTRAINT "submission_documents_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_app_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_seller_id_app_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kam_thread_messages" ADD CONSTRAINT "kam_thread_messages_person_id_app_users_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_id_app_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_person_id_app_users_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."app_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_assignment_history" ADD CONSTRAINT "deal_assignment_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_stage_history" ADD CONSTRAINT "deal_stage_history_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_buyer_id_app_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_seller_id_app_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_rounds" ADD CONSTRAINT "negotiation_rounds_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_comments" ADD CONSTRAINT "round_comments_round_id_negotiation_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."negotiation_rounds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_amendments" ADD CONSTRAINT "contract_amendments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contract_stage_history" ADD CONSTRAINT "contract_stage_history_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_buyer_id_app_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_seller_id_app_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requested_documents" ADD CONSTRAINT "requested_documents_request_id_term_sheet_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."term_sheet_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_sheet_fields" ADD CONSTRAINT "term_sheet_fields_request_id_term_sheet_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."term_sheet_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "term_sheet_requests" ADD CONSTRAINT "term_sheet_requests_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_document_id_requested_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."requested_documents"("id") ON DELETE cascade ON UPDATE no action;