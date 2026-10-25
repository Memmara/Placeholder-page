-- Memmara game-layer reference DDL. PostgreSQL 16+. New schema; no existing app tables replaced.
-- Design artefact, not a deployment. JSON catalogues are seeded by a future importer.
BEGIN;
CREATE SCHEMA IF NOT EXISTS memmara_game;
SET search_path TO memmara_game, public;

CREATE TYPE market_mode AS ENUM ('SCHOOL_MODE','CONSUMER_MODE','HYBRID');
CREATE TYPE account_type AS ENUM ('school_managed','child','parent_managed','adult');
CREATE TYPE rarity AS ENUM ('common','uncommon','rare','epic','legendary','seasonal_legendary');
CREATE TYPE currency AS ENUM ('coins','premium','mastery_shards');
CREATE TYPE equip_slot AS ENUM ('hair','eyes','face','skin','torso_base','torso_outer','head','feet','hands','face_accessory','legs','hand_right','hand_left','back','shoulder','waist','pet','effect','background');

CREATE TABLE organisations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
 market_override market_mode NOT NULL DEFAULT 'SCHOOL_MODE', purchases_allowed boolean NOT NULL DEFAULT false,
 privacy_policy_version text NOT NULL, region char(2) NOT NULL DEFAULT 'GB', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (market_override <> 'SCHOOL_MODE' OR purchases_allowed=false)
);
CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_user_id text NOT NULL UNIQUE,
 organisation_id uuid REFERENCES organisations(id), account_type account_type NOT NULL,
 age_band text NOT NULL CHECK (age_band IN ('13_15','16_17','18_plus','unknown')),
 age_assurance_status text NOT NULL DEFAULT 'unknown', region char(2) NOT NULL DEFAULT 'GB',
 market_override market_mode, timezone text NOT NULL DEFAULT 'Europe/London',
 display_name text NOT NULL, private_profile boolean NOT NULL DEFAULT true,
 purchases_disabled boolean NOT NULL DEFAULT true, deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), CHECK (length(display_name) BETWEEN 1 AND 40),
 CHECK(account_type<>'adult' OR age_band='18_plus')
);
CREATE INDEX users_organisation ON users(organisation_id,id);
CREATE TABLE feature_flags (
 name text PRIMARY KEY, enabled boolean NOT NULL DEFAULT false, config jsonb NOT NULL DEFAULT '{}', version bigint NOT NULL DEFAULT 1
);
CREATE TABLE region_age_policies (
 region char(2) NOT NULL, age_band text NOT NULL, account_type account_type NOT NULL,
 money_ui_allowed boolean NOT NULL DEFAULT false, parent_checkout_required boolean NOT NULL DEFAULT true,
 legal_review_version text, PRIMARY KEY(region,age_band,account_type),
 CHECK (account_type <> 'school_managed' OR money_ui_allowed=false)
);
CREATE TABLE config_versions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, published_at timestamptz, payload jsonb NOT NULL,
 content_hash text NOT NULL UNIQUE, published_by text NOT NULL
);
CREATE TABLE subjects (id text PRIMARY KEY, name text NOT NULL, available boolean NOT NULL DEFAULT false);
INSERT INTO subjects VALUES ('general','General',true),('maths','Maths',false),('biology','Biology',true),('chemistry','Chemistry',false),('physics','Physics',true),('english','English',false),('history','History',false),('geography','Geography',false);

