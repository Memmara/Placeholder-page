// Single account and game API for Memmara's local development environment.
import "./env.mjs";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  root,
  pool,
  seed,
  catalogue,
  byId,
  sets,
  achievements,
  levels,
  boxes,
  config,
  ensureConfigId,
} from "./catalogue.mjs";
import {
  migrateLoadout,
  categories,
  worlds,
  EPIC_PET_COHORT,
  exclusionFor,
} from "./presentation.mjs";
import { markWithRules } from "../src/marking.ts";
import { practiceLevel, streakBoost, streakStats } from "../src/engine.ts";
import { handleAuth, authenticatedUser, rate } from "./auth.mjs";
import { handleOAuth } from "./oauth.mjs";
import { handleCommerce, commerceConfigured } from "./commerce.mjs";
import { bestDailyStreak } from "./achievement-catalogue.mjs";
import { syncContentImport } from "./content-sync.mjs";

const production =
  process.env.NODE_ENV === "production" ||
  String(process.env.MEMMARA_PUBLIC_URL ?? "").startsWith("https://");
let questions = [],
  qmap = new Map(),
  definitions = [],
  definitionMap = new Map(),
  curriculum = [];
function loadLocalContent() {
  questions = JSON.parse(
    zlib
      .gunzipSync(
        fs.readFileSync(path.join(root, "data/questions-bank.json.gz")),
      )
      .toString("utf8"),
  );
  qmap = new Map(questions.map((q) => [q.question_id, q]));
  definitions = JSON.parse(
    fs.readFileSync(path.join(root, "public/data/definitions.json"), "utf8"),
  );
  definitionMap = new Map(definitions.map((item) => [item.id, item]));
  const source = JSON.parse(
    fs.readFileSync(path.join(root, "public/data/curriculum.json"), "utf8"),
  );
  curriculum = Array.isArray(source) ? source : source.records;
}
function inferredSubject(id) {
  const code = id.match(/^AQA(\d+)/)?.[1];
  return (
    {
      8461: "biology",
      8462: "chemistry",
      8463: "physics",
      8300: "maths",
      8035: "geography",
      8145: "history",
      8700: "english_language",
      8702: "english_literature",
      8062: "religious_studies",
      8132: "business_studies",
      8201: "art_and_design",
      8525: "computer_science",
      8552: "design_and_technology",
      8582: "physical_education",
      7132: "alevel_business",
      7136: "alevel_economics",
      7182: "alevel_psychology",
      7367: "alevel_further_maths",
      7402: "alevel_biology",
      7405: "alevel_chemistry",
      7357: "alevel_maths",
      7408: "alevel_physics",
      7042: "alevel_history",
      7192: "alevel_sociology",
      7712: "alevel_english_literature",
      7037: "alevel_geography",
      7152: "alevel_politics",
    }[code] ?? "physics"
  );
}
async function questionById(db, id) {
  if (qmap.size) {
    const q = qmap.get(id);
    return q ? { ...q, _subjectId: inferredSubject(id) } : undefined;
  }
  const row = (
    await db.query(
      "SELECT subject_id,payload FROM content_questions WHERE question_id=$1 AND active",
      [id],
    )
  ).rows[0];
  return row ? { ...row.payload, _subjectId: row.subject_id } : undefined;
}
async function validQuestionIds(db, ids) {
  if (qmap.size) return ids.every((id) => qmap.has(id));
  const rows = await db.query(
    "SELECT question_id FROM content_questions WHERE active AND question_id=ANY($1::text[])",
    [ids],
  );
  return rows.rowCount === ids.length;
}
async function definitionById(db, id) {
  if (definitionMap.size) return definitionMap.get(id);
  return (
    await db.query(
      "SELECT payload FROM content_definitions WHERE definition_id=$1 AND active",
      [id],
    )
  ).rows[0]?.payload;
}
const hash = (value) =>
  crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const date = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });
const storedDate = (value) =>
  value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value ?? "").slice(0, 10);
const error = (message, status = 400) =>
  Object.assign(new Error(message), { status });
function requireThat(ok, message, status = 400) {
  if (!ok) throw error(message, status);
}
async function transaction(fn) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (e) {
    await db.query("ROLLBACK");
    throw e;
  } finally {
    db.release();
  }
}
async function serialAll(tasks) {
  const results = [];
  for (const task of tasks) results.push(await task());
  return results;
}
const PLAN_TOKENS = {
  free: { capacity: 1, hours: 5, unlimited: false },
  plus: { capacity: 8, hours: 2, unlimited: false },
  pro: { capacity: 8, hours: 0, unlimited: true },
  school: { capacity: 8, hours: 0, unlimited: true },
};
// Exact Google identity for the owner's token-unlimited test account. Store
// only its email hash in the public source repository.
const UNLIMITED_TEST_GOOGLE_EMAIL_SHA256 =
  "dd1facf46207e9fac7a061ad6aaee47f2a61dcb0cd5dd8501299c66a4d18ed15";
