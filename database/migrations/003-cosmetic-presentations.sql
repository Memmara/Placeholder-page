-- Presentation v2 never rewrites economic item identity or inventory entitlements.
CREATE TABLE memmara_game.item_presentations (
 item_id text PRIMARY KEY REFERENCES memmara_game.items(id),
 presentation_version integer NOT NULL DEFAULT 2,
 display_name text NOT NULL,
 visual_category text NOT NULL,
 display_slot text NOT NULL,
 exclusion_group text,
 metadata jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX item_presentation_category ON memmara_game.item_presentations(visual_category,item_id);
CREATE TABLE memmara_game.cosmetic_loadout_versions (
 user_id uuid PRIMARY KEY REFERENCES memmara_game.users(id),
 presentation_version integer NOT NULL DEFAULT 2,
 migrated_at timestamptz NOT NULL DEFAULT now(),
 retained_conflicts jsonb NOT NULL DEFAULT '[]'
);
CREATE TABLE memmara_game.cosmetic_equipped_items (
 user_id uuid NOT NULL REFERENCES memmara_game.users(id),
 slot text NOT NULL,
 inventory_id uuid NOT NULL,
 equipped_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,slot),
 UNIQUE(user_id,inventory_id),
 FOREIGN KEY(user_id,inventory_id) REFERENCES memmara_game.inventory(user_id,id)
);
CREATE TABLE memmara_game.cosmetic_outfit_items (
 user_id uuid NOT NULL REFERENCES memmara_game.users(id),
 outfit_id uuid NOT NULL REFERENCES memmara_game.outfits(id),
 slot text NOT NULL,
 inventory_id uuid NOT NULL,
 PRIMARY KEY(outfit_id,slot),
 UNIQUE(outfit_id,inventory_id),
 FOREIGN KEY(user_id,inventory_id) REFERENCES memmara_game.inventory(user_id,id)
);
CREATE FUNCTION memmara_game.check_cosmetic_equipment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid boolean; collision_group text;
BEGIN
 SELECT i.revoked_at IS NULL AND p.display_slot=NEW.slot,p.exclusion_group INTO valid,collision_group
 FROM memmara_game.inventory i JOIN memmara_game.item_presentations p ON p.item_id=i.item_id
 WHERE i.id=NEW.inventory_id AND i.user_id=NEW.user_id;
 IF valid IS DISTINCT FROM true THEN RAISE EXCEPTION 'unowned, revoked or incompatible cosmetic'; END IF;
 IF TG_TABLE_NAME='cosmetic_outfit_items' THEN
  IF NOT EXISTS(SELECT 1 FROM memmara_game.outfits WHERE id=NEW.outfit_id AND user_id=NEW.user_id)
  THEN RAISE EXCEPTION 'outfit does not belong to this user'; END IF;
  IF collision_group IS NOT NULL AND EXISTS(
   SELECT 1 FROM memmara_game.cosmetic_outfit_items e JOIN memmara_game.inventory i ON i.id=e.inventory_id
   JOIN memmara_game.item_presentations p ON p.item_id=i.item_id
   WHERE e.outfit_id=NEW.outfit_id AND e.slot<>NEW.slot AND p.exclusion_group=collision_group
  ) THEN RAISE EXCEPTION 'incompatible rear attachments in outfit'; END IF;
 ELSE
  IF collision_group IS NOT NULL AND EXISTS(
   SELECT 1 FROM memmara_game.cosmetic_equipped_items e JOIN memmara_game.inventory i ON i.id=e.inventory_id
   JOIN memmara_game.item_presentations p ON p.item_id=i.item_id
   WHERE e.user_id=NEW.user_id AND e.slot<>NEW.slot AND p.exclusion_group=collision_group
  ) THEN RAISE EXCEPTION 'incompatible rear attachments'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cosmetic_equipped_validate BEFORE INSERT OR UPDATE ON memmara_game.cosmetic_equipped_items
 FOR EACH ROW EXECUTE FUNCTION memmara_game.check_cosmetic_equipment();
CREATE TRIGGER cosmetic_outfit_validate BEFORE INSERT OR UPDATE ON memmara_game.cosmetic_outfit_items
 FOR EACH ROW EXECUTE FUNCTION memmara_game.check_cosmetic_equipment();
ALTER TABLE memmara_game.cosmetic_loadout_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.cosmetic_equipped_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE memmara_game.cosmetic_outfit_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_user ON memmara_game.cosmetic_loadout_versions USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid) WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY own_user ON memmara_game.cosmetic_equipped_items USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid) WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
CREATE POLICY own_user ON memmara_game.cosmetic_outfit_items USING(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid) WITH CHECK(user_id=NULLIF(current_setting('app.user_id',true),'')::uuid);
REVOKE ALL ON memmara_game.item_presentations,memmara_game.cosmetic_loadout_versions,memmara_game.cosmetic_equipped_items,memmara_game.cosmetic_outfit_items FROM PUBLIC;