CREATE TABLE seasonal_events (
 id text PRIMARY KEY, name text NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 edition integer NOT NULL CHECK(edition>0), returning_variant_of text REFERENCES seasonal_events(id),
 claim_grace_ends_at timestamptz NOT NULL, config jsonb NOT NULL, CHECK(ends_at>starts_at), CHECK(claim_grace_ends_at>=ends_at)
);
CREATE TABLE item_sets (id text PRIMARY KEY,name text NOT NULL,subject_id text REFERENCES subjects(id),pieces integer NOT NULL CHECK(pieces BETWEEN 4 AND 6));
CREATE TABLE items (
 id text PRIMARY KEY, name text NOT NULL, category text NOT NULL, slot equip_slot NOT NULL, rarity rarity NOT NULL,
 set_id text REFERENCES item_sets(id), subject_id text NOT NULL REFERENCES subjects(id),
 source text[] NOT NULL, coin_price bigint CHECK(coin_price>0), premium_price bigint CHECK(premium_price>0),
 real_money_product_id text, purchasable_with_real_money boolean NOT NULL DEFAULT false,
 coin_purchasable boolean NOT NULL, drop_eligible boolean NOT NULL DEFAULT false,
 available_in_modes market_mode[] NOT NULL, region_availability char(2)[] NOT NULL DEFAULT ARRAY['GB']::char(2)[],
 season_id text REFERENCES seasonal_events(id), animated boolean NOT NULL, headline boolean NOT NULL DEFAULT false,
 art_brief text NOT NULL, asset_uri text, asset_version integer NOT NULL DEFAULT 1,
 asset_hash text, hidden_slots equip_slot[] NOT NULL DEFAULT '{}', occupies_slots equip_slot[] NOT NULL DEFAULT '{}',
 upgradeable boolean NOT NULL DEFAULT false, active boolean NOT NULL DEFAULT true,
 CHECK(coin_purchasable=(coin_price IS NOT NULL)),
 CHECK(NOT purchasable_with_real_money OR (coin_purchasable AND real_money_product_id IS NOT NULL)),
 CHECK(rarity<>'seasonal_legendary' OR (season_id IS NOT NULL AND coin_purchasable=false AND purchasable_with_real_money=false))
);
CREATE INDEX items_browse ON items(active,category,rarity,id);
CREATE INDEX items_set ON items(set_id,id);
CREATE INDEX items_subject ON items(subject_id,rarity,id);
CREATE TABLE set_bonuses (
 set_id text REFERENCES item_sets(id), pieces_required integer NOT NULL CHECK(pieces_required IN (2,4,5,6)),
 cosmetic_effect jsonb NOT NULL, title text, PRIMARY KEY(set_id,pieces_required)
);
CREATE TABLE unlock_conditions (id text PRIMARY KEY, condition_ast jsonb NOT NULL, metric_version integer NOT NULL, description text NOT NULL);
CREATE TABLE item_unlocks (item_id text REFERENCES items(id),condition_id text REFERENCES unlock_conditions(id),PRIMARY KEY(item_id,condition_id));
CREATE TABLE item_upgrades (
 item_id text REFERENCES items(id), form integer NOT NULL CHECK(form IN (1,2,3)), name text NOT NULL,
 coin_cost bigint NOT NULL CHECK(coin_cost>=0), shard_cost bigint NOT NULL CHECK(shard_cost>=0),
 shard_subject_id text NOT NULL REFERENCES subjects(id), asset_uri text, art_brief text NOT NULL,
 PRIMARY KEY(item_id,form), CHECK(form<>1 OR (coin_cost=0 AND shard_cost=0))
);
CREATE TABLE avatar_components (id text PRIMARY KEY,kind text NOT NULL,asset_uri text NOT NULL,asset_hash text NOT NULL,metadata jsonb NOT NULL);
CREATE TABLE avatars (
 user_id uuid PRIMARY KEY REFERENCES users(id), body_type text NOT NULL DEFAULT 'standard',
 appearance jsonb NOT NULL DEFAULT '{}', pose text NOT NULL DEFAULT 'idle', version bigint NOT NULL DEFAULT 1,
 showcase_visibility text NOT NULL DEFAULT 'private' CHECK(showcase_visibility IN ('private','approved_class','friends','public')),
 reduced_motion boolean NOT NULL DEFAULT false,sound_enabled boolean NOT NULL DEFAULT false,haptics_enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE attachment_definitions (slot equip_slot PRIMARY KEY,bone_name text NOT NULL,transform jsonb NOT NULL,layer_order integer NOT NULL,exclusion_rules jsonb NOT NULL);

CREATE TABLE study_sessions (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), learning_session_ref text NOT NULL UNIQUE,
 mode text NOT NULL CHECK(mode IN ('daily_mix','topic','exam','speed_select')),
 started_at timestamptz NOT NULL, completed_at timestamptz, verified boolean NOT NULL DEFAULT false,
 study_date date NOT NULL, verified_metrics jsonb NOT NULL DEFAULT '{}', verifier_version text,
 UNIQUE(user_id,id)
);
CREATE INDEX study_sessions_user_date ON study_sessions(user_id,study_date,mode);
CREATE TABLE study_events (
 id uuid PRIMARY KEY, user_id uuid NOT NULL, session_id uuid NOT NULL,
 attempt_ref text NOT NULL UNIQUE, subject_id text NOT NULL REFERENCES subjects(id), question_ref text NOT NULL,
 specification_point_ref text NOT NULL, occurred_at timestamptz NOT NULL,
 outcome text NOT NULL CHECK(outcome IN ('correct','partial','incorrect','unsure','review')),
 independent boolean NOT NULL, delayed boolean NOT NULL, verified boolean NOT NULL, UNIQUE(user_id,id),
 FOREIGN KEY(user_id,session_id) REFERENCES study_sessions(user_id,id)
);
CREATE INDEX study_events_user_question ON study_events(user_id,question_ref,occurred_at DESC);
CREATE INDEX study_events_user_point ON study_events(user_id,specification_point_ref,occurred_at DESC);
CREATE INDEX study_events_occurred_brin ON study_events USING brin(occurred_at);
CREATE TABLE reward_claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),
 source_kind text NOT NULL,source_ref text NOT NULL,reward_code text NOT NULL,
 idempotency_key text NOT NULL,request_hash text NOT NULL,config_version bigint NOT NULL REFERENCES config_versions(id),
 grant_snapshot jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,id),UNIQUE(user_id,idempotency_key),UNIQUE(user_id,source_kind,source_ref,reward_code)
);
CREATE INDEX reward_claims_user_time ON reward_claims(user_id,created_at DESC);
CREATE TABLE wallet_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),
 currency currency NOT NULL,subject_id text REFERENCES subjects(id),
 balance_projection bigint NOT NULL DEFAULT 0 CHECK(balance_projection>=0),version bigint NOT NULL DEFAULT 0,
 UNIQUE NULLS NOT DISTINCT(user_id,currency,subject_id),UNIQUE(user_id,id),
 CHECK((currency='mastery_shards')=(subject_id IS NOT NULL))
);
CREATE TABLE currency_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, user_id uuid NOT NULL,wallet_id uuid NOT NULL,
 amount bigint NOT NULL CHECK(amount<>0),reason text NOT NULL,
 reward_claim_id uuid REFERENCES reward_claims(id),idempotency_key text NOT NULL,
 source_ref text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,wallet_id) REFERENCES wallet_accounts(user_id,id),
 UNIQUE(wallet_id,idempotency_key)
);
CREATE INDEX currency_ledger_wallet_time ON currency_ledger(wallet_id,created_at DESC,id DESC);
CREATE INDEX currency_ledger_source ON currency_ledger(user_id,source_ref);
CREATE VIEW coin_ledger WITH (security_invoker=true) AS SELECT l.* FROM currency_ledger l JOIN wallet_accounts w ON w.id=l.wallet_id WHERE w.currency='coins';
CREATE VIEW premium_currency_ledger WITH (security_invoker=true) AS SELECT l.* FROM currency_ledger l JOIN wallet_accounts w ON w.id=l.wallet_id WHERE w.currency='premium';
CREATE TABLE earning_counters (
 user_id uuid REFERENCES users(id),currency currency NOT NULL,budget_class text NOT NULL,
 window_start date NOT NULL,window_kind text NOT NULL CHECK(window_kind IN ('day','week')),
 credited bigint NOT NULL DEFAULT 0 CHECK(credited>=0),PRIMARY KEY(user_id,currency,budget_class,window_kind,window_start)
);
CREATE TABLE xp_ledger (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),
 session_id uuid, amount bigint NOT NULL CHECK(amount>0),
 kind text NOT NULL CHECK(kind IN ('participation','performance','completion','streak','event')),
 reward_claim_id uuid NOT NULL REFERENCES reward_claims(id),source_ref text NOT NULL,
 idempotency_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,idempotency_key),FOREIGN KEY(user_id,session_id) REFERENCES study_sessions(user_id,id)
);
CREATE INDEX xp_ledger_user_time ON xp_ledger(user_id,created_at DESC);
CREATE TABLE xp_levels (level integer PRIMARY KEY CHECK(level>0),total_xp bigint NOT NULL UNIQUE,rank text NOT NULL,title text NOT NULL,reward jsonb NOT NULL);
CREATE FUNCTION level_xp(l bigint) RETURNS bigint LANGUAGE sql IMMUTABLE STRICT AS $$ SELECT 5*(l-1)*(l-1)+25*(l-1) $$;
CREATE TABLE progression (
 user_id uuid PRIMARY KEY REFERENCES users(id),xp_projection bigint NOT NULL DEFAULT 0 CHECK(xp_projection>=0),
 level bigint NOT NULL DEFAULT 1 CHECK(level>0),rank text NOT NULL DEFAULT 'Beginner',title text NOT NULL DEFAULT 'Beginner',
 prestige bigint NOT NULL DEFAULT 0 CHECK(prestige>=0),celebrated_level bigint NOT NULL DEFAULT 1,version bigint NOT NULL DEFAULT 1
);
CREATE TABLE streak_days (user_id uuid REFERENCES users(id),study_date date NOT NULL,session_id uuid NOT NULL,PRIMARY KEY(user_id,study_date),FOREIGN KEY(user_id,session_id) REFERENCES study_sessions(user_id,id));
CREATE TABLE streaks (user_id uuid PRIMARY KEY REFERENCES users(id),raw_daily integer NOT NULL DEFAULT 0,protected_daily integer NOT NULL DEFAULT 0,best_daily integer NOT NULL DEFAULT 0,weekly integer NOT NULL DEFAULT 0,last_completed date,version bigint NOT NULL DEFAULT 1);
CREATE TABLE streak_shields (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),grant_claim_id uuid NOT NULL REFERENCES reward_claims(id),granted_at timestamptz NOT NULL,used_for_date date,UNIQUE(user_id,used_for_date));
CREATE INDEX shields_available ON streak_shields(user_id,granted_at) WHERE used_for_date IS NULL;
CREATE TABLE streak_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,study_date date NOT NULL,source_ref text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,kind,source_ref));

