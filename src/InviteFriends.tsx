import { useEffect, useState } from "react";
import { Copy, ExternalLink, Gift, Share2, Users, X } from "lucide-react";
import { authRequest } from "./auth";
import "./invite-friends.css";

type Invite = {
  code: string;
  url: string;
  successfulInvites: number;
  plusUntil: string | null;
};
export function InviteFriends({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (dontShowAgain?: boolean) => void;
}) {
  const [invite, setInvite] = useState<Invite | null>(null),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [dontShowAgain, setDontShowAgain] = useState(false);
  useEffect(() => {
    if (!open) return;
    setDontShowAgain(false);
    authRequest("referral-link")
      .then(setInvite)
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Could not load your invite link.",
        ),
      );
  }, [open]);
  if (!open) return null;
  const url = invite?.url ?? "";
  async function copy() {
    if (!invite) return;
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(url);
      else {
        const input =
          document.querySelector<HTMLInputElement>(".invite-link input");
        input?.select();
        document.execCommand("copy");
      }
      setCopied(true);
    } catch {
      setError("Select the link below and choose Copy.");
    }
  }
  async function share() {
    if (!invite) return;
    if (navigator.share)
      try {
        await navigator.share({
          title: "Join me on Memmara",
          text: "Practise with me on Memmara.",
          url,
        });
        return;
      } catch {}
    await copy();
  }
  return (
    <div
      className="invite-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(dontShowAgain);
      }}
    >
      <section
        className="invite-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-title"
      >
        <button
          className="icon-button invite-close"
          aria-label="Close invitation"
          onClick={() => onClose(dontShowAgain)}
        >
          <X size={20} />
        </button>
        <div className="invite-icon">
          <Gift size={30} />
        </div>
        <p className="eyebrow">LEARN TOGETHER</p>
        <h2 id="invite-title">Invite a friend</h2>
        <div className="invite-offer"><strong>1 MONTH PLUS FREE</strong><span>LIMITED TIME ONLY</span></div>
        <p>
          Get one month of Memmara Plus when a new friend joins through your
          link and verifies their account.
        </p>
        {invite ? (
          <>
            <div className="invite-link">
              <input
                aria-label="Your invite link"
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
              />
              <button className="primary" onClick={() => void copy()}>
                <Copy size={16} />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="invite-actions">
              <button className="secondary" onClick={() => void share()}>
                <Share2 size={16} />
                Share invite
              </button>
              <a
                className="secondary"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                Test link
              </a>
            </div>
            <p className="invite-status">
              <Users size={16} />
              {invite.successfulInvites} successful invite
              {invite.successfulInvites === 1 ? "" : "s"}
              {invite.plusUntil
                ? " · Plus until " +
                  new Date(invite.plusUntil).toLocaleDateString("en-GB")
                : ""}
            </p>
          </>
        ) : (
          <p>{error || "Preparing your link…"}</p>
        )}
        <label className="invite-dismiss-choice">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
          />
          <span>Don’t show this again</span>
        </label>
        <small>
          The reward is added after they create a new account and verify their
          email, or join with a verified social account.
        </small>
      </section>
    </div>
  );
}
