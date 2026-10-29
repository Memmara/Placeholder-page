import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  Shirt,
  Package,
  ShoppingBag,
  Medal,
  Coins,
  ArrowRight,
  ArrowLeft,
  Home,
  BookOpen,
  ChartNoAxesColumnIncreasing,
  UserRound,
  Flame,
  Check,
  X,
  Moon,
  Sun,
  Sparkles,
  Atom,
  Zap,
  Waves,
  Orbit,
  Magnet,
  MoveUpRight,
  Clock3,
  ChevronRight,
  CircleHelp,
  Flag,
  Lightbulb,
  CheckCircle2,
  Pause,
  RotateCcw,
  WifiOff,
  Leaf,
  Target,
  Trophy,
  Layers3,
  WalletCards,
  Gift,
} from "lucide-react";
import type {
  Attempt,
  Bank,
  Progress,
  Question,
  Session,
  Settings,
  Outcome,
  ReviewRevision,
  ReviewDraft,
} from "./models";
import {
  blank,
  createSession,
  createReviewSession,
  day,
  DAY,
  SPEED_SECONDS,
  defaultSettings,
  evidence,
  finish,
  pointFor,
  pointEligible,
  practiceLevel,
  record,
  suitable,
  validateBank,
  xpBreakdown,
  levelDetails,
  streakStats,
  streakBoost,
  tierFor,
} from "./engine";
import { markWithRules } from "./marking";
import { MarkingStatus } from "./MarkingStatus";
import "./styles.css";
import "./app-refresh.css";
import { Brand } from "./Brand";
import { PublicLanding } from "./PublicLanding";
import { GuestWelcome } from './GuestWelcome';
import {isGuestSession,leaveGuest,requestGuestPlay} from './guestAccess';
import {GuestPlayGate} from './GuestPlayGate';
import { AboutPage, PrivacyPage } from "./PublicInfoPages";
import { useGame, coinBalance, useTokenCountdown, type GameController } from "./GameService";
import { GameHub, GameHomeCard } from "./CosmeticViews";
import { Avatar3D, ItemArt, defaultAppearance } from "./CosmeticStage";
import { ProgressAnalytics } from "./ProgressAnalytics";
import { automaticPointIds } from "./studyPlan";
import { geographyOptionsValid } from "./GeographyOptions";
import { historyOptionsValid } from "./HistoryOptions";
import { CourseOptions } from "./CourseOptions";
import { courseContentValid, normaliseCourseContent } from "./courseContent";
import { ReviewVault } from "./ReviewVault";
import { Minigames } from "./Minigames";
import "./daily-mix.css";
import { AuthGate, AccountSettings, authRequest, type Account } from "./auth";
import { RewardedAdsCard } from "./ads/RewardedAdsCard";
import { NativeBannerAd } from "./ads/NativeBannerAd";
import { WebBannerAd } from "./ads/WebBannerAd";
import { GenderSetup } from "./GenderSetup";
import { ShopPage } from "./commerce/ShopPage";
import { InviteFriends } from "./InviteFriends";
import { useRewardedAds } from "./ads/useRewardedAds";

const COURSES = [
  ["GCSE-PHYSICS", "Physics", "GCSE"],
  ["GCSE-CHEMISTRY", "Chemistry", "GCSE"],
  ["GCSE-BIOLOGY", "Biology", "GCSE"],
  ["GCSE-MATHS", "Maths", "GCSE"],
  ["GCSE-ENGLISH-LANGUAGE", "English Language", "GCSE"],
  ["GCSE-ENGLISH-LITERATURE", "English Literature", "GCSE"],
  ["GCSE-GEOGRAPHY", "Geography", "GCSE"],
  ["GCSE-HISTORY", "History", "GCSE"],
  ["GCSE-RELIGIOUS-STUDIES", "Religious Studies", "GCSE"],
  ["GCSE-ART-DESIGN", "Art and Design", "GCSE"],
  ["GCSE-BUSINESS", "Business Studies", "GCSE"],
  ["GCSE-COMPUTER-SCIENCE", "Computer Science", "GCSE"],
  ["GCSE-DESIGN-TECHNOLOGY", "Design and Technology", "GCSE"],
  ["GCSE-PHYSICAL-EDUCATION", "Physical Education", "GCSE"],
  ["A-LEVEL-BUSINESS", "Business", "A-Level"],
  ["A-LEVEL-ECONOMICS", "Economics", "A-Level"],
  ["A-LEVEL-PSYCHOLOGY", "Psychology", "A-Level"],
  ["A-LEVEL-MATHEMATICS", "Mathematics", "A-Level"],
  ["A-LEVEL-FURTHER-MATHS", "Further Maths", "A-Level"],
  ["A-LEVEL-PHYSICS", "Physics", "A-Level"],
  ["A-LEVEL-BIOLOGY", "Biology", "A-Level"],
  ["A-LEVEL-CHEMISTRY", "Chemistry", "A-Level"],
  ["A-LEVEL-HISTORY", "History", "A-Level"],
  ["A-LEVEL-SOCIOLOGY", "Sociology", "A-Level"],
  ["A-LEVEL-ENGLISH-LITERATURE", "English Literature", "A-Level"],
  ["A-LEVEL-GEOGRAPHY", "Geography", "A-Level"],
  ["A-LEVEL-POLITICS", "Politics", "A-Level"],
] as const;
const courseName = (id: string) =>
  COURSES.find(([courseId]) => courseId === id)?.[1] ?? id;