CREATE TABLE inventory (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),item_id text NOT NULL REFERENCES items(id),
 form integer NOT NULL DEFAULT 1 CHECK(form BETWEEN 1 AND 3),favourite boolean NOT NULL DEFAULT false,
 acquired_at timestamptz NOT NULL DEFAULT now(),acquisition_claim_id uuid REFERENCES reward_claims(id),
 provenance text NOT NULL CHECK(provenance IN ('study','coin_purchase','premium_purchase','direct_purchase','gift','starter')),
 revoked_at timestamptz,version bigint NOT NULL DEFAULT 1,UNIQUE(user_id,item_id),UNIQUE(user_id,id)
);
CREATE INDEX inventory_user_newest ON inventory(user_id,acquired_at DESC);
CREATE TABLE inventory_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL,inventory_id uuid NOT NULL,kind text NOT NULL,source_ref text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id),UNIQUE(user_id,kind,source_ref,inventory_id));
CREATE TABLE item_mastery (
 user_id uuid REFERENCES users(id),inventory_id uuid NOT NULL,days_worn integer NOT NULL DEFAULT 0,
 verified_answers bigint NOT NULL DEFAULT 0,unlocked_effects text[] NOT NULL DEFAULT '{}',
 PRIMARY KEY(user_id,inventory_id),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id)
);
CREATE TABLE item_wear_days (user_id uuid REFERENCES users(id),inventory_id uuid NOT NULL,study_date date NOT NULL,PRIMARY KEY(user_id,inventory_id,study_date),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id));
CREATE TABLE mastery_events (user_id uuid REFERENCES users(id),inventory_id uuid NOT NULL,study_event_id uuid NOT NULL,PRIMARY KEY(user_id,inventory_id,study_event_id),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id),FOREIGN KEY(user_id,study_event_id) REFERENCES study_events(user_id,id));
CREATE TABLE outfits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,id),UNIQUE(user_id,name));
CREATE TABLE outfit_items (user_id uuid NOT NULL,outfit_id uuid NOT NULL,slot equip_slot NOT NULL,inventory_id uuid NOT NULL,PRIMARY KEY(outfit_id,slot),FOREIGN KEY(user_id,outfit_id) REFERENCES outfits(user_id,id),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id));
CREATE TABLE equipped_items (user_id uuid REFERENCES users(id),slot equip_slot NOT NULL,inventory_id uuid NOT NULL,equipped_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,slot),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id));
CREATE TABLE pet_definitions (item_id text PRIMARY KEY REFERENCES items(id),pet_type text NOT NULL CHECK(pet_type IN ('walking','floating','robotic','magical')),bond_forms jsonb NOT NULL);
CREATE TABLE pet_bonds (user_id uuid NOT NULL,inventory_id uuid NOT NULL,bond_points bigint NOT NULL DEFAULT 0,bond_level integer NOT NULL DEFAULT 1,PRIMARY KEY(user_id,inventory_id),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id));
CREATE TABLE pet_bond_events (user_id uuid NOT NULL,inventory_id uuid NOT NULL,session_id uuid NOT NULL,points integer NOT NULL CHECK(points>0),PRIMARY KEY(user_id,inventory_id,session_id),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id),FOREIGN KEY(user_id,session_id) REFERENCES study_sessions(user_id,id));
CREATE TABLE effects (item_id text PRIMARY KEY REFERENCES items(id),particle_budget integer NOT NULL CHECK(particle_budget BETWEEN 0 AND 128),reduced_motion_asset text NOT NULL,reaction_subject_id text REFERENCES subjects(id));
CREATE TABLE backgrounds (item_id text PRIMARY KEY REFERENCES items(id),kind text NOT NULL CHECK(kind IN ('static','detailed','animated','legendary_animated')),mobile_asset text NOT NULL);
CREATE TABLE showcase (user_id uuid REFERENCES users(id),position integer NOT NULL CHECK(position BETWEEN 1 AND 3),inventory_id uuid NOT NULL,PRIMARY KEY(user_id,position),FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id));
CREATE TABLE showcase_badges (user_id uuid REFERENCES users(id),position integer NOT NULL CHECK(position BETWEEN 1 AND 3),badge_id text NOT NULL,PRIMARY KEY(user_id,position));
CREATE TABLE achievements (id text PRIMARY KEY,name text NOT NULL,category text NOT NULL,subject_id text REFERENCES subjects(id),condition_id text NOT NULL REFERENCES unlock_conditions(id),hidden boolean NOT NULL DEFAULT false,prestige_points integer NOT NULL CHECK(prestige_points>0),reward jsonb NOT NULL,version integer NOT NULL DEFAULT 1);
CREATE TABLE user_achievements (user_id uuid REFERENCES users(id),achievement_id text REFERENCES achievements(id),progress numeric NOT NULL DEFAULT 0,unlocked_at timestamptz,reward_claim_id uuid REFERENCES reward_claims(id),PRIMARY KEY(user_id,achievement_id));
CREATE TABLE quests (id text PRIMARY KEY,name text NOT NULL,period text NOT NULL CHECK(period IN ('daily','weekly','season')),condition_id text NOT NULL REFERENCES unlock_conditions(id),subject_id text REFERENCES subjects(id),reward jsonb NOT NULL,version integer NOT NULL);
CREATE TABLE user_quests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),quest_id text REFERENCES quests(id),period_start date NOT NULL,progress numeric NOT NULL DEFAULT 0,completed_at timestamptz,reward_claim_id uuid REFERENCES reward_claims(id),UNIQUE(user_id,quest_id,period_start));

