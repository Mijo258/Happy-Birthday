"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";

export type PasswordGateProps = {
  onSuccess: () => void;
};

const CORRECT_PIN = "2611";
const PIN_LENGTH = CORRECT_PIN.length;

const KEYS = [
  "1", "2", "3",
  "4", "5", "6",
  "7", "8", "9",
  "clear", "0", "enter",
] as const;

const FLOWER_EMOJIS = ["🌸", "🌺", "🌷", "💮"] as const;

// Deterministic positions keep the server and client rendering consistent.
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

export default function PasswordGate({ onSuccess }: PasswordGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const unlockingRef = useRef(false);
  const successCalledRef = useRef(false);

  const shakeControls = useAnimationControls();
  const prefersReducedMotion = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(true);

  const id = useId();
  const headingId = `${id}-heading`;
  const instructionsId = `${id}-instructions`;
  const feedbackId = `${id}-feedback`;

  useEffect(() => {
    // Start still on both server and client, then honor the device preference.
    setReduceMotion(prefersReducedMotion ?? true);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (document.activeElement === document.body) {
      formRef.current?.focus({ preventScroll: true });
    }
  }, []);

  const appendDigit = useCallback((digit: string) => {
    if (unlockingRef.current) return;

    setError(null);
    setPin((current) =>
      current.length < PIN_LENGTH ? current + digit : current,
    );
  }, []);

  const clearPin = useCallback(() => {
    if (unlockingRef.current) return;

    setPin("");
    setError(null);
  }, []);

  const submitPin = useCallback(() => {
    if (unlockingRef.current || pin.length !== PIN_LENGTH) return;

    if (pin === CORRECT_PIN) {
      unlockingRef.current = true;
      setError(null);
      setIsUnlocking(true);
      return;
    }

    setPin("");
    setError("ليس هذا الرمز… جرّبي مرة أخرى يا حبيبتي ♡");

    void shakeControls.start({
      x: reduceMotion ? 0 : [0, -12, 12, -9, 9, -5, 5, 0],
      transition: {
        duration: reduceMotion ? 0 : 0.48,
        ease: "easeInOut",
      },
    });
  }, [pin, reduceMotion, shakeControls]);

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing ||
      unlockingRef.current
    ) {
      return;
    }

    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      appendDigit(event.key);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      setPin((current) => current.slice(0, -1));
      setError(null);
      return;
    }

    if (event.key === "Escape" || event.key === "Delete") {
      event.preventDefault();
      clearPin();
      return;
    }

    // Preserve native Enter/Space activation for focused buttons.
    if (
      event.key === "Enter" &&
      !(event.target as HTMLElement).closest("button")
    ) {
      event.preventDefault();
      submitPin();
    }
  };

  const finishUnlock = () => {
    if (!unlockingRef.current || successCalledRef.current) return;

    successCalledRef.current = true;
    onSuccess();
  };

  return (
    <section
      lang="ar"
      aria-labelledby={headingId}
      aria-busy={isUnlocking}
      className="relative isolate grid min-h-[100svh] w-full grid-rows-[auto_1fr_auto] place-items-center gap-8 overflow-hidden bg-rose-200 px-4 py-8 sm:px-6 sm:py-10"
    >
      {/* Animated rose-colored sky */}
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

      {/* Soft, luminous atmosphere */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 20%, rgba(255,255,255,0.7), transparent 55%), radial-gradient(ellipse at 15% 90%, rgba(255,241,242,0.65), transparent 50%)",
        }}
      />

      {/* Falling flowers */}
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

      <motion.header
        dir="rtl"
        className="relative z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: isUnlocking ? 0 : 1 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.75 }}
      >
        <p
          aria-hidden="true"
          className="mb-3 text-sm tracking-[0.5em] text-rose-500/70"
        >
          ✦ ♡ ✦
        </p>

        <h1
          id={headingId}
          className="font-arabic text-4xl leading-relaxed font-bold text-amber-600 sm:text-5xl md:text-6xl"
          style={{
            textShadow:
              "0 2px 14px rgba(255,248,214,0.95), 0 0 38px rgba(251,191,36,0.3)",
          }}
        >
          {"مرحبا بفتاة الميلاد "}
        </h1>

        <p className="font-arabic mt-2 text-xl text-rose-900/65 sm:text-2xl">
          خبّأتُ لكِ شيئًا يشبه جمال قلبكِ
        </p>
      </motion.header>

      {/* Separate wrappers keep floating, shaking, and fading independent. */}
      <motion.div
        className="relative z-10 w-full max-w-sm"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isUnlocking ? 0 : 1,
          y: isUnlocking && !reduceMotion ? -12 : 0,
          scale: isUnlocking && !reduceMotion ? 0.96 : 1,
        }}
        transition={{
          duration: reduceMotion ? 0.15 : 0.6,
          ease: "easeOut",
        }}
      >
        <motion.div
          animate={{
            y: reduceMotion || isUnlocking ? 0 : [0, -7, 0],
          }}
          transition={{
            duration: reduceMotion ? 0 : 6,
            repeat: reduceMotion || isUnlocking ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.form
            ref={formRef}
            tabIndex={0}
            aria-label="مفتاح المفاجأة"
            aria-describedby={`${instructionsId} ${feedbackId}`}
            onKeyDown={handleKeyDown}
            onSubmit={(event) => {
              event.preventDefault();
              submitPin();
            }}
            animate={shakeControls}
            className="relative rounded-[2rem] border border-white/70 bg-white/30 p-6 shadow-[0_25px_80px_-25px_rgba(157,42,94,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] outline-none backdrop-blur-2xl focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-rose-200/50 sm:p-7"
          >
            <div dir="rtl" className="text-center">
              <p className="font-arabic text-2xl text-rose-900/80">
                مفتاح المفاجأة
              </p>
              <p
                id={instructionsId}
                className="font-arabic mt-1 text-base text-rose-900/65"
              >
                أربعة أرقام… وتبدأ الحكاية
              </p>
            </div>

            {/* Only the number of entered digits is announced. */}
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="mt-6"
            >
              <span className="sr-only">
                {`تم إدخال ${pin.length} من ${PIN_LENGTH} أرقام`}
              </span>

              <div
                aria-hidden="true"
                dir="ltr"
                className="flex justify-center gap-3"
              >
                {Array.from({ length: PIN_LENGTH }, (_, index) => {
                  const filled = index < pin.length;

                  return (
                    <div
                      key={index}
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors duration-200 ${
                        error
                          ? "border-rose-400/60 bg-rose-100/40"
                          : "border-white/70 bg-white/30"
                      }`}
                    >
                      <motion.span
                        animate={{
                          scale: filled ? 1 : 0.8,
                          opacity: filled ? 1 : 0.4,
                        }}
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                stiffness: 420,
                                damping: 20,
                              }
                        }
                        className={`text-3xl leading-none ${
                          filled
                            ? "text-rose-500 drop-shadow-[0_2px_8px_rgba(244,63,94,0.3)]"
                            : "text-rose-400"
                        }`}
                      >
                        {filled ? "♥" : "♡"}
                      </motion.span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p
              id={feedbackId}
              role="status"
              aria-live="polite"
              aria-atomic="true"
              dir="rtl"
              className={`font-arabic my-3 min-h-7 text-center text-base leading-7 ${
                error ? "text-rose-800" : "text-rose-900/65"
              }`}
            >
              {error ??
                (isUnlocking ? "كل عام وأنتِ أجمل أقداري ♡" : "\u00A0")}
            </p>

            <fieldset
              disabled={isUnlocking}
              dir="ltr"
              lang="en"
              className="m-0 grid min-w-0 grid-cols-3 gap-3 border-0 p-0"
            >
              <legend className="sr-only">PIN keypad</legend>

              {KEYS.map((key) => {
                const isEnter = key === "enter";
                const isClear = key === "clear";
                const disabled =
                  isUnlocking || (isEnter && pin.length !== PIN_LENGTH);

                return (
                  <motion.button
                    key={key}
                    type={isEnter ? "submit" : "button"}
                    disabled={disabled}
                    aria-label={
                      isClear ? "Clear PIN" : isEnter ? "Enter PIN" : key
                    }
                    onClick={
                      isEnter
                        ? undefined
                        : () => {
                            if (isClear) clearPin();
                            else appendDigit(key);
                          }
                    }
                    whileHover={
                      reduceMotion || disabled
                        ? undefined
                        : { y: -2, scale: 1.025 }
                    }
                    whileTap={
                      reduceMotion || disabled ? undefined : { scale: 0.94 }
                    }
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 24,
                    }}
                    className={`flex h-14 touch-manipulation items-center justify-center rounded-2xl border font-medium shadow-[0_4px_12px_rgba(157,42,94,0.06)] outline-none transition-colors duration-200 select-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-pink-100 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isEnter
                        ? "border-rose-400/40 bg-rose-500 text-sm text-white enabled:hover:bg-rose-600"
                        : isClear
                          ? "border-white/65 bg-white/25 text-sm text-rose-900/80 enabled:hover:bg-white/50"
                          : "border-white/70 bg-white/40 text-2xl text-rose-950/80 tabular-nums enabled:hover:bg-white/65"
                    }`}
                  >
                    {isClear ? "Clear" : isEnter ? "Enter" : key}
                  </motion.button>
                );
              })}
            </fieldset>

            <p
              dir="rtl"
              className="font-arabic mt-5 text-center text-sm text-rose-900/60"
            >
              صُنعت هذه اللحظة من أجلكِ وحدكِ
            </p>
          </motion.form>
        </motion.div>
      </motion.div>

      <motion.p
        dir="rtl"
        className="font-arabic relative z-10 text-center text-lg text-rose-900/60"
        animate={{ opacity: isUnlocking ? 0 : 1 }}
        transition={{ duration: 0.25 }}
      >
        أنتِ أجمل أسباب الفرح ♡
      </motion.p>

      {/* Notify the parent only after the glow completely covers the gate. */}
      {isUnlocking && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-30 bg-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            duration: reduceMotion ? 0.18 : 1.15,
            delay: reduceMotion ? 0 : 0.15,
            ease: "easeInOut",
          }}
          onAnimationComplete={finishUnlock}
        />
      )}
    </section>
  );
}
