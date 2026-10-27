-- Consumer accounts may use Stripe. School-managed accounts remain blocked.
ALTER TABLE memmara_game.users
  ALTER COLUMN purchases_disabled SET DEFAULT false;

UPDATE memmara_game.users
SET purchases_disabled = false
WHERE account_type <> 'school_managed'
  AND purchases_disabled = true
  AND deleted_at IS NULL;

UPDATE memmara_game.users
SET purchases_disabled = true
WHERE account_type = 'school_managed'
  AND purchases_disabled = false;