CREATE TABLE drop_boxes (id text PRIMARY KEY,name text NOT NULL,coin_min integer NOT NULL,coin_max integer NOT NULL,earnable_only boolean NOT NULL DEFAULT true,animation_key text NOT NULL,CHECK(coin_max>=coin_min AND coin_min>=0),CHECK(earnable_only));
CREATE TABLE loot_tables (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),box_id text NOT NULL REFERENCES drop_boxes(id),version integer NOT NULL,active_from timestamptz NOT NULL,active_to timestamptz,config_version bigint NOT NULL REFERENCES config_versions(id),UNIQUE(box_id,version));
CREATE TABLE loot_rarity_weights (loot_table_id uuid REFERENCES loot_tables(id),rarity rarity NOT NULL,weight_bps integer NOT NULL CHECK(weight_bps BETWEEN 0 AND 10000),PRIMARY KEY(loot_table_id,rarity));
CREATE TABLE loot_pool_items (loot_table_id uuid REFERENCES loot_tables(id),item_id text REFERENCES items(id),weight integer NOT NULL CHECK(weight>0),featured boolean NOT NULL DEFAULT false,PRIMARY KEY(loot_table_id,item_id));
CREATE TABLE user_boxes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),box_id text NOT NULL REFERENCES drop_boxes(id),reward_claim_id uuid NOT NULL REFERENCES reward_claims(id),season_id text REFERENCES seasonal_events(id),earned_at timestamptz NOT NULL DEFAULT now(),opened_at timestamptz,UNIQUE(user_id,id));
CREATE INDEX boxes_unopened ON user_boxes(user_id,earned_at) WHERE opened_at IS NULL;
CREATE TABLE pity_counters (user_id uuid REFERENCES users(id),rarity rarity NOT NULL,eligible_openings_without integer NOT NULL DEFAULT 0 CHECK(eligible_openings_without>=0),version bigint NOT NULL DEFAULT 1,PRIMARY KEY(user_id,rarity),CHECK(rarity IN ('rare','epic','legendary')));
CREATE TABLE drop_box_openings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,user_box_id uuid NOT NULL UNIQUE,
 loot_table_id uuid NOT NULL REFERENCES loot_tables(id),item_id text NOT NULL REFERENCES items(id),
 rolled_rarity rarity NOT NULL,duplicate boolean NOT NULL,coin_roll integer NOT NULL CHECK(coin_roll>=0),
 awarded_coins integer NOT NULL CHECK(awarded_coins>=0),awarded_shards integer NOT NULL CHECK(awarded_shards>=0),
 effective_odds jsonb NOT NULL,pity_before jsonb NOT NULL,pity_after jsonb NOT NULL,
 rng_audit_hash text NOT NULL,idempotency_key text NOT NULL,request_hash text NOT NULL,
 reward_claim_id uuid NOT NULL REFERENCES reward_claims(id),created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(user_id,user_box_id) REFERENCES user_boxes(user_id,id),UNIQUE(user_id,idempotency_key)
);

