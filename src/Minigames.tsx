import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Grid2X2,
  Layers3,
  Puzzle,
  Trophy,
  X,
} from "lucide-react";
import type { Bank, Progress, Question, Settings } from "./models";
import type { GameController } from "./GameService";
import { day, pointFor, shuffled, suitable } from "./engine";
import { MarkingStatus } from "./MarkingStatus";
import "./minigames.css";

type Mode = "survival" | "attack" | "match" | "tower" | "memory";
type Definition = {
  id: string;
  subject_id: string;
  specification_point_id: string;
  term: string;
  definition: string;
};
type TowerBlock = { left: number; width: number; perfect: boolean };

const games: {
  id: Mode;
  name: string;
  description: string;
  icon: typeof Flame;
}[] = [
  {
    id: "tower",
    name: "Knowledge Tower",
    description:
      "Answer, then stack moving platforms for as long as you can.",
    icon: Layers3,
  },
  {
    id: "survival",
    name: "Streak Survival",
    description: "Keep answering until one miss ends the run.",
    icon: Flame,
  },
  {
    id: "attack",
    name: "Time Attack",
    description: "Score as much as you can in 60 seconds.",
    icon: Clock3,
  },
  {
    id: "match",
    name: "Flash Match",
    description: "Pair four terms with their definitions.",
    icon: Puzzle,
  },
  {
    id: "memory",
    name: "Memory Grid",
    description: "Remember where each definition appeared.",
    icon: Grid2X2,
  },
];

const label = (id: string) =>
  id
    .replace("GCSE-", "")
    .replace("A-LEVEL-", "")
    .toLowerCase()
    .replace(
      /(^|-)([a-z])/g,
      (_, dash, letter) => (dash ? " " : "") + letter.toUpperCase(),
    );
const dailyOrder = (items: Question[]) =>
  [...items].sort(
    (a, b) => hash(day() + a.question_id) - hash(day() + b.question_id),
  );
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));
function hash(value: string) {
  let n = 0;
  for (const letter of value) n = (n * 31 + letter.charCodeAt(0)) | 0;
  return n;
}

function TowerScene({
  blocks,
  movingLeft,
  movingWidth,
  placing,
  onPlace,
}: {
  blocks: TowerBlock[];
  movingLeft: number;
  movingWidth: number;
  placing: boolean;
  onPlace: () => void;
}) {
  const cameraOffset = Math.max(0, blocks.length - 11) * 23;
  const firstVisibleBlock = Math.max(0, blocks.length - 13);
  return (
    <div
      className={"tower-stage " + (placing ? "is-placing" : "")}
      aria-label={`${Math.max(0, blocks.length - 1)} tower floors built`}
    >
      <div className="tower-sky" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="tower-stack">
        {blocks
          .slice(firstVisibleBlock)
          .map((block, visibleIndex) => {
            const index = firstVisibleBlock + visibleIndex;
            return (
              <span
                className={
                  "tower-block " +
                  (index === 0 ? "tower-base " : "") +
                  (block.perfect ? "perfect" : "")
                }
                key={index}
                style={{
                  left: block.left + "%",
                  width: block.width + "%",
                  bottom: 10 + index * 23 - cameraOffset + "px",
                }}
              />
            );
          })}
        {placing && (
          <button
            type="button"
            className="tower-block tower-moving"
            style={{
              left: `${movingLeft}%`,
              width: `${movingWidth}%`,
              bottom: 10 + blocks.length * 23 - cameraOffset + "px",
            }}
            onClick={onPlace}
            aria-label="Place moving platform"
          />
        )}
      </div>
      <div className="tower-ground" aria-hidden="true" />
    </div>
  );
}

