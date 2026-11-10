"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Amiri, Aref_Ruqaa } from "next/font/google";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";

const envelopeFont = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const handwritingFont = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
});

// Replace this with your message; use a template literal for multiple lines.
const loveLetter = "الى أجمل غيداء بالكون";

const EASE = [0.22, 1, 0.36, 1] as const;
const FIRST_HOLD_MS = 3_000;
const SECOND_HOLD_MS = 5_000;
const PHOTO_HOLD_MS = 650;

type Phase =
  | "anticipation"
  | "writing"
  | "envelope"
  | "opening"
  | "photo"
  | "paper"
  | "letter";

type DownloadStatus = "idle" | "saving" | "started" | "error";

const hearts = [
  { left: "9%", top: "19%", size: 22 },
  { left: "84%", top: "13%", size: 30 },
  { left: "16%", top: "76%", size: 26 },
  { left: "88%", top: "71%", size: 19 },
  { left: "72%", top: "88%", size: 24 },
] as const;

function NotebookPaper({
  compact = false,
  paperRef,
  id,
}: {
  compact?: boolean;
  paperRef?: RefObject<HTMLDivElement | null>;
  id?: string;
}) {
  return (
    <div
      ref={paperRef}
      id={id}
      dir="rtl"
      lang="ar"
      role={compact ? undefined : "article"}
      aria-label={compact ? undefined : "رسالة حب ليكي"}
      aria-hidden={compact || undefined}
      tabIndex={compact ? undefined : -1}
      className={`${handwritingFont.className} grand-reveal-notebook ${
        compact ? "grand-reveal-notebook-compact" : ""
      }`}
    >
      <div className="grand-reveal-paper-grain" aria-hidden="true" />
      <div className="grand-reveal-paper-margin" aria-hidden="true" />
      {["18%", "50%", "82%"].map((top) => (
        <span
          key={top}
          className="grand-reveal-paper-hole"
          style={{ top }}
          aria-hidden="true"
        />
      ))}
      <div className="grand-reveal-paper-content">
        <p className="grand-reveal-letter-heading">إلى حبيبتي ♡</p>
        <p className="grand-reveal-letter-message">{loveLetter}</p>
        <p className="grand-reveal-letter-signature">بكل حبي ♡</p>
      </div>
    </div>
  );
}