CREATE TABLE shop_catalogue (id text PRIMARY KEY,item_id text NOT NULL REFERENCES items(id),coin_price bigint NOT NULL CHECK(coin_price>0),starts_at timestamptz,ends_at timestamptz,metadata jsonb NOT NULL,version integer NOT NULL);
CREATE TABLE rotations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),rotation_date date NOT NULL,region char(2) NOT NULL,market_mode market_mode NOT NULL,items jsonb NOT NULL,config_version bigint NOT NULL REFERENCES config_versions(id),UNIQUE(rotation_date,region,market_mode));
CREATE TABLE bundles (id text PRIMARY KEY,name text NOT NULL,discount_percent integer NOT NULL CHECK(discount_percent BETWEEN 0 AND 20),premium_price bigint,real_money_product_id text,purchasable_with_real_money boolean NOT NULL DEFAULT false,available_in_modes market_mode[] NOT NULL,region_availability char(2)[] NOT NULL);
CREATE TABLE bundle_items (bundle_id text REFERENCES bundles(id),item_id text REFERENCES items(id),PRIMARY KEY(bundle_id,item_id));
CREATE TABLE wishlist (user_id uuid REFERENCES users(id),item_id text REFERENCES items(id),created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,item_id));
CREATE TABLE shop_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),catalogue_version integer NOT NULL,item_id text REFERENCES items(id),bundle_id text REFERENCES bundles(id),coin_total bigint NOT NULL CHECK(coin_total>0),idempotency_key text NOT NULL,request_hash text NOT NULL,reward_claim_id uuid NOT NULL REFERENCES reward_claims(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,idempotency_key),CHECK((item_id IS NULL)<>(bundle_id IS NULL)));