async function refreshMonetisation(db, user, locked = false) {
  await db.query(
    "INSERT INTO user_monetisation(user_id) VALUES($1) ON CONFLICT DO NOTHING",
    [user],
  );
  const row = (
    await db.query(
      `SELECT * FROM user_monetisation WHERE user_id=$1${locked ? " FOR UPDATE" : ""}`,
      [user],
    )
  ).rows[0];
  const effectivePlan =
    row.account_plan === "free" &&
    row.referral_plus_until &&
    new Date(row.referral_plus_until) > new Date()
      ? "plus"
      : row.account_plan;
  const baseConfig = PLAN_TOKENS[effectivePlan] ?? PLAN_TOKENS.free;
  const googleEmail = !baseConfig.unlimited
    ? (await db.query(
        "SELECT email_at_link FROM auth_identities WHERE user_id=$1 AND provider='google'",
        [user],
      )).rows[0]?.email_at_link
    : null;
  const testUnlimited = !!googleEmail &&
    crypto.createHash("sha256").update(String(googleEmail).trim().toLowerCase()).digest("hex") ===
      UNLIMITED_TEST_GOOGLE_EMAIL_SHA256;
  const config = testUnlimited
    ? { ...baseConfig, unlimited: true }
    : baseConfig,
    interval = config.hours * 60 * 60 * 1000;
  let organic = Number(row.practice_tokens),
    next = row.next_token_at ? new Date(row.next_token_at) : null;
  const now = new Date();
  if (config.unlimited || organic >= config.capacity) next = null;
  else if (!next) next = new Date(now.getTime() + interval);
  else if (next <= now) {
    const periods = Math.floor((now.getTime() - next.getTime()) / interval) + 1;
    organic = Math.min(config.capacity, organic + periods);
    next =
      organic >= config.capacity
        ? null
        : new Date(next.getTime() + periods * interval);
  }
  if (
    organic !== Number(row.practice_tokens) ||
    (next?.getTime() ?? null) !==
      (row.next_token_at ? new Date(row.next_token_at).getTime() : null)
  )
    await db.query(
      "UPDATE user_monetisation SET practice_tokens=$2,next_token_at=$3,updated_at=now() WHERE user_id=$1",
      [user, organic, next],
    );
  return {
    ...row,
    account_plan: effectivePlan,
    practice_tokens: organic,
    purchased_tokens: Number(row.purchased_tokens ?? 0),
    next_token_at: next,
    tokenConfig: config,
  };
}
async function beginPaidSession(db, user, consumeBoost = true) {
  const row = await refreshMonetisation(db, user, true),
    available = Number(row.practice_tokens) + Number(row.purchased_tokens);
  requireThat(
    row.tokenConfig.unlimited || available > 0,
    "You have no practice tokens. Visit the Shop to continue.",
    409,
  );
  const multiplier = consumeBoost && row.xp_boost_pending ? 2 : 1;
  if (!row.tokenConfig.unlimited) {
    const organic = Number(row.practice_tokens),
      purchased = Number(row.purchased_tokens),
      useOrganic = organic > 0,
      nextOrganic = useOrganic ? organic - 1 : organic,
      nextPurchased = useOrganic ? purchased : purchased - 1,
      next =
        row.next_token_at ??
        (useOrganic && organic >= row.tokenConfig.capacity
          ? new Date(Date.now() + row.tokenConfig.hours * 60 * 60 * 1000)
          : null);
    await db.query(
      "UPDATE user_monetisation SET practice_tokens=$2,purchased_tokens=$3,next_token_at=$4,xp_boost_pending=CASE WHEN $5 THEN false ELSE xp_boost_pending END,updated_at=now() WHERE user_id=$1",
      [user, nextOrganic, nextPurchased, next, consumeBoost],
    );
  } else if (consumeBoost && row.xp_boost_pending)
    await db.query(
      "UPDATE user_monetisation SET xp_boost_pending=false,updated_at=now() WHERE user_id=$1",
      [user],
    );
  return multiplier;
}
async function claim(db, user, kind, ref, code, snapshot) {
  return (
    await db.query(
      `INSERT INTO reward_claims(user_id,source_kind,source_ref,reward_code,idempotency_key,request_hash,config_version,grant_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING id`,
      [
        user,
        kind,
        ref,
        code,
        [kind, ref, code].join(":"),
        hash(snapshot),
        await ensureConfigId(),
        snapshot,
      ],
    )
  ).rows[0]?.id;
}
async function credit(
  db,
  user,
  amount,
  reason,
  claimId,
  key,
  currency = "coins",
  subject = null,
) {
  if (!amount) return 0;
  const wallet = (
    await db.query(
      "INSERT INTO wallet_accounts(user_id,currency,subject_id) VALUES($1,$2,$3) ON CONFLICT(user_id,currency,subject_id) DO UPDATE SET currency=excluded.currency RETURNING id",
      [user, currency, subject],
    )
  ).rows[0].id;
  if (
    (
      await db.query(
        "SELECT 1 FROM currency_ledger WHERE wallet_id=$1 AND idempotency_key=$2",
        [wallet, key],
      )
    ).rowCount
  )
    return 0;
  if (amount > 0) {
    const milestone =
        reason.startsWith("Level ") || reason.startsWith("Achievement:"),
      kind =
        currency === "mastery_shards"
          ? reason === "Duplicate cosmetic"
            ? "duplicate_shards"
            : "mastery_shards"
          : milestone
            ? "milestone"
            : "recurring";
    const dailyLimit =
      currency === "mastery_shards"
        ? 30
        : milestone
          ? config.economy.one_off_milestone_coin_daily_limit
          : config.economy.daily_recurring_coin_cap;
    const weeklyLimit =
      currency === "mastery_shards"
        ? 210
        : milestone
          ? config.economy.one_off_milestone_coin_weekly_limit
          : config.economy.weekly_recurring_coin_cap;
    const monday = new Date(date() + "T12:00:00Z");
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const windows = [
      ["day", date(), dailyLimit],
      ["week", monday.toISOString().slice(0, 10), weeklyLimit],
    ];
    for (const [window, start, limit] of windows) {
      await db.query(
        "INSERT INTO earning_counters(user_id,currency,budget_class,window_start,window_kind) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
        [user, currency, kind, start, window],
      );
      const used = Number(
        (
          await db.query(
            "SELECT credited FROM earning_counters WHERE user_id=$1 AND currency=$2 AND budget_class=$3 AND window_start=$4 AND window_kind=$5 FOR UPDATE",
            [user, currency, kind, start, window],
          )
        ).rows[0].credited,
      );
      amount = Math.min(amount, Math.max(0, limit - used));
    }
    if (!amount) return 0;
    for (const [window, start] of windows)
      await db.query(
        "UPDATE earning_counters SET credited=credited+$6 WHERE user_id=$1 AND currency=$2 AND budget_class=$3 AND window_start=$4 AND window_kind=$5",
        [user, currency, kind, start, window, amount],
      );
  }
  await db.query(
    "INSERT INTO currency_ledger(user_id,wallet_id,amount,reason,reward_claim_id,idempotency_key,source_ref) VALUES($1,$2,$3,$4,$5,$6,$6)",
    [user, wallet, amount, reason, claimId, key],
  );
  return amount;
}
async function grantItem(db, user, item, claimId, provenance = "study") {
  const inv = (
    await db.query(
      "INSERT INTO inventory(user_id,item_id,acquisition_claim_id,provenance) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id",
      [user, item, claimId, provenance],
    )
  ).rows[0];
  if (inv)
    await db.query(
      "INSERT INTO inventory_grants(user_id,inventory_id,reward_claim_id) VALUES($1,$2,$3)",
      [user, inv.id, claimId],
    );
  return !!inv;
}
async function awardLevel(db, user, level) {
  const reward = levels[level - 1] ?? {
    level,
    coins: level % 5 === 0 ? 20 : 10,
    rank_bonus_coins: 0,
    unlock_items: [],
    boxes: level % 5 === 0 ? ["level_common"] : [],
  };
  const cid = await claim(
    db,
    user,
    "level",
    String(level),
    "level_reward",
    reward,
  );
  if (!cid) return;
  await credit(
    db,
    user,
    reward.coins + reward.rank_bonus_coins,
    "Level " + level,
    cid,
    "level:" + level,
  );
  for (const item of reward.unlock_items) await grantItem(db, user, item, cid);
  for (const box of reward.boxes)
    await db.query(
      "INSERT INTO user_boxes(user_id,box_id,reward_claim_id) VALUES($1,$2,$3)",
      [user, box, cid],
    );
}
async function addXp(db, user, amount, kind, ref, session = null) {
  if (!amount) return;
  if (session) {
    const multiplier = Number(
      (
        await db.query(
          "SELECT xp_multiplier FROM study_sessions WHERE id=$1 AND user_id=$2",
          [session, user],
        )
      ).rows[0]?.xp_multiplier ?? 1,
    );
    amount *= multiplier;
  }
  const cid = await claim(db, user, "xp", ref, kind, { amount });
  if (!cid) return;
  await db.query(
    "INSERT INTO xp_ledger(user_id,session_id,amount,kind,reward_claim_id,source_ref,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$6)",
    [user, session, amount, kind, cid, ref + ":" + kind],
  );
  const progress = (
    await db.query(
      "UPDATE progression SET xp_projection=xp_projection+$2,version=version+1 WHERE user_id=$1 RETURNING xp_projection,level",
      [user, amount],
    )
  ).rows[0];
  const rank = practiceLevel(Number(progress.xp_projection));
  await db.query(
    "UPDATE progression SET level=$2,title=$3,rank=$3 WHERE user_id=$1",
    [user, rank.level, rank.name],
  );
  const eligible = (
    await db.query(
      "SELECT 1 FROM study_sessions WHERE user_id=$1 AND verified LIMIT 1",
      [user],
    )
  ).rowCount;
  if (eligible)
    for (let l = Number(progress.level) + 1; l <= rank.level; l++)
      await awardLevel(db, user, l);
  return amount;
}
async function state(user) {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user]);
    await migrateLoadout(db, user);
    // One visit per London calendar day, including persistent signed-in visits.
    await claim(db, user, "achievement_activity", date(), "visit", {});
    const monetisation = await refreshMonetisation(db, user, true);
    await db.query("COMMIT");
  const profile = (
    await db.query("SELECT gender_identity FROM users WHERE id=$1", [user])
  ).rows[0];
  const result = await serialAll([
    () => db.query("SELECT * FROM avatars WHERE user_id=$1", [user]),
    () => db.query(
      "SELECT id,item_id,form,favourite,acquired_at,provenance FROM inventory WHERE user_id=$1 AND revoked_at IS NULL ORDER BY acquired_at DESC",
      [user],
    ),
    () => db.query(
      "SELECT e.slot,i.item_id,e.inventory_id FROM cosmetic_equipped_items e JOIN inventory i ON i.id=e.inventory_id AND i.user_id=e.user_id WHERE e.user_id=$1 AND i.revoked_at IS NULL",
      [user],
    ),
    () => db.query(
      "SELECT currency,subject_id,balance_projection::int AS balance FROM wallet_accounts WHERE user_id=$1",
      [user],
    ),
    () => db.query("SELECT item_id FROM wishlist WHERE user_id=$1", [user]),
    () => db.query("SELECT * FROM progression WHERE user_id=$1", [user]),
    () => db.query(
      "SELECT b.id,b.box_id,b.earned_at,d.name FROM user_boxes b JOIN drop_boxes d ON d.id=b.box_id WHERE b.user_id=$1 AND opened_at IS NULL ORDER BY earned_at",
      [user],
    ),
    () => db.query(
      "SELECT name,id FROM outfits WHERE user_id=$1 ORDER BY created_at DESC",
      [user],
    ),
    () => db.query(
      "SELECT amount::int,reason,created_at FROM currency_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 10",
      [user],
    ),
    () => db.query(
      "SELECT achievement_id,progress,unlocked_at FROM user_achievements WHERE user_id=$1",
      [user],
    ),
    () => db.query(
      "SELECT count(*)::int AS sessions FROM study_sessions WHERE user_id=$1 AND verified",
      [user],
    ),
    () => db.query(
      "SELECT history_version FROM local_game_clients WHERE user_id=$1",
      [user],
    ),
    () => db.query(
      "SELECT i.item_id,s.position FROM showcase s JOIN inventory i ON i.id=s.inventory_id WHERE s.user_id=$1 ORDER BY position",
      [user],
    ),
    () => db.query(
      "SELECT study_date::text FROM streak_days WHERE user_id=$1 ORDER BY study_date",
      [user],
    ),
    () => db.query(
      "SELECT count(*)::int AS count FROM study_sessions WHERE user_id=$1 AND mode='daily_mix' AND study_date=$2::date",
      [user, date()],
    ),
  ]);
  const [
    avatar,
    inventory,
    equipped,
    wallets,
    wishlist,
    progression,
    userBoxes,
    outfits,
    ledger,
    earned,
    stats,
    client,
    showcase,
    days,
    dailyMixes,
  ] = result.map((x) => x.rows);
  const today = date(),
    qualified = days.some((d) => d.study_date === today),
    chestPurchased = userBoxes.some(
      (box) =>
        box.box_id === "daily_free" &&
        new Date(box.earned_at).toLocaleDateString("en-CA", {
          timeZone: "Europe/London",
        }) === today,
    );
  const pity = Object.fromEntries(
    (
      await db.query(
        "SELECT rarity,eligible_openings_without FROM pity_counters WHERE user_id=$1",
        [user],
      )
    ).rows.map((p) => [p.rarity, p.eligible_openings_without]),
  );
  const boxDefinitions = boxes.map(({ active_pool, ...b }) => {
    const weights = { ...b.rarity_probabilities_percent },
      order = config.rarity.map((r) => r.id);
    let guarantee = -1;
    for (const rule of config.pity)
      if (
        weights[rule.rarity] > 0 &&
        (pity[rule.rarity] ?? 0) + 1 >= rule.guaranteed_by_eligible_opening
      )
        guarantee = Math.max(guarantee, order.indexOf(rule.rarity));
    for (const r of order)
      if (
        order.indexOf(r) < guarantee ||
        !active_pool.some((id) => byId.get(id)?.rarity === r)
      )
        weights[r] = 0;
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    return {
      ...b,
      rarity_probabilities_percent: Object.fromEntries(
        Object.entries(weights).map(([r, w]) => [
          r,
          total ? Math.round((w / total) * 1000) / 10 : 0,
        ]),
      ),
    };
  });
  return {
    catalogueVersion: 2,
    categories,
    worlds,
    loadoutNotes:
      (
        await db.query(
          "SELECT retained_conflicts FROM cosmetic_loadout_versions WHERE user_id=$1",
          [user],
        )
      ).rows[0]?.retained_conflicts ?? [],
    userId: user,
    profile: { genderIdentity: profile?.gender_identity ?? null },
    avatar: avatar[0],
    inventory,
    equipped,
    wallets,
    wishlist: wishlist.map((w) => w.item_id),
    progression: progression[0],
    boxes: userBoxes,
    outfits,
    ledger,
    earned,
    showcase,
    historyImported: client[0].history_version >= 2,
    stats: stats[0],
    studyDays: days.map((d) => d.study_date),
    daily: {
      qualified,
      coins: config.economy.base_daily_mix_coins,
      box: "daily_free",
      chestPurchased,
      mixesStarted: Number(dailyMixes[0]?.count ?? 0),
      extraMixCredits:
        storedDate(monetisation.daily_mix_unlock_date) === today
          ? Number(monetisation.extra_daily_mix_credits ?? 0)
          : 0,
      unlimitedMixes: monetisation.account_plan !== "free",
    },
    monetisation: {
      plan: monetisation.account_plan,
      tokens: monetisation.tokenConfig.unlimited
        ? Number(monetisation.practice_tokens) +
          Number(monetisation.purchased_tokens)
        : Number(monetisation.practice_tokens) +
          Number(monetisation.purchased_tokens),
      organicTokens: Number(monetisation.practice_tokens),
      purchasedTokens: Number(monetisation.purchased_tokens),
      organicCapacity: monetisation.tokenConfig.capacity,
      adTokenLimit: monetisation.tokenConfig.capacity + 1,
      nextTokenAt: monetisation.next_token_at?.toISOString?.() ?? null,
      xpBoostPending: monetisation.xp_boost_pending,
      refillHours: monetisation.tokenConfig.hours,
      unlimited: monetisation.tokenConfig.unlimited,
    },
    catalogue,
    sets,
    achievements,
    levelRewards: levels,
    boxDefinitions,
    mode: "SCHOOL_MODE",
    payments: commerceConfigured(),
  };
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    db.release();
  }
}
async function updateAchievements(db, user) {
  const owned = new Set(
    (
      await db.query(
        "SELECT item_id FROM inventory WHERE user_id=$1 AND revoked_at IS NULL",
        [user],
      )
    ).rows.map((i) => i.item_id),
  );
  const days = (
      await db.query(
        "SELECT study_date::text FROM streak_days WHERE user_id=$1",
        [user],
      )
    ).rows.map((d) => d.study_date),
    streak = streakStats(new Set(days));
  const weeks = new Map();
  for (const d of days) {
    const at = new Date(d + "T12:00:00Z");
    at.setUTCDate(at.getUTCDate() - ((at.getUTCDay() + 6) % 7));
    const monday = at.toISOString().slice(0, 10);
    weeks.set(monday, (weeks.get(monday) ?? 0) + 1);
  }
  const counts = (
    await db.query(
      `SELECT count(DISTINCT question_ref) FILTER(WHERE independent)::int AS independent,
  count(DISTINCT specification_point_ref) FILTER(WHERE independent AND delayed AND outcome='correct')::int AS delayed FROM study_events WHERE user_id=$1 AND verified`,
      [user],
    )
  ).rows[0];
  const sessions = (
    await db.query(
      "SELECT completed_at FROM study_sessions WHERE user_id=$1 AND verified AND mode<>'review' ORDER BY completed_at",
      [user],
    )
  ).rows;
  const activity = (await db.query(`
    SELECT source_ref AS day FROM reward_claims
    WHERE user_id=$1 AND source_kind='achievement_activity' AND reward_code='visit'
    UNION SELECT (created_at AT TIME ZONE 'Europe/London')::date::text
    FROM auth_sessions WHERE user_id=$1`, [user])).rows.map(row=>row.day);
  const arcade = (await db.query(`SELECT count(*)::int AS runs,
    count(DISTINCT study_date)::int AS days FROM study_sessions s
    WHERE user_id=$1 AND (verified_metrics @> '{"minigame":true}'::jsonb
      OR (mode='speed_select' AND EXISTS(SELECT 1 FROM study_events e WHERE e.user_id=$1 AND e.session_id=s.id)))`, [user])).rows[0];
  const collectionMetrics = (await db.query(`SELECT
    (SELECT count(*)::int FROM cosmetic_equipped_items WHERE user_id=$1) AS slots,
    (SELECT count(*)::int FROM outfits WHERE user_id=$1) AS outfits,
    (SELECT count(*)::int FROM reward_claims WHERE user_id=$1 AND source_kind='minigame') AS arcade_correct,
    EXISTS(SELECT 1 FROM reward_claims WHERE user_id=$1 AND source_kind='achievement_activity' AND reward_code='avatar_customised') AS customised`, [user])).rows[0];
  const epicPets = EPIC_PET_COHORT.map((id) => ({ id }));
  const metrics = {
    qualifying_sessions: sessions.length,
    distinct_independent_answers: counts.independent,
    distinct_delayed_success_points: counts.delayed,
    sign_in_days: new Set(activity).size,
    best_sign_in_streak: bestDailyStreak(activity),
    best_practice_streak: bestDailyStreak(days),
    minigame_runs: arcade.runs,
    minigame_days: arcade.days,
    minigame_correct_rewards: collectionMetrics.arcade_correct,
    avatar_customised: collectionMetrics.customised ? 1 : 0,
    equipped_slots: collectionMetrics.slots,
    saved_outfits: collectionMetrics.outfits,
    protected_daily_streak: streak.daily,
    unique_daily_mix_dates: days.length,
    qualifying_weeks: [...weeks.values()].filter((n) => n >= 3).length,
    weekly_streak: streak.weekly,
    complete_sets: sets.filter((s) => s.item_ids.every((id) => owned.has(id)))
      .length,
    epic_pet_collection_ratio:
      epicPets.filter((i) => owned.has(i.id)).length / epicPets.length,
    verified_comebacks: sessions.filter(
      (s, i) =>
        i > 0 &&
        new Date(s.completed_at) - new Date(sessions[i - 1].completed_at) >=
          7 * 86400000,
    ).length,
  };
  const recovered = (
    await db.query(
      `SELECT count(DISTINCT good.specification_point_ref)::int AS n FROM study_events good WHERE good.user_id=$1 AND good.outcome='correct' AND good.independent AND good.delayed AND EXISTS(SELECT 1 FROM study_events bad WHERE bad.user_id=$1 AND bad.specification_point_ref=good.specification_point_ref AND bad.outcome IN ('incorrect','partial','unsure') AND bad.occurred_at<=good.occurred_at-interval '24 hours')`,
      [user],
    )
  ).rows[0].n;
  metrics.distinct_recovered_points = recovered;
  const previous = new Map((await db.query(
    "SELECT achievement_id,progress,unlocked_at FROM user_achievements WHERE user_id=$1", [user],
  )).rows.map(a=>[a.achievement_id,a]));
  const already = new Set([...previous.values()].filter(a=>a.unlocked_at).map(a=>a.achievement_id));
  const unlocked = [];
  const updates = [];
  for (const a of achievements) {
    if (already.has(a.id)) continue;
    let value = metrics[a.condition.metric] ?? 0;
    const complete = value >= a.condition.target;
    if (!complete && Number(previous.get(a.id)?.progress) === value) continue;
    let cid = null;
    if (complete) {
      cid = await claim(db, user, "achievement", a.id, "achievement", a.reward);
      if (cid) {
        await credit(
          db,
          user,
          a.reward.coins,
          "Achievement: " + a.name,
          cid,
          "achievement:" + a.id,
        );
        if (a.reward.shards)
          await credit(
            db,
            user,
            a.reward.shards.amount,
            "Achievement: " + a.name,
            cid,
            "achievement-shards:" + a.id,
            "mastery_shards",
            a.reward.shards.subject,
          );
        for (const item of a.reward.items ?? [])
          await grantItem(db, user, item, cid);
        await db.query(
          "UPDATE progression SET prestige=prestige+$2 WHERE user_id=$1",
          [user, a.reward.prestige_points ?? 10],
        );
        unlocked.push(a.name);
      }
    }
    updates.push({achievement_id:a.id,progress:value,unlocked_at:complete?new Date():null,reward_claim_id:cid});
  }
  if(updates.length) await db.query(`INSERT INTO user_achievements(user_id,achievement_id,progress,unlocked_at,reward_claim_id)
    SELECT $1,achievement_id,progress,unlocked_at,reward_claim_id
    FROM jsonb_to_recordset($2::jsonb) AS x(achievement_id text,progress numeric,unlocked_at timestamptz,reward_claim_id uuid)
    ON CONFLICT(user_id,achievement_id) DO UPDATE SET progress=excluded.progress,
    unlocked_at=COALESCE(user_achievements.unlocked_at,excluded.unlocked_at),
    reward_claim_id=COALESCE(user_achievements.reward_claim_id,excluded.reward_claim_id)`,[user,JSON.stringify(updates)]);
  return unlocked;
}
async function mutate(user, route, b) {
  return transaction(async (db) => {
    // All mutations for one learner serialize, including purchases and repeat reward requests.
    await db.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user]);
    // The game state request has already migrated the avatar loadout. Avoid
    // another database round trip on every answer in a timed game.
    if (route === "achievement-progress") {
      const unlocked = await updateAchievements(db, user);
      return { message: unlocked.length ? "Achievement unlocked: " + unlocked.join(", ") : "" };
    }
    if (route !== "answer" && route !== "minigame-answer")
      await migrateLoadout(db, user);
    if (route === "ad-intent") {
      requireThat(
        ["token", "xp_boost", "daily_mix_unlock"].includes(b.rewardKind),
        "Choose a valid ad reward.",
      );
      requireThat(
        ["web_google", "admob", "development"].includes(b.provider),
        "Unknown ad provider.",
      );
      requireThat(
        b.provider !== "development" || !production,
        "Development ads are disabled.",
        403,
      );
      const entitlement = await refreshMonetisation(db, user, true);
      requireThat(
        b.rewardKind !== "token" || !entitlement.tokenConfig.unlimited,
        "Your account already has unlimited tokens.",
        409,
      );
      requireThat(
        b.rewardKind !== "token" ||
          Number(entitlement.practice_tokens) <
            entitlement.tokenConfig.capacity + 1,
        "Your token balance is already full.",
        409,
      );
      requireThat(
        b.rewardKind !== "xp_boost" || entitlement.account_plan === "free",
        "Your plan does not use rewarded ads for XP.",
        409,
      );
      requireThat(
        b.rewardKind !== "xp_boost" || !entitlement.xp_boost_pending,
        "Your next-game XP boost is already ready.",
        409,
      );
      const unlockIsToday = storedDate(entitlement.daily_mix_unlock_date) === date();
      requireThat(
        b.rewardKind !== "daily_mix_unlock" || entitlement.account_plan === "free",
        "Your plan already includes unlimited Daily Mixes.",
        409,
      );
      if (b.rewardKind === "daily_mix_unlock") {
        const mixesToday = Number((await db.query(
          "SELECT count(*) FROM study_sessions WHERE user_id=$1 AND mode='daily_mix' AND study_date=$2::date",
          [user, date()],
        )).rows[0].count);
        requireThat(
          mixesToday > 0,
          "Complete your first Daily Mix before unlocking another.",
          409,
        );
      }
      requireThat(
        b.rewardKind !== "daily_mix_unlock" || !unlockIsToday || Number(entitlement.extra_daily_mix_credits ?? 0) < 1,
        "Your next Daily Mix is already unlocked.",
        409,
      );
      const recent = Number(
        (
          await db.query(
            "SELECT count(*) FROM ad_reward_intents WHERE user_id=$1 AND created_at>now()-interval '1 hour'",
            [user],
          )
        ).rows[0].count,
      );
      requireThat(
        recent < 12,
        "Please wait before requesting another rewarded ad.",
        429,
      );
      await db.query(
        "UPDATE ad_reward_intents SET status='expired' WHERE user_id=$1 AND status='pending' AND expires_at<=now()",
        [user],
      );
      const id = crypto.randomUUID(),
        completionToken = crypto.randomBytes(32).toString("base64url");
      await db.query(
        "INSERT INTO ad_reward_intents(id,user_id,reward_kind,provider,completion_token_hash,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '10 minutes')",
        [id, user, b.rewardKind, b.provider, hash(completionToken)],
      );
      return {
        adIntent: {
          id,
          rewardKind: b.rewardKind,
          provider: b.provider,
          completionToken,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      };
    }
    if (route === "ad-complete") {
      requireThat(
        typeof b.intentId === "string" && typeof b.completionToken === "string",
        "Reward confirmation is missing.",
      );
      const intent = (
        await db.query(
          "SELECT * FROM ad_reward_intents WHERE id::text=$1 AND user_id=$2 FOR UPDATE",
          [b.intentId, user],
        )
      ).rows[0];
      requireThat(intent, "Reward request not found.", 404);
      if (intent.status === "completed")
        return {
          message:
            intent.reward_kind === "token"
              ? "Token already added."
              : intent.reward_kind === "daily_mix_unlock"
                ? "Another Daily Mix is already unlocked."
                : "Your next-game XP boost is ready.",
        };
      requireThat(
        intent.status === "pending" && new Date(intent.expires_at) > new Date(),
        "This rewarded ad request expired.",
        409,
      );
      const supplied = Buffer.from(hash(b.completionToken)),
        expected = Buffer.from(intent.completion_token_hash);
      requireThat(
        supplied.length === expected.length &&
          crypto.timingSafeEqual(supplied, expected),
        "Reward confirmation is invalid.",
        403,
      );
      const providerTransactionId =
        typeof b.providerTransactionId === "string"
          ? b.providerTransactionId.slice(0, 200)
          : null;
      await db.query(
        "UPDATE ad_reward_intents SET status='completed',completed_at=now(),provider_transaction_id=$3 WHERE id=$1 AND user_id=$2",
        [intent.id, user, providerTransactionId],
      );
      const entitlement = await refreshMonetisation(db, user, true);
      if (intent.reward_kind === "token")
        await db.query(
          "UPDATE user_monetisation SET practice_tokens=$2,next_token_at=CASE WHEN $2>=$3 THEN NULL ELSE next_token_at END,updated_at=now() WHERE user_id=$1",
          [
            user,
            Math.min(
              entitlement.tokenConfig.capacity + 1,
              Number(entitlement.practice_tokens) + 1,
            ),
            entitlement.tokenConfig.capacity,
          ],
        );
      else if (intent.reward_kind === "daily_mix_unlock")
        await db.query(
          "UPDATE user_monetisation SET daily_mix_unlock_date=$2::date,extra_daily_mix_credits=CASE WHEN daily_mix_unlock_date=$2::date THEN LEAST(extra_daily_mix_credits+1,3) ELSE 1 END,updated_at=now() WHERE user_id=$1",
          [user, date()],
        );
      else
        await db.query(
          "UPDATE user_monetisation SET xp_boost_pending=true,xp_boost_granted_at=now(),updated_at=now() WHERE user_id=$1",
          [user],
        );
      return {
        message:
          intent.reward_kind === "token"
            ? "+1 practice token"
            : intent.reward_kind === "daily_mix_unlock"
              ? "Another Daily Mix is unlocked"
              : "2× XP is ready for your next game",
      };
    }
    if (route === "start-minigame") {
      requireThat(
        typeof b.sessionRef === "string" &&
          b.sessionRef.length <= 100 &&
          Array.isArray(b.questionIds) &&
          b.questionIds.length >= (b.mode === "review" ? 1 : 5) &&
          b.questionIds.length <= 12 &&
          new Set(b.questionIds).size === b.questionIds.length &&
          (await validQuestionIds(db, b.questionIds)),
        "Invalid learning session.",
      );
      const mode =
        b.mode === "speed"
          ? "speed_select"
          : b.mode === "review"
            ? "review"
            : b.mode === "topic"
              ? "topic"
              : "daily_mix";
      const existing = (
        await db.query(
          "SELECT s.xp_multiplier FROM local_play_sessions p JOIN study_sessions s ON s.id=p.session_id WHERE p.user_id=$1 AND p.client_ref=$2",
          [user, b.sessionRef],
        )
      ).rows[0];
      if (existing)
        return {
          message: "Game already started",
          xpMultiplier: Number(existing.xp_multiplier),
        };
      if (mode === "daily_mix") {
        const entitlement = await refreshMonetisation(db, user, true);
        if (entitlement.account_plan === "free") {
          const prior = Number((await db.query(
            "SELECT count(*) FROM study_sessions WHERE user_id=$1 AND mode='daily_mix' AND study_date=$2::date",
            [user, date()],
          )).rows[0].count);
          if (prior > 0) {
            const unlockIsToday = storedDate(entitlement.daily_mix_unlock_date) === date();
            requireThat(
              unlockIsToday && Number(entitlement.extra_daily_mix_credits ?? 0) > 0,
              "Watch an ad to unlock another Daily Mix today.",
              409,
            );
            await db.query(
              "UPDATE user_monetisation SET extra_daily_mix_credits=extra_daily_mix_credits-1,updated_at=now() WHERE user_id=$1",
              [user],
            );
          }
        }
      }
      const sid = crypto.randomUUID(),
        xpMultiplier = await beginPaidSession(db, user);
      await db.query(
        "INSERT INTO study_sessions(id,user_id,learning_session_ref,mode,started_at,study_date,xp_multiplier,token_spent) VALUES($1,$2,$3,$4,now(),$5,$6,true)",
        [sid, user, user + ":" + b.sessionRef, mode, date(), xpMultiplier],
      );
      await db.query(
        "INSERT INTO local_play_sessions(user_id,client_ref,session_id,question_ids) VALUES($1,$2,$3,$4)",
        [user, b.sessionRef, sid, JSON.stringify(b.questionIds)],
      );
      return { message: "Game started · 1 token used", xpMultiplier };
    }
    if (route === "minigame-answer") {
      requireThat(
        typeof b.runRef === "string" && /^[0-9a-f-]{36}$/i.test(b.runRef),
        "Start this minigame before answering.",
      );
      const q = b.questionId ? await questionById(db, b.questionId) : null,
        definition = b.definitionId
          ? await definitionById(db, b.definitionId)
          : null;
      if (q)
        requireThat(
          q.question_type === "multiple_choice" &&
            typeof b.optionId === "string" &&
            q.options.some((option) => option.option_id === b.optionId),
          "Choose an answer from this question.",
          400,
        );
      else
        requireThat(
          definition &&
            typeof b.chosenTermId === "string" &&
            (await definitionById(db, b.chosenTermId)),
          "Choose an answer from this game.",
          400,
        );
      // The first playable answer starts the paid run. Repeating it or another
      // answer from the same run cannot spend a second token.
      const clientRef = "minigame:" + b.runRef;
      const existingRun = await db.query(
        "SELECT 1 FROM local_play_sessions WHERE user_id=$1 AND client_ref=$2",
        [user, clientRef],
      );
      if (!existingRun.rowCount) {
        const sid = crypto.randomUUID();
        await beginPaidSession(db, user, false);
        await db.query(
          "INSERT INTO study_sessions(id,user_id,learning_session_ref,mode,started_at,study_date,xp_multiplier,token_spent,verified_metrics) VALUES($1,$2,$3,'speed_select',now(),$4,1,true,$5)",
          [sid, user, user + ":" + clientRef, date(), { minigame: true }],
        );
        await db.query(
          "INSERT INTO local_play_sessions(user_id,client_ref,session_id,question_ids) VALUES($1,$2,$3,'[]'::jsonb)",
          [user, clientRef, sid],
        );
      }
      const correct = q
        ? q.answer_key.correct_option_ids.includes(b.optionId)
        : definition.id === b.chosenTermId;
      const earned = (
        await db.query(
          "SELECT count(*)::int AS count FROM reward_claims WHERE user_id=$1 AND source_kind='minigame' AND created_at::date=$2::date",
          [user, date()],
        )
      ).rows[0].count;
      let xp = 0;
      if (correct && earned < 12) {
        const ref = date() + ":" + (q?.question_id ?? definition.id);
        const cid = await claim(db, user, "minigame", ref, "correct_answer", {
          contentId: q?.question_id ?? definition.id,
          xp: 1,
        });
        if (cid) {
          await addXp(db, user, 1, "event", ref);
          xp = 1;
        }
      }
      return { correct, xp, message: xp ? "+1 Minigame XP" : "" };
    }
    if (route === "dismiss-loadout-notes") {
      await db.query(
        "UPDATE cosmetic_loadout_versions SET retained_conflicts='[]' WHERE user_id=$1",
        [user],
      );
      return { message: "Your collection is ready" };
    }
    if (route === "profile-presentation") {
      const gender = String(b.gender ?? "");
      requireThat(
        ["male", "female", "prefer_not_to_say"].includes(gender),
        "Choose Male, Female or Prefer not to say.",
      );
      await db.query("UPDATE users SET gender_identity=$2 WHERE id=$1", [
        user,
        gender,
      ]);
      await db.query(
        "UPDATE avatars SET body_type=$2,appearance=appearance||$3::jsonb,version=version+1 WHERE user_id=$1",
        [user, gender, { gender }],
      );
      return { message: "Profile choice saved" };
    }
    if (route === "appearance") {
      const a = b.appearance,
        gender = a?.gender ?? "prefer_not_to_say";
      requireThat(
        a &&
          /^#[0-9a-f]{6}$/i.test(a.skin) &&
          /^#[0-9a-f]{6}$/i.test(a.hair) &&
          /^#[0-9a-f]{6}$/i.test(a.top) &&
          ["male", "female", "prefer_not_to_say"].includes(gender) &&
          [
            "swept",
            "curly",
            "short",
            "none",
            "braids",
            "bob",
            "ponytail",
            "bun",
            "waves",
            "locs",
          ].includes(a.style) &&
          ["happy", "calm"].includes(a.eyes) &&
          ["round", "soft", "wide"].includes(a.eyeShape ?? "round") &&
          ["plain", "freckles", "rosy"].includes(a.faceDetail ?? "plain") &&
          Number.isFinite(a.height ?? 1) &&
          (a.height ?? 1) >= 0.88 &&
          (a.height ?? 1) <= 1.12,
        "Choose valid avatar options.",
      );
      await db.query("UPDATE users SET gender_identity=$2 WHERE id=$1", [
        user,
        gender,
      ]);
      await db.query(
        "UPDATE avatars SET body_type=$2,appearance=$3,reduced_motion=$4,version=version+1 WHERE user_id=$1",
        [
          user,
          gender,
          {
            skin: a.skin,
            hair: a.hair,
            top: a.top,
            style: a.style,
            eyes: a.eyes,
            eyeShape: a.eyeShape ?? "round",
            faceDetail: a.faceDetail ?? "plain",
            height: a.height ?? 1,
            gender,
          },
          !!b.reducedMotion,
        ],
      );
      await claim(db, user, "achievement_activity", "appearance", "avatar_customised", {});
      return { message: "Avatar saved" };
    }
    if (route === "wishlist") {
      requireThat(byId.has(b.itemId), "Unknown item.");
      if (b.saved)
        await db.query(
          "INSERT INTO wishlist(user_id,item_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
          [user, b.itemId],
        );
      else
        await db.query("DELETE FROM wishlist WHERE user_id=$1 AND item_id=$2", [
          user,
          b.itemId,
        ]);
      return {};
    }
    if (route === "equip" || route === "favourite" || route === "showcase") {
      const inv = (
        await db.query(
          "SELECT i.*,p.display_slot AS slot,p.exclusion_group FROM inventory i JOIN item_presentations p ON p.item_id=i.item_id WHERE i.user_id=$1 AND i.item_id=$2 AND i.revoked_at IS NULL AND i.revoked_at IS NULL",
          [user, b.itemId],
        )
      ).rows[0];
      requireThat(inv, "You don’t own this item.", 403);
      if (route === "favourite")
        await db.query(
          "UPDATE inventory SET favourite=$3,version=version+1 WHERE user_id=$1 AND id=$2",
          [user, inv.id, !!b.favourite],
        );
      else if (route === "showcase") {
        requireThat(
          Number.isInteger(b.position) && b.position >= 1 && b.position <= 3,
          "Choose showcase position 1–3.",
        );
        await db.query(
          "INSERT INTO showcase(user_id,position,inventory_id) VALUES($1,$2,$3) ON CONFLICT(user_id,position) DO UPDATE SET inventory_id=excluded.inventory_id",
          [user, b.position, inv.id],
        );
      } else if (b.equipped === false)
        await db.query(
          "DELETE FROM cosmetic_equipped_items WHERE user_id=$1 AND inventory_id=$2",
          [user, inv.id],
        );
      else {
        if (inv.exclusion_group)
          await db.query(
            "DELETE FROM cosmetic_equipped_items e USING inventory i,item_presentations p WHERE e.user_id=$1 AND e.inventory_id=i.id AND p.item_id=i.item_id AND p.exclusion_group=$2 AND e.inventory_id<>$3",
            [user, inv.exclusion_group, inv.id],
          );
        await db.query(
          "INSERT INTO cosmetic_equipped_items(user_id,slot,inventory_id) VALUES($1,$2,$3) ON CONFLICT(user_id,slot) DO UPDATE SET inventory_id=excluded.inventory_id,equipped_at=now()",
          [user, inv.slot, inv.id],
        );
      }
      return {
        message:
          route === "equip"
            ? b.equipped === false
              ? "Item removed"
              : "Item equipped"
            : "Saved",
      };
    }
    if (route === "outfit") {
      requireThat(
        typeof b.name === "string" &&
          b.name.trim().length > 0 &&
          b.name.length <= 30,
        "Give your outfit a name (up to 30 characters).",
      );
      const id = (
        await db.query(
          "INSERT INTO outfits(user_id,name) VALUES($1,$2) ON CONFLICT(user_id,name) DO UPDATE SET name=excluded.name RETURNING id",
          [user, b.name.trim()],
        )
      ).rows[0].id;
      await db.query(
        "DELETE FROM cosmetic_outfit_items WHERE user_id=$1 AND outfit_id=$2",
        [user, id],
      );
      await db.query(
        "INSERT INTO cosmetic_outfit_items(user_id,outfit_id,slot,inventory_id) SELECT user_id,$2,slot,inventory_id FROM cosmetic_equipped_items WHERE user_id=$1",
        [user, id],
      );
      return { message: "Outfit saved" };
    }
    if (route === "wear-outfit") {
      requireThat(
        (
          await db.query("SELECT 1 FROM outfits WHERE user_id=$1 AND id=$2", [
            user,
            b.id,
          ])
        ).rowCount,
        "Outfit not found.",
        404,
      );
      await db.query("DELETE FROM cosmetic_equipped_items WHERE user_id=$1", [
        user,
      ]);
      await db.query(
        "INSERT INTO cosmetic_equipped_items(user_id,slot,inventory_id) SELECT o.user_id,o.slot,o.inventory_id FROM cosmetic_outfit_items o JOIN inventory i ON i.id=o.inventory_id WHERE o.user_id=$1 AND outfit_id=$2 AND i.revoked_at IS NULL",
        [user, b.id],
      );
      return { message: "Outfit equipped" };
    }
    if (route === "buy") {
      requireThat(
        typeof b.key === "string" && b.key.length >= 12 && b.key.length <= 100,
        "Purchase reference missing.",
      );
      const prior = (
        await db.query(
          "SELECT item_id FROM shop_orders WHERE user_id=$1 AND idempotency_key=$2",
          [user, b.key],
        )
      ).rows[0];
      if (prior) {
        requireThat(
          prior.item_id === b.itemId,
          "This purchase reference was already used for another item.",
          409,
        );
        return { message: "Purchase already saved" };
      }
      const item = (
        await db.query(
          "SELECT c.* FROM items c JOIN shop_catalogue s ON s.item_id=c.id WHERE c.id=$1 AND c.active AND c.coin_purchasable AND NOT c.purchasable_with_real_money AND (s.starts_at IS NULL OR s.starts_at<=now()) AND (s.ends_at IS NULL OR s.ends_at>now())",
          [b.itemId],
        )
      ).rows[0];
      requireThat(item, "This item isn’t for sale.", 404);
      requireThat(
        !(
          await db.query(
            "SELECT 1 FROM inventory WHERE user_id=$1 AND item_id=$2",
            [user, item.id],
          )
        ).rowCount,
        "You already own this item.",
        409,
      );
      const balance = Number(
        (
          await db.query(
            "SELECT balance_projection FROM wallet_accounts WHERE user_id=$1 AND currency='coins' FOR UPDATE",
            [user],
          )
        ).rows[0].balance_projection,
      );
      requireThat(
        balance >= Number(item.coin_price),
        `You need ${Number(item.coin_price) - balance} more coins. Complete a Daily Mix to earn coins.`,
        409,
      );
      const cid = await claim(db, user, "purchase", b.key, "coin_item", {
        item: item.id,
        coins: Number(item.coin_price),
      });
      await credit(
        db,
        user,
        -Number(item.coin_price),
        "Bought " + (byId.get(item.id)?.name ?? item.name),
        cid,
        "buy:" + b.key,
      );
      await grantItem(db, user, item.id, cid, "coin_purchase");
      await db.query(
        "INSERT INTO shop_orders(user_id,catalogue_version,item_id,coin_total,idempotency_key,request_hash,reward_claim_id) VALUES($1,1,$2,$3,$4,$5,$6)",
        [user, item.id, item.coin_price, b.key, hash({ item: item.id }), cid],
      );
      return { message: (byId.get(item.id)?.name ?? item.name) + " is yours!" };
    }
    if (route === "buy-box") {
      requireThat(
        typeof b.key === "string" && b.key.length >= 12 && b.key.length <= 100,
        "Purchase reference missing.",
      );
      const previous = (
        await db.query(
          "SELECT id FROM reward_claims WHERE user_id=$1 AND source_kind='box_purchase' AND source_ref=$2",
          [user, b.key],
        )
      ).rows[0];
      if (previous)
        return { message: "Daily Chest is ready in your inventory" };
      const boughtToday = Number((await db.query(
        "SELECT count(*) FROM reward_claims WHERE user_id=$1 AND source_kind='box_purchase' AND (created_at AT TIME ZONE 'Europe/London')::date=$2::date",
        [user, date()],
      )).rows[0].count);
      requireThat(!boughtToday, "You have already bought today's Daily Chest.", 409);
      const wallet = (
        await db.query(
          "SELECT balance_projection FROM wallet_accounts WHERE user_id=$1 AND currency='coins' FOR UPDATE",
          [user],
        )
      ).rows[0];
      const balance = Number(wallet?.balance_projection ?? 0);
      requireThat(
        balance >= 100,
        `You need ${100 - balance} more study coins for a Daily Chest.`,
        409,
      );
      const cid = await claim(db, user, "box_purchase", b.key, "daily_chest", {
        box: "daily_free",
        coins: 100,
      });
      await credit(
        db,
        user,
        -100,
        "Bought Daily Chest",
        cid,
        "buy-box:" + b.key,
      );
      await db.query(
        "INSERT INTO user_boxes(user_id,box_id,reward_claim_id) VALUES($1,'daily_free',$2)",
        [user, cid],
      );
      return { message: "Daily Chest is ready in your inventory" };
    }
    if (route === "open-box") {
      requireThat(
        typeof b.key === "string" && b.key.length >= 12 && b.key.length <= 100,
        "Reward reference missing.",
      );
      const previous = (
        await db.query(
          "SELECT item_id,awarded_coins,duplicate,awarded_shards,user_box_id FROM drop_box_openings WHERE user_id=$1 AND (user_box_id::text=$2 OR idempotency_key=$3)",
          [user, b.id, b.key],
        )
      ).rows[0];
      if (previous) {
        requireThat(
          previous.user_box_id === b.id,
          "This reward reference was already used.",
          409,
        );
        return {
          reveal: {
            itemId: previous.item_id,
            coins: previous.awarded_coins,
            duplicate: previous.duplicate,
            shards: previous.awarded_shards,
          },
        };
      }
      const userBox = (
        await db.query(
          "SELECT * FROM user_boxes WHERE user_id=$1 AND id::text=$2 AND opened_at IS NULL FOR UPDATE",
          [user, b.id],
        )
      ).rows[0];
      requireThat(userBox, "This reward is no longer available.", 404);
      const definition = boxes.find((x) => x.id === userBox.box_id),
        order = config.rarity.map((r) => r.id),
        poolItems = definition.active_pool
          .map((id) => byId.get(id))
          .filter(Boolean);
      const odds = { ...definition.rarity_probabilities_percent },
        before = Object.fromEntries(
          (
            await db.query(
              "SELECT rarity,eligible_openings_without FROM pity_counters WHERE user_id=$1",
              [user],
            )
          ).rows.map((p) => [p.rarity, p.eligible_openings_without]),
        );
      let guarantee = -1;
      for (const rule of config.pity)
        if (
          odds[rule.rarity] > 0 &&
          (before[rule.rarity] ?? 0) + 1 >= rule.guaranteed_by_eligible_opening
        )
          guarantee = Math.max(guarantee, order.indexOf(rule.rarity));
      for (const r of order)
        if (
          order.indexOf(r) < guarantee ||
          !poolItems.some((i) => i.rarity === r)
        )
          odds[r] = 0;
      const sum = Object.values(odds).reduce((n, v) => n + v, 0);
      requireThat(sum > 0, "This reward pool is temporarily unavailable.", 503);
      const random = crypto.randomInt(0, 1_000_000) / 1_000_000;
      let position = random * sum,
        rolled;
      for (const [r, w] of Object.entries(odds)) {
        position -= w;
        if (position < 0) {
          rolled = r;
          break;
        }
      }
      const eligible = poolItems.filter((i) => i.rarity === rolled),
        item = eligible[crypto.randomInt(eligible.length)];
      const duplicate = !!(
        await db.query(
          "SELECT 1 FROM inventory WHERE user_id=$1 AND item_id=$2",
          [user, item.id],
        )
      ).rowCount;
      const conversion = config.rarity.find((r) => r.id === rolled),
        coinRoll = crypto.randomInt(
          definition.coin_range[0],
          definition.coin_range[1] + 1,
        );
      let coins = coinRoll + (duplicate ? conversion.duplicate_coins : 0),
        shards = duplicate ? conversion.duplicate_shards : 0;
      const cid = await claim(db, user, "box", b.id, "open", {
        item: item.id,
        coins,
        shards,
      });
      if (!duplicate) await grantItem(db, user, item.id, cid);
      coins = await credit(
        db,
        user,
        coins,
        "Study reward box",
        cid,
        "box:" + b.id,
      );
      if (shards)
        shards = await credit(
          db,
          user,
          shards,
          "Duplicate cosmetic",
          cid,
          "box-shards:" + b.id,
          "mastery_shards",
          item.subject_tag,
        );
      const after = { ...before };
      for (const rule of config.pity) {
        if (definition.rarity_probabilities_percent[rule.rarity] > 0) {
          after[rule.rarity] =
            order.indexOf(rolled) >= order.indexOf(rule.rarity)
              ? 0
              : (before[rule.rarity] ?? 0) + 1;
          await db.query(
            "INSERT INTO pity_counters(user_id,rarity,eligible_openings_without) VALUES($1,$2,$3) ON CONFLICT(user_id,rarity) DO UPDATE SET eligible_openings_without=excluded.eligible_openings_without,version=pity_counters.version+1",
            [user, rule.rarity, after[rule.rarity]],
          );
        }
      }
      const lid = (
        await db.query(
          "SELECT id FROM loot_tables WHERE box_id=$1 AND version=1",
          [definition.id],
        )
      ).rows[0].id;
      await db.query(
        `INSERT INTO drop_box_openings(user_id,user_box_id,loot_table_id,item_id,rolled_rarity,duplicate,coin_roll,awarded_coins,awarded_shards,effective_odds,pity_before,pity_after,rng_audit_hash,idempotency_key,request_hash,reward_claim_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
        [
          user,
          b.id,
          lid,
          item.id,
          rolled,
          duplicate,
          coinRoll,
          coins,
          shards,
          Object.fromEntries(
            Object.entries(odds).map(([k, v]) => [k, v / sum]),
          ),
          before,
          after,
          hash({ random, coinRoll }),
          b.key,
          hash({ box: b.id }),
          cid,
        ],
      );
      await db.query(
        "UPDATE user_boxes SET opened_at=now() WHERE id=$1 AND user_id=$2",
        [b.id, user],
      );
      return { reveal: { itemId: item.id, coins, duplicate, shards } };
    }
    const saveAnswer = async (b) => {
      const q = await questionById(db, b.questionId);
      requireThat(
        q && typeof b.response === "string" && b.response.length <= 10000,
        "Invalid question or answer.",
      );
      requireThat(
        typeof b.sessionRef === "string" &&
          b.sessionRef.length <= 100 &&
          Array.isArray(b.questionIds) &&
          b.questionIds.length >= (b.mode === "review" ? 1 : 5) &&
          b.questionIds.length <= 12 &&
          new Set(b.questionIds).size === b.questionIds.length &&
          (await validQuestionIds(db, b.questionIds)) &&
          b.questionIds[b.index] === b.questionId &&
          Number.isInteger(b.index),
        "Invalid learning session.",
      );
      const mode =
        b.mode === "speed"
          ? "speed_select"
          : b.mode === "review"
            ? "review"
            : b.mode === "topic"
              ? "topic"
              : "daily_mix";
      let play = (
        await db.query(
          "SELECT * FROM local_play_sessions WHERE user_id=$1 AND client_ref=$2",
          [user, b.sessionRef],
        )
      ).rows[0];
      if (!play) {
        const sid = crypto.randomUUID(),
          multiplier = await beginPaidSession(db, user);
        await db.query(
          "INSERT INTO study_sessions(id,user_id,learning_session_ref,mode,started_at,study_date,xp_multiplier,token_spent) VALUES($1,$2,$3,$4,now(),$5,$6,true)",
          [sid, user, user + ":" + b.sessionRef, mode, date(), multiplier],
        );
        await db.query(
          "INSERT INTO local_play_sessions(user_id,client_ref,session_id,question_ids) VALUES($1,$2,$3,$4)",
          [user, b.sessionRef, sid, JSON.stringify(b.questionIds)],
        );
        play = { session_id: sid, answers: {}, completed: false };
      }
      const actualMode = (
        await db.query(
          "SELECT mode FROM study_sessions WHERE id=$1 AND user_id=$2",
          [play.session_id, user],
        )
      ).rows[0].mode;
      requireThat(actualMode === mode, "Session mode changed.", 409);
      const ref = user + ":" + b.sessionRef + ":" + b.index;
      const existing = (
        await db.query("SELECT 1 FROM study_events WHERE attempt_ref=$1", [ref])
      ).rowCount;
      const marked = markWithRules(q, b.timedOut ? "" : b.response);
      let miniXp = 0;
      if (!existing) {
        requireThat(!play.completed, "This session is complete.", 409);
        const subject = q._subjectId ?? inferredSubject(q.question_id);
        const previous = (
          await db.query(
            "SELECT occurred_at,outcome FROM study_events WHERE user_id=$1 AND specification_point_ref=$2 ORDER BY occurred_at DESC LIMIT 1",
            [user, subject + ":" + q.specification_point_id],
          )
        ).rows[0];
        const delayed =
          !!previous &&
          Date.now() - new Date(previous.occurred_at).getTime() >= 86400000;
        await db.query(
          "INSERT INTO study_events(id,user_id,session_id,attempt_ref,subject_id,question_ref,specification_point_ref,occurred_at,outcome,independent,delayed,verified) VALUES($1,$2,$3,$4,$5,$6,$7,now(),$8,$9,$10,true)",
          [
            crypto.randomUUID(),
            user,
            play.session_id,
            ref,
            subject,
            q.question_id,
            subject + ":" + q.specification_point_id,
            marked.outcome,
            !!b.response.trim() && !b.hintUsed && !b.retry && !b.timedOut,
            delayed,
          ],
        );
        if (actualMode === "review" && marked.outcome === "correct") {
          const earned = Number(
            (
              await db.query(
                "SELECT count(*) FROM reward_claims WHERE user_id=$1 AND source_kind='minigame' AND created_at::date=$2::date",
                [user, date()],
              )
            ).rows[0].count,
          );
          if (earned < 12) {
            const rewardRef = date() + ":" + q.question_id;
            const miniClaim = await claim(
              db,
              user,
              "minigame",
              rewardRef,
              "correct_answer",
              { questionId: q.question_id, xp: 1 },
            );
            if (miniClaim)
              miniXp =
                (await addXp(
                  db,
                  user,
                  1,
                  "event",
                  rewardRef,
                  play.session_id,
                )) ?? 0;
          }
        }
        const key = "question:" + date() + ":" + q.question_id;
        const unique =
          actualMode === "review"
            ? null
            : await claim(db, user, "participation", date(), q.question_id, {
                question: q.question_id,
              });
        if (unique) {
          const days = (
              await db.query(
                "SELECT study_date::text FROM streak_days WHERE user_id=$1",
                [user],
              )
            ).rows.map((d) => d.study_date),
            boost = streakBoost(days);
          const perf =
            !b.hintUsed && !b.retry && !b.timedOut
              ? marked.outcome === "correct"
                ? 5
                : marked.outcome === "partial"
                  ? 2
                  : 0
              : 0;
          await addXp(db, user, 5, "participation", key, play.session_id);
          if (perf)
            await addXp(db, user, perf, "performance", key, play.session_id);
          const bonus = Math.floor((5 + perf) * (boost.multiplier - 1));
          if (bonus)
            await addXp(db, user, bonus, "streak", key, play.session_id);
        }
        const answers = {
          ...play.answers,
          [b.index]: {
            questionId: q.question_id,
            response: b.response.slice(0, 10000),
            hint: !!b.hintUsed,
            outcome: marked.outcome,
          },
        };
        await db.query(
          "UPDATE local_play_sessions SET answers=$3,question_ids=$4 WHERE user_id=$1 AND client_ref=$2",
          [user, b.sessionRef, answers, JSON.stringify(b.questionIds)],
        );
      }
      return { marked, xp: miniXp };
    };
    if (route === "answer") return saveAnswer(b);
    if (route === "answer-batch") {
      requireThat(
        Array.isArray(b.answers) &&
          b.answers.length > 0 &&
          b.answers.length <= 12,
        "Invalid answer batch.",
      );
      const results = [];
      for (const answer of b.answers) results.push(await saveAnswer(answer));
      return { message: "Answers saved", results };
    }
    if (route === "complete") {
      const play = (
        await db.query(
          "SELECT * FROM local_play_sessions WHERE user_id=$1 AND client_ref=$2",
          [user, b.sessionRef],
        )
      ).rows[0];
      if (!play)
        return { message: "Finish a new session to earn study coins." };
      if (play.completed) return {};
      const events = (
        await db.query(
          "SELECT * FROM study_events WHERE user_id=$1 AND session_id=$2",
          [user, play.session_id],
        )
      ).rows;
      const all = Object.values(play.answers),
        study = (
          await db.query("SELECT mode FROM study_sessions WHERE id=$1", [
            play.session_id,
          ])
        ).rows[0],
        review = study.mode === "review",
        qualified = review
          ? all.length === play.question_ids.length &&
            all.some((a) => a.response.trim())
          : all.length === play.question_ids.length &&
            all.length >= 5 &&
            all.filter((a) => a.response.trim()).length >= 3 &&
            new Set(events.map((e) => e.specification_point_ref)).size >= 3;
      await db.query(
        "UPDATE local_play_sessions SET completed=true WHERE user_id=$1 AND client_ref=$2",
        [user, b.sessionRef],
      );
      await db.query(
        "UPDATE study_sessions SET completed_at=now(),verified=$3,verified_metrics=$4,verifier_version=$5 WHERE user_id=$1 AND id=$2",
        [
          user,
          play.session_id,
          qualified,
          {
            responses: all.length,
            nonblank: all.filter((a) => a.response.trim()).length,
          },
          "rules-v1",
        ],
      );
      if (!qualified)
        return {
          message: review
            ? "Review session saved. Try at least one answer to update your Vault."
            : "Session saved. Study coins need a full session with at least three written or selected answers across three concepts.",
        };
      if (review)
        return {
          message: "Review Vault updated. Your next retrieval is scheduled.",
        };
      const daily = study.mode === "daily_mix";
      let coins = 0;
      let dailyGranted = false;
      if (daily) {
        const cid = await claim(db, user, "daily_mix", date(), "daily", {
          coins: config.economy.base_daily_mix_coins,
        });
        if (cid) {
          dailyGranted = true;
          coins = await credit(
            db,
            user,
            config.economy.base_daily_mix_coins,
            "Daily Mix complete",
            cid,
            "daily:" + date(),
          );
          await db.query(
            "INSERT INTO user_boxes(user_id,box_id,reward_claim_id) VALUES($1,'daily_free',$2)",
            [user, cid],
          );
          await db.query(
            "INSERT INTO streak_days VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [user, date(), play.session_id],
          );
          await addXp(
            db,
            user,
            10,
            "completion",
            "daily:" + date(),
            play.session_id,
          );
          const days = (
              await db.query(
                "SELECT study_date::text FROM streak_days WHERE user_id=$1",
                [user],
              )
            ).rows.map((d) => d.study_date),
            bonus = Math.floor(10 * (streakBoost(days).multiplier - 1));
          if (bonus)
            await addXp(
              db,
              user,
              bonus,
              "streak",
              "daily-completion:" + date(),
              play.session_id,
            );
        }
      }
      if (!dailyGranted) {
        const count = Number(
          (
            await db.query(
              "SELECT count(*) FROM reward_claims WHERE user_id=$1 AND source_kind='extra_session' AND created_at::date=$2::date",
              [user, date()],
            )
          ).rows[0].count,
        );
        if (count < config.economy.extra_sessions_coin_limit) {
          const cid = await claim(
            db,
            user,
            "extra_session",
            play.session_id,
            "study",
            { coins: config.economy.base_extra_session_coins },
          );
          if (cid)
            coins = await credit(
              db,
              user,
              config.economy.base_extra_session_coins,
              "Practice session complete",
              cid,
              "session:" + play.session_id,
            );
        }
      }
      const level = Number(
        (
          await db.query("SELECT level FROM progression WHERE user_id=$1", [
            user,
          ])
        ).rows[0].level,
      );
      for (let l = 1; l <= level; l++) await awardLevel(db, user, l);
      return {
        message: `Practice saved${coins ? " · +" + coins + " study coins" : ""}. Check Inventory for your level rewards!`,
      };
    }
    throw error("Unknown action.", 404);
  });
}
export async function handleApiRequest(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  if (production)
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  try {
    const publicUrl = process.env.MEMMARA_PUBLIC_URL ?? "http://localhost:5173";
    const configuredPublicUrl = new URL(publicUrl);
    const publicHostnames = new Set([configuredPublicUrl.hostname]);
    if (production && configuredPublicUrl.hostname.includes(".")) {
      const apexHostname = configuredPublicUrl.hostname.replace(/^www\./, "");
      publicHostnames.add(apexHostname);
      publicHostnames.add(`www.${apexHostname}`);
    }
    const publicHosts = new Set(
      [...publicHostnames].map((hostname) =>
        configuredPublicUrl.port
          ? `${hostname}:${configuredPublicUrl.port}`
          : hostname,
      ),
    );
    const allowed = new Set([
      ...[...publicHosts].map(
        (host) => `${configuredPublicUrl.protocol}//${host}`,
      ),
      ...(production
        ? []
        : [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
          ]),
    ]);
    requireThat(
      [
        ...publicHosts,
        `${process.env.MEMMARA_API_HOST ?? "127.0.0.1"}:${process.env.MEMMARA_API_PORT ?? 5178}`,
        "127.0.0.1:5178",
        "localhost:5178",
      ].includes(req.headers.host),
      "Unknown host.",
      403,
    );
    const origin = req.headers.origin,
      appleCallback =
        req.method === "POST" &&
        req.url?.startsWith("/api/auth/oauth/apple/callback");
    requireThat(
      !origin ||
        allowed.has(origin) ||
        (appleCallback && origin === "https://appleid.apple.com"),
      "Unknown origin.",
      403,
    );
    const url = new URL(req.url, publicUrl);
    if (url.pathname.startsWith("/api/auth/oauth/")) {
      if (req.method === "POST" && !appleCallback)
        requireThat(
          origin && allowed.has(origin),
          "Browser origin required.",
          403,
        );
      await handleOAuth(req, res, url);
      return;
    }
    if (url.pathname.startsWith("/api/auth/")) {
      if (req.method !== "GET")
        requireThat(
          origin && allowed.has(origin),
          "Browser origin required.",
          403,
        );
      await handleAuth(req, res, url);
      return;
    }
    if (url.pathname === "/api/commerce/webhook") {
      await handleCommerce(req, res, url, null);
      return;
    }
    if (url.pathname.startsWith("/api/commerce/")) {
      if (req.method !== "GET")
        requireThat(
          origin && allowed.has(origin),
          "Browser origin required.",
          403,
        );
      const commerceUser = await authenticatedUser(req, res);
      await handleCommerce(req, res, url, commerceUser);
      return;
    }
    requireThat(url.pathname.startsWith("/api/game/"), "Not found.", 404);
    const route = url.pathname.slice("/api/game/".length);
    if (req.method === "GET" && route === "health") {
      await pool.query("SELECT 1");
      res.end(
        JSON.stringify({
          ready: true,
          service: "memmara-game",
          database: "connected",
        }),
      );
      return;
    }
    const user = await authenticatedUser(req, res);
    requireThat(user, "Sign in required.", 401);
    if (req.method === "GET" && route === "state") {
      res.end(JSON.stringify(await state(user)));
      return;
    }
    requireThat(req.method === "POST", "Method not allowed.", 405);
    requireThat(origin, "Browser origin required.", 403);
    requireThat(
      req.headers["content-type"]?.includes("application/json"),
      "JSON required.",
      415,
    );
    await rate("game-write:" + user, 300, 1);
    let raw = "";
    for await (const part of req) {
      raw += part;
      requireThat(
        Buffer.byteLength(raw) <= 2_000_000,
        "Request too large.",
        413,
      );
    }
    const body = JSON.parse(raw || "{}");
    if (route === "content-sync") {
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(await syncContentImport(user, body)));
      return;
    }
    let result = await mutate(user, route, body);
    // Answer feedback only needs its result and XP. Rebuilding the entire
    // inventory/account state here makes every question wait on many queries.
    if (
      route === "answer" ||
      route === "answer-batch" ||
      route === "minigame-answer" ||
      route === "start-minigame"
    ) {
      res.end(JSON.stringify(result));
      return;
    }
    res.end(JSON.stringify({ ...result, state: await state(user) }));
  } catch (e) {
    res.statusCode = e.status ?? 500;
    if (!e.status) console.error("Game API:", e.code ?? e.name, e.message);
    res.end(
      JSON.stringify({
        error: e.status
          ? e.message
          : "The game service couldn’t save this change. Please try again.",
      }),
    );
  }
}

if (
  import.meta.url &&
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await seed();
  loadLocalContent();
  const server = http.createServer(handleApiRequest),
    apiPort = Number(process.env.MEMMARA_API_PORT ?? 5178),
    apiHost = process.env.MEMMARA_API_HOST ?? "127.0.0.1";
  server.listen(apiPort, apiHost, () =>
    console.log(
      `Memmara account and game API listening on ${apiHost}:${apiPort}`,
    ),
  );
  const cleanup = setInterval(async () => {
    try {
      await pool.query("DELETE FROM auth_oauth_flows WHERE expires_at<now()");
      await pool.query(
        "DELETE FROM auth_tokens WHERE expires_at<now()-interval '7 days' OR used_at<now()-interval '7 days'",
      );
      await pool.query(
        "DELETE FROM auth_sessions WHERE expires_at<now()-interval '30 days' OR revoked_at<now()-interval '30 days'",
      );
      await pool.query(
        "DELETE FROM auth_rate_limits WHERE window_start<now()-interval '2 days'",
      );
    } catch (e) {
      console.error("Account cleanup:", e.message);
    }
  }, 3600000);
  cleanup.unref();
  process.on("SIGINT", () =>
    server.close(() => pool.end().then(() => process.exit())),
  );
}