export default function GrandReveal() {
  const reduceMotion = useReducedMotion();
  const letterId = useId();
  const paperRef = useRef<HTMLDivElement>(null);
  const envelopeButtonRef = useRef<HTMLButtonElement>(null);
  const mountedRef = useRef(false);
  const downloadLockRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("anticipation");
  const [writingVisible, setWritingVisible] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [letterReady, setLetterReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [downloadStatus, setDownloadStatus] =
    useState<DownloadStatus>("idle");

  const fadeDuration = reduceMotion ? 0 : 0.65;
  const flapDuration = reduceMotion ? 0 : 0.85;
  const extractionDuration = reduceMotion ? 0 : 1;
  const expansionDuration = reduceMotion ? 0 : 1;
  const sealed = phase === "envelope";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Each hold belongs to its visible phase. AnimatePresence waits for the
  // preceding exit, and writingVisible starts the second hold after entry.
  // Cleanup also prevents duplicate timers in React Strict Mode.
  useEffect(() => {
    let next: Phase;
    let hold: number;

    if (phase === "anticipation") {
      next = "writing";
      hold = FIRST_HOLD_MS;
    } else if (phase === "writing" && writingVisible) {
      next = "envelope";
      hold = SECOND_HOLD_MS;
    } else if (phase === "photo" && photoVisible) {
      next = "paper";
      hold = PHOTO_HOLD_MS;
    } else {
      return;
    }

    const timer = window.setTimeout(() => {
      setPhase((current) => (current === phase ? next : current));
    }, hold);

    return () => window.clearTimeout(timer);
  }, [phase, writingVisible, photoVisible]);

  useEffect(() => {
    if (letterReady) paperRef.current?.focus({ preventScroll: true });
  }, [letterReady]);

  const textVariants: Variants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: fadeDuration, ease: EASE },
    },
    exit: {
      opacity: 0,
      y: reduceMotion ? 0 : -10,
      transition: { duration: fadeDuration, ease: EASE },
    },
  };

  const flapVariants: Variants = {
    closed: { rotateX: 0, zIndex: 30 },
    open: {
      rotateX: -180,
      zIndex: 5,
      transition: {
        duration: flapDuration,
        ease: EASE,
        zIndex: { duration: 0, delay: flapDuration / 2 },
      },
    },
  };

  const photoVariants: Variants = {
    hidden: { opacity: 0, x: "-50%", y: 0, rotate: 0, scale: 0.78 },
    visible: {
      opacity: 1,
      x: "-50%",
      y: "-106%",
      rotate: -7,
      scale: 1,
      transition: { duration: extractionDuration, ease: EASE },
    },
    aside: {
      opacity: 0.85,
      x: "-91%",
      y: "-108%",
      rotate: -15,
      scale: 0.88,
      transition: { duration: reduceMotion ? 0 : 0.65, ease: EASE },
    },
  };

  async function downloadLetter() {
    const paper = paperRef.current;
    if (!paper || !letterReady || downloadLockRef.current) return;

    downloadLockRef.current = true;
    setDownloadStatus("saving");

    try {
      // Load the exporter only when requested, and wait for Arabic glyphs.
      const [{ default: html2canvas }] = await Promise.all([
        import("html2canvas"),
        document.fonts.ready,
      ]);

      if (!mountedRef.current || !paper.isConnected) return;

      const width = Math.max(paper.offsetWidth, paper.scrollWidth);
      const height = Math.max(paper.offsetHeight, paper.scrollHeight);
      if (!width || !height) throw new Error("The letter has no dimensions.");

      // Keep long letters within practical mobile canvas limits.
      const scale = Math.min(
        2,
        8_192 / width,
        8_192 / height,
        Math.sqrt(16_000_000 / (width * height)),
      );

      const canvas = await html2canvas(paper, {
        backgroundColor: null,
        width,
        height,
        scale,
        useCORS: true,
        logging: false,
        onclone: (clonedDocument) => {
          const clonedPaper = clonedDocument.getElementById(letterId);
          if (!clonedPaper) return;

          clonedPaper.style.outline = "none";
          clonedPaper.style.boxShadow = "none";
          clonedPaper.style.maxHeight = "none";
          clonedPaper.style.overflow = "visible";

          // Shared-layout transforms belong to the animation, not the PNG.
          let element: HTMLElement | null = clonedPaper;
          while (element) {
            element.style.transform = "none";
            element.style.animation = "none";
            element.style.transition = "none";
            element.style.opacity = "1";
            element = element.parentElement;
          }
        },
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("PNG export failed."));
        }, "image/png");
      });

      if (!mountedRef.current) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "رسالة-حبي.png";
      link.style.display = "none";
      document.body.appendChild(link);

      try {
        link.click();
      } finally {
        link.remove();
        // Delay revocation so mobile browsers can consume the download.
        window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }

      setDownloadStatus("started");
    } catch {
      if (mountedRef.current) setDownloadStatus("error");
    } finally {
      downloadLockRef.current = false;
    }
  }

  return (
    <section
      dir="rtl"
      lang="ar"
      aria-label="مفاجأة عيد ميلادك"
      className={`${envelopeFont.className} grand-reveal relative isolate min-h-[100svh] w-full overflow-hidden`}
    >
      <div
        className="grand-reveal-background pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {hearts.map((heart, index) => (
          <motion.span
            key={heart.left}
            className="absolute select-none"
            style={{
              left: heart.left,
              top: heart.top,
              fontSize: heart.size,
              color: "#ca9b91",
            }}
            initial={{ opacity: 0.25 }}
            animate={
              reduceMotion
                ? { opacity: 0.25 }
                : { y: [0, -14, 0], opacity: [0.2, 0.45, 0.2] }
            }
            transition={{
              duration: 6 + index,
              delay: index * 0.4,
              repeat: reduceMotion ? 0 : Infinity,
              ease: "easeInOut",
            }}
          >
            ♡
          </motion.span>
        ))}
      </div>

      {/* The first text is visible at mount, without an entrance delay. */}
      <AnimatePresence mode="wait" initial={false}>
        {phase === "anticipation" || phase === "writing" ? (
          <motion.div
            key={phase}
            variants={textVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onAnimationComplete={(definition) => {
              if (definition === "visible" && phase === "writing") {
                setWritingVisible(true);
              }
            }}
            className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-16 text-center"
          >
            <span className="grand-reveal-ornament mb-6" aria-hidden="true">
              ── ♡ ──
            </span>
            <p
              role="status"
              aria-live="polite"
              className="grand-reveal-anticipation max-w-2xl"
            >
              {phase === "anticipation"
                ? "خلاص انتهت الحركات يا سكرو و حيبدأ الأحتفال"
                : "خليك ثانية بس الرسالة بتتكتب حبي"}
            </p>
            {phase === "writing" && (
              <div className="mt-8 flex gap-2" aria-hidden="true">
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "#bf9455" }}
                    animate={
                      reduceMotion
                        ? { opacity: 0.6 }
                        : { opacity: [0.3, 1, 0.3], y: [0, -4, 0] }
                    }
                    transition={{
                      duration: 1.4,
                      delay: dot * 0.2,
                      repeat: reduceMotion ? 0 : Infinity,
                    }}
                  />
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: fadeDuration }}
            className="relative grid min-h-[100svh] w-full place-items-center px-4 py-24 sm:px-8"
          >
            <AnimatePresence mode="sync">
              {phase !== "letter" ? (
                <motion.div
                  key="envelope"
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 70 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : 70 }}
                  transition={{ duration: reduceMotion ? 0 : 0.85, ease: EASE }}
                  onAnimationComplete={() => {
                    if (sealed) {
                      envelopeButtonRef.current?.focus({ preventScroll: true });
                    }
                  }}
                  className="relative w-[min(82vw,23rem)] [grid-area:1/1]"
                >
                  <motion.div
                    className="grand-reveal-envelope relative aspect-[3/2] w-full"
                    animate={
                      sealed && !reduceMotion
                        ? { y: [0, -5, 0], scale: [1, 1.012, 1] }
                        : { y: 0, scale: 1 }
                    }
                    transition={{
                      duration: sealed && !reduceMotion ? 3 : 0.25,
                      repeat: sealed && !reduceMotion ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="grand-reveal-envelope-back" aria-hidden="true" />

                    <motion.div
                      className="grand-reveal-polaroid"
                      variants={photoVariants}
                      initial="hidden"
                      animate={
                        phase === "photo"
                          ? "visible"
                          : phase === "paper"
                            ? "aside"
                            : "hidden"
                      }
                      onAnimationComplete={(definition) => {
                        if (definition === "visible") setPhotoVisible(true);
                      }}
                      aria-hidden={phase !== "photo" && phase !== "paper"}
                    >
                      <div className="grand-reveal-photo-frame">
                        {photoFailed ? (
                          <div className="grand-reveal-photo-fallback" role="img" aria-label="حبيبتي">
                            ♡
                          </div>
                        ) : (
                          // A normal img is intentional: replace this local placeholder.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src="/her-photo.jpg"
                            alt="صورتك الجميلة"
                            width={240}
                            height={280}
                            loading="eager"
                            decoding="async"
                            draggable={false}
                            onError={() => setPhotoFailed(true)}
                          />
                        )}
                      </div>
                      <p className={handwritingFont.className}>حبيبتي ♡</p>
                    </motion.div>

                    {phase === "paper" && (
                      <motion.div
                        layoutId={letterId}
                        className="grand-reveal-paper-preview"
                        initial={{ opacity: 0, y: 0, scale: 0.78, rotate: 0 }}
                        animate={{
                          opacity: 1,
                          y: reduceMotion ? 0 : "-116%",
                          scale: 1,
                          rotate: reduceMotion ? 0 : 3,
                        }}
                        transition={{ duration: extractionDuration, ease: EASE }}
                        onAnimationComplete={() => {
                          setPhase((current) => (current === "paper" ? "letter" : current));
                        }}
                      >
                        <NotebookPaper compact />
                      </motion.div>
                    )}

                    <div className="grand-reveal-envelope-front" aria-hidden="true" />
                    <div className="grand-reveal-envelope-left" aria-hidden="true" />
                    <div className="grand-reveal-envelope-right" aria-hidden="true" />
                    <div className="grand-reveal-envelope-bottom" aria-hidden="true" />

                    <motion.div
                      className="grand-reveal-envelope-flap"
                      variants={flapVariants}
                      initial="closed"
                      animate={sealed ? "closed" : "open"}
                      onAnimationComplete={(definition) => {
                        if (definition === "open") {
                          setPhase((current) => (current === "opening" ? "photo" : current));
                        }
                      }}
                      aria-hidden="true"
                    >
                      <div className="grand-reveal-flap-face" />
                      <div className="grand-reveal-flap-lining" />
                    </motion.div>

                    <motion.button
                      ref={envelopeButtonRef}
                      type="button"
                      disabled={!sealed}
                      aria-label="أفتحي يا سكر، افتحي الظرف لقراءة الرسالة"
                      aria-expanded={!sealed}
                      className="grand-reveal-open-button absolute inset-0 z-40 flex flex-col items-center justify-end gap-3 rounded-lg pb-6 sm:pb-7"
                      animate={{ opacity: sealed ? 1 : 0 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2 }}
                      onClick={() => {
                        setPhase((current) => (current === "envelope" ? "opening" : current));
                      }}
                      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                    >
                      <motion.span
                        className="grand-reveal-wax-seal"
                        aria-hidden="true"
                        animate={
                          sealed && !reduceMotion
                            ? { scale: [1, 1.06, 1] }
                            : { scale: 1 }
                        }
                        transition={{ duration: 2.6, repeat: sealed && !reduceMotion ? Infinity : 0 }}
                      >
                        ♡
                      </motion.span>
                      <span className="text-2xl sm:text-3xl">أفتحي يا سكر</span>
                    </motion.button>
                  </motion.div>
                </motion.div>
              ) : (
                <div
                  key="letter"
                  className="relative z-50 flex w-full max-w-[40rem] flex-col items-center [grid-area:1/1]"
                >
                  <motion.div
                    layoutId={letterId}
                    className="w-full"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    transition={{
                      duration: expansionDuration,
                      ease: EASE,
                      layout: { duration: expansionDuration, ease: EASE },
                    }}
                    onAnimationComplete={() => setLetterReady(true)}
                  >
                    <NotebookPaper paperRef={paperRef} id={letterId} />
                  </motion.div>

                  {/* Reserve space so the paper stays still when the button appears. */}
                  <div className="flex min-h-[100px] w-full items-end justify-center pt-7">
                    {letterReady && (
                      <motion.button
                        type="button"
                        onClick={downloadLetter}
                        disabled={downloadStatus === "saving"}
                        aria-busy={downloadStatus === "saving"}
                        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE }}
                        whileHover={reduceMotion ? undefined : { y: -2, scale: 1.02 }}
                        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                        className="grand-reveal-download rounded-full px-6 py-4 text-center text-lg leading-relaxed transition-shadow disabled:cursor-wait disabled:opacity-70 sm:px-8 sm:text-xl"
                      >
                        {downloadStatus === "saving"
                          ? "لحظة يا حبي… بنجهز الرسالة"
                          : "📥 حملي الرسالة عشان تفضل معاكي"}
                      </motion.button>
                    )}
                  </div>
                  <p
                    role="status"
                    aria-live="polite"
                    className="mt-3 min-h-7 text-center text-base"
                    style={{ color: downloadStatus === "error" ? "#a13e52" : "#9b735b" }}
                  >
                    {downloadStatus === "error"
                      ? "حصلت مشكلة في التحميل، جربي تاني يا حبي."
                      : downloadStatus === "started"
                        ? "بدأ تحميل الرسالة ♡"
                        : ""}
                  </p>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .grand-reveal {
          background: #fff8f3;
          color: #8b5e53;
        }
        .grand-reveal-background {
          background:
            radial-gradient(ellipse at 12% 18%, #f8dde2 0%, transparent 54%),
            radial-gradient(ellipse at 88% 82%, #f5e7cb 0%, transparent 50%),
            radial-gradient(ellipse at 50% 42%, #fffdf9 0%, #fff5f1 74%);
        }
        .grand-reveal-ornament {
          color: #c79b59;
          font-size: 22px;
          letter-spacing: 0.16em;
        }
        .grand-reveal-anticipation {
          margin: 0;
          color: #b27b2d;
          font-size: clamp(1.8rem, 5vw, 3rem);
          line-height: 1.85;
          text-wrap: balance;
          text-shadow: 0 0 22px #eac58c80, 0 2px 1px #ffffff;
        }
        .grand-reveal-envelope {
          perspective: 1200px;
          isolation: isolate;
        }
        .grand-reveal-envelope-back,
        .grand-reveal-envelope-front,
        .grand-reveal-envelope-left,
        .grand-reveal-envelope-right,
        .grand-reveal-envelope-bottom,
        .grand-reveal-envelope-flap,
        .grand-reveal-flap-face,
        .grand-reveal-flap-lining {
          position: absolute;
          inset: 0;
          border-radius: 7px;
        }
        .grand-reveal-envelope-back {
          z-index: 0;
          background: linear-gradient(145deg, #e7afb9, #f4cbd1);
          border: 1px solid #dca3ad;
          box-shadow: 0 24px 60px #aa687530, 0 6px 18px #aa68751c;
        }
        .grand-reveal-envelope-front {
          z-index: 20;
          clip-path: polygon(0 0, 50% 55%, 100% 0, 100% 100%, 0 100%);
          background: #f6d0d6;
        }
        .grand-reveal-envelope-left {
          z-index: 21;
          clip-path: polygon(0 0, 52% 56%, 0 100%);
          background: linear-gradient(110deg, #f7d3d9, #eebcc6);
        }
        .grand-reveal-envelope-right {
          z-index: 21;
          clip-path: polygon(100% 0, 48% 56%, 100% 100%);
          background: linear-gradient(250deg, #f9d8dd, #edbac4);
        }
        .grand-reveal-envelope-bottom {
          z-index: 22;
          clip-path: polygon(0 100%, 50% 49%, 100% 100%);
          background: linear-gradient(180deg, #f7ced5, #f9dce1);
        }
        .grand-reveal-envelope-flap {
          transform-origin: 50% 0%;
          transform-style: preserve-3d;
          pointer-events: none;
        }
        .grand-reveal-flap-face,
        .grand-reveal-flap-lining {
          clip-path: polygon(0 0, 100% 0, 50% 56%);
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .grand-reveal-flap-face {
          background: linear-gradient(180deg, #fbe0e4, #efbbc6);
        }
        .grand-reveal-flap-lining {
          clip-path: polygon(0 100%, 100% 100%, 50% 44%);
          transform: rotateX(180deg);
          background: linear-gradient(180deg, #efc3cb, #fde8eb);
        }
        .grand-reveal-open-button {
          color: #9e6155;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .grand-reveal-open-button:disabled {
          cursor: default;
          pointer-events: none;
        }
        .grand-reveal-open-button:focus-visible {
          outline: 2px solid #b88d43;
          outline-offset: 8px;
        }
        .grand-reveal-wax-seal {
          display: grid;
          width: 52px;
          height: 52px;
          place-items: center;
          border: 1px solid #d692a0;
          border-radius: 50%;
          background: radial-gradient(circle at 32% 26%, #edb2be, #cd8294);
          box-shadow: inset 0 0 0 4px #e6a3b2, inset 0 0 0 5px #c98595,
            0 3px 8px #95546426;
          color: #fff0e7;
          font-family: Georgia, serif;
          font-size: 30px;
          line-height: 1;
        }
        .grand-reveal-polaroid {
          position: absolute;
          z-index: 12;
          top: 4%;
          left: 50%;
          width: 54%;
          padding: 9px 9px 0;
          background: #fffdfa;
          border: 1px solid #ede3d8;
          box-shadow: 0 10px 24px #70453b26;
          transform-origin: 50% 85%;
        }
        .grand-reveal-photo-frame {
          aspect-ratio: 6 / 7;
          overflow: hidden;
          background: #f4dce1;
        }
        .grand-reveal-photo-frame img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .grand-reveal-photo-fallback {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          background: radial-gradient(circle, #fff1ed, #ebc3ce);
          color: #bc7e8d;
          font-size: 58px;
        }
        .grand-reveal-polaroid p {
          margin: 0;
          padding: 5px 0 9px;
          color: #966e67;
          font-size: 18px;
          line-height: 1.6;
          text-align: center;
        }
        .grand-reveal-paper-preview {
          position: absolute;
          z-index: 14;
          top: 5%;
          left: 14%;
          width: 72%;
          height: 90%;
          transform-origin: 50% 100%;
        }
        /* Hex/RGB colors and tiled linear gradients also render in html2canvas.
           The red margin uses physical left positioning, even in RTL. */
        .grand-reveal-notebook {
          --rule-gap: 36px;
          position: relative;
          box-sizing: border-box;
          width: 100%;
          min-height: 396px;
          padding: 55px 28px 40px 68px;
          overflow: hidden;
          border: 1px solid #e5dac5;
          border-radius: 4px 7px 6px 3px;
          background-color: #fffdf2;
          background-image: linear-gradient(
            to bottom,
            transparent 35px,
            #abc4d45e 35px,
            #abc4d45e 36px
          );
          background-size: 100% var(--rule-gap);
          background-position: 0 14px;
          background-repeat: repeat;
          color: #594844;
          box-shadow: 0 24px 65px #775c4226, 0 4px 14px #775c4212;
          font-size: clamp(1.25rem, 3.4vw, 1.6rem);
          line-height: var(--rule-gap);
          text-align: right;
          outline-offset: 6px;
        }
        .grand-reveal-notebook:focus-visible {
          outline: 2px solid #d3ac6e;
        }
        .grand-reveal-paper-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(#b5986130 0.5px, transparent 0.7px),
            linear-gradient(110deg, #e5d7b814, #ffffff36 45%, #ddc99e14);
          background-size: 5px 5px, 100% 100%;
          opacity: 0.35;
        }
        .grand-reveal-paper-margin {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 48px;
          width: 1px;
          background: #d990958c;
          box-shadow: 3px 0 0 #d9909526;
        }
        .grand-reveal-paper-hole {
          position: absolute;
          left: 17px;
          width: 12px;
          height: 12px;
          border: 1px solid #d7c9b5;
          border-radius: 50%;
          background: #f6e9e3;
          box-shadow: inset 0 1px 3px #745d4833, 0 1px 0 #ffffff;
        }
        .grand-reveal-paper-content {
          position: relative;
          z-index: 1;
        }
        .grand-reveal-letter-heading,
        .grand-reveal-letter-message,
        .grand-reveal-letter-signature {
          margin: 0;
          line-height: var(--rule-gap);
        }
        .grand-reveal-letter-heading {
          margin-bottom: var(--rule-gap);
          color: #99695f;
          font-size: 1.08em;
        }
        .grand-reveal-letter-message {
          min-height: calc(var(--rule-gap) * 4);
          white-space: pre-wrap;
          overflow-wrap: anywhere;
          unicode-bidi: plaintext;
        }
        .grand-reveal-letter-signature {
          margin-top: var(--rule-gap);
          color: #99695f;
        }
        .grand-reveal-notebook-compact {
          height: 100%;
          min-height: 0;
          padding: 19px 16px 15px 55px;
          font-size: 14px;
        }
        .grand-reveal-notebook-compact .grand-reveal-letter-heading {
          margin-bottom: 0;
        }
        .grand-reveal-notebook-compact .grand-reveal-letter-signature {
          display: none;
        }
        .grand-reveal-download {
          border: 1px solid #e2b77d;
          background: linear-gradient(120deg, #c28c44, #dcad69 55%, #bd843e);
          color: #fffdf8;
          box-shadow: 0 0 24px #e5b66b59, 0 8px 22px #a7783d26,
            inset 0 1px 0 #fff9e85c;
          cursor: pointer;
          text-shadow: 0 1px 1px #865c3833;
          -webkit-tap-highlight-color: transparent;
        }
        .grand-reveal-download:hover {
          box-shadow: 0 0 32px #e5b66b80, 0 10px 24px #a7783d33;
        }
        .grand-reveal-download:focus-visible {
          outline: 2px solid #b7853e;
          outline-offset: 5px;
        }
        @media (max-width: 420px) {
          .grand-reveal-notebook {
            padding-right: 19px;
            padding-left: 59px;
          }
          .grand-reveal-paper-margin {
            left: 41px;
          }
          .grand-reveal-paper-hole {
            left: 13px;
            width: 10px;
            height: 10px;
          }
          .grand-reveal-notebook-compact {
            padding-right: 12px;
            padding-left: 49px;
          }
        }
      `}</style>
    </section>
  );
}