-- Payment-readiness storage only. All provider handlers and purchase grants are NOT IMPLEMENTED.
CREATE TABLE products (id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('cosmetic','bundle','premium_pack','coin_pack','season_pass','subscription')),platform text NOT NULL CHECK(platform IN ('apple','google','web')),platform_product_id text NOT NULL,enabled boolean NOT NULL DEFAULT false,metadata jsonb NOT NULL,UNIQUE(platform,platform_product_id));
ALTER TABLE items ADD FOREIGN KEY(real_money_product_id) REFERENCES products(id);
ALTER TABLE bundles ADD FOREIGN KEY(real_money_product_id) REFERENCES products(id);
CREATE TABLE product_prices (product_id text REFERENCES products(id),region char(2) NOT NULL,currency char(3) NOT NULL,minor_units bigint NOT NULL CHECK(minor_units>=0),platform_price_point_id text,display_price text NOT NULL,tax_inclusive boolean NOT NULL,valid_from timestamptz NOT NULL,valid_to timestamptz,PRIMARY KEY(product_id,region,currency,valid_from));
CREATE TABLE entitlement_definitions (id text PRIMARY KEY,kind text NOT NULL CHECK(kind IN ('item','currency','season_lane','subscription_feature')),item_id text REFERENCES items(id),currency currency,amount bigint CHECK(amount>0),metadata jsonb NOT NULL);
CREATE TABLE product_entitlements (product_id text REFERENCES products(id),entitlement_id text REFERENCES entitlement_definitions(id),PRIMARY KEY(product_id,entitlement_id));
CREATE TABLE purchases (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),product_id text NOT NULL REFERENCES products(id),
 platform text NOT NULL,provider_transaction_id text,provider_original_transaction_id text,
 state text NOT NULL CHECK(state IN ('created','pending','validated','granted','failed','refunded','revoked')),
 region char(2) NOT NULL,currency char(3) NOT NULL,minor_units bigint NOT NULL CHECK(minor_units>=0),
 price_snapshot jsonb NOT NULL,idempotency_key text NOT NULL,request_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(user_id,idempotency_key),UNIQUE(platform,provider_transaction_id),UNIQUE(user_id,id)
);
CREATE TABLE purchase_receipts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),purchase_id uuid NOT NULL REFERENCES purchases(id),platform text NOT NULL,receipt_hash text NOT NULL,encrypted_object_ref text NOT NULL,validated_at timestamptz,validation_result jsonb,UNIQUE(platform,receipt_hash));
CREATE TABLE entitlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),definition_id text NOT NULL REFERENCES entitlement_definitions(id),purchase_id uuid,reward_claim_id uuid REFERENCES reward_claims(id),granted_at timestamptz NOT NULL,revoked_at timestamptz,idempotency_key text NOT NULL,FOREIGN KEY(user_id,purchase_id) REFERENCES purchases(user_id,id),UNIQUE(user_id,id),UNIQUE(user_id,idempotency_key),CHECK((purchase_id IS NOT NULL)<>(reward_claim_id IS NOT NULL)));
CREATE TABLE inventory_grants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL,inventory_id uuid NOT NULL,
 entitlement_id uuid,reward_claim_id uuid,revoked_at timestamptz,
 FOREIGN KEY(user_id,inventory_id) REFERENCES inventory(user_id,id),
 FOREIGN KEY(user_id,entitlement_id) REFERENCES entitlements(user_id,id),
 FOREIGN KEY(user_id,reward_claim_id) REFERENCES reward_claims(user_id,id),
 UNIQUE(inventory_id,entitlement_id),UNIQUE(inventory_id,reward_claim_id),
 CHECK((entitlement_id IS NOT NULL)<>(reward_claim_id IS NOT NULL))
);
CREATE TABLE currency_lot_allocations (
 credit_ledger_id bigint REFERENCES currency_ledger(id),debit_ledger_id bigint REFERENCES currency_ledger(id),
 amount bigint NOT NULL CHECK(amount>0),PRIMARY KEY(credit_ledger_id,debit_ledger_id),
 CHECK(credit_ledger_id<>debit_ledger_id)
);
CREATE TABLE refunds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),purchase_id uuid NOT NULL REFERENCES purchases(id),provider_event_id text NOT NULL UNIQUE,minor_units bigint NOT NULL CHECK(minor_units>0),reason text NOT NULL,processed_at timestamptz,metadata jsonb NOT NULL);
CREATE TABLE refund_debts (user_id uuid REFERENCES users(id),purchase_id uuid REFERENCES purchases(id),currency currency NOT NULL,amount bigint NOT NULL CHECK(amount>0),settled_amount bigint NOT NULL DEFAULT 0 CHECK(settled_amount>=0),PRIMARY KEY(user_id,purchase_id,currency),CHECK(settled_amount<=amount));
CREATE TABLE subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),product_id text NOT NULL REFERENCES products(id),provider_original_id text NOT NULL UNIQUE,state text NOT NULL,starts_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,auto_renew boolean NOT NULL DEFAULT false,metadata jsonb NOT NULL);
CREATE TABLE parental_consents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),child_user_id uuid NOT NULL REFERENCES users(id),parent_identity_ref text NOT NULL,purpose text NOT NULL,policy_version text NOT NULL,verification_method text NOT NULL,granted_at timestamptz NOT NULL,revoked_at timestamptz,evidence_ref text NOT NULL);
CREATE INDEX consents_current ON parental_consents(child_user_id,purpose) WHERE revoked_at IS NULL;
CREATE TABLE spending_limits (user_id uuid PRIMARY KEY REFERENCES users(id),currency char(3) NOT NULL,monthly_cap_minor bigint NOT NULL DEFAULT 0 CHECK(monthly_cap_minor>=0),purchases_enabled boolean NOT NULL DEFAULT false,parent_identity_ref text,version bigint NOT NULL DEFAULT 1);
CREATE TABLE spending_reservations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id),purchase_id uuid NOT NULL REFERENCES purchases(id),month_start date NOT NULL,amount_minor bigint NOT NULL CHECK(amount_minor>0),currency char(3) NOT NULL,state text NOT NULL CHECK(state IN ('reserved','captured','released')),expires_at timestamptz NOT NULL,UNIQUE(purchase_id));
CREATE INDEX spend_month ON spending_reservations(user_id,month_start,state);
CREATE TABLE season_passes (id text PRIMARY KEY,event_id text NOT NULL REFERENCES seasonal_events(id),name text NOT NULL,premium_product_id text REFERENCES products(id),premium_enabled boolean NOT NULL DEFAULT false);
CREATE TABLE season_pass_rewards (pass_id text REFERENCES season_passes(id),step integer NOT NULL CHECK(step>0),lane text NOT NULL CHECK(lane IN ('free','premium')),entitlement_id text NOT NULL REFERENCES entitlement_definitions(id),study_condition_id text NOT NULL REFERENCES unlock_conditions(id),PRIMARY KEY(pass_id,step,lane));
CREATE TABLE season_pass_claims (user_id uuid REFERENCES users(id),pass_id text NOT NULL,step integer NOT NULL,lane text NOT NULL,reward_claim_id uuid NOT NULL REFERENCES reward_claims(id),PRIMARY KEY(user_id,pass_id,step,lane),FOREIGN KEY(pass_id,step,lane) REFERENCES season_pass_rewards(pass_id,step,lane));
CREATE TABLE notification_outbox (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),kind text NOT NULL,payload jsonb NOT NULL,idempotency_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),published_at timestamptz,UNIQUE(user_id,idempotency_key));
CREATE INDEX outbox_pending ON notification_outbox(id) WHERE published_at IS NULL;
CREATE TABLE audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,actor_ref text NOT NULL,user_id uuid REFERENCES users(id),action text NOT NULL,source_ref text NOT NULL,request_hash text NOT NULL,details jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_user_time ON audit_events(user_id,created_at DESC);

