"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import {
  animate,
  motion,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "framer-motion";

export type HoldToUnlockProps = {
  onComplete: () => void;
};

type HoldInput =
  | { kind: "pointer"; pointerId: number }
  | { kind: "keyboard"; key: " " | "Enter" };

type ActiveHold = HoldInput & { startedAt: number };
type Phase = "idle" | "holding" | "complete";

const HOLD_DURATION_MS = 3_000;
const RADIUS = 108;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const FLOWER_EMOJIS = ["🌸", "🌺", "🌷", "💮"] as const;

// Match the password gate without random values that differ during hydration.
const FLOWERS = Array.from({ length: 18 }, (_, index) => ({
  id: index,
  emoji: FLOWER_EMOJIS[index % FLOWER_EMOJIS.length],
  left: `${(index * 37 + 5) % 100}%`,
  size: 20 + (index % 4) * 7,
  duration: 14 + (index % 6) * 2,
  delay: -index * 1.7,
  drift: (index % 2 === 0 ? 1 : -1) * (24 + (index % 5) * 12),
  rotation: index * 23,
  restingTop: `${(index * 17 + 8) % 95}vh`,
}));

function releasePointerCapture(
  button: HTMLButtonElement | null,
  hold: ActiveHold | null,
) {
  if (
    button &&
    hold?.kind === "pointer" &&
    button.hasPointerCapture(hold.pointerId)
  ) {
    button.releasePointerCapture(hold.pointerId);
  }
}