const pagePath: Record<string, string> = {
  home: "/dashboard",
  subjects: "/subjects",
  progress: "/progress",
  minigames: "/minigames",
  profile: "/account/settings",
  avatar: "/avatar",
  inventory: "/inventory",
  store: "/store",
  shop: "/shop",
  achievements: "/achievements",
  session: "/daily-mix",
  topic: "/subjects#topic",
};
const initialPage = () => {
  const hash = location.hash.slice(1);
  if (
    [
      "home",
      "subjects",
      "progress",
      "minigames",
      "profile",
      "avatar",
      "inventory",
      "store",
      "shop",
      "achievements",
      "session",
      "topic",
    ].includes(hash)
  )
    return hash;
  return (
    Object.entries(pagePath).find(
      ([, path]) => path.split("#")[0] === location.pathname,
    )?.[0] ?? "home"
  );
};
const topicsIcons = [
  Zap,
  Zap,
  Atom,
  Orbit,
  MoveUpRight,
  Waves,
  Magnet,
  Orbit,
  BookOpen,
];
function PlayerAvatar({
  game,
  className = "",
}: {
  game: GameController;
  className?: string;
}) {
  const data = game.data;
  const items =
    data?.equipped
      .map((entry) => data.catalogue.find((item) => item.id === entry.item_id))
      .filter((item): item is NonNullable<typeof item> => !!item) ?? [];
  return (
    <div className={"practice-avatar " + className}>
      <Avatar3D
        small
        appearance={data?.avatar.appearance ?? defaultAppearance}
        items={items}
        reducedMotion={data?.avatar.reduced_motion ?? false}
      />
    </div>
  );
}
function LevelCelebration({
  level,
  game,
  onClose,
}: {
  level: number;
  game: GameController;
  onClose: () => void;
}) {
  const modal = useRef<HTMLDialogElement>(null);
  const name = levelDetails(level).name;
  const reward = game.data?.levelRewards?.find(
    (entry) => entry.level === level,
  );
  useEffect(() => {
    const dialog = modal.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={modal}
      className="level-celebration"
      aria-labelledby="celebration-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="celebration-burst" aria-hidden="true">
        {Array.from({ length: 20 }, (_, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </div>
      <PlayerAvatar game={game} className="celebration-avatar" />
      <p className="eyebrow">LOOK HOW FAR YOU’VE COME</p>
      <h2 id="celebration-title">
        {level > 1 && (level - 1) % 5 === 0
          ? "New title unlocked!"
          : "Level up!"}
      </h2>
      <p className="celebration-rank">
        Level {level} · {name}
      </p>
      <p>Your effort and growing knowledge are paying off.</p>
      <div className="celebration-rewards">
        <Sparkles size={19} />
        <strong>Your XP has been added.</strong>
        {reward && (
          <span>
            {reward.coins + reward.rank_bonus_coins} coins
            {reward.boxes.length
              ? ` · ${reward.boxes.length} reward box${reward.boxes.length === 1 ? "" : "es"}`
              : ""}
            {reward.unlock_items.length
              ? ` · ${reward.unlock_items.length} gear unlock${reward.unlock_items.length === 1 ? "" : "s"}`
              : ""}
          </span>
        )}
      </div>
      <button autoFocus className="primary" onClick={onClose}>
        Keep going <ArrowRight size={18} />
      </button>
    </dialog>
  );
}
function LevelRoadmap({
  xp,
  days,
  onClose,
}: {
  xp: number;
  days: string[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    rank = practiceLevel(xp),
    boost = streakBoost(days),
    next = rank.next,
    progress = Math.min(
      100,
      Math.max(
        0,
        ((xp - rank.threshold) / (next.threshold - rank.threshold)) * 100,
      ),
    );
  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="levels-dialog level-summary"
      aria-labelledby="levels-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h2 id="levels-title">
            Level {rank.level} · {rank.name}
          </h2>
        </div>
        <button
          autoFocus
          className="icon-button"
          aria-label="Close level progress"
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </header>
      <div
        className="level-summary-track"
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuenow={xp - rank.threshold}
        aria-valuemin={0}
        aria-valuemax={next.threshold - rank.threshold}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <p>
        {xp.toLocaleString()} XP · {(next.threshold - xp).toLocaleString()} XP
        to Level {next.level}
      </p>
      <div className="level-summary-boost">
        <Flame size={23} />
        <span>
          <strong>{boost.multiplier.toFixed(1)}× streak multiplier</strong>
          <small>
            {boost.daily} day streak · {boost.weekly} qualifying weeks
          </small>
        </span>
      </div>
      <p className="fine">Your XP and level rewards appear after each game.</p>
    </dialog>
  );
}
function ContactPage() {
  return (
    <div className="public-contact">
      <header className="contact-nav">
        <a className="brand" href="/">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          Memmara<span className="brand-dot">.</span>
        </a>
        <a className="secondary" href="/">
          Back to Memmara
        </a>
      </header>
      <main>
        <section className="contact-hero">
          <span className="eyebrow">CONTACT MEMMARA</span>
          <h1>How can we help?</h1>
          <p>
            Questions about your account, learning content, a school rollout or
            something that is not working? Contact the Memmara team directly.
          </p>
          <a
            className="primary contact-email-button"
            href="mailto:contact@memmara.com"
          >
            <span>contact@memmara.com</span>
            <ArrowRight size={18} />
          </a>
        </section>
        <section className="contact-options" aria-label="Ways we can help">
          <article>
            <UserRound size={25} />
            <h2>Account support</h2>
            <p>Sign-in, account access, subscriptions and profile help.</p>
            <a href="mailto:contact@memmara.com?subject=Memmara%20account%20support">
              Email account support
            </a>
          </article>
          <article>
            <BookOpen size={25} />
            <h2>Question feedback</h2>
            <p>
              Report unclear content or a marking problem. Include the question
              ID if you can.
            </p>
            <a href="mailto:contact@memmara.com?subject=Memmara%20question%20feedback">
              Send question feedback
            </a>
          </article>
          <article>
            <Home size={25} />
            <h2>Schools and MATs</h2>
            <p>
              Ask about school accounts, classes, reporting and future MIS
              integration.
            </p>
            <a href="mailto:contact@memmara.com?subject=Memmara%20school%20enquiry">
              Make a school enquiry
            </a>
          </article>
        </section>
        <section className="contact-safety">
          <Sparkles size={22} />
          <div>
            <h2>Keep your account secure</h2>
            <p>
              Never include your password, verification code or payment-card
              details in an email. For a question problem, send the question ID
              and a description of what happened.
            </p>
          </div>
        </section>
      </main>
      <footer className="contact-footer">
        <span>Memmara.</span>
        <a href="mailto:contact@memmara.com">contact@memmara.com</a>
        <span>Make a little room for learning.</span>
      </footer>
    </div>
  );
}

function App({
  initialProgress,
  initialVersion,
  user,
  onUser,
  onLogout,
}: {
  initialProgress: Progress;
  initialVersion: number;
  user: Account;
  onUser: (user: Account) => void;
  onLogout: () => void;
}) {
  const [data, setData] = useState<Bank | null>(null),
    [loadError, setLoadError] = useState(""),
    [loading, setLoading] = useState(true);
  const [p, setP] = useState<Progress>(() => {
      const saved = initialProgress.session;
      if (saved?.phase !== "submitted") return initialProgress;
      const recorded = initialProgress.attempts.some(
        (a) => a.id === saved.id + ":" + saved.index,
      );
      return {
        ...initialProgress,
        session: { ...saved, phase: recorded ? "feedback" : "answering" },
      };
    }),
    [page, setPage] = useState(initialPage),
    [onboarding, setOnboarding] = useState(!initialProgress.settings),
    [step, setStep] = useState(0),
    [form, setForm] = useState<Settings>(
      initialProgress.settings ?? {
        ...defaultSettings,
        yearGroup: 9,
        studyMode: "automatic",
        studied: [],
      },
    );
  const progressVersion = useRef(initialVersion),
    saveChain = useRef(Promise.resolve()),
    firstProgress = useRef(true);
  const game = useGame(p);
  const rewardedAds = useRewardedAds(game);
  const tokenCountdown = useTokenCountdown(game.data?.monetisation.nextTokenAt);
  const [topicId, setTopicId] = useState("AQA8463-T01"),
    [browseSubjectId, setBrowseSubjectId] = useState(
      p.settings?.subjects[0] ?? "GCSE-PHYSICS",
    ),
    [online, setOnline] = useState(navigator.onLine),
    [storageError, setStorageError] = useState(""),
    [markError, setMarkError] = useState(""),
    [notice, setNotice] = useState(""),
    [returnDemo, setReturnDemo] = useState(false),
    [reporting, setReporting] = useState(false),
    [reportText, setReportText] = useState("");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [sessionStarting, setSessionStarting] = useState(false);
  const sessionLaunch = useRef(0);
  const [inviteOpen, setInviteOpen] = useState(false),
    [tokenPrompt, setTokenPrompt] = useState(false),
    [tokenPromptMessage, setTokenPromptMessage] = useState(""),
    [dailyMixPrompt, setDailyMixPrompt] = useState(false),
    [dailyMixPromptMessage, setDailyMixPromptMessage] = useState("");
  useEffect(() => {
    const dismissed =
      "memmara.invite.dismissed." + user.id + "." + (user.loginCount ?? 0);
    const hidden = "memmara.invite.hidden." + user.id;
    if (
      page !== "home" ||
      onboarding ||
      (user.loginCount ?? 0) < 2 ||
      localStorage.getItem(hidden) ||
      sessionStorage.getItem(dismissed)
    )
      return;
    let live = true,
      timer = 0;
    void authRequest("referral-link")
      .then((status) => {
        if (live && status.successfulInvites === 0)
          timer = window.setTimeout(() => setInviteOpen(true), 8000);
      })
      .catch(() => {});
    return () => {
      live = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [page, onboarding, user.id, user.loginCount]);
  function closeInvite(dontShowAgain = false) {
    setInviteOpen(false);
    if (dontShowAgain)
      localStorage.setItem("memmara.invite.hidden." + user.id, "1");
    sessionStorage.setItem(
      "memmara.invite.dismissed." + user.id + "." + (user.loginCount ?? 0),
      "1",
    );
  }
  const [reviewOpen, setReviewOpen] = useState(false),
    [reviewResponse, setReviewResponse] = useState(""),
    [reviewCriteria, setReviewCriteria] = useState<Record<string, boolean>>({}),
    [challengeCriterion, setChallengeCriterion] = useState(""),
    [challengeReason, setChallengeReason] = useState("");
  const [pendingAttempt, setPendingAttempt] = useState<Attempt | null>(null),
    [finishingMix, setFinishingMix] = useState(false);
  const busy = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousXp = useRef<number | null>(null);
  const [xpAward, setXpAward] = useState(0);
  const [replayLevel, setReplayLevel] = useState(0);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const [rewardQueue, setRewardQueue] = useState<string[]>([]),
    previousInventory = useRef<Set<string> | null>(null),
    previousStreak = useRef<number | null>(null),
    previousWeeklyStreak = useRef<number | null>(null),
    previousSecure = useRef<number | null>(null);
  const requestedSubjects = [
      ...new Set([
        ...(p.settings?.subjects ?? defaultSettings.subjects),
        ...form.subjects,
      ]),
    ].sort(),
    requestedSubjectKey = requestedSubjects.join("|");
  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const [manifestResponse, c] = await Promise.all([
        fetch("/data/questions/manifest.json"),
        fetch("/data/curriculum.json"),
      ]);
      if (!manifestResponse.ok || !c.ok)
        throw new Error(
          "We couldn’t load your questions. Reconnect and try again.",
        );
      const manifest = (await manifestResponse.json()) as {
          subjects: Record<string, { url: string; count: number }>;
        },
        files = requestedSubjects
          .map((id) => manifest.subjects[id]?.url)
          .filter((url): url is string => !!url),
        responses = await Promise.all(files.map((url) => fetch(url)));
      if (responses.some((response) => !response.ok))
        throw new Error("One of your subject banks could not be loaded.");
      const questions = (
        await Promise.all(responses.map((response) => response.json()))
      ).flat();
      const bank = validateBank(questions, await c.json());
      const available = new Set(bank.questions.map((item) => item.question_id));
      setP((previous) => {
        const valid = (saved: Session) =>
          saved.questionIds.every((id) => available.has(id));
        const session =
          previous.session && valid(previous.session) ? previous.session : null;
        const pausedSessions = (previous.pausedSessions ?? []).filter(valid);
        if (previous.session && !session)
          setNotice(
            "The question bank was updated. Your previous answers and XP are saved; start a new session to use the new questions.",
          );
        if (
          session === previous.session &&
          pausedSessions.length === (previous.pausedSessions ?? []).length
        )
          return previous;
        return { ...previous, session, pausedSessions };
      });
      setData(bank);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Unable to load content.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [requestedSubjectKey]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);
  useEffect(() => {
    if (firstProgress.current) {
      firstProgress.current = false;
      return;
    }
    const timer = setTimeout(() => {
      saveChain.current = saveChain.current
        .then(async () => {
          const result = await authRequest(
            "progress",
            { progress: p, version: progressVersion.current },
            "PUT",
          );
          progressVersion.current = result.version;
          setStorageError("");
        })
        .catch((e) =>
          setStorageError(
            e instanceof Error ? e.message : "Could not sync your progress.",
          ),
        );
    }, 350);
    return () => clearTimeout(timer);
  }, [p]);
  useEffect(() => {
    document.documentElement.dataset.theme = p.settings?.theme ?? "dark";
  }, [p.settings?.theme]);
  useEffect(() => {
    if (page === "home" && !onboarding)
      document
        .querySelector<HTMLButtonElement>(".mix-card .primary")
        ?.focus({ preventScroll: true });
    else heading.current?.focus();
    window.scrollTo(0, 0);
  }, [page, onboarding, step]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const bank = data;
  const s = p.settings ?? defaultSettings;
  const session = p.session;
  const active = session && session.phase !== "complete";
  const subjectId = s.subjects.includes(browseSubjectId)
    ? browseSubjectId
    : (s.subjects[0] ?? "GCSE-PHYSICS");
  const subjectName = courseName(subjectId);
  const planSubjects = s.subjects.map(courseName).join(", ");
  const subjectPoints = bank
    ? bank.points.filter(
        (x) => x.subject_id === subjectId && pointEligible(x, s),
      )
    : [];
  const topics = Array.from(
    new Map(
      subjectPoints.map((x) => [
        x.topic_id,
        { id: x.topic_id, name: x.topic.replace(" (Physics only)", "") },
      ]),
    ).values(),
  );
  const formTopicGroups = form.subjects.map((id) => ({
    id,
    name: courseName(id),
    topics: Array.from(
      new Map(
        (bank?.points ?? [])
          .filter((x) => x.subject_id === id && pointEligible(x, form))
          .map((x) => [
            x.topic_id,
            { id: x.topic_id, name: x.topic.replace(" (Physics only)", "") },
          ]),
      ).values(),
    ),
  }));
  const formTopicIds = new Set(
    formTopicGroups.flatMap((group) => group.topics.map((topic) => topic.id)),
  );
  const autoPoints =
    bank && s.studyMode === "automatic" ? automaticPointIds(bank, s) : null;
  const studiedTopicIds = autoPoints
    ? new Set(
        subjectPoints
          .filter((pt) => autoPoints.has(pt.specification_point_id))
          .map((pt) => pt.topic_id),
      )
    : new Set(s.studied);
  const formAutoCount = bank
    ? bank.points.filter(
        (pt) =>
          form.subjects.includes(pt.subject_id) &&
          automaticPointIds(bank, form).has(pt.specification_point_id),
      ).length
    : 0;
  const current =
    session && bank
      ? bank.questions.find(
          (q) => q.question_id === session.questionIds[session.index],
        )
      : undefined;
  const currentPoint = current && bank ? pointFor(bank, current) : undefined;
  const attempt = session
    ? (p.attempts.find((a) => a.id === session.id + ":" + session.index) ??
      (pendingAttempt?.id === session.id + ":" + session.index
        ? pendingAttempt
        : undefined))
    : undefined;
  const showingFeedback = session?.phase === "feedback";
  useEffect(() => {
    setReviewOpen(!!attempt?.reviewDraft?.started);
    setReviewResponse(
      attempt?.reviewDraft?.response ?? attempt?.response ?? "",
    );
    setReviewCriteria(attempt?.reviewDraft?.criterionChecks ?? {});
    setChallengeCriterion(attempt?.reviewDraft?.criterion ?? "");
    setChallengeReason(attempt?.reviewDraft?.reason ?? "");
  }, [attempt?.id]);
  const xp = p.xp.reduce((n, x) => n + x.amount, 0);
  const rank = practiceLevel(xp);
  const nextLevel = rank.next;
  const levelProgress = nextLevel
    ? Math.max(
        0,
        Math.min(
          100,
          ((xp - rank.threshold) / (nextLevel.threshold - rank.threshold)) *
            100,
        ),
      )
    : 100;
  const completed = p.completedDays.includes(day());
  useEffect(() => {
    if (previousXp.current === null) {
      previousXp.current = xp;
      return;
    }
    const gained = xp - previousXp.current;
    previousXp.current = xp;
    if (gained <= 0) return;
    setXpAward(gained);
    const timer = window.setTimeout(() => setXpAward(0), 2400);
    return () => window.clearTimeout(timer);
  }, [xp]);
  const pendingLevel =
    (p.celebratedLevel ?? 1) < rank.level ? (p.celebratedLevel ?? 1) + 1 : 0;
  // A saved answering session must not suppress a replay from the home screen.
  const celebrationLevel =
    page === "session" && session?.phase === "answering"
      ? 0
      : replayLevel || pendingLevel;
  const totalXp = xpBreakdown(p.xp);
  const boost = streakBoost(p.completedDays);
  function closeCelebration() {
    if (pendingLevel)
      setP((prev) => ({ ...prev, celebratedLevel: pendingLevel }));
    setReplayLevel(0);
  }

  const returning =
    returnDemo || (p.lastVisit !== null && Date.now() - p.lastVisit > DAY * 2);
  const ids = new Set(p.attempts.map((a) => a.pointId));
  const availablePoints = subjectPoints.filter(
    (pt) => tierFor(s, pt.subject_id) === "higher" || pt.tier !== "higher",
  );
  const due = availablePoints.filter(
    (pt) => evidence(p, pt.specification_point_id).reviewDue,
  ).length;
  const notificationCount =
    (completed ? 0 : 1) + (due > 0 ? 1 : 0) + (active ? 1 : 0);
  const secure = availablePoints.filter(
    (pt) => evidence(p, pt.specification_point_id).state === "Secure",
  ).length;
  const sessionAttempts = session
    ? p.attempts.filter((a) => a.sessionId === session.id)
    : [];
  const sessionXp = xpBreakdown(
    p.xp.filter(
      (x) =>
        (!!session && x.sessionId === session.id) ||
        (x.sessionId === undefined &&
          (sessionAttempts.some((a) => x.id.endsWith(a.id)) ||
            (session?.isDaily &&
              session.completedAt &&
              x.id === "complete:" + day(session.completedAt)))),
    ),
  );
  const answerXp = xpBreakdown(
    p.xp.filter((x) => attempt && x.id.endsWith(attempt.id)),
  );
  const week = Array.from({ length: 7 }, (_, i) => Date.now() - (6 - i) * DAY);
  const activeDays = new Set(p.completedDays);
  const streak = streakStats(activeDays);
  const weekly = streak.thisWeekDays;
  useEffect(() => {
    if (!rewardQueue.length) return;
    const timer = window.setTimeout(
      () => setRewardQueue((queue) => queue.slice(1)),
      4200,
    );
    return () => window.clearTimeout(timer);
  }, [rewardQueue]);
  useEffect(() => {
    if (!game.data) return;
    const owned = new Set(game.data.inventory.map((item) => item.item_id));
    if (previousInventory.current) {
      const fresh = [...owned].filter(
        (id) => !previousInventory.current!.has(id),
      );
      if (fresh.length) {
        const names = fresh
          .slice(0, 2)
          .map(
            (id) =>
              game.data!.catalogue.find((item) => item.id === id)?.name ??
              "new gear",
          )
          .join(" and ");
        setRewardQueue((queue) => [
          ...queue,
          "Cosmetic unlocked: " +
            names +
            (fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""),
        ]);
      }
    }
    previousInventory.current = owned;
  }, [game.data?.inventory]);
  useEffect(() => {
    if (
      previousStreak.current !== null &&
      streak.daily > previousStreak.current &&
      [3, 7, 14, 30, 100].includes(streak.daily)
    )
      setRewardQueue((queue) => [
        ...queue,
        `${streak.daily}-day streak milestone!`,
      ]);
    previousStreak.current = streak.daily;
  }, [streak.daily]);
  useEffect(() => {
    if (
      previousWeeklyStreak.current !== null &&
      streak.weekly > previousWeeklyStreak.current &&
      [2, 4, 10, 52].includes(streak.weekly)
    )
      setRewardQueue((queue) => [
        ...queue,
        `${streak.weekly}-week streak milestone!`,
      ]);
    previousWeeklyStreak.current = streak.weekly;
  }, [streak.weekly]);
  useEffect(() => {
    if (!bank) return;
    const count = bank.points.filter(
      (point) => evidence(p, point.specification_point_id).state === "Secure",
    ).length;
    if (previousSecure.current !== null && count > previousSecure.current)
      setRewardQueue((queue) => [...queue, `${count} concepts mastered!`]);
    previousSecure.current = count;
  }, [bank, p.attempts.length]);
  useEffect(() => {
    if (game.message?.includes("Achievement unlocked:"))
      setRewardQueue((queue) => [
        ...queue,
        "Achievement unlocked: " +
          game.message!.split("Achievement unlocked: ")[1],
      ]);
  }, [game.message]);
  function changeSession(patch: Partial<Session>) {
    setP((prev) => ({
      ...prev,
      session: prev.session ? { ...prev.session, ...patch } : null,
    }));
  }
  function sendToShop() {
    setTokenPromptMessage("");
    setTokenPrompt(true);
  }
  function openTokenShop() {
    setTokenPrompt(false);
    setPage("shop");
    history.replaceState(null, "", "/shop?reason=out-of-tokens");
  }
  async function watchForToken() {
    setTokenPromptMessage("");
    const result = await rewardedAds.showTokenAd();
    if (result.status === "rewarded") {
      await game.refresh();
      setTokenPrompt(false);
      setNotice("+1 practice token added.");
    } else setTokenPromptMessage("Ad unavailable, try again later.");
  }
  async function watchForAnotherMix() {
    setDailyMixPromptMessage("");
    const result = await rewardedAds.showDailyMixAd();
    if (result.status === "rewarded") {
      await game.refresh();
      setDailyMixPrompt(false);
      setNotice("Another Daily Mix is unlocked. It will use 1 token.");
      await start();
    } else setDailyMixPromptMessage("Ad unavailable, try again later.");
  }
  function noTokens() {
    const state = game.data?.monetisation;
    return !!state && !state.unlimited && state.tokens <= 0;
  }
  function requestDailyMix() {
    if(isGuestSession()){requestGuestPlay('Daily Mix');return;}
    if (active && session.isDaily) {
      void start();
      return;
    }
    if (noTokens()) {
      sendToShop();
      return;
    }
    const daily = game.data?.daily;
    const alreadyStarted = completed || (daily?.mixesStarted ?? 0) > 0;
    if (
      alreadyStarted &&
      !daily?.unlimitedMixes &&
      (daily?.extraMixCredits ?? 0) <= 0
    ) {
      setDailyMixPromptMessage("");
      setDailyMixPrompt(true);
      return;
    }
    void start();
  }
  async function activateSession(fresh: Session, progress: Progress) {
    if(isGuestSession()){requestGuestPlay(fresh.mode==='speed'?'Speed Select':'Daily Mix');return;}
    const launch = ++sessionLaunch.current;
    setSessionStarting(true);
    try {
      // Keep the resumable session on the account before spending its token.
      const saved = saveChain.current.then(async () => {
        const result = await authRequest("progress", { progress, version: progressVersion.current }, "PUT");
        progressVersion.current = result.version;
      });
      saveChain.current = saved.catch(() => {});
      await saved;
      if (launch !== sessionLaunch.current) return;
      const started = await game.action("start-minigame", {
        mode: fresh.mode,
        sessionRef: fresh.id,
        questionIds: fresh.questionIds,
      });
      setP(prev => prev.session?.id === fresh.id ? {
        ...prev,
        session: {
          ...prev.session,
          phase: "answering",
          xpMultiplier: started.xpMultiplier === 2 ? 2 : prev.session.xpMultiplier,
          deadlineAt: fresh.mode === "speed" ? Date.now() + SPEED_SECONDS * 1000 : undefined,
        },
      } : prev);
      void game.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "This practice could not start.";
      if (message.toLowerCase().includes("unlock another daily mix")) setDailyMixPrompt(true);
      else if (message.toLowerCase().includes("token")) sendToShop();
      else setNotice(message);
    } finally {
      if (launch === sessionLaunch.current) setSessionStarting(false);
    }
  }
  function prepareSession(fresh: Session) {
    const progress: Progress = {
      ...p,
      pausedSessions: p.session && p.session.phase !== "complete"
        ? [...(p.pausedSessions ?? []).filter(x => x.id !== p.session!.id), p.session]
        : p.pausedSessions,
      session: fresh,
      lastVisit: Date.now(),
    };
    setP(progress);
    setReturnDemo(false);
    setPage("session");
    history.replaceState(null, "", "/daily-mix");
    void activateSession(fresh, progress);
  }
  async function start(topic?: string, speed = false, subjects?: string[]) {
    if(isGuestSession()){requestGuestPlay(speed?'Speed Select':'Daily Mix');return;}
    if (!bank) return;
    const same =
      active &&
      (speed
        ? session.mode === "speed"
        : topic
          ? session.mode === "topic" &&
            pointFor(
              bank,
              bank.questions.find(
                (q) => q.question_id === session.questionIds[0],
              )!,
            ).topic_id === topic
          : session.isDaily);
    if (same) {
      setPage("session");
      history.replaceState(null, "", "/daily-mix");
      return;
    }
    if (noTokens()) {
      sendToShop();
      return;
    }
    const sessionProgress = speed && subjects?.length
      ? { ...p, settings: { ...s, subjects } }
      : p;
    const fresh = createSession(bank, sessionProgress, topic, speed);
    if (!fresh) {
      setNotice(
        speed
          ? "Speed Select needs at least five multiple-choice questions in your current study plan."
          : "No suitable questions yet. Choose a studied topic in Profile.",
      );
      return;
    }
    prepareSession(fresh);
  }
  async function startReview() {
    if(isGuestSession()){requestGuestPlay('Past Mistakes');return;}
    if (!bank) return;
    if (noTokens()) {
      sendToShop();
      return;
    }
    const fresh = createReviewSession(bank, p);
    if (!fresh) {
      setNotice("Your Review Vault will fill as you practise.");
      return;
    }
    prepareSession(fresh);
  }
  function awardMinigameXp(contentId: string, amount: number) {
    const id = "minigame:" + day() + ":" + contentId;
    setP((prev) =>
      prev.xp.some((event) => event.id === id)
        ? prev
        : {
            ...prev,
            xp: [...prev.xp, { id, kind: "minigame", amount, at: Date.now() }],
          },
    );
  }
  function finishMinigame(
    mode: string,
    score: number,
    dailyChallenge: boolean,
  ) {
    const key = day() + ":" + mode;
    setP((prev) => ({
      ...prev,
      minigameBests: {
        ...prev.minigameBests,
        [mode]: Math.max(score, prev.minigameBests?.[mode] ?? 0),
      },
      minigameDailyBests: dailyChallenge
        ? {
            ...prev.minigameDailyBests,
            [key]: Math.max(score, prev.minigameDailyBests?.[key] ?? 0),
          }
        : prev.minigameDailyBests,
    }));
  }
  function navigate(next: string) {
    if (next !== "session") {
      sessionLaunch.current++;
      setSessionStarting(false);
    }
    setNotificationOpen(false);
    if (page === "session" && next !== "session")
      void game
        .flushAnswers(session?.id)
        .catch(() =>
          setStorageError(
            "Your answers are still queued and will retry when you finish the mix.",
          ),
        );
    if (p.settings) {
      setOnboarding(false);
      setStep(0);
      setForm(p.settings);
    }
    setPage(next);
    history.replaceState(null, "", pagePath[next] ?? "/dashboard");
    setReporting(false);
  }
  function submit(unsure = false, choice?: string, timedOut = false) {
    if(isGuestSession()){requestGuestPlay(session?.mode==='speed'?'Speed Select':'Daily Mix');return;}
    if (!current || !session || !bank || busy.current || attempt) return;
    busy.current = true;
    setMarkError("");
    const expired =
      timedOut ||
      (session.mode === "speed" &&
        !!session.deadlineAt &&
        Date.now() >= session.deadlineAt);
    const response = expired || unsure ? "" : (choice ?? session.draft);
    try {
      const marked = markWithRules(current, response);
      const result = expired
        ? {
            ...marked,
            explanation:
              "Time’s up. No answer was recorded within 25 seconds. " +
              current.model_answer,
          }
        : marked;
      const pt = pointFor(bank, current);
      const prev = p.attempts
        .filter((a) => a.pointId === pt.specification_point_id)
        .at(-1);
      const local: Attempt = {
        id: session.id + ":" + session.index,
        sessionId: session.id,
        questionId: current.question_id,
        pointId: pt.specification_point_id,
        response,
        at: Date.now(),
        result,
        hintUsed: session.hintUsed,
        answerRevealed: false,
        selfAssessed: false,
        delayed: !!prev && Date.now() - prev.at >= DAY,
        retry: session.revisitIds.includes(pt.specification_point_id),
      };
      const capturedSession = session,
        capturedQuestion = current;
      setPendingAttempt(local);
      changeSession({ phase: "submitted", draft: response });
      const reveal = () => {
        game.capture(capturedSession, capturedQuestion, response, expired);
        setP((old) => {
          const next = record(old, bank, local);
          return {
            ...next,
            session:
              next.session?.id === capturedSession.id &&
              next.session.index === capturedSession.index
                ? { ...next.session, phase: "feedback", draft: response }
                : next.session,
          };
        });
        setPendingAttempt(null);
        busy.current = false;
      };
      const written =
        current.question_type !== "multiple_choice" &&
        current.question_type !== "calculation";
      if (written) window.setTimeout(reveal, 850);
      else reveal();
    } catch (e) {
      setMarkError(
        e instanceof Error
          ? e.message
          : "Marking unavailable. Retry when ready.",
      );
      setPendingAttempt(null);
      busy.current = false;
    }
  }
  async function next() {
    if (!session || busy.current) return;
    if (session.index === session.questionIds.length - 1) {
      busy.current = true;
      setFinishingMix(true);
      setMarkError("");
      // Close the question flow immediately. Rewards can finish syncing in
      // the background without trapping the learner on the final question.
      setP((prev) => finish(prev));
      try {
        await game.flushAnswers(session.id);
        await game.action("complete", { sessionRef: session.id });
      } catch (e) {
        setStorageError(
          e instanceof Error
            ? "Your mix is complete on this device. " + e.message
            : "Your mix is complete on this device, but its rewards could not sync yet.",
        );
      } finally {
        setFinishingMix(false);
        busy.current = false;
      }
      return;
    }
    changeSession({ phase: "next" });
    setTimeout(() => {
      setP((prev) => ({
        ...prev,
        session: prev.session
          ? {
              ...prev.session,
              index: prev.session.index + 1,
              phase: "answering",
              draft: "",
              hintUsed: false,
              deadlineAt:
                prev.session.mode === "speed"
                  ? Date.now() + SPEED_SECONDS * 1000
                  : undefined,
            }
          : null,
      }));
      heading.current?.focus();
    }, 120);
  }
  useEffect(() => {
    if (
      session?.mode !== "speed" ||
      session.phase !== "answering" ||
      !session.deadlineAt ||
      !bank
    )
      return;
    const tick = () => {
      setClockNow(Date.now());
      if (Date.now() >= session.deadlineAt!)
        void submit(false, undefined, true);
    };
    tick();
    const timer = window.setInterval(tick, 100);
    return () => window.clearInterval(timer);
  }, [session?.id, session?.index, session?.phase, session?.deadlineAt, bank]);
  const secondsLeft = session?.deadlineAt
    ? Math.max(
        0,
        Math.min(
          SPEED_SECONDS,
          Math.ceil((session.deadlineAt - clockNow) / 1000),
        ),
      )
    : SPEED_SECONDS;
  function saveSettings() {
    if (!form.subjects.length) return;
    const nextForm = normaliseCourseContent({
      ...form,
      studied: form.studied.filter((id) => formTopicIds.has(id)),
    });
    if (nextForm.gender)
      void game
        .action("profile-presentation", { gender: nextForm.gender })
        .catch(() => {});
    setP((prev) => {
      const pause =
        prev.session &&
        prev.session.phase !== "complete" &&
        JSON.stringify(prev.settings) !== JSON.stringify(nextForm);
      return {
        ...prev,
        settings: nextForm,
        session: pause ? null : prev.session,
        pausedSessions: pause
          ? [
              ...(prev.pausedSessions ?? []).filter(
                (saved) => saved.id !== prev.session!.id,
              ),
              { ...prev.session!, plan: prev.settings ?? defaultSettings },
            ]
          : prev.pausedSessions,
      };
    });
    setBrowseSubjectId((id) =>
      nextForm.subjects.includes(id) ? id : nextForm.subjects[0],
    );
    setOnboarding(false);
    setStep(0);
    setPage("home");
    history.replaceState(null, "", "/dashboard");
  }
  function maxMarks(q: Question) {
    return q.self_check.total_marks;
  }
  function updateReviewDraft(patch: Partial<ReviewDraft>) {
    if (!attempt) return;
    const base = attempt.reviewDraft ?? {
      response: attempt.response,
      criterionChecks: {},
      criterion: "",
      reason: "",
      started: true,
      updatedAt: Date.now(),
    };
    setP((prev) => ({
      ...prev,
      attempts: prev.attempts.map((a) =>
        a.id === attempt.id
          ? { ...a, reviewDraft: { ...base, ...patch, updatedAt: Date.now() } }
          : a,
      ),
    }));
  }
  function saveReview() {
    if (!attempt || !current) return;
    if (challengeReason.trim() && !challengeCriterion.trim()) {
      setNotice("Select the criterion you want to challenge.");
      return;
    }
    const score = current.self_check.criteria.reduce(
      (total, c) => total + (reviewCriteria[c.criterion_id] ? c.marks : 0),
      0,
    );
    const revision: ReviewRevision = {
      response: reviewResponse,
      awardedMarks: score,
      criterionChecks: { ...reviewCriteria },
      changedAt: Date.now(),
      modelAnswerSeenAt: Date.now(),
      markSchemeSeenAt: Date.now(),
      ...(challengeReason.trim()
        ? {
            challenge: {
              criterion: challengeCriterion,
              reason: challengeReason.trim(),
              status: "saved_locally" as const,
            },
          }
        : {}),
    };
    setP((prev) => ({
      ...prev,
      attempts: prev.attempts.map((a) =>
        a.id === attempt.id
          ? {
              ...a,
              reviewDraft: undefined,
              reviewRevisions: [...(a.reviewRevisions ?? []), revision],
            }
          : a,
      ),
    }));
    setNotice(
      challengeReason.trim()
        ? "Self-check saved. Your challenge is saved with this attempt."
        : "Self-check saved. This post-review result is learning evidence, not independent recall.",
    );
    setChallengeReason("");
    setChallengeCriterion("");
  }
  function topicCoverage(id: string) {
    const pts = availablePoints.filter((x) => x.topic_id === id);
    return {
      count: pts.filter((x) => ids.has(x.specification_point_id)).length,
      total: pts.length,
      due: pts.filter((x) => evidence(p, x.specification_point_id).reviewDue)
        .length,
    };
  }
  function TopicCard({
    id,
    name,
    index,
  }: {
    id: string;
    name: string;
    index: number;
  }) {
    const cov = topicCoverage(id),
      Icon = topicsIcons[index] ?? BookOpen;
    return (
      <button
        className="topic-card"
        onClick={() => {
          setTopicId(id);
          navigate("topic");
        }}
      >
        <span className={"topic-icon color-" + (index % 3)}>
          <Icon size={23} />
        </span>
        <span className="grow">
          <strong>{name}</strong>
          <small>
            {cov.count
              ? `${cov.count} of ${cov.total} concepts practised`
              : "A fresh place to begin"}
          </small>
          <span className="mini-track">
            <span
              style={{
                width: `${cov.total ? (cov.count / cov.total) * 100 : 0}%`,
              }}
            />
          </span>
        </span>
        <span className="topic-status">
          {cov.count ? "Building" : "Not started"}
          {cov.due > 0 && <small>{cov.due} review due</small>}
        </span>
        <ChevronRight size={18} />
      </button>
    );
  }
  function Week() {
    return (
      <div className="week">
        {week.map((at, i) => (
          <div key={i}>
            <span>
              {new Date(at)
                .toLocaleDateString("en-GB", { weekday: "short" })
                .slice(0, 1)}
            </span>
            <span
              className={
                "day " +
                (activeDays.has(day(at)) ? "done " : "") +
                (i === 6 ? "today" : "")
              }
            >
              {activeDays.has(day(at)) ? (
                <Check size={16} />
              ) : i === 6 ? (
                <span className="dot" />
              ) : (
                <span>·</span>
              )}
            </span>
          </div>
        ))}
      </div>
    );
  }
  function Intro({
    eyebrow,
    title,
    children,
  }: {
    eyebrow: string;
    title: string;
    children?: React.ReactNode;
  }) {
    return (
      <header className="intro">
        <p className="eyebrow">{eyebrow}</p>
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
        {children && <p className="muted">{children}</p>}
      </header>
    );
  }
  const labels: Record<Outcome, string> = {
    correct: "That’s it.",
    incorrect: "Let’s untangle this.",
    partial: "A little more to check.",
    review: "Compare with the mark scheme.",
    unsure: "Let’s build from here.",
  };

  if (loading || loadError)
    return (
      <div className="load-screen">
        <Brand />
        <div className="panel">
          <Atom size={36} />
          <h1>
            {loading ? "Getting your practice ready…" : "A small interruption"}
          </h1>
          <p>{loadError || "Loading your question bank."}</p>
          {loadError && (
            <button className="primary" onClick={load}>
              Try again <RotateCcw size={18} />
            </button>
          )}
        </div>
      </div>
    );
  return (
    <div className="app-shell">
      {isGuestSession()&&<GuestPlayGate/>}
      {isGuestSession()&&<div className="guest-session-banner" role="status"><strong>Guest preview</strong><span>Explore Memmara. Sign in to play and save progress.</span><button onClick={()=>leaveGuest()}>Sign in</button></div>}
      <NativeBannerAd
        game={game}
        active={page === "session" || page === "minigames"}
      />
      <InviteFriends open={inviteOpen} onClose={closeInvite} />
      {xpAward > 0 && (
        <div className="xp-gain-toast" key={xp} role="status">
          <Sparkles size={20} />
          <strong>+{xpAward} XP</strong>
          <span>
            Level {rank.level} · {boost.multiplier.toFixed(1)}× streak boost
          </span>
        </div>
      )}
      {tokenPrompt && (
        <div
          className="token-prompt-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setTokenPrompt(false);
          }}
        >
          <section
            className="token-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="token-prompt-title"
          >
            <button
              className="icon-button token-prompt-close"
              aria-label="Close"
              onClick={() => setTokenPrompt(false)}
            >
              <X size={19} />
            </button>
            <span className="token-prompt-icon">
              <Zap size={30} />
            </span>
            <p className="eyebrow">
              CURRENT BALANCE:{" "}
              {game.data?.monetisation.unlimited
                ? "UNLIMITED"
                : (game.data?.monetisation.tokens ?? 0)}
            </p>
            <h2 id="token-prompt-title">Insufficient tokens</h2>
            <p>Buy more tokens or watch a rewarded ad to continue.</p>
            {tokenCountdown && <p className="token-refill-time"><Clock3 size={15}/>{tokenCountdown}</p>}
            {tokenPromptMessage && (
              <p className="banner warning" role="alert">
                {tokenPromptMessage}
              </p>
            )}
            <div className="token-prompt-actions">
              <button className="primary" onClick={openTokenShop}>
                <WalletCards size={17} />
                Buy more tokens
              </button>
              <button
                className="secondary"
                disabled={!!rewardedAds.busy}
                onClick={() => void watchForToken()}
              >
                <Sparkles size={17} />
                {rewardedAds.busy ? "Opening ad…" : "Watch an ad for 1 token"}
              </button>
            </div>
          </section>
        </div>
      )}
      {dailyMixPrompt && (
        <div
          className="token-prompt-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDailyMixPrompt(false);
          }}
        >
          <section
            className="token-prompt"
            role="dialog"
            aria-modal="true"
            aria-labelledby="daily-mix-prompt-title"
          >
            <button
              className="icon-button token-prompt-close"
              aria-label="Close"
              onClick={() => setDailyMixPrompt(false)}
            >
              <X size={19} />
            </button>
            <span className="token-prompt-icon">
              <Sparkles size={30} />
            </span>
            <p className="eyebrow">EXTRA DAILY MIX</p>
            <h2 id="daily-mix-prompt-title">Ready for another mix?</h2>
            <p>
              Free accounts can watch one rewarded ad to unlock another Daily
              Mix. Starting it will still use 1 practice token.
            </p>
            {dailyMixPromptMessage && (
              <p className="banner warning" role="alert">
                {dailyMixPromptMessage}
              </p>
            )}
            <div className="token-prompt-actions">
              <button
                className="primary"
                disabled={!!rewardedAds.busy}
                onClick={() => void watchForAnotherMix()}
              >
                <Sparkles size={17} />
                {rewardedAds.busy === "daily_mix_unlock"
                  ? "Opening ad…"
                  : "Watch ad and unlock"}
              </button>
              <button
                className="secondary"
                onClick={() => setDailyMixPrompt(false)}
              >
                Maybe later
              </button>
            </div>
          </section>
        </div>
      )}
      {rewardQueue.length > 0 && (
        <div className="reward-popup" key={rewardQueue[0]} role="status">
          <Trophy size={23} />
          <strong>{rewardQueue[0]}</strong>
          <button
            className="icon-button"
            aria-label="Dismiss reward"
            onClick={() => setRewardQueue((queue) => queue.slice(1))}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {levelsOpen && (
        <LevelRoadmap
          xp={xp}
          days={p.completedDays}
          onClose={() => setLevelsOpen(false)}
        />
      )}
      {celebrationLevel > 0 && (
        <LevelCelebration
          key={celebrationLevel}
          level={celebrationLevel}
          game={game}
          onClose={closeCelebration}
        />
      )}
      {game.message && !game.message.includes("Achievement unlocked:") && (
        <div className="game-toast" role="status">
          <Sparkles size={18} />
          <span>{game.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss reward message"
            onClick={game.clearMessage}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <a href="#main" className="skip">
        Skip to content
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">YOUR LEARNING SPACE</div>
        <nav aria-label="Main navigation">
          {[
            ["home", "Daily Mix", Sparkles],
            ["subjects", "Subjects", BookOpen],
            ["progress", "Progress", ChartNoAxesColumnIncreasing],
            ["minigames", "Minigames", Zap],
            ["avatar", "Avatar", Shirt],
            ["inventory", "Inventory", Package],
            ["store", "Gear", ShoppingBag],
            ["shop", "Shop", WalletCards],
            ["achievements", "Achievements", Medal],
            ["profile", "Profile", UserRound],
          ].map(([key, label, Icon]) => {
            const I = Icon as typeof Home;
            return (
              <button
                key={key as string}
                aria-current={page === key ? "page" : undefined}
                className={page === key ? "selected" : ""}
                onClick={() => navigate(key as string)}
              >
                <I size={20} />
                {label as string}
                {key === "home" && <span className="nav-dot" />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="soft-note">
            <Leaf size={21} />
            <p>
              A little practice.
              <br />
              <strong>A lasting difference.</strong>
            </p>
          </div>
          <button className="profile-chip" onClick={() => navigate("profile")}>
            <span className="avatar">{user.displayName[0]?.toUpperCase()}</span>
            <span>
              {user.displayName}
              <small>My account · {s.qualification}</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div className="main-wrap">
        <div className="topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="breadcrumb">
            Your space <ChevronRight size={13} />{" "}
            {page === "home"
              ? "Daily Mix"
              : page === "session"
                ? "Daily practice"
                : page[0].toUpperCase() + page.slice(1)}
          </span>
          <div className="topbar-right">
            <button
              className="coin-hud"
              aria-label={
                "Open gear store, " + coinBalance(game.data) + " study coins"
              }
              onClick={() => navigate("store")}
            >
              <Coins size={16} />
              {coinBalance(game.data).toLocaleString()}
            </button>
            <button
              className="coin-hud token-hud"
              aria-label={`Open token shop, ${game.data?.monetisation.unlimited ? "unlimited" : (game.data?.monetisation.tokens ?? 0)} tokens${tokenCountdown ? `. ${tokenCountdown}` : ""}`}
              onClick={() => navigate("shop")}
            >
              <Zap size={16} />
              <span>{game.data?.monetisation.unlimited ? "∞" : (game.data?.monetisation.tokens ?? 0)}</span>
              {!game.data?.monetisation.unlimited && tokenCountdown && <small>{tokenCountdown}</small>}
            </button>
            <div className="notification-anchor">
              <button
                className="icon-button notification-trigger"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                aria-controls="memmara-notifications"
                onClick={() => setNotificationOpen((open) => !open)}
              >
                <Bell size={19} />
                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationCount}
                  </span>
                )}
              </button>
              {notificationOpen && (
                <section
                  id="memmara-notifications"
                  className="notification-panel"
                  aria-label="Notifications"
                >
                  <div className="notification-heading">
                    <strong>Notifications</strong>
                    <button
                      className="icon-button"
                      aria-label="Close notifications"
                      onClick={() => setNotificationOpen(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {!completed && (
                    <button
                      className="notification-item"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("home");
                      }}
                    >
                      <span className="notification-item-icon">
                        <Sparkles size={18} />
                      </span>
                      <span>
                        <strong>Your Daily Mix is ready</strong>
                        <small>
                          A short session across your chosen subjects.
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {due > 0 && (
                    <button
                      className="notification-item"
                      onClick={() => {
                        setNotificationOpen(false);
                        startReview();
                      }}
                    >
                      <span className="notification-item-icon">
                        <BookOpen size={18} />
                      </span>
                      <span>
                        <strong>{due} ideas ready for review</strong>
                        <small>Revisit concepts in {subjectName}.</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {active && (
                    <button
                      className="notification-item"
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate("session");
                      }}
                    >
                      <span className="notification-item-icon">
                        <Clock3 size={18} />
                      </span>
                      <span>
                        <strong>Practice saved</strong>
                        <small>Continue where you left off.</small>
                      </span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                  {notificationCount === 0 && (
                    <p className="notification-empty">
                      All caught up. Your next practice will appear here.
                    </p>
                  )}
                </section>
              )}
            </div>
            <button
              className="icon-button"
              aria-label={
                s.theme === "dark"
                  ? "Switch to light theme"
                  : "Switch to dark theme"
              }
              onClick={() =>
                setP((prev) => ({
                  ...prev,
                  settings: {
                    ...s,
                    theme: s.theme === "dark" ? "light" : "dark",
                  },
                }))
              }
            >
              {s.theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="icon-button"
              aria-label="Open profile"
              onClick={() => navigate("profile")}
            >
              <span className="avatar small">
                {user.displayName[0]?.toUpperCase() || "M"}
              </span>
            </button>
          </div>
        </div>
        {!online && (
          <div className="banner">
            <WifiOff size={17} /> You’re offline. Loaded questions and
            rule-based marking still work in this tab.
          </div>
        )}
        {storageError && (
          <div role="alert" className="banner warning">
            {storageError}
          </div>
        )}
        <main
          id="main"
          className={page === "session" ? "session-main" : "content"}
        >
          {onboarding ? (
            <div className="onboarding">
              <span className="pill">
                <Sparkles size={14} /> A small start, made for you
              </span>
              <Intro
                eyebrow={`YOUR STARTING PICTURE · ${step + 1} OF 5`}
                title={
                  step === 0
                    ? "Choose your subjects."
                    : step === 1
                      ? "Set up each course."
                      : step === 2
                        ? "Choose your profile."
                        : step === 3
                          ? "How should we choose your content?"
                          : "Find your everyday pace."
                }
              >
                {step === 0
                  ? "Start with the courses you are taking."
                  : step === 1
                    ? "Choose tiers and the optional content taught by your school."
                    : step === 2
                      ? "Select the gender used for your account and avatar."
                      : step === 3
                        ? "Choose an approximate year-based plan or tell us what your class has covered."
                        : "Choose something that fits your day. You can always adjust it."}
              </Intro>
              <div className="panel setup-panel">
                {step === 0 ? (
                  <>
                    <div className="field-grid">
                      <label>
                        Qualification
                        <select
                          value={form.qualification}
                          onChange={(event) => {
                            const qualification = event.target
                              .value as Settings["qualification"];
                            setForm((previous) => ({
                              ...previous,
                              qualification,
                              subjects: [],
                              studied: [],
                              yearGroup: qualification === "GCSE" ? 10 : 12,
                            }));
                          }}
                        >
                          <option value="GCSE">GCSE</option>
                          <option value="A-Level">A-Level</option>
                        </select>
                      </label>
                      <label>
                        Exam board
                        <select value={form.board} onChange={() => {}}>
                          <option>AQA</option>
                          <option disabled>Edexcel · coming later</option>
                          <option disabled>OCR · coming later</option>
                        </select>
                      </label>
                    </div>
                    <p className="label">Your subjects</p>
                    <div
                      className="course-switch"
                      role="group"
                      aria-label={`Your ${form.qualification} subjects`}
                    >
                      {COURSES.filter(
                        ([, , qualification]) =>
                          qualification === form.qualification,
                      ).map(([id, name, qualification]) => (
                        <button
                          type="button"
                          key={id}
                          className={form.subjects.includes(id) ? "active" : ""}
                          aria-pressed={form.subjects.includes(id)}
                          onClick={() =>
                            setForm((previous) => ({
                              ...previous,
                              subjects: previous.subjects.includes(id)
                                ? previous.subjects.filter(
                                    (value) => value !== id,
                                  )
                                : [...previous.subjects, id],
                            }))
                          }
                        >
                          {form.subjects.includes(id) && <Check size={14} />}{" "}
                          {name}
                          <small> · AQA {qualification}</small>
                        </button>
                      ))}
                    </div>
                    <p className="fine">
                      Choose every subject you take. The next page will ask
                      about tiers and course options.
                    </p>
                    <p className="label">Your school year</p>
                    <div
                      className="segmented year-group-select"
                      role="group"
                      aria-label="School year"
                    >
                      {(form.qualification === "GCSE"
                        ? ([9, 10, 11] as const)
                        : ([12, 13] as const)
                      ).map((year) => (
                        <button
                          key={year}
                          className={
                            (form.yearGroup ??
                              (form.qualification === "GCSE" ? 10 : 12)) ===
                            year
                              ? "active"
                              : ""
                          }
                          aria-pressed={
                            (form.yearGroup ??
                              (form.qualification === "GCSE" ? 10 : 12)) ===
                            year
                          }
                          onClick={() => setForm({ ...form, yearGroup: year })}
                        >
                          Year {year}
                        </button>
                      ))}
                    </div>
                    <p className="fine">
                      You can change your subjects, course choices and year
                      later in Profile.
                    </p>
                  </>
                ) : step === 1 ? (
                  <CourseOptions settings={form} onChange={setForm} />
                ) : step === 2 ? (
                  <GenderSetup
                    value={form.gender}
                    onChange={(gender) => setForm({ ...form, gender })}
                  />
                ) : step === 3 ? (
                  <>
                    <div
                      className="study-mode-select"
                      role="group"
                      aria-label="Study coverage mode"
                    >
                      <button
                        type="button"
                        aria-pressed={form.studyMode === "automatic"}
                        onClick={() =>
                          setForm({ ...form, studyMode: "automatic" })
                        }
                      >
                        <Sparkles size={20} />
                        <strong>Automatic</strong>
                        <small>
                          A rough plan for Year {form.yearGroup ?? 10}, updated
                          by date
                        </small>
                      </button>
                      <button
                        type="button"
                        aria-pressed={form.studyMode !== "automatic"}
                        onClick={() =>
                          setForm({ ...form, studyMode: "manual" })
                        }
                      >
                        <BookOpen size={20} />
                        <strong>Choose topics myself</strong>
                        <small>Tick what your class has already studied</small>
                      </button>
                    </div>
                    {form.studyMode === "automatic" ? (
                      <div className="auto-study-summary">
                        <strong>
                          {formAutoCount} specification points available now
                        </strong>
                        <p>
                          We spread question-bearing specification points evenly
                          across{" "}
                          {form.qualification === "GCSE"
                            ? "Years 9, 10 and 11"
                            : "Years 12 and 13"}
                          . The first weeks start slightly ahead so you have
                          questions available; after that, the suggestion stays
                          about three teaching weeks behind. Your school may
                          teach topics in a different order. You can switch to
                          manual topics whenever you like.
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="fine">
                          Select the topics your class has covered in each
                          subject.
                        </p>
                        <div className="topic-checks">
                          {formTopicGroups.map((group) => (
                            <div className="topic-check-group" key={group.id}>
                              <h3>{group.name}</h3>
                              {group.topics.map((t) => (
                                <label key={t.id}>
                                  <input
                                    type="checkbox"
                                    checked={form.studied.includes(t.id)}
                                    onChange={(e) =>
                                      setForm((previous) => ({
                                        ...previous,
                                        studied: e.target.checked
                                          ? [...previous.studied, t.id]
                                          : previous.studied.filter(
                                              (id) => id !== t.id,
                                            ),
                                      }))
                                    }
                                  />
                                  <span>{t.name}</span>
                                </label>
                              ))}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="goal-grid">
                      {([3, 6, 10] as const).map((g, i) => (
                        <button
                          key={g}
                          className={
                            "goal " + (form.goal === g ? "active" : "")
                          }
                          onClick={() => setForm({ ...form, goal: g })}
                        >
                          <span>
                            {
                              [
                                "A small start",
                                "A steady rhythm",
                                "A deeper dive",
                              ][i]
                            }
                          </span>
                          <strong>
                            {g}
                            <small> min</small>
                          </strong>
                          <span>{[5, 8, 12][i]} questions</span>
                        </button>
                      ))}
                    </div>
                    <p className="fine">
                      Daily Mix is untimed. Speed Select is a separate mode with
                      25 seconds per question.
                    </p>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={form.allowNew}
                        onChange={(e) =>
                          setForm({ ...form, allowNew: e.target.checked })
                        }
                      />
                      Include new topics when I have spare room
                    </label>
                  </>
                )}
              </div>
              <div className="setup-actions">
                {p.settings && (
                  <button className="quiet" onClick={() => navigate("profile")}>
                    Cancel editing
                  </button>
                )}
                {step > 0 && (
                  <button className="quiet" onClick={() => setStep(step - 1)}>
                    <ArrowLeft size={17} />
                    Back
                  </button>
                )}
                <button
                  className="primary"
                  disabled={
                    (step === 0 && !form.subjects.length) ||
                    (step === 1 &&
                      (!geographyOptionsValid(form) ||
                        !historyOptionsValid(form) ||
                        !courseContentValid(form))) ||
                    (step === 2 && !form.gender) ||
                    (step === 3 &&
                      form.studyMode !== "automatic" &&
                      !form.studied.some((id) => formTopicIds.has(id)))
                  }
                  onClick={() =>
                    step < 4 ? setStep(step + 1) : saveSettings()
                  }
                >
                  {step === 4 ? "Make my practice plan" : "Continue"}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          ) : (
            <>
              {["avatar", "inventory", "store", "achievements"].includes(
                page,
              ) && (
                <GameHub
                  page={page}
                  game={game}
                  xp={xp}
                  name={user.displayName}
                  onPractice={() => start()}
                  onLevels={() => setLevelsOpen(true)}
                  onPage={navigate}
                />
              )}
              {page === "home" && (
                <>
                  <div className="home-grid">
                    <section
                      className={"mix-card " + (completed ? "is-complete" : "")}
                    >
                      <div className="mix-top">
                        <span className="pill">
                          {completed ? (
                            <Check size={14} />
                          ) : (
                            <Sparkles size={14} />
                          )}{" "}
                          {completed ? "TODAY, COMPLETE" : "YOUR DAILY MIX"}
                        </span>
                        <span className="small muted">Made for your pace</span>
                      </div>
                      <div className="mix-body">
                        <div>
                          <h2>
                            {completed ? (
                              <>
                                You showed up.
                                <br />
                                That counts.
                              </>
                            ) : returning ? (
                              <>
                                A gentle way
                                <br />
                                back in.
                              </>
                            ) : (
                              <>
                                Small session.
                                <br />
                                <span>Lasting progress.</span>
                              </>
                            )}
                          </h2>
                          <p>
                            {completed
                              ? game.data?.daily.unlimitedMixes
                                ? "Plus includes unlimited Daily Mixes. Each new mix still uses one practice token."
                                : "You can stop here, or watch a short ad to unlock one more Daily Mix. The new mix still uses one token."
                              : active && session.isDaily
                                ? "Your mix is saved. Pick up exactly where you left off."
                                : "Random practice across your chosen subjects, including two previously tricky specification points when available."}
                          </p>
                          <div className="mix-meta">
                            <span>
                              <BookOpen size={15} />
                              {active && session.isDaily
                                ? session.questionIds.length
                                : s.goal === 3
                                  ? 5
                                  : s.goal === 6
                                    ? 8
                                    : 12}{" "}
                              questions
                            </span>
                            <span>
                              <Clock3 size={15} />
                              About {s.goal} minutes
                            </span>
                          </div>
                        </div>
                        <div className="orbit-art" aria-hidden="true">
                          <div className="orbit o1" />
                          <div className="orbit o2" />
                          <div className="orbit o3" />
                          <div className="orb core">
                            <Atom size={42} />
                          </div>
                          <div className="orb satellite s1">
                            <Zap size={20} />
                          </div>
                          <div className="orb satellite s2">
                            <Waves size={20} />
                          </div>
                          <span className="star st1">✦</span>
                          <span className="star st2">✧</span>
                          <span className="orbit-dot" />
                        </div>
                      </div>
                      <div className="mix-bottom">
                        {completed && !active ? (
                          <button
                            className="primary"
                            onClick={requestDailyMix}
                          >
                            {game.data?.daily.unlimitedMixes ||
                            (game.data?.daily.extraMixCredits ?? 0) > 0
                              ? "Start another mix"
                              : "Unlock another mix"}{" "}
                            <ArrowRight size={18} />
                          </button>
                        ) : (
                          <button className="primary" onClick={requestDailyMix}>
                            {active && session.isDaily
                              ? "Continue my mix"
                              : "Start my mix"}
                            <ArrowRight size={19} />
                          </button>
                        )}
                        <span className="subject-pill">
                          <Atom size={15} />
                          Your subjects
                        </span>
                      </div>
                    </section>
                    <aside className="rhythm-card">
                      <span className="eyebrow">YOUR RHYTHM</span>
                      <h3>A little adds up.</h3>
                      <p className="muted">
                        Aim for 3 practice days a week.
                        <br />
                        There’s room for rest days, too.
                      </p>
                      <Week />
                      <div className="rhythm-footer">
                        <span className="tiny-flame">
                          <Flame size={17} />
                        </span>
                        <p>
                          {weekly
                            ? "You’re making room for practice."
                            : "Your next step starts today."}
                          <small>Every return is a fresh start.</small>
                        </p>
                      </div>
                    </aside>
                  </div>
                  <section className="arcade-home-tile">
                    <div className="arcade-home-art" aria-hidden="true">
                      <Layers3 size={48} /><Zap size={25} /><Trophy size={25} />
                    </div>
                    <div className="grow">
                      <span className="eyebrow">THE MINIGAMES ARCADE</span>
                      <h2>A little play. A lot to remember.</h2>
                      <p>
                        Build a tower, beat the clock or keep your streak alive.
                      </p>
                      <div className="arcade-game-tags"><span>Knowledge Tower</span><span>Speed Select</span><span>+ more</span></div>
                    </div>
                    <button
                      className="primary"
                      onClick={() => navigate("minigames")}
                    >
                      Explore minigames
                      <ArrowRight size={18} />
                    </button>
                  </section>
                  <div
                    className="streak-summary compact-streak"
                    aria-label="Practice progress shortcuts"
                  >
                    <button
                      type="button"
                      className="streak-item"
                      onClick={() => {
                        navigate("progress");
                        window.setTimeout(
                          () =>
                            document
                              .getElementById("daily-streak")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              }),
                          100,
                        );
                      }}
                      aria-label={`View daily streak: ${streak.daily} days`}
                    >
                      <Flame size={17} />
                      <strong>{streak.daily}</strong>
                      <span>day streak</span>
                    </button>
                    <button
                      type="button"
                      className="streak-item weekly-streak"
                      onClick={() => {
                        navigate("progress");
                        window.setTimeout(
                          () =>
                            document
                              .getElementById("weekly-streak")
                              ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                              }),
                          100,
                        );
                      }}
                      aria-label={`View weekly streak: ${streak.weekly} weeks`}
                    >
                      <Trophy size={16} />
                      <strong>{streak.weekly}</strong>
                      <span>week streak</span>
                      <small>{weekly}/3 days this week</small>
                    </button>
                    <button
                      type="button"
                      className="streak-item level-streak"
                      onClick={() => setLevelsOpen(true)}
                      aria-label={`View level ${rank.level} and XP requirements`}
                    >
                      <Sparkles size={17} />
                      <strong>{rank.level}</strong>
                      <span>level</span>
                    </button>
                  </div>
                  <div className="practice-level-card">
                    <button
                      className="level-medallion"
                      aria-label="View level progress"
                      onClick={() => setLevelsOpen(true)}
                    >
                      <Trophy size={23} />
                      <span>LV {rank.level}</span>
                    </button>
                    <div className="level-copy">
                      <div className="level-title-row">
                        <button
                          className="level-name-button"
                          onClick={() => setLevelsOpen(true)}
                        >
                          Level {rank.level} · {rank.name}
                        </button>
                        <span>{xp} XP</span>
                      </div>
                      <div
                        className="level-track"
                        role="progressbar"
                        aria-label="Progress to next practice level"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(levelProgress)}
                      >
                        <span style={{ width: `${levelProgress}%` }} />
                      </div>
                      <small>
                        {nextLevel
                          ? `${nextLevel.threshold - xp} XP to Level ${nextLevel.level}`
                          : "Keep learning"}
                      </small>
                      <button
                        className="streak-boost-button"
                        onClick={() => setLevelsOpen(true)}
                      >
                        <Flame size={14} />
                        {boost.multiplier.toFixed(1)}× streak multiplier
                      </button>
                    </div>
                    <PlayerAvatar game={game} className="level-card-avatar" />
                  </div>
                  {!isGuestSession()&&<section className="panel invite-home-card">
                    <Gift size={25} />
                    <div className="grow">
                      <h2>Practice is better together</h2>
                      <p>
                        Invite a friend. When they join and verify their
                        account, you get one month of Plus.
                      </p>
                    </div>
                    <button
                      className="secondary"
                      onClick={() => setInviteOpen(true)}
                    >
                      Invite friends <ArrowRight size={16} />
                    </button>
                  </section>}
                  <RewardedAdsCard game={game} />
                  <ReviewVault
                    bank={bank!}
                    progress={p}
                    onPractice={startReview}
                  />
                  <GameHomeCard
                    game={game}
                    name={user.displayName}
                    onOpen={navigate}
                    onPractice={() => start()}
                  />
                  <div className="section-heading">
                    <h2>Make it your own</h2>
                    <button
                      className="text-button"
                      onClick={() => navigate("subjects")}
                    >
                      Choose a topic <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="two-col">
                    {topics
                      .filter((t) => studiedTopicIds.has(t.id))
                      .slice(0, 2)
                      .map((t) => (
                        <TopicCard
                          key={t.id}
                          {...t}
                          index={topics.findIndex((x) => x.id === t.id)}
                        />
                      ))}
                  </div>
                  <div className="insight-row">
                    <span className="insight-icon">
                      <Leaf size={23} />
                    </span>
                    <div>
                      <h3>
                        {p.attempts.length
                          ? "Your picture is taking shape."
                          : "Understanding starts with remembering."}
                      </h3>
                      <p>
                        {p.attempts.length
                          ? `${ids.size} concepts practised. A return after a delay gives us better evidence of what stays.`
                          : "Try recalling before you look. Even a tricky attempt gives you a useful place to begin."}
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Explore learning progress"
                      onClick={() => navigate("progress")}
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                  <p className="page-note">
                    A manageable plan. A clear place to stop.
                  </p>
                </>
              )}
              {page === "home" && (p.pausedSessions ?? []).length > 0 && (
                <section className="panel paused-sessions">
                  <span className="eyebrow">SAVED PRACTICE</span>
                  <h2>Pick up where you left off.</h2>
                  {p.pausedSessions!.map((saved) => {
                    const q = bank!.questions.find(
                      (item) =>
                        item.question_id === saved.questionIds[saved.index],
                    );
                    if (!q) return null;
                    const point = pointFor(bank!, q),
                      name =
                        saved.mode === "speed"
                          ? "Speed Select"
                          : saved.mode === "review"
                            ? "Past Mistakes"
                            : saved.isDaily
                              ? "Daily Mix · your subjects"
                              : courseName(point.subject_id);
                    return (
                      <button
                        className="secondary"
                        key={saved.id}
                        onClick={() =>
                          setP((prev) => {
                            const current =
                              prev.session && prev.session.phase !== "complete"
                                ? [prev.session]
                                : [];
                            return {
                              ...prev,
                              session: saved,
                              pausedSessions: [
                                ...(prev.pausedSessions ?? []).filter(
                                  (x) => x.id !== saved.id,
                                ),
                                ...current,
                              ],
                              settings: {
                                ...(saved.plan ??
                                  prev.settings ??
                                  defaultSettings),
                                theme:
                                  prev.settings?.theme ?? defaultSettings.theme,
                                examDate: prev.settings?.examDate ?? "",
                                subjects: [
                                  ...new Set([
                                    ...(prev.settings?.subjects ??
                                      saved.plan?.subjects ??
                                      []),
                                    point.subject_id,
                                  ]),
                                ],
                              },
                            };
                          })
                        }
                      >
                        {name} · {saved.questionIds.length - saved.index}{" "}
                        questions left <ArrowRight size={17} />
                      </button>
                    );
                  })}
                </section>
              )}{" "}
              {page === "subjects" && (
                <>
                  <Intro
                    eyebrow="YOUR SUBJECTS"
                    title="Find your next small step."
                  >
                    Start with a topic you know, or explore something your class
                    is studying.
                  </Intro>
                  <div
                    className="course-switch"
                    aria-label="Browse your subjects"
                  >
                    {s.subjects.map((id) => (
                      <button
                        key={id}
                        className={subjectId === id ? "active" : ""}
                        aria-pressed={subjectId === id}
                        onClick={() => {
                          setBrowseSubjectId(id);
                          setTopicId(
                            bank!.points.find((pt) => pt.subject_id === id)
                              ?.topic_id ?? "",
                          );
                        }}
                      >
                        {courseName(id)}
                      </button>
                    ))}
                  </div>
                  <button
                    className="text-button subject-edit"
                    onClick={() => {
                      setForm({ ...s });
                      setStep(0);
                      setOnboarding(true);
                    }}
                  >
                    Edit my subjects <ArrowRight size={16} />
                  </button>
                  <div className="subject-heading">
                    <div className="topic-icon">
                      <Atom />
                    </div>
                    <div>
                      <h2>{subjectName}</h2>
                      <p>
                        AQA ·{" "}
                        {subjectId.startsWith("A-LEVEL-")
                          ? "A-Level · Single tier"
                          : `GCSE · ${tierFor(s, subjectId) === "higher" ? "Higher" : "Foundation"} tier`}
                      </p>
                    </div>
                    <span className="pill">{ids.size} concepts practised</span>
                  </div>
                  <div className="topic-list">
                    {topics.map((t, i) => (
                      <TopicCard key={t.id} {...t} index={i} />
                    ))}
                  </div>
                  <p className="fine">
                    Coverage uses the imported curriculum records. It is not a
                    whole-course mastery score.
                  </p>
                </>
              )}
              {page === "topic" &&
                (() => {
                  const topic = topics.find((t) => t.id === topicId)!;
                  const pts = availablePoints.filter(
                    (pt) => pt.topic_id === topicId,
                  );
                  const subtopics = Array.from(
                    new Map(
                      pts.map((pt) => [pt.subtopic_id, pt.subtopic]),
                    ).entries(),
                  );
                  const covered = topicCoverage(topicId);
                  const recent = p.attempts
                    .filter((a) =>
                      pts.some((pt) => pt.specification_point_id === a.pointId),
                    )
                    .slice(-3)
                    .reverse();
                  return (
                    <>
                      <button
                        className="text-button"
                        onClick={() => navigate("subjects")}
                      >
                        <ArrowLeft size={16} />
                        All topics
                      </button>
                      <Intro
                        eyebrow={`${subjectName.toUpperCase()} · YOUR TOPIC`}
                        title={topic?.name ?? subjectName}
                      >
                        {covered.count
                          ? `${covered.count} of ${covered.total} concepts practised. Keep building your picture.`
                          : "Take this one idea at a time."}
                      </Intro>
                      <div className="topic-hero panel">
                        <div>
                          <span className="pill">
                            {covered.count ? "Building" : "Not started"}
                          </span>
                          <h2>
                            {covered.due
                              ? "Ready for another look."
                              : "A little focus goes a long way."}
                          </h2>
                          <p>
                            {studiedTopicIds.has(topicId)
                              ? "This topic is included in your daily practice."
                              : "This topic is outside your studied list. Choosing it starts optional new practice."}
                          </p>
                        </div>
                        <button
                          className="primary"
                          onClick={() => start(topicId)}
                        >
                          {active
                            ? "Resume current session"
                            : "Practise this topic"}
                          <ArrowRight size={18} />
                        </button>
                      </div>
                      <h2 className="section-title">One idea at a time</h2>
                      <div className="panel subtopics">
                        {subtopics.map(([id, name]) => {
                          const records = pts.filter(
                            (pt) => pt.subtopic_id === id,
                          );
                          const n = records.filter((pt) =>
                            ids.has(pt.specification_point_id),
                          ).length;
                          return (
                            <div key={id}>
                              <span
                                className={
                                  "number-icon " + (n ? "practised" : "")
                                }
                              >
                                <BookOpen size={18} />
                              </span>
                              <div className="grow">
                                <strong>{name}</strong>
                                <small>
                                  {n} of {records.length} concepts practised
                                </small>
                              </div>
                              <span className="muted small">
                                {n ? "Building" : "Not started"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <h2 className="section-title">
                        Recent learning evidence
                      </h2>
                      {recent.length ? (
                        <div className="panel">
                          {recent.map((a) => (
                            <div className="evidence-row" key={a.id}>
                              <span>
                                {
                                  bank!.points.find(
                                    (pt) =>
                                      pt.specification_point_id === a.pointId,
                                  )?.subtopic
                                }
                                <small>
                                  {a.result.outcome === "correct"
                                    ? "Answer accepted"
                                    : a.result.outcome === "review"
                                      ? "Needs a mark scheme self-check"
                                      : "Ready for another look"}{" "}
                                  ·{" "}
                                  {a.delayed
                                    ? "after a delay"
                                    : "same-day practice"}
                                  {a.hintUsed ? " · with hint" : ""}
                                </small>
                              </span>
                              <span className="small muted">
                                {new Date(a.at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="muted">
                          Your first attempt will give us a starting point.
                          Unpractised ideas are unknown, not incorrect.
                        </p>
                      )}
                    </>
                  );
                })()}
              {page === "session" && session && current && (
                <div className={session.mode === "speed" ? "speed-select-session" : session.isDaily ? "daily-mix-session" : undefined}>
                  <div className="session-header">
                    <button
                      className="icon-button"
                      aria-label="Save and leave session"
                      onClick={() => navigate(session.mode === "speed" ? "minigames" : "home")}
                    >
                      <X size={21} />
                    </button>
                    <div className="session-progress">
                      <div>
                        <span>
                          {session.mode === "speed"
                            ? "Speed Select"
                            : session.isDaily
                              ? "Daily Mix · all subjects"
                              : "Topic practice"}
                        </span>
                        <span>
                          {session.phase === "complete"
                            ? session.questionIds.length
                            : session.index + 1}{" "}
                          / {session.questionIds.length}
                        </span>
                      </div>
                      <div className="track">
                        <div
                          style={{
                            width: `${((session.phase === "complete" ? session.questionIds.length : session.index) / session.questionIds.length) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Pause and save session"
                      onClick={() => navigate("home")}
                    >
                      <Pause size={18} />
                    </button>
                  </div>
                  {session.phase === "ready" ? (
                    <div className="ready-screen">
                      <PlayerAvatar game={game} className="ready-avatar" />
                      <span className="eyebrow">A LITTLE SPACE TO THINK</span>
                      <h1 ref={heading} tabIndex={-1}>
                        {session.mode === "speed"
                          ? "Ready, set, select."
                          : session.mode === "review"
                            ? "Let’s revisit those tricky ideas."
                            : p.attempts.length
                              ? "Let’s keep it fresh."
                              : "Building your starting picture."}
                      </h1>
                      {session.xpMultiplier === 2 && (
                        <span className="pill session-xp-boost">
                          <Sparkles size={14} /> 2× XP active
                        </span>
                      )}
                      <p>
                        {session.questionIds.length} questions.{" "}
                        {session.mode === "speed" ? (
                          <>
                            25 seconds per question.
                            <br />
                            Tap one answer to lock it in. Read feedback before
                            moving on. The timer keeps running if you leave a
                            question.
                          </>
                        ) : (
                          <>
                            About {s.goal} minutes.
                            <br />
                            Take your time. There’s no countdown.
                          </>
                        )}
                      </p>
                      <div className="panel ready-note">
                        <Lightbulb size={21} />
                        <p>
                          Try recalling first. If it doesn’t come yet, that’s a
                          useful place to start.
                        </p>
                      </div>
                      <button
                        className="primary"
                        disabled={sessionStarting}
                        onClick={() => void activateSession(session, p)}
                      >
                        {sessionStarting ? "Preparing your questions…" : "Try starting again"} <ArrowRight size={19} />
                      </button>
                      <small className="muted">
                        Answers are checked by rules. If a result is uncertain,
                        compare it with the model answer and mark scheme.
                      </small>
                    </div>
                  ) : session.phase === "complete" ? (
                    <div className="completion">
                      <PlayerAvatar game={game} className="completion-avatar" />
                      <span className="eyebrow">
                        YOU MADE TIME FOR LEARNING
                      </span>
                      <h1 ref={heading} tabIndex={-1}>
                        {session.mode === "speed"
                          ? "Speed round complete."
                          : session.isDaily
                            ? "Daily mix complete."
                            : "Practice complete."}
                      </h1>
                      <p>
                        {session.mode === "speed"
                          ? `${sessionAttempts.filter((a) => a.result.outcome === "correct").length} of ${sessionAttempts.length} correct. A quick round, a little stronger.`
                          : "A small session. A worthwhile step."}
                      </p>
                      <div className="completion-stats">
                        <div>
                          <strong>{sessionAttempts.length}</strong>
                          <span>questions practised</span>
                        </div>
                        <div>
                          <strong>+{sessionXp.participation}</strong>
                          <span>participation XP</span>
                        </div>
                        <div>
                          <strong>+{sessionXp.performance}</strong>
                          <span>performance XP</span>
                        </div>
                        {sessionXp.streak > 0 && (
                          <div>
                            <strong>+{sessionXp.streak}</strong>
                            <span>streak bonus XP</span>
                          </div>
                        )}
                      </div>
                      <div className="panel completion-summary">
                        <p>
                          <CheckCircle2 size={19} />
                          {session.isDaily
                            ? "Your daily goal is complete."
                            : "Your chosen practice is complete."}
                        </p>
                        <p>
                          <BookOpen size={19} />
                          {
                            new Set(sessionAttempts.map((a) => a.pointId)).size
                          }{" "}
                          concepts revisited
                        </p>
                        {sessionAttempts.some(
                          (a) => a.result.outcome === "review",
                        ) && (
                          <p>
                            <CircleHelp size={19} />
                            {
                              sessionAttempts.filter(
                                (a) => a.result.outcome === "review",
                              ).length
                            }{" "}
                            responses to compare with mark schemes
                          </p>
                        )}
                        <hr />
                        <strong>Your next small step</strong>
                        <p className="muted">
                          {sessionAttempts.some((a) =>
                            ["incorrect", "partial", "unsure"].includes(
                              a.result.outcome,
                            ),
                          )
                            ? "Come back tomorrow for a fresh look at the ideas that felt tricky."
                            : "Return after a day to see what stays with you. Today’s practice is a starting point."}
                        </p>
                      </div>
                      <button
                        className="primary wide"
                        onClick={() => {
                          navigate(session.mode === "speed" ? "minigames" : "home");
                          setP((prev) => ({ ...prev, lastVisit: Date.now() }));
                        }}
                      >
                        {session.mode === "speed" ? "Back to minigames" : "Done for today"} <Check size={18} />
                      </button>
                      <button
                        className="quiet"
                        onClick={() => navigate("subjects")}
                      >
                        Practise another topic
                      </button>
                      <div className="usefulness">
                        <span>How did this session feel?</span>
                        {(["helpful", "frustrating"] as const).map((v) => (
                          <button
                            key={v}
                            aria-pressed={p.usefulness.some(
                              (x) =>
                                x.sessionId === session.id && x.value === v,
                            )}
                            onClick={() => {
                              setP((prev) => ({
                                ...prev,
                                usefulness: [
                                  ...prev.usefulness.filter(
                                    (x) => x.sessionId !== session.id,
                                  ),
                                  { sessionId: session.id, value: v },
                                ],
                              }));
                              setNotice(
                                "Thanks. Your feedback is saved to your account.",
                              );
                            }}
                          >
                            {v === "helpful" ? "Helpful" : "Frustrating"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="question-wrap" key={current.question_id}>
                      <div className="question-context">
                        <span className="subject-pill">
                          <Atom size={15} />
                          {courseName(currentPoint?.subject_id ?? "")}
                        </span>
                        <span>
                          {currentPoint?.topic.replace(" (Physics only)", "")}
                        </span>
                        <span className="question-kind">
                          {current.question_type.replaceAll("_", " ")}
                        </span>
                        {current.geographyOption && (
                          <span className="question-kind">
                            {current.geographyOption}
                          </span>
                        )}
                        {current.marks && (
                          <span className="question-kind">
                            {current.marks}{" "}
                            {current.marks === 1 ? "mark" : "marks"}
                            {(current.self_check.spag_marks ?? 0) > 0
                              ? ` + ${current.self_check.spag_marks} SPaG`
                              : ""}
                          </span>
                        )}
                        {current.calculator &&
                          current.calculator !== "either" && (
                            <span className="question-kind">
                              {current.calculator === "non_calc"
                                ? "No calculator"
                                : "Calculator allowed"}
                            </span>
                          )}
                      </div>
                      <p className="reason">
                        {session.reasons[current.question_id]}
                      </p>
                      <h1
                        ref={heading}
                        tabIndex={-1}
                        className="question-title"
                      >
                        {current.question}
                      </h1>
                      {session.mode === "speed" &&
                        session.phase === "answering" && (
                          <div
                            className={
                              "speed-timer " +
                              (secondsLeft <= 4 ? "urgent" : "")
                            }
                          >
                            <div>
                              <Clock3 size={18} />
                              <strong role="timer">{secondsLeft}s</strong>
                              <span>Choose your answer</span>
                            </div>
                            <div className="track">
                              <span
                                style={{
                                  width:
                                    (secondsLeft / SPEED_SECONDS) * 100 + "%",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          void submit();
                        }}
                      >
                        {current.question_type === "multiple_choice" ? (
                          <fieldset className="mcq-options">
                            <legend>Choose one answer</legend>
                            {current.options!.map((option) => {
                              const locked = session.phase !== "answering",
                                correct =
                                  showingFeedback &&
                                  current.answer_key!.correct_option_ids.includes(
                                    option.option_id,
                                  ),
                                wrong =
                                  showingFeedback &&
                                  session.draft === option.option_id &&
                                  !correct;
                              return (
                                <button
                                  type="button"
                                  key={option.option_id}
                                  aria-pressed={
                                    session.draft === option.option_id
                                  }
                                  disabled={locked}
                                  className={
                                    "mcq-option " +
                                    (session.draft === option.option_id
                                      ? "selected "
                                      : "") +
                                    (correct ? "correct " : "") +
                                    (wrong ? "wrong" : "")
                                  }
                                  onClick={() =>
                                    session.mode === "speed"
                                      ? void submit(false, option.option_id)
                                      : changeSession({
                                          draft: option.option_id,
                                        })
                                  }
                                >
                                  <span className="option-letter">
                                    {option.option_id}
                                  </span>
                                  <span>{option.text}</span>
                                  {correct && <CheckCircle2 size={20} />}
                                  {wrong && <X size={20} />}
                                </button>
                              );
                            })}
                          </fieldset>
                        ) : (
                          <>
                            <label className="answer-label" htmlFor="answer">
                              {current.question_type === "calculation"
                                ? "Your answer, including units"
                                : "Your answer"}
                            </label>
                            <textarea
                              id="answer"
                              autoComplete="off"
                              placeholder={
                                current.question_type === "calculation"
                                  ? "e.g. 12 J — you can include your working"
                                  : "Write what you remember…"
                              }
                              value={session.draft}
                              disabled={session.phase !== "answering"}
                              onChange={(e) =>
                                changeSession({ draft: e.target.value })
                              }
                              rows={
                                current.question_type === "calculation"
                                  ? 3
                                  : current.question_type ===
                                      "extended_response"
                                    ? 7
                                    : 4
                              }
                            />
                            <div className="answer-meta">
                              <span>Saved as you type</span>
                              {!showingFeedback && (
                                <button
                                  type="button"
                                  className="text-button"
                                  disabled={session.hintUsed}
                                  onClick={() =>
                                    changeSession({ hintUsed: true })
                                  }
                                >
                                  <Lightbulb size={15} />
                                  {session.hintUsed
                                    ? "Hint shown"
                                    : "A small hint"}
                                </button>
                              )}
                            </div>
                            {session.hintUsed && (
                              <div className="hint">
                                <Lightbulb size={17} />
                                <span>
                                  Think about{" "}
                                  {currentPoint?.keywords
                                    .slice(0, 2)
                                    .join(" and ")}
                                  . Name the quantity or relationship before you
                                  write your answer.
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {!showingFeedback && session.mode !== "speed" && (
                          <div className="answer-actions">
                            <button
                              className="primary"
                              disabled={
                                !session.draft.trim() ||
                                session.phase !== "answering"
                              }
                            >
                              {session.phase === "submitted"
                                ? "Checking…"
                                : "Check answer"}
                              <ArrowRight size={18} />
                            </button>
                            <button
                              type="button"
                              className="quiet"
                              disabled={session.phase !== "answering"}
                              onClick={() => submit(true)}
                            >
                              I’m not sure yet
                            </button>
                          </div>
                        )}
                      </form>
                      {session.phase === "submitted" &&
                        !showingFeedback &&
                        current.question_type !== "multiple_choice" &&
                        current.question_type !== "calculation" && (
                          <MarkingStatus />
                        )}
                      {markError && (
                        <p role="alert" className="banner warning">
                          {markError}
                        </p>
                      )}
                      {showingFeedback && attempt && (
                        <section
                          className={"feedback " + attempt.result.outcome}
                          aria-live="polite"
                        >
                          <div className="feedback-title">
                            {attempt.result.outcome === "correct" ? (
                              <CheckCircle2 size={24} />
                            ) : (
                              <Lightbulb size={24} />
                            )}
                            <h2>{labels[attempt.result.outcome]}</h2>
                            <span className="marking-tag">
                              {current.question_type === "multiple_choice"
                                ? "Answer-key check"
                                : "Initial rule check"}
                            </span>
                          </div>
                          <p>{attempt.result.explanation}</p>
                          <div
                            className="xp-breakdown answer-xp"
                            aria-label="XP earned for this answer"
                          >
                            <span>
                              +{answerXp.participation} participation XP
                            </span>
                            <span>+{answerXp.performance} performance XP</span>
                            {answerXp.streak > 0 && (
                              <span>+{answerXp.streak} streak bonus XP</span>
                            )}
                          </div>
                          {attempt.result.missing.length > 0 && (
                            <div className="missing">
                              <strong>What to look at</strong>
                              <ul>
                                {attempt.result.missing.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {current.question_type !== "multiple_choice" &&
                            (!reviewOpen ? (
                              <div className="review-gate">
                                <p>
                                  Now compare your answer with the mark scheme.
                                  You can revise your answer, check each mark
                                  and challenge a criterion.
                                </p>
                                <button
                                  className="secondary"
                                  onClick={() => {
                                    setReviewOpen(true);
                                    setReviewResponse(
                                      attempt.reviewDraft?.response ??
                                        attempt.response,
                                    );
                                    updateReviewDraft({ started: true });
                                  }}
                                >
                                  <BookOpen size={17} />
                                  See mark scheme and self-check
                                </button>
                              </div>
                            ) : (
                              <div className="review-area">
                                <section className="model-answer">
                                  <span className="eyebrow">MODEL ANSWER</span>
                                  <p>{current.self_check.model_answer}</p>
                                </section>
                                {current.self_check.misconception_feedback
                                  .length > 0 && (
                                  <details>
                                    <summary>Common mix-ups</summary>
                                    {current.self_check.misconception_feedback.map(
                                      (m) => (
                                        <p key={m.misconception}>
                                          <strong>{m.misconception}</strong>
                                          <br />
                                          {m.feedback}
                                        </p>
                                      ),
                                    )}
                                  </details>
                                )}
                                <section className="mark-scheme">
                                  <span className="eyebrow">
                                    MARK SCHEME{" "}
                                    <span className="marks-badge">
                                      UP TO {current.self_check.total_marks}{" "}
                                      {current.self_check.total_marks === 1
                                        ? "MARK"
                                        : "MARKS"}
                                    </span>
                                  </span>
                                  <p>{current.mark_scheme}</p>
                                </section>
                                {current.self_check.marking_style ===
                                  "levels" && (
                                  <section className="level-guidance">
                                    <h4>Level descriptors</h4>
                                    <ul>
                                      {current.self_check.levels?.map(
                                        (level) => (
                                          <li key={level.level}>
                                            Level {level.level}:{" "}
                                            {level.descriptor} ·{" "}
                                            {level.min_marks}–{level.max_marks}{" "}
                                            content marks
                                          </li>
                                        ),
                                      )}
                                    </ul>
                                    {(current.self_check.level_caps ?? []).map(
                                      (cap) => (
                                        <p key={cap}>{cap}</p>
                                      ),
                                    )}
                                    {(current.self_check.spag_marks ?? 0) >
                                      0 && (
                                      <p>
                                        Up to {current.self_check.spag_marks}{" "}
                                        additional SPaG marks. Check spelling,
                                        punctuation and grammar separately.
                                      </p>
                                    )}
                                    <p>
                                      These guide ticks are prompts. The level
                                      is awarded for the whole answer, so the
                                      tick count is not an automatic grade.
                                    </p>
                                  </section>
                                )}
                                <section className="self-review">
                                  <div className="self-review-heading">
                                    <span className="eyebrow">YOUR TURN</span>
                                    <h3>Mark your answer</h3>
                                    <p>{current.self_check.instructions}</p>
                                  </div>
                                  {current.self_check.criteria.map((c) => (
                                    <div
                                      className={
                                        "criterion-card " +
                                        (reviewCriteria[c.criterion_id]
                                          ? "is-correct"
                                          : "")
                                      }
                                      key={c.criterion_id}
                                    >
                                      <label className="criterion-check">
                                        <input
                                          type="checkbox"
                                          aria-label={`Mark as correct: ${c.description}`}
                                          checked={
                                            !!reviewCriteria[c.criterion_id]
                                          }
                                          onChange={(e) => {
                                            const checks = {
                                              ...reviewCriteria,
                                              [c.criterion_id]:
                                                e.target.checked,
                                            };
                                            setReviewCriteria(checks);
                                            updateReviewDraft({
                                              criterionChecks: checks,
                                            });
                                          }}
                                        />
                                        <span>
                                          <strong className="criterion-title">
                                            <span>
                                              {c.marks}{" "}
                                              {c.marks === 1 ? "mark" : "marks"}{" "}
                                              · {c.description}
                                            </span>
                                            <span className="self-check-status">
                                              {reviewCriteria[c.criterion_id]
                                                ? "Marked correct"
                                                : "Mark as correct"}
                                            </span>
                                          </strong>
                                          <small>
                                            {c.examples_are_exhaustive
                                              ? "Accepted examples: "
                                              : "Examples (not exhaustive): "}
                                            {(current.self_check
                                              .checker_version ===
                                            "history-1.0.0"
                                              ? c.examples.slice(0, 3)
                                              : c.examples
                                            ).join(" · ")}
                                            {current.self_check
                                              .checker_version ===
                                              "history-1.0.0" &&
                                            c.examples.length > 3
                                              ? " · …"
                                              : ""}
                                          </small>
                                          {!reviewCriteria[c.criterion_id] && (
                                            <small className="criterion-feedback">
                                              {c.feedback_if_missed}
                                            </small>
                                          )}
                                        </span>
                                      </label>
                                      <button
                                        className={
                                          "text-button " +
                                          (challengeCriterion === c.criterion_id
                                            ? "chosen"
                                            : "")
                                        }
                                        aria-pressed={
                                          challengeCriterion === c.criterion_id
                                        }
                                        onClick={() => {
                                          const id =
                                            challengeCriterion ===
                                            c.criterion_id
                                              ? ""
                                              : c.criterion_id;
                                          setChallengeCriterion(id);
                                          setChallengeReason("");
                                          updateReviewDraft({
                                            criterion: id,
                                            reason: "",
                                          });
                                        }}
                                      >
                                        <Flag size={14} />
                                        {challengeCriterion === c.criterion_id
                                          ? "Selected for challenge"
                                          : "Challenge this point"}
                                      </button>
                                    </div>
                                  ))}
                                  <p className="score-total">
                                    {current.self_check.marking_style ===
                                    "levels"
                                      ? "Guide ticks"
                                      : "Your self-check"}
                                    :{" "}
                                    <strong>
                                      {current.self_check.criteria.reduce(
                                        (n, c) =>
                                          n +
                                          (reviewCriteria[c.criterion_id]
                                            ? c.marks
                                            : 0),
                                        0,
                                      )}{" "}
                                      / {current.self_check.total_marks} marks
                                    </strong>
                                  </p>
                                  <label
                                    className="review-label"
                                    htmlFor="review-response"
                                  >
                                    Revise your answer if you want to
                                  </label>
                                  <textarea
                                    id="review-response"
                                    value={reviewResponse}
                                    onChange={(e) => {
                                      setReviewResponse(e.target.value);
                                      updateReviewDraft({
                                        response: e.target.value,
                                      });
                                    }}
                                    rows={3}
                                  />
                                  {challengeCriterion && (
                                    <div className="challenge-box">
                                      <strong>Challenge this criterion</strong>
                                      <p>
                                        {
                                          current.self_check.criteria.find(
                                            (c) =>
                                              c.criterion_id ===
                                              challengeCriterion,
                                          )?.description
                                        }
                                      </p>
                                      <p>
                                        Explain why your answer should earn
                                        these marks. Your challenge is saved to
                                        your account.
                                      </p>
                                      <label htmlFor="challenge-reason">
                                        Why do you think this point should
                                        count?
                                      </label>
                                      <textarea
                                        id="challenge-reason"
                                        value={challengeReason}
                                        onChange={(e) => {
                                          setChallengeReason(e.target.value);
                                          updateReviewDraft({
                                            reason: e.target.value,
                                          });
                                        }}
                                        rows={3}
                                        placeholder="For example, my answer uses different correct wording…"
                                      />
                                    </div>
                                  )}
                                  <button
                                    className="primary"
                                    disabled={
                                      !reviewResponse.trim() ||
                                      (!!challengeCriterion &&
                                        !challengeReason.trim())
                                    }
                                    onClick={saveReview}
                                  >
                                    Save my self-check <Check size={17} />
                                  </button>
                                  <small className="review-caveat">
                                    This post-review self-check is learning
                                    evidence, not independent recall. Changes
                                    save as you type.
                                  </small>
                                  {attempt.reviewRevisions?.length ? (
                                    <div className="saved-reviews">
                                      <strong>Saved self-check history</strong>
                                      {attempt.reviewRevisions.map((r, i) => (
                                        <p key={i}>
                                          Self-check {i + 1}: {r.awardedMarks}/
                                          {current.self_check.total_marks} marks
                                          {r.challenge && " · Challenge saved"}
                                        </p>
                                      ))}
                                    </div>
                                  ) : null}
                                </section>
                              </div>
                            ))}
                          <div className="feedback-actions">
                            <button
                              className="primary"
                              disabled={finishingMix}
                              onClick={next}
                            >
                              {finishingMix
                                ? "Saving your mix…"
                                : session.index ===
                                    session.questionIds.length - 1
                                  ? "Finish my mix"
                                  : "Continue"}
                              <ArrowRight size={18} />
                            </button>
                            <button
                              className="text-button"
                              disabled={finishingMix}
                              onClick={() => setReporting(!reporting)}
                            >
                              <Flag size={15} />
                              Report unclear question
                            </button>
                          </div>
                          {finishingMix && <MarkingStatus saving />}
                          {reporting && (
                            <div className="report">
                              <label htmlFor="report">
                                What is unclear about the question?
                              </label>
                              <textarea
                                id="report"
                                value={reportText}
                                onChange={(e) => setReportText(e.target.value)}
                                placeholder="Tell us what made this hard to understand…"
                              />
                              <button
                                className="secondary"
                                disabled={!reportText.trim()}
                                onClick={() => {
                                  setP((prev) => ({
                                    ...prev,
                                    reports: [
                                      ...prev.reports,
                                      {
                                        id: crypto.randomUUID(),
                                        attemptId: attempt.id,
                                        reason: reportText,
                                        at: Date.now(),
                                      },
                                    ],
                                  }));
                                  setReporting(false);
                                  setReportText("");
                                  setNotice("Report saved to your account.");
                                }}
                              >
                                Save report
                              </button>
                              <small>
                                Your report is saved to your account.
                              </small>
                            </div>
                          )}
                        </section>
                      )}
                      <p className="session-footnote">
                        <Leaf size={14} />{" "}
                        {session.mode === "speed"
                          ? "25 seconds to choose. Take your time with the feedback."
                          : "Practice, not a performance. Take the time you need."}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {page === "session" && !session && (
                <div className="panel">
                  <h1>Ready when you are.</h1>
                  <button className="primary" onClick={() => start()}>
                    Start a mix <ArrowRight size={18} />
                  </button>
                </div>
              )}
              {page === "shop" && (
                <ShopPage
                  game={game}
                  outOfTokens={
                    noTokens() ||
                    new URLSearchParams(location.search).get("reason") ===
                      "out-of-tokens"
                  }
                />
              )}
              {page === "minigames" && (
                <Minigames
                  bank={bank!}
                  settings={s}
                  progress={p}
                  game={game}
                  onXp={awardMinigameXp}
                  onFinish={finishMinigame}
                  onPastMistakes={startReview}
                  onNeedToken={sendToShop}
                  onSpeedSelect={(subjects) => void start(undefined, true, subjects)}
                  speedActive={!!(active && session.mode === "speed")}
                />
              )}{" "}
              {page === "progress" && (
                <>
                  <Intro
                    eyebrow="YOUR PROGRESS"
                    title="See what’s taking shape."
                  >
                    Every attempt gives you somewhere to build from.
                  </Intro>
                  <div className="progress-overview">
                    <section className="panel">
                      <span className="eyebrow">COVERAGE</span>
                      <h2>
                        {ids.size}
                        <span> concepts practised</span>
                      </h2>
                      <p className="muted">
                        {availablePoints.length} imported concepts in your tier.
                        Unpractised content is still unknown.
                      </p>
                    </section>
                    <section className="panel">
                      <span className="eyebrow">RETENTION</span>
                      <h2>
                        {secure}
                        <span> currently secure</span>
                      </h2>
                      <p className="muted">
                        {due} ready for review. Secure requires successful
                        independent recall on three delayed practice days.
                      </p>
                    </section>
                  </div>
                  <div className="panel progress-rhythm">
                    <div>
                      <span className="eyebrow">PARTICIPATION</span>
                      <h2>
                        {xp} XP{" "}
                        <span className="muted small">
                          · Level {rank.level} · {rank.name}
                        </span>
                      </h2>
                      <p className="muted">
                        XP recognises showing up. It isn’t a measure of
                        knowledge.
                      </p>
                    </div>
                    <Week />
                  </div>
                  <section
                    className="panel progress-streak-details"
                    aria-label="Practice streak details"
                  >
                    <div id="daily-streak">
                      <Flame size={22} />
                      <strong>{streak.daily} day streak</strong>
                      <small>Practice days in a row</small>
                    </div>
                    <div id="weekly-streak">
                      <Trophy size={22} />
                      <strong>{streak.weekly} week streak</strong>
                      <small>{weekly} of 3 practice days this week</small>
                    </div>
                  </section>
                  <ProgressAnalytics progress={p} />
                  <h2 className="section-title">
                    Small things worth recognising
                  </h2>
                  <div className="achievements">
                    {[
                      {
                        label: "A first step",
                        desc: "Complete your first session",
                        earned: p.completedDays.length > 0,
                        Icon: Leaf,
                      },
                      {
                        label: "Back to an idea",
                        desc: "Retrieve after at least a day",
                        earned: p.attempts.some((a) => a.delayed),
                        Icon: RotateCcw,
                      },
                      {
                        label: "A steady rhythm",
                        desc: "Practise on three different days",
                        earned: activeDays.size >= 3,
                        Icon: Flame,
                      },
                    ].map(({ label, desc, earned, Icon }) => (
                      <div
                        className={"achievement " + (earned ? "earned" : "")}
                        key={label}
                      >
                        <span>
                          <Icon size={24} />
                        </span>
                        <h3>{label}</h3>
                        <p>{desc}</p>
                        <small>
                          {earned ? "Earned" : "Something to grow towards"}
                        </small>
                      </div>
                    ))}
                  </div>
                  <h2 className="section-title">Your learning picture</h2>
                  <div className="topic-list">
                    {topics
                      .filter((t) => studiedTopicIds.has(t.id))
                      .map((t, i) => (
                        <TopicCard key={t.id} {...t} index={i} />
                      ))}
                  </div>
                  <details className="panel evidence-explainer">
                    <summary>How progress is counted</summary>
                    <p>
                      Building means a concept has been attempted. Secure
                      requires three separate successful delayed practice days
                      without hints or an immediate retry. This is a
                      conservative prototype rule, not a validated mastery
                      model. “Review due” is a schedule, not proof you have
                      forgotten.
                    </p>
                    <p>
                      Answers not marked by rules do not count as correct or
                      incorrect retention evidence. Immediate corrections still
                      count as practice. Daily attempt XP is awarded only once
                      per question; the daily completion bonus is awarded once
                      per day.
                    </p>
                  </details>
                </>
              )}
              {page === "profile" && (
                <>
                  <button
                    className="text-button"
                    onClick={() => navigate("home")}
                  >
                    <ArrowLeft size={17} />
                    Back to home
                  </button>
                  <Intro
                    eyebrow="YOUR SPACE, YOUR PACE"
                    title="Make it work for you."
                  >
                    {isGuestSession() ? 'Your guest learning history is saved only in this browser.' : 'Your learning history and rewards are linked to your account.'}
                  </Intro>
                  <div className="panel settings-panel">
                    <h2>Your learning plan</h2>
                    <div className="settings-row">
                      <div>
                        <strong>
                          AQA {s.qualification} {planSubjects}
                        </strong>
                        <small>
                          Year{" "}
                          {s.yearGroup ??
                            (s.qualification === "GCSE" ? 10 : 12)}{" "}
                          ·{" "}
                          {s.subjects
                            .map(
                              (id) =>
                                courseName(id) +
                                (id.startsWith("GCSE-")
                                  ? " " +
                                    (tierFor(s, id) === "higher"
                                      ? "Higher"
                                      : "Foundation")
                                  : ""),
                            )
                            .join(" · ")}{" "}
                          ·{" "}
                          {s.studyMode === "automatic"
                            ? "automatic specification-point plan"
                            : new Set(s.studied).size + " studied topics"}{" "}
                          · about {s.goal} minutes a day
                        </small>
                      </div>
                      <button
                        className="secondary"
                        onClick={() => {
                          setForm({
                            ...s,
                            yearGroup:
                              s.yearGroup ??
                              (s.qualification === "GCSE" ? 10 : 12),
                            studyMode: s.studyMode ?? "manual",
                          });
                          setStep(0);
                          setOnboarding(true);
                        }}
                      >
                        Edit plan
                      </button>
                    </div>
                    {active && (
                      <p className="fine">
                        You can edit your plan now. Your unfinished session will
                        be saved to resume later.
                      </p>
                    )}
                    <div className="settings-row">
                      <div>
                        <strong>Appearance</strong>
                        <small>A comfortable space, light or dark.</small>
                      </div>
                      <button
                        className="secondary"
                        onClick={() =>
                          setP((prev) => ({
                            ...prev,
                            settings: {
                              ...s,
                              theme: s.theme === "dark" ? "light" : "dark",
                            },
                          }))
                        }
                      >
                        {s.theme === "dark" ? (
                          <Sun size={17} />
                        ) : (
                          <Moon size={17} />
                        )}{" "}
                        {s.theme === "dark" ? "Light mode" : "Dark mode"}
                      </button>
                    </div>
                    <label className="settings-row">
                      <span>
                        <strong>Exam date</strong>
                        <small>Optional. Saved for your planning.</small>
                      </span>
                      <input
                        type="date"
                        value={s.examDate}
                        onChange={(e) =>
                          setP((prev) => ({
                            ...prev,
                            settings: { ...s, examDate: e.target.value },
                          }))
                        }
                      />
                    </label>
                    <div className="settings-row">
                      <div>
                        <strong>Reminders</strong>
                        <small>
                          Notifications are not connected. No reminders will be
                          sent.
                        </small>
                      </div>
                      <span className="pill">Off</span>
                    </div>
                    <div className="settings-row">
                      <div>
                        <strong>Marking</strong>
                        <small>
                          Authored criteria and numerical rules support the
                          initial check. You can reveal the mark scheme,
                          self-check each criterion, revise your answer and
                          challenge a point. Unfamiliar wording stays unmarked
                          by the automatic rules.
                        </small>
                      </div>
                      <span className="pill">Rules v1</span>
                    </div>
                  </div>
                  <div className="panel">
                    <h2>How you earn XP</h2>
                    <p>
                      +5 participation XP per question. +5 performance XP for an
                      unaided correct answer, or +2 for a partially correct
                      answer. +10 participation XP for completing your daily
                      mix. Minigames award 1 XP per new correct answer, capped
                      at 12 XP a day.
                    </p>
                    <p className="fine">
                      Question XP is awarded once per question per day. Hints,
                      same-session retries and changes after revealing the
                      answer do not earn performance XP. Uncertain answers keep
                      their participation XP.
                    </p>
                  </div>
                  <div className="panel demo-panel">
                    <h2>Explore the prototype</h2>
                    <p className="muted">
                      These controls change the demo presentation, not your
                      learning history.
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setReturnDemo(true);
                        navigate("home");
                      }}
                    >
                      <RotateCcw size={17} />
                      Preview a return after a missed day
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(p, null, 2)], {
                          type: "application/json",
                        });
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "memmara-progress.json";
                        a.click();
                        URL.revokeObjectURL(a.href);
                      }}
                    >
                      Export my progress
                    </button>
                    <p className="fine">
                      AI marking and notifications need backend connections. The
                      review schedule remains a transparent prototype.
                    </p>
                  </div>
                  <AccountSettings
                    user={user}
                    onUser={onUser}
                    onLogout={onLogout}
                    onAvatar={() => navigate("avatar")}
                  />
                </>
              )}
            </>
          )}
          <WebBannerAd
            game={game}
            active={page === "session" || page === "minigames"}
          />
        </main>
        <footer className="site-footer">
          <span>Memmara.</span>
          <span>Make a little room for learning.</span>
          <span>AQA GCSE and A-Level courses · account progress</span>
          <a href="mailto:contact@memmara.com">contact@memmara.com</a>
          <a href="/contact">Contact</a>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          ["home", "Daily Mix", Sparkles],
          ["subjects", "Subjects", BookOpen],
          ["progress", "Progress", ChartNoAxesColumnIncreasing],
          ["minigames", "Minigames", Zap],
          ["avatar", "Avatar", Shirt],
          ["inventory", "Inventory", Package],
          ["store", "Gear", ShoppingBag],
          ["shop", "Shop", WalletCards],
          ["achievements", "Achievements", Medal],
          ["profile", "Profile", UserRound],
        ].map(([key, label, Icon]) => {
          const I = Icon as typeof Home;
          return (
            <button
              key={key as string}
              className={page === key ? "selected" : ""}
              aria-current={page === key ? "page" : undefined}
              onClick={() => navigate(key as string)}
            >
              <I size={21} />
              <span>{label as string}</span>
            </button>
          );
        })}
      </nav>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </div>
  );
}
function Root() {
  return location.pathname === "/" ? (
    <PublicLanding />
  ) : location.pathname === "/guest" ? (
    <GuestWelcome />
  ) : location.pathname === "/about" ? (
    <AboutPage />
  ) : location.pathname === "/privacy" ? (
    <PrivacyPage />
  ) : location.pathname === "/contact" ? (
    <ContactPage />
  ) : (
    <AuthGate>
      {(user, progress, version, onUser, onLogout) => (
        <App
          key={user.id}
          initialProgress={progress}
          initialVersion={version}
          user={user}
          onUser={onUser}
          onLogout={onLogout}
        />
      )}
    </AuthGate>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