-- Append-only ledgers with an atomic, locked wallet projection. All writes stay inside the API transaction.
CREATE FUNCTION immutable_row() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only table: use a compensating event'; END $$;
CREATE TRIGGER currency_immutable BEFORE UPDATE OR DELETE ON currency_ledger FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE TRIGGER xp_immutable BEFORE UPDATE OR DELETE ON xp_ledger FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE TRIGGER inventory_events_immutable BEFORE UPDATE OR DELETE ON inventory_events FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE TRIGGER openings_immutable BEFORE UPDATE OR DELETE ON drop_box_openings FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE TRIGGER lot_allocations_immutable BEFORE UPDATE OR DELETE ON currency_lot_allocations FOR EACH ROW EXECUTE FUNCTION immutable_row();
CREATE FUNCTION apply_wallet_delta() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=memmara_game,pg_temp AS $$
BEGIN
 UPDATE wallet_accounts SET balance_projection=balance_projection+NEW.amount,version=version+1
 WHERE id=NEW.wallet_id AND user_id=NEW.user_id AND balance_projection+NEW.amount>=0;
 IF NOT FOUND THEN RAISE EXCEPTION 'insufficient balance or invalid wallet'; END IF;
 RETURN NEW;
END $$;
-- AFTER INSERT is deliberate: ON CONFLICT DO NOTHING must never mutate the projection.
CREATE TRIGGER wallet_projection AFTER INSERT ON currency_ledger FOR EACH ROW EXECUTE FUNCTION apply_wallet_delta();