export function Minigames({
  bank,
  settings,
  progress,
  game,
  onXp,
  onFinish,
  onPastMistakes,
  onNeedToken,
}: {
  bank: Bank;
  settings: Settings;
  progress: Progress;
  game: GameController;
  onXp: (contentId: string, amount: number) => void;
  onFinish: (mode: Mode, score: number, daily: boolean) => void;
  onPastMistakes: () => void;
  onNeedToken: () => void;
}) {
  const [definitions, setDefinitions] = useState<Definition[]>([]),
    [mode, setMode] = useState<Mode | null>(null),
    [selectedSubjects, setSelectedSubjects] = useState<string[]>(
      settings.subjects,
    ),
    [daily, setDaily] = useState(false),
    [matchTimed, setMatchTimed] = useState(false),
    [queue, setQueue] = useState<Question[]>([]),
    [cards, setCards] = useState<Definition[]>([]),
    [round, setRound] = useState(0),
    [score, setScore] = useState(0),
    [streak, setStreak] = useState(0),
    [tower, setTower] = useState(0),
    [towerBlocks, setTowerBlocks] = useState<TowerBlock[]>([
      { left: 20, width: 60, perfect: false },
    ]),
    [towerPlacing, setTowerPlacing] = useState(false),
    [movingLeft, setMovingLeft] = useState(0),
    [movingWidth, setMovingWidth] = useState(52),
    [remaining, setRemaining] = useState(60),
    [matched, setMatched] = useState<string[]>([]),
    [selectedTerm, setSelectedTerm] = useState(""),
    [memoryShowing, setMemoryShowing] = useState(false),
    [memoryTarget, setMemoryTarget] = useState(""),
    [finished, setFinished] = useState(false),
    [feedback, setFeedback] = useState(""),
    [waiting, setWaiting] = useState(false),
    [marking, setMarking] = useState(false);
  const [answerState, setAnswerState] = useState<"correct" | "wrong" | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedPair, setSelectedPair] = useState("");
  const startedAt = useRef(Date.now()),
    startedQuestionAt = useRef(Date.now()),
    finishGuard = useRef(false),
    draggedTerm = useRef(""),
    pausedAt = useRef<number | null>(null),
    pausedMs = useRef(0),
    runRef = useRef(""),
    charged = useRef(false),
    towerMovementStarted = useRef(performance.now());

  function pauseTimer() {
    if (pausedAt.current === null) pausedAt.current = Date.now();
  }
  function resumeTimer() {
    if (pausedAt.current !== null) {
      pausedMs.current += Date.now() - pausedAt.current;
      pausedAt.current = null;
    }
  }

  const pool = suitable(bank, settings).filter(
    (question) =>
      question.question_type === "multiple_choice" &&
      selectedSubjects.includes(pointFor(bank, question).subject_id),
  );
  const defPool = definitions.filter(
    (item) =>
      settings.subjects.includes(item.subject_id) &&
      selectedSubjects.includes(item.subject_id) &&
      bank.points.some(
        (point) =>
          point.specification_point_id === item.specification_point_id,
      ),
  );

  useEffect(() => {
    fetch("/data/definitions.json")
      .then((response) => response.json())
      .then(setDefinitions)
      .catch(() => setDefinitions([]));
  }, []);

  function complete(finalScore: number) {
    if (finishGuard.current || !mode) return;
    finishGuard.current = true;
    setScore(finalScore);
    setFinished(true);
    onFinish(mode, finalScore, daily);
    void game.refresh();
  }

  useEffect(() => {
    if (
      (mode !== "attack" && !(mode === "match" && matchTimed)) ||
      finished
    )
      return;
    const limit = mode === "attack" ? 60 : 45;
    const tick = () => {
      const now = Date.now(),
        elapsed =
          now -
          startedAt.current -
          pausedMs.current -
          (pausedAt.current === null ? 0 : now - pausedAt.current),
        seconds = Math.max(0, limit - Math.floor(elapsed / 1000));
      setRemaining(seconds);
      if (seconds === 0 && pausedAt.current === null) complete(score);
    };
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [mode, matchTimed, finished, score]);

  useEffect(() => {
    if (mode !== "memory" || !memoryShowing || finished) return;
    const timer = window.setTimeout(() => setMemoryShowing(false), 5000);
    return () => window.clearTimeout(timer);
  }, [mode, memoryShowing, round, finished]);

  useEffect(() => {
    if (mode !== "tower" || !towerPlacing || finished) return;
    let frame = 0;
    const range = Math.max(0, 100 - movingWidth),
      speed = 34 + Math.floor(tower / 10) * 8;
    towerMovementStarted.current = performance.now();
    const move = (now: number) => {
      const distance = ((now - towerMovementStarted.current) / 1000) * speed,
        cycle = range ? distance % (range * 2) : 0;
      setMovingLeft(cycle <= range ? cycle : range * 2 - cycle);
      frame = requestAnimationFrame(move);
    };
    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [mode, towerPlacing, movingWidth, tower, finished]);

  async function start(
    next: Mode,
    useDaily = false,
    useTimer = false,
  ) {
    if (!selectedSubjects.length) {
      setFeedback("Choose at least one subject before you play.");
      return;
    }
    const state = game.data?.monetisation;
    if (state && !state.unlimited && state.tokens <= 0) {
      onNeedToken();
      return;
    }
    const items = useDaily ? dailyOrder(pool) : shuffled(pool),
      chosen = shuffled(defPool).slice(0, 4);
    if (["match", "memory"].includes(next) && chosen.length < 4) {
      setFeedback("Choose more subjects to unlock four matching cards.");
      return;
    }
    if (!["match", "memory"].includes(next) && items.length < 5) {
      setFeedback(
        "This study plan needs at least five multiple-choice questions for this game.",
      );
      return;
    }
    runRef.current = crypto.randomUUID();
    charged.current = false;
    setMode(next);
    setDaily(useDaily);
    setMatchTimed(useTimer);
    setQueue(items);
    setCards(chosen);
    setRound(0);
    setScore(0);
    setStreak(0);
    setTower(0);
    setTowerBlocks([{ left: 20, width: 60, perfect: false }]);
    setTowerPlacing(false);
    setMovingLeft(0);
    setMovingWidth(52);
    setRemaining(next === "match" ? 45 : 60);
    setMatched([]);
    setSelectedTerm("");
    setMemoryShowing(next === "memory");
    setMemoryTarget(chosen[Math.floor(Math.random() * chosen.length)]?.id ?? "");
    setFinished(false);
    setFeedback("");
    setWaiting(false);
    setMarking(false);
    setAnswerState(null);
    setSelectedAnswer("");
    setSelectedPair("");
    finishGuard.current = false;
    pausedAt.current = null;
    pausedMs.current = 0;
    startedAt.current = Date.now();
    startedQuestionAt.current = Date.now();
  }

  async function award(body: Record<string, unknown>, id: string) {
    let result;
    try {
      result = await game.action("minigame-answer", {
        ...body,
        runRef: runRef.current,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("token")
      )
        onNeedToken();
      throw error;
    }
    if (!charged.current) {
      charged.current = true;
      void game.refresh();
    }
    if (result.xp) onXp(id, result.xp);
    return !!result.correct;
  }

  async function answerQuestion(optionId: string) {
    const question = queue[round % queue.length];
    if (!question || waiting || finished || towerPlacing) return;
    setWaiting(true);
    setMarking(true);
    pauseTimer();
    const localCorrect =
      question.answer_key?.correct_option_ids.includes(optionId) ?? false;
    setSelectedAnswer(optionId);
    setAnswerState(localCorrect ? "correct" : "wrong");
    setFeedback(
      localCorrect
        ? "Correct! Saving your score…"
        : `Not this time. ${question.options?.find((option) => option.option_id === question.answer_key?.correct_option_ids[0])?.text ?? ""} Saving your answer…`,
    );
    try {
      const correct = await award(
        { questionId: question.question_id, optionId },
        question.question_id,
      );
      setMarking(false);
      if (finishGuard.current) return;
      setAnswerState(correct ? "correct" : "wrong");
      const nextStreak = correct ? streak + 1 : 0;
      setStreak(nextStreak);
      let nextScore = score;
      if (mode === "survival") nextScore = correct ? score + 1 : score;
      if (mode === "attack")
        nextScore = Math.max(
          0,
          score +
            (correct ? Math.round(10 * (1 + Math.floor(nextStreak / 3) * 0.25)) : -5),
        );
      setScore(nextScore);

      if (mode === "tower") {
        const top = towerBlocks[towerBlocks.length - 1],
          adjustedWidth = clamp(top.width + (correct ? 8 : -8), 16, 78);
        setMovingWidth(adjustedWidth);
        setMovingLeft(0);
        setTowerPlacing(true);
        setWaiting(false);
        setFeedback(
          correct
            ? "Correct — your next platform grew. Time the placement!"
            : `Not this time. ${question.options?.find((option) => option.option_id === question.answer_key?.correct_option_ids[0])?.text ?? ""} Your next platform is smaller.`,
        );
        return;
      }

      setFeedback(
        correct
          ? "Correct!"
          : `Not this time. ${question.options?.find((option) => option.option_id === question.answer_key?.correct_option_ids[0])?.text ?? ""}`,
      );
      if (
        (mode === "survival" && !correct) ||
        (mode === "attack" && remaining <= 0)
      )
        window.setTimeout(() => complete(nextScore), 1000);
      else
        window.setTimeout(() => {
          setRound((value) => value + 1);
          setFeedback("");
          setAnswerState(null);
          setSelectedAnswer("");
          resumeTimer();
          setWaiting(false);
          startedQuestionAt.current = Date.now();
        }, 1100);
    } catch (error) {
      setAnswerState(null);
      setSelectedAnswer("");
      setMarking(false);
      resumeTimer();
      setFeedback(
        error instanceof Error ? error.message : "Could not save this answer.",
      );
      setWaiting(false);
    }
  }

  function placeTowerBlock() {
    if (!towerPlacing || waiting || finished) return;
    setWaiting(true);
    const top = towerBlocks[towerBlocks.length - 1],
      left = Math.max(movingLeft, top.left),
      right = Math.min(movingLeft + movingWidth, top.left + top.width),
      overlap = right - left;
    setTowerPlacing(false);
    if (overlap <= 2) {
      setAnswerState("wrong");
      setFeedback("The platform missed the tower.");
      window.setTimeout(() => complete(tower), 350);
      return;
    }
    const centreDifference = Math.abs(
        movingLeft + movingWidth / 2 - (top.left + top.width / 2),
      ),
      perfect = centreDifference < 1.75,
      placed = perfect
        ? {
            left: top.left,
            width: Math.min(top.width, movingWidth),
            perfect: true,
          }
        : { left, width: overlap, perfect: false },
      nextTower = tower + 1,
      nextBlocks = [...towerBlocks, placed];
    setTowerBlocks(nextBlocks);
    setTower(nextTower);
    setScore(nextTower);
    setFeedback(perfect ? "Perfect placement!" : "Platform placed.");
    setAnswerState("correct");
    window.setTimeout(() => {
      setRound((value) => value + 1);
      setFeedback("");
      setAnswerState(null);
      setSelectedAnswer("");
      setWaiting(false);
      startedQuestionAt.current = Date.now();
    }, 550);
  }

  async function chooseDefinition(chosenId: string, termId = selectedTerm) {
    if (!termId || waiting || finished) return;
    setSelectedTerm(termId);
    setSelectedPair(chosenId);
    setAnswerState(chosenId === termId ? "correct" : "wrong");
    setWaiting(true);
    setMarking(true);
    pauseTimer();
    setFeedback(
      chosenId === termId
        ? "Matched! Saving…"
        : "That pair does not match. Saving…",
    );
    let saved = false;
    try {
      const correct = await award(
        { definitionId: chosenId, chosenTermId: termId },
        chosenId,
      );
      saved = true;
      setAnswerState(correct ? "correct" : "wrong");
      if (correct) {
        const next = [...matched, chosenId];
        setMatched(next);
        setScore(score + 10);
        setFeedback("Matched!");
        if (next.length === cards.length)
          window.setTimeout(() => complete(score + 10), 900);
      } else setFeedback("That pair does not match. Try another.");
    } catch (error) {
      setAnswerState(null);
      setFeedback(
        error instanceof Error ? error.message : "Could not save this match.",
      );
    } finally {
      setMarking(false);
      window.setTimeout(() => {
        setSelectedTerm("");
        setSelectedPair("");
        setAnswerState(null);
        if (saved) setFeedback("");
        resumeTimer();
        setWaiting(false);
      }, 900);
    }
  }

  async function chooseMemory(index: number) {
    if (waiting || finished) return;
    setWaiting(true);
    setMarking(true);
    pauseTimer();
    const chosen = cards[index];
    setSelectedAnswer(chosen.id);
    setAnswerState(chosen.id === memoryTarget ? "correct" : "wrong");
    setFeedback(
      chosen.id === memoryTarget
        ? "Well remembered! Saving…"
        : `That definition was in square ${cards.findIndex((card) => card.id === memoryTarget) + 1}. Saving…`,
    );
    try {
      const correct = await award(
        { definitionId: memoryTarget, chosenTermId: chosen.id },
        memoryTarget,
      );
      setAnswerState(correct ? "correct" : "wrong");
      setMarking(false);
      const nextScore = score + (correct ? 10 : 0);
      setScore(nextScore);
      setFeedback(
        correct
          ? "Well remembered!"
          : `That definition was in square ${cards.findIndex((card) => card.id === memoryTarget) + 1}.`,
      );
      if (round >= 4) window.setTimeout(() => complete(nextScore), 1100);
      else
        window.setTimeout(() => {
          const next = shuffled(defPool).slice(
            0,
            Math.min(6, 4 + Math.floor((round + 1) / 2)),
          );
          setCards(next);
          setMemoryTarget(next[Math.floor(Math.random() * next.length)].id);
          setRound((value) => value + 1);
          setMemoryShowing(true);
          setFeedback("");
          setAnswerState(null);
          setSelectedAnswer("");
          resumeTimer();
          setWaiting(false);
        }, 900);
    } catch (error) {
      setAnswerState(null);
      setSelectedAnswer("");
      setMarking(false);
      resumeTimer();
      setFeedback(
        error instanceof Error ? error.message : "Could not save this answer.",
      );
      setWaiting(false);
    }
  }

  const question = queue.length ? queue[round % queue.length] : undefined;
  function optionClass(id: string) {
    if (!answerState || !selectedAnswer) return "";
    if (question?.answer_key?.correct_option_ids.includes(id)) return "is-correct";
    return id === selectedAnswer ? "is-wrong" : "is-muted";
  }
  return (
    <div className="minigames-page" data-mode={mode ?? "lobby"}>
      <header className="intro">
        <p className="eyebrow">FUN RETRIEVAL PRACTICE</p>
        <h1>Minigames</h1>
        <p className="muted">
          Short challenges using your chosen subjects. Your first answer spends
          1 token. Correct answers earn 1 XP each, up to 12 Minigame XP a day.
        </p>
      </header>
      {mode && (
        <button
          className="text-button"
          onClick={() => {
            setMode(null);
            setFinished(false);
            setFeedback("");
          }}
        >
          <ArrowLeft size={17} /> All minigames
        </button>
      )}
      {!mode ? (
        <>
          <div className="minigame-controls">
            <fieldset className="minigame-subjects">
              <legend>Choose subjects for this game</legend>
              {settings.subjects.map((id) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={selectedSubjects.includes(id)}
                    onChange={() =>
                      setSelectedSubjects((current) =>
                        current.includes(id)
                          ? current.filter((value) => value !== id)
                          : [...current, id],
                      )
                    }
                  />
                  {label(id)}
                </label>
              ))}
            </fieldset>
            <span>
              {pool.length} multiple-choice questions · {defPool.length}{" "}
              definitions available
            </span>
          </div>
          <div className="minigame-grid">
            {games.map((item) => {
              const Icon = item.icon;
              return (
                <article className="panel minigame-card" data-game={item.id} key={item.id}>
                  <div className="minigame-card-art" aria-hidden="true"><Icon size={46} /><i /><i /><i /></div>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                  <small>
                    Personal best: {progress.minigameBests?.[item.id] ?? 0}
                  </small>
                  {["survival", "attack"].includes(item.id) && (
                    <small>
                      Today’s challenge best:{" "}
                      {progress.minigameDailyBests?.[
                        day() + ":" + item.id
                      ] ?? 0}
                    </small>
                  )}
                  <button className="primary" onClick={() => start(item.id)}>
                    Play <ArrowRight size={17} />
                  </button>
                  {["survival", "attack"].includes(item.id) && (
                    <button
                      className="text-button"
                      onClick={() => start(item.id, true)}
                    >
                      Daily challenge
                    </button>
                  )}
                  {item.id === "match" && (
                    <button
                      className="text-button"
                      onClick={() => start("match", false, true)}
                    >
                      Timed challenge · 45s
                    </button>
                  )}
                </article>
              );
            })}
            <article className="panel minigame-card">
              <BookOpen size={29} />
              <h2>Past Mistakes</h2>
              <p>
                Up to five fresh questions from specification points you
                previously missed.
              </p>
              <button className="primary" onClick={onPastMistakes}>
                Open Review Vault <ArrowRight size={17} />
              </button>
            </article>
          </div>
        </>
      ) : (
        <section className="panel minigame-play" data-result={answerState ?? "idle"}>
          <div className="minigame-hud">
            <strong>
              {games.find((item) => item.id === mode)?.name}
              {daily ? " · Daily Challenge" : ""}
            </strong>
            <span className="minigame-score" key={"score-" + score}><Trophy size={16} /> Score {score}</span>
            {(mode === "attack" || (mode === "match" && matchTimed)) && (
              <span className={remaining <= 10 ? "timer-urgent" : ""}>
                <Clock3 size={16} /> {remaining}s
              </span>
            )}
            {mode === "survival" && (
              <span>
                <Flame size={16} /> {streak} streak
              </span>
            )}
            {mode === "tower" && <span>{tower} floors</span>}
          </div>
          {!finished && mode === "attack" && <div className="minigame-clock-track" role="progressbar" aria-label="Time remaining" aria-valuenow={remaining} aria-valuemin={0} aria-valuemax={60}><span style={{width: remaining / 60 * 100 + "%"}} /></div>}
          {!finished && mode === "survival" && <div className="survival-stage"><Flame key={streak} size={54} aria-hidden="true" /><div><strong>{streak ? `${streak} in a row` : "Keep the flame alive"}</strong><span>{streak ? "One more. You've got this." : "Every correct answer feeds your streak."}</span></div><div className="streak-sparks" aria-hidden="true">{Array.from({length: Math.min(8, streak)}, (_, i) => <i key={i} />)}</div></div>}
          {!finished && mode === "match" && <div className="match-progress" aria-label={`${matched.length} of ${cards.length} pairs matched`}>{cards.map(card => <span key={card.id} className={matched.includes(card.id) ? "complete" : ""}><Check size={16} /></span>)}<strong>{matched.length}/{cards.length} pairs</strong></div>}
          {finished ? (
            <div className="minigame-finish">
              <Trophy size={46} />
              <div className="minigame-finish-score">{score}<small>{mode === "tower" ? "floors built" : mode === "survival" ? "answer streak" : "points"}</small></div>
              <h2>{mode === "tower" ? "Tower run complete" : "Run complete"}</h2>
              <p>
                You scored {score}. Your best is{" "}
                {Math.max(score, progress.minigameBests?.[mode] ?? 0)}.
              </p>
              <button
                className="primary"
                onClick={() => start(mode, daily, matchTimed)}
              >
                Play again <ArrowRight size={17} />
              </button>
            </div>
          ) : mode === "tower" && question ? (
            <>
              <TowerScene
                blocks={towerBlocks}
                movingLeft={movingLeft}
                movingWidth={movingWidth}
                placing={towerPlacing}
                onPlace={placeTowerBlock}
              />
              {towerPlacing ? (
                <div className="tower-placement-controls">
                  <p>
                    {movingWidth > towerBlocks[towerBlocks.length - 1].width
                      ? "Your correct answer made this platform wider."
                      : "Your incorrect answer made this platform narrower."}{" "}
                    Place it when it lines up with the tower.
                  </p>
                  <button
                    className="primary"
                    disabled={waiting}
                    onClick={placeTowerBlock}
                  >
                    Place platform
                  </button>
                </div>
              ) : (
                <>
                  <p className="eyebrow">
                    {label(pointFor(bank, question).subject_id)} ·{" "}
                    {pointFor(bank, question).spec_reference}
                  </p>
                  <h2>{question.question}</h2>
                  <div className="minigame-options" key={question.question_id + ":" + round}>
                    {question.options?.map((option) => (
                      <button
                        key={option.option_id}
                        className={optionClass(option.option_id)}
                        disabled={waiting}
                        onClick={() => void answerQuestion(option.option_id)}
                      >
                        <span>{optionClass(option.option_id) === "is-correct" ? <Check size={18} /> : optionClass(option.option_id) === "is-wrong" ? <X size={18} /> : option.option_id}</span>
                        {option.text}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : ["survival", "attack"].includes(mode) && question ? (
            <>
              <p className="eyebrow">
                {label(pointFor(bank, question).subject_id)} ·{" "}
                {pointFor(bank, question).spec_reference}
              </p>
              <h2>{question.question}</h2>
              <div className="minigame-options" key={question.question_id + ":" + round}>
                {question.options?.map((option) => (
                  <button
                    key={option.option_id}
                    className={optionClass(option.option_id)}
                    disabled={waiting}
                    onClick={() => void answerQuestion(option.option_id)}
                  >
                    <span>{optionClass(option.option_id) === "is-correct" ? <Check size={18} /> : optionClass(option.option_id) === "is-wrong" ? <X size={18} /> : option.option_id}</span>
                    {option.text}
                  </button>
                ))}
              </div>
            </>
          ) : mode === "match" ? (
            <>
              <p>Tap a term, then its matching definition.</p>
              <div className="match-columns">
                <div>
                  {cards.map((card) => (
                    <button
                      key={card.id}
                      disabled={matched.includes(card.id) || waiting}
                      draggable={!matched.includes(card.id)}
                      onDragStart={() => {
                        draggedTerm.current = card.id;
                      }}
                      className={matched.includes(card.id) ? "is-correct" : selectedPair && selectedTerm === card.id ? (answerState === "correct" ? "is-correct" : "is-wrong") : selectedTerm === card.id ? "selected" : ""}
                      onClick={() => setSelectedTerm(card.id)}
                    >
                      {matched.includes(card.id) ? <Check size={16} /> : null}
                      {card.term}
                    </button>
                  ))}
                </div>
                <div>
                  {shuffledStable(cards).map((card) => (
                    <button
                      key={card.id}
                      className={matched.includes(card.id) ? "is-correct" : selectedPair === card.id ? (answerState === "correct" ? "is-correct" : "is-wrong") : ""}
                      disabled={matched.includes(card.id) || waiting}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        void chooseDefinition(card.id, draggedTerm.current);
                        draggedTerm.current = "";
                      }}
                      onClick={() => void chooseDefinition(card.id)}
                    >
                      {card.definition}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : mode === "memory" ? (
            <>
              <p>
                {memoryShowing
                  ? "Study the cards. They will hide in five seconds."
                  : `Which square contained the definition of ${cards.find((card) => card.id === memoryTarget)?.term}?`}
              </p>
              <div className="memory-grid" key={round + ":" + memoryShowing}>
                {cards.map((card, index) => (
                  <button
                    key={card.id}
                    className={answerState && card.id === memoryTarget ? "is-correct" : answerState && selectedAnswer === card.id ? "is-wrong" : memoryShowing ? "is-revealed" : "is-hidden"}
                    disabled={memoryShowing || waiting}
                    onClick={() => void chooseMemory(index)}
                  >
                    <strong>Square {index + 1}</strong>
                    <span>{memoryShowing || answerState ? card.definition : "?"}</span>
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {marking && (
            <MarkingStatus
              compact
              saving
              timerPaused={mode === "attack" || (mode === "match" && matchTimed)}
            />
          )}
          {feedback && (
            <p className={"minigame-feedback feedback-" + (answerState ?? "neutral")} role="status">
              {answerState === "correct" ? <Check size={22} /> : answerState === "wrong" ? <X size={22} /> : null}
              {feedback}
            </p>
          )}
        </section>
      )}
      {!mode && feedback && (
        <p role="alert" className="banner warning">
          {feedback}
        </p>
      )}
    </div>
  );
}

function shuffledStable(cards: Definition[]) {
  return [...cards].reverse();
}
