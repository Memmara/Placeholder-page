import { Check, Clock3, Crown, Sparkles, Ticket, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameController } from "../GameService";
import { useRewardedAds } from "../ads/useRewardedAds";
import { purchase, refreshPurchase, type ProductCode } from "./CommerceService";

const packs = [
  { code: "tokens_5" as const, tokens: 5, price: "£0.99" },
  { code: "tokens_10" as const, tokens: 10, price: "£1.79" },
];
const plans = [
  {
    code: "plan_plus" as const,
    name: "Plus Mode",
    price: "£2.99",
    trial: "3 days free, then £2.99/month",
    features: [
      "No banner ads",
      "No rewarded ads for XP",
      "8 regenerating tokens",
      "One token every 2 hours",
      "AI marking is planned for a future release",
    ],
  },
  {
    code: "plan_pro" as const,
    name: "Pro Mode",
    price: "£9.99",
    featured: true,
    features: [
      "No ads anywhere",
      "Unlimited practice tokens",
      "AI marking planned for a future release",
    ],
  },
];

export function ShopPage({
  game,
  outOfTokens = false,
}: {
  game: GameController;
  outOfTokens?: boolean;
}) {
  const state = game.data?.monetisation,
    ads = useRewardedAds(game),
    [busy, setBusy] = useState<ProductCode | null>(null),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (new URLSearchParams(location.search).get("payment") === "success")
      void refreshPurchase()
        .then(() => game.refresh())
        .then(() =>
          setMessage("Payment successful. Your account has been updated."),
        )
        .catch(() =>
          setMessage(
            "Payment received. Your account may take a moment to update.",
          ),
        );
  }, []);
  async function buy(code: ProductCode) {
    setBusy(code);
    setMessage("");
    try {
      await purchase(code);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Payment failed, please try again.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function watch() {
    const result = await ads.showTokenAd();
    setMessage(
      result.status === "rewarded"
        ? "+1 token added. You can continue playing."
        : "Ad unavailable, try again later.",
    );
  }
  return (
    <div className="token-shop">
      {outOfTokens && (
        <div className="shop-alert" role="alert">
          <Zap size={22} />
          <strong>
            You’re out of tokens! Choose an option below to continue.
          </strong>
        </div>
      )}
      <header className="shop-header">
        <span className="eyebrow">MEMMARA SHOP</span>
        <h1>Get More Tokens</h1>
        <p>Buy tokens, upgrade your plan, or watch an ad to earn a token.</p>
        <div className="token-status">
          <Ticket size={21} />
          <span>Current balance</span>
          <strong>
            {state?.unlimited ? "Unlimited" : (state?.tokens ?? 0)}
            {!state?.unlimited && <> token{state?.tokens === 1 ? "" : "s"}</>}
          </strong>
          {state?.nextTokenAt && (
            <small>
              <Clock3 size={13} />
              Tokens regenerate automatically
            </small>
          )}
        </div>
      </header>
      {message && (
        <p className="shop-message" role="status">
          {message}
        </p>
      )}
      <section className="shop-section">
        <div className="shop-section-title">
          <div>
            <span className="eyebrow">TOP UP</span>
            <h2>Token packs</h2>
          </div>
          <p>Purchased tokens do not expire.</p>
        </div>
        <div className="token-pack-grid">
          {packs.map((pack) => (
            <article className="shop-price-card" key={pack.code}>
              <span className="pack-orb">
                <Ticket size={26} />
              </span>
              <h3>{pack.tokens} tokens</h3>
              <p className="large-price">{pack.price}</p>
              <button
                className="primary"
                disabled={!!busy}
                onClick={() => void buy(pack.code)}
              >
                {busy === pack.code ? "Opening Stripe…" : "Buy with Stripe"}
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="shop-section">
        <div className="shop-section-title">
          <div>
            <span className="eyebrow">MEMBERSHIP</span>
            <h2>Choose your mode</h2>
          </div>
          <p>Cancel any time.</p>
        </div>
        <div className="plan-grid">
          {plans.map((plan) => (
            <article
              className={"plan-card " + (plan.featured ? "plan-featured" : "")}
              key={plan.code}
            >
              {plan.featured && (
                <span className="pill">
                  <Crown size={14} />
                  COMING SOON
                </span>
              )}
              <h3>{plan.name}</h3>
              <p className="plan-price">
                <strong>{plan.price}</strong> / month
              </p>
              {plan.trial && (
                <p className="plan-trial">
                  <Sparkles size={15} />
                  {plan.trial}
                </p>
              )}
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={16} />
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                className="primary"
                disabled={
                  plan.code === "plan_pro" ||
                  !!busy ||
                  state?.plan === (plan.code === "plan_plus" ? "plus" : "pro")
                }
                onClick={() => void buy(plan.code)}
              >
                {plan.code === "plan_pro"
                  ? "Memmara Pro coming soon"
                  : state?.plan === "plus"
                    ? "Current plan"
                    : busy === plan.code
                      ? "Opening Stripe…"
                      : "Start 3-day free trial"}
              </button>
            </article>
          ))}
        </div>
      </section>
      <section
        className={"quick-token-card " + (outOfTokens ? "attention" : "")}
      >
        <span className="quick-token-icon">
          <Sparkles size={27} />
        </span>
        <div>
          <span className="eyebrow">NEED A QUICK TOKEN?</span>
          <h2>Watch one short rewarded ad</h2>
          <p>
            The token is added only after the ad provider confirms completion.
          </p>
        </div>
        <button
          className="primary"
          disabled={
            !!ads.busy ||
            !!state?.unlimited ||
            state?.tokens === state?.adTokenLimit
          }
          onClick={() => void watch()}
        >
          {ads.busy ? "Opening ad…" : "Watch an Ad for 1 Token"}
        </button>
      </section>
      <p className="shop-fineprint">
        Payments are completed securely by Stripe. Tokens and purchases are
        granted by the server after Stripe confirms payment.
      </p>
    </div>
  );
}