CREATE FUNCTION check_equipment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid boolean;
BEGIN
 SELECT i.revoked_at IS NULL AND t.slot=NEW.slot INTO valid FROM inventory i JOIN items t ON t.id=i.item_id
 WHERE i.id=NEW.inventory_id AND i.user_id=NEW.user_id;
 IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'unowned, revoked or incompatible equipment'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER equipped_validate BEFORE INSERT OR UPDATE ON equipped_items FOR EACH ROW EXECUTE FUNCTION check_equipment();
CREATE TRIGGER outfit_validate BEFORE INSERT OR UPDATE ON outfit_items FOR EACH ROW EXECUTE FUNCTION check_equipment();
-- Multi-slot collision, entitlement revocation cleanup, equip version checks and school content filters are API transaction rules.

CREATE FUNCTION check_loot_odds() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE table_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN table_id:=OLD.loot_table_id; ELSE table_id:=NEW.loot_table_id; END IF;
 IF EXISTS(SELECT 1 FROM loot_tables WHERE id=table_id) AND
 (SELECT COALESCE(sum(weight_bps),0) FROM loot_rarity_weights WHERE loot_table_id=table_id)<>10000 THEN
 RAISE EXCEPTION 'loot table rarity weights must sum to 10000'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER loot_odds_total AFTER INSERT OR UPDATE OR DELETE ON loot_rarity_weights DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_loot_odds();

-- API transactions set app.user_id from the authenticated identity, never from a client-supplied ID.
-- API role must not own these tables and must not have BYPASSRLS. Privileged workers are separately scoped.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY self_user ON users USING(id=NULLIF(current_setting('app.user_id',true),'')::uuid) WITH CHECK(id=NULLIF(current_setting('app.user_id',true),'')::uuid);
DO $$ DECLARE owned_table record;
BEGIN
 FOR owned_table IN SELECT t.table_name FROM information_schema.tables t JOIN information_schema.columns c
 ON c.table_schema=t.table_schema AND c.table_name=t.table_name
 WHERE t.table_schema='memmara_game' AND t.table_type='BASE TABLE' AND c.column_name='user_id'
 LOOP
  EXECUTE format('ALTER TABLE memmara_game.%I ENABLE ROW LEVEL SECURITY',owned_table.table_name);
  EXECUTE format('CREATE POLICY own_user ON memmara_game.%I USING(user_id=NULLIF(current_setting(''app.user_id'',true),'''')::uuid) WITH CHECK(user_id=NULLIF(current_setting(''app.user_id'',true),'''')::uuid)',owned_table.table_name);
 END LOOP;
END $$;
-- Parent-consent and spending-evidence tables require dedicated parent/service grants; no teacher policy is included.
-- Browser clients receive no SQL credentials. Runtime role/tenant policy deployment is detailed in ENGINEERING.md.
REVOKE ALL ON ALL TABLES IN SCHEMA memmara_game FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA memmara_game FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA memmara_game FROM PUBLIC;
COMMIT;