export default function HoldToUnlock({ onComplete }: HoldToUnlockProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progressPercent, setProgressPercent] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  const buttonRef = useRef<HTMLButtonElement>(null);
  const activeHoldRef = useRef<ActiveHold | null>(null);
  const completedRef = useRef(false);
  const notifiedRef = useRef(false);
  const progressStepRef = useRef(0);
  const resetAnimationRef = useRef<{ stop: () => void } | null>(null);

  const progress = useMotionValue(0);
  // 0%: offset = circumference; 100%: offset = 0.
  const strokeDashoffset = useTransform(
    progress,
    (value) => CIRCUMFERENCE * (1 - value),
  );
  // Hide the rounded stroke cap when the ring is completely empty.
  const ringOpacity = useTransform(progress, [0, 0.005], [0, 1]);
  const haloOpacity = useTransform(progress, [0, 1], [0.25, 0.8]);

  const id = useId();
  const headingId = `${id}-heading`;
  const hintId = `${id}-hint`;
  const keyboardHintId = `${id}-keyboard`;
  const gradientId = `hold-ring-${id.replace(/:/g, "")}`;

  useEffect(() => {
    // Keep the server and first client render identical and still.
    setReduceMotion(prefersReducedMotion ?? true);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (document.activeElement === document.body) {
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, []);

  // Update accessibility values in 10% steps; the SVG animates every frame
  // through its MotionValue without rerendering the component every frame.
  useMotionValueEvent(progress, "change", (value) => {
    const nextStep = Math.max(0, Math.min(100, Math.floor(value * 10) * 10));

    if (nextStep !== progressStepRef.current) {
      progressStepRef.current = nextStep;
      setProgressPercent(nextStep);
    }
  });

  const finishHold = useCallback(() => {
    const hold = activeHoldRef.current;
    if (!hold || completedRef.current) return;

    completedRef.current = true;
    activeHoldRef.current = null;
    resetAnimationRef.current?.stop();
    progress.set(1);
    setPhase("complete");
    releasePointerCapture(buttonRef.current, hold);
  }, [progress]);

  const cancelHold = useCallback(() => {
    const hold = activeHoldRef.current;
    if (!hold || completedRef.current) return;

    // Clear the active hold before releasing capture, which can emit events.
    activeHoldRef.current = null;
    setPhase("idle");
    releasePointerCapture(buttonRef.current, hold);
    resetAnimationRef.current?.stop();
    resetAnimationRef.current = animate(progress, 0, {
      type: "tween",
      duration: 0.35,
      ease: "easeOut",
    });
  }, [progress]);

  const endHold = useCallback(() => {
    const hold = activeHoldRef.current;
    if (!hold) return;

    // A release after the deadline still succeeds if the next frame is late.
    if (performance.now() - hold.startedAt >= HOLD_DURATION_MS) {
      finishHold();
    } else {
      cancelHold();
    }
  }, [cancelHold, finishHold]);

  const beginHold = (input: HoldInput) => {
    if (
      activeHoldRef.current ||
      completedRef.current ||
      document.visibilityState === "hidden"
    ) {
      return false;
    }

    resetAnimationRef.current?.stop();
    resetAnimationRef.current = null;
    progress.set(0);
    activeHoldRef.current = { ...input, startedAt: performance.now() };
    setPhase("holding");
    return true;
  };

  // One monotonic clock controls both the ring and completion. Every new
  // press requires the full 3,000 ms, even if the previous reset is unfinished.
  useAnimationFrame(() => {
    const hold = activeHoldRef.current;
    if (!hold || completedRef.current) return;

    const fraction = Math.min(
      (performance.now() - hold.startedAt) / HOLD_DURATION_MS,
      1,
    );

    if (fraction >= 1) finishHold();
    else progress.set(fraction);
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") cancelHold();
    };

    window.addEventListener("blur", cancelHold);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", cancelHold);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      const hold = activeHoldRef.current;
      activeHoldRef.current = null;
      resetAnimationRef.current?.stop();
      releasePointerCapture(buttonRef.current, hold);
    };
  }, [cancelHold]);

  const isActivePointer = (event: PointerEvent<HTMLButtonElement>) => {
    const hold = activeHoldRef.current;
    return hold?.kind === "pointer" && hold.pointerId === event.pointerId;
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;

    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });

    if (beginHold({ kind: "pointer", pointerId: event.pointerId })) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isActivePointer(event)) return;

    if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
      endHold();
      return;
    }

    // Captured touch pointers do not emit pointerleave. Check the circular
    // boundary explicitly so dragging a finger off also ends the hold.
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2);
    const y = (event.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2);

    if (x * x + y * y > 1) endHold();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelHold();
      return;
    }

    if (
      (event.key !== " " && event.key !== "Enter") ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (!event.repeat) beginHold({ kind: "keyboard", key: event.key });
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    const hold = activeHoldRef.current;
    if (hold?.kind !== "keyboard" || hold.key !== event.key) return;

    event.preventDefault();
    endHold();
  };

  const notifyComplete = () => {
    if (!completedRef.current || notifiedRef.current) return;

    notifiedRef.current = true;
    onComplete();
  };

  return (
    <section
      lang="ar"
      dir="rtl"
      aria-labelledby={headingId}
      aria-busy={phase === "complete"}
      className="relative isolate flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden bg-rose-200 px-6 py-12"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-20"
        style={{
          backgroundImage:
            "linear-gradient(125deg, #fff1f2 0%, #fbcfe8 25%, #fda4af 50%, #f9a8d4 75%, #ffe4e6 100%)",
          backgroundSize: "300% 300%",
        }}
        animate={{
          backgroundPosition: reduceMotion
            ? "50% 50%"
            : ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{
          duration: reduceMotion ? 0 : 24,
          repeat: reduceMotion ? 0 : Infinity,
          ease: "easeInOut",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(ellipse at 15% 90%, rgba(255,241,242,0.65), transparent 50%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
      >
        {FLOWERS.map((flower) => (
          <motion.span
            key={flower.id}
            className="absolute top-0 block drop-shadow-sm"
            style={{
              left: flower.left,
              fontSize: flower.size,
              lineHeight: 1,
            }}
            initial={false}
            animate={
              reduceMotion
                ? {
                    y: flower.restingTop,
                    x: 0,
                    rotate: flower.rotation,
                    opacity: 0.3,
                  }
                : {
                    y: ["-18vh", "118vh"],
                    x: [0, flower.drift, -flower.drift / 2, 0],
                    rotate: [
                      flower.rotation,
                      flower.rotation + (flower.id % 2 === 0 ? 360 : -360),
                    ],
                    opacity: [0, 0.65, 0.65, 0],
                  }
            }
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    duration: flower.duration,
                    delay: flower.delay,
                    repeat: Infinity,
                    ease: "linear",
                  }
            }
          >
            {flower.emoji}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: phase === "complete" ? 0 : 1,
          scale: phase === "complete" && !reduceMotion ? 1.04 : 1,
        }}
        transition={{ duration: reduceMotion ? 0.15 : 0.6, ease: "easeOut" }}
        className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center"
      >
        <p
          aria-hidden="true"
          className="mb-5 text-sm tracking-[0.5em] text-rose-500/70"
        >
          ✦ ♡ ✦
        </p>

        <h1
          id={headingId}
          className="font-arabic max-w-2xl text-[clamp(1.7rem,4.5vw,2.75rem)] leading-[1.9] font-bold text-amber-600"
          style={{
            textShadow:
              "0 2px 14px rgba(255,248,214,0.95), 0 0 38px rgba(251,191,36,0.3)",
          }}
        >
          لمسة منك سكرة و تبدأ الحكاية 🌸
        </h1>

        <div className="relative mt-9 h-64 w-64 shrink-0 sm:mt-12 sm:h-72 sm:w-72">
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-6 rounded-full bg-white blur-2xl"
            style={{ opacity: haloOpacity }}
          />

          <svg
            viewBox="0 0 240 240"
            role="progressbar"
            aria-label="التقدم نحو فتح الحكاية"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPercent}
            focusable="false"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff5cc" />
                <stop offset="40%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>
            <circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.65)"
              strokeWidth="3"
            />
            <motion.circle
              cx="120"
              cy="120"
              r={RADIUS}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              transform="rotate(-90 120 120)"
              style={{ strokeDashoffset, opacity: ringOpacity }}
              className="drop-shadow-[0_0_7px_rgba(251,191,36,0.55)]"
            />
          </svg>

          <motion.button
            ref={buttonRef}
            type="button"
            disabled={phase === "complete"}
            aria-label="اضغطي مطولًا على G لمدة ثلاث ثوانٍ لبدء الحكاية"
            aria-describedby={`${hintId} ${keyboardHintId}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={(event) => {
              if (isActivePointer(event)) endHold();
            }}
            onPointerLeave={(event) => {
              if (isActivePointer(event)) endHold();
            }}
            onPointerCancel={(event) => {
              if (isActivePointer(event)) cancelHold();
            }}
            onLostPointerCapture={(event) => {
              if (isActivePointer(event)) cancelHold();
            }}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onBlur={() => cancelHold()}
            onContextMenu={(event) => event.preventDefault()}
            onDragStart={(event) => event.preventDefault()}
            animate={{ scale: phase === "holding" && !reduceMotion ? 0.95 : 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 280, damping: 20 }
            }
            style={{
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.85), rgba(255,228,230,0.6) 42%, rgba(249,168,212,0.65))",
            }}
            className="absolute inset-[11%] flex touch-none cursor-pointer items-center justify-center rounded-full border border-white/80 shadow-[0_20px_60px_-15px_rgba(190,24,93,0.3),inset_0_2px_12px_rgba(255,255,255,0.8)] outline-none backdrop-blur-xl select-none [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] focus-visible:ring-4 focus-visible:ring-amber-500/70 focus-visible:ring-offset-4 focus-visible:ring-offset-pink-100 disabled:cursor-default"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-3 rounded-full border border-white/50"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-5 left-7 -rotate-12 text-2xl opacity-70"
            >
              🌸
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-7 bottom-5 rotate-12 text-2xl opacity-70"
            >
              🌸
            </span>
            <span
              aria-hidden="true"
              lang="en"
              className="pointer-events-none -translate-x-1 font-serif text-[6.5rem] leading-none text-amber-600 italic sm:text-[7.5rem]"
              style={{
                textShadow:
                  "0 2px 0 rgba(255,255,255,0.85), 0 0 24px rgba(251,191,36,0.25)",
              }}
            >
              G
            </span>
          </motion.button>
        </div>

        <p id={hintId} className="font-arabic mt-8 text-xl text-rose-900/75">
          اضغطي مطولًا لمدة ٣ ثوانٍ
        </p>
        <p id={keyboardHintId} className="sr-only">
          باستخدام لوحة المفاتيح، اضغطي باستمرار على المسافة أو Enter لمدة ثلاث
          ثوانٍ. ارفعي إصبعكِ أو اضغطي Escape للإلغاء.
        </p>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="font-arabic mt-2 min-h-7 text-lg text-rose-900/65"
        >
          {phase === "complete"
            ? "وبلمستكِ… بدأت الحكاية ♡"
            : phase === "holding"
              ? "خليك ضاغطة ... قربنا ♡"
              : "لحظة صغيرة… وحكاية لكِ وحدكِ"}
        </p>
      </motion.div>

      {phase === "complete" && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0.18 : 0.95,
            delay: reduceMotion ? 0 : 0.1,
            ease: "easeInOut",
          }}
          onAnimationComplete={notifyComplete}
        />
      )}
    </section>
  );
}
