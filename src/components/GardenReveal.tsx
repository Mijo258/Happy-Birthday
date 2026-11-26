"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Amiri, Aref_Ruqaa } from "next/font/google";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GARDEN_PHOTOS, type GardenPhotoItem } from "@/data/gardenGallery";
import type { GardenControls } from "./GardenCanvas";

const gardenFont = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const captionFont = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
});

const GardenCanvas = dynamic(() => import("./GardenCanvas"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#f9d5c7,#9a665d_70%,#3e302c)] text-xl text-[#fff8e8]">
      <motion.p
        initial={{ opacity: 0.35 }}
        animate={{ opacity: [0.35, 1, 0.35] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      >
        نفتح لك أبواب الحديقة 🌸
      </motion.p>
    </div>
  ),
});

interface GardenRevealProps {
  musicPlaying: boolean;
  musicMuted: boolean;
  musicUnavailable: boolean;
  onToggleMusic: () => void;
  onToggleMute: () => void;
  onBackToLetter: () => void;
}

const INITIAL_CONTROLS: GardenControls = {
  forward: false,
  backward: false,
  lookLeft: false,
  lookRight: false,
  autoStroll: false,
};

function WebGLFallbackCard({
  item,
  onOpen,
}: {
  item: GardenPhotoItem;
  onOpen: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group rotate-[var(--card-rotate)] rounded-sm bg-[#fffaf0] p-2 pb-4 text-right shadow-[0_18px_45px_#4d262d35] transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e8bd78]"
      style={{ "--card-rotate": `${item.id % 2 ? -1.2 : 1.2}deg` } as React.CSSProperties}
    >
      <span className="block aspect-[4/5] overflow-hidden bg-[radial-gradient(circle,#f9ded4,#c48683)]">
        {failed ? (
          <span className="grid h-full place-items-center text-center text-[#8b5a55]">
            <span>
              <span className="block text-5xl text-[#c89958]">♡</span>
              صورة قادمة قريبًا
            </span>
          </span>
        ) : (
          // Local user-provided files intentionally use a normal img element.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt={item.caption ?? `صورة الذكرى ${item.id}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
      </span>
      <span className={`${captionFont.className} mt-3 block text-lg text-[#80534d]`}>
        {item.caption}
      </span>
    </button>
  );
}

function LightboxPhoto({ item }: { item: GardenPhotoItem }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="grid h-[min(64svh,46rem)] w-full place-items-center rounded-2xl bg-[radial-gradient(circle_at_50%_35%,#fff9e8,#e8b6ae)] text-center text-[#7e514d]">
        <div>
          <div className="text-7xl text-[#bd8a4d]">♡</div>
          <p className={`${captionFont.className} mt-3 text-2xl`}>صورة قادمة قريبًا</p>
        </div>
      </div>
    );
  }

  return (
    // Local user-provided files intentionally use a normal img element.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.caption ?? `صورة الذكرى ${item.id}`}
      className="max-h-[min(64svh,46rem)] w-full rounded-2xl bg-[#2c201e] object-contain"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

export default function GardenReveal({
  musicPlaying,
  musicMuted,
  musicUnavailable,
  onToggleMusic,
  onToggleMute,
  onBackToLetter,
}: GardenRevealProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [controls, setControls] = useState<GardenControls>(INITIAL_CONTROLS);
  const [progress, setProgress] = useState({ value: 0, nearest: 0 });
  const [showHint, setShowHint] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const context = (
        canvas.getContext("webgl2") ??
        canvas.getContext("webgl") ??
        canvas.getContext("experimental-webgl")
      ) as WebGL2RenderingContext | WebGLRenderingContext | null;
      setWebglSupported(Boolean(context));
      const loseContext = context?.getExtension("WEBGL_lose_context");
      loseContext?.loseContext();
    } catch {
      setWebglSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!showHint) return;
    const timer = window.setTimeout(() => setShowHint(false), 6_000);
    return () => window.clearTimeout(timer);
  }, [showHint]);

  const openPhoto = useCallback((item: GardenPhotoItem) => {
    const index = GARDEN_PHOTOS.findIndex((photo) => photo.id === item.id);
    if (index >= 0) setSelectedIndex(index);
  }, []);

  const moveSelection = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => {
      if (current === null || GARDEN_PHOTOS.length === 0) return current;
      return (current + direction + GARDEN_PHOTOS.length) % GARDEN_PHOTOS.length;
    });
  }, []);

  useEffect(() => {
    if (selectedIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIndex(null);
      if (event.key === "ArrowLeft") moveSelection(1);
      if (event.key === "ArrowRight") moveSelection(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveSelection, selectedIndex]);

  const selectedPhoto =
    selectedIndex === null ? null : GARDEN_PHOTOS[selectedIndex] ?? null;

  const progressLabel = useMemo(() => {
    if (GARDEN_PHOTOS.length === 0) return "0 / 0";
    return `${Math.min(progress.nearest + 1, GARDEN_PHOTOS.length)} / ${GARDEN_PHOTOS.length}`;
  }, [progress.nearest]);

  const setHeldControl = useCallback(
    (key: "forward" | "backward" | "lookLeft" | "lookRight", active: boolean) => {
      setControls((current) => ({ ...current, [key]: active }));
      if (active) setShowHint(false);
    },
    [],
  );

  const holdHandlers = (
    key: "forward" | "backward" | "lookLeft" | "lookRight",
  ) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeldControl(key, true);
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setHeldControl(key, false);
    },
    onPointerLeave: () => setHeldControl(key, false),
    onPointerCancel: () => setHeldControl(key, false),
  });

  return (
    <section
      dir="rtl"
      lang="ar"
      aria-label="حديقة ذكرياتنا التفاعلية"
      className={`${gardenFont.className} relative h-[100svh] w-full overflow-hidden bg-[#302923] text-[#fff9ea]`}
    >
      {webglSupported === null && (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_35%,#f6c9bd,#8c5f58_70%,#302923)] text-xl">
          نفتح لك أبواب الحديقة 🌸
        </div>
      )}

      {webglSupported === true && (
        <GardenCanvas
          controls={controls}
          reducedMotion={reduceMotion}
          onSelectPhoto={openPhoto}
          onProgressChange={(value, nearest) => setProgress({ value, nearest })}
          onInteraction={() => setShowHint(false)}
          onFatalError={() => setWebglSupported(false)}
        />
      )}

      {webglSupported === false && (
        <div className="h-full overflow-y-auto bg-[radial-gradient(circle_at_50%_5%,#f6d6c8,#986762_45%,#3c302b)] px-4 pb-28 pt-28 sm:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-lg text-[#fff2dc]">
              تعذّر تشغيل الحديقة ثلاثية الأبعاد، لكن ذكرياتنا ما زالت هنا ♡
            </p>
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {GARDEN_PHOTOS.map((item) => (
                <WebGLFallbackCard
                  key={item.id}
                  item={item}
                  onOpen={() => openPhoto(item)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-2 bg-gradient-to-b from-[#231714a8] to-transparent px-3 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="pointer-events-auto flex min-w-0 items-center gap-2">
          <div className="rounded-full border border-[#ffe6bd3d] bg-[#4d342f99] px-3 py-2 shadow-lg backdrop-blur-md sm:px-4">
            <span className="whitespace-nowrap text-sm sm:text-base">حديقة ذكرياتنا 🌸</span>
          </div>
          <div
            className="rounded-full border border-[#ffe6bd2f] bg-[#4d342f8f] px-3 py-2 text-xs tabular-nums backdrop-blur-md sm:text-sm"
            aria-label={`التقدم ${Math.round(progress.value * 100)} بالمئة`}
          >
            {progressLabel}
          </div>
        </div>

        <div className="pointer-events-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center rounded-full border border-[#ffe6bd35] bg-[#4d342fa8] p-1 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={onToggleMusic}
              disabled={musicUnavailable}
              aria-label={
                musicUnavailable
                  ? "ملف الموسيقى غير متاح"
                  : musicPlaying
                    ? "إيقاف الموسيقى"
                    : "تشغيل الموسيقى"
              }
              aria-pressed={musicPlaying}
              className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {musicUnavailable ? "♫×" : musicPlaying ? "❚❚" : "▶"}
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              disabled={musicUnavailable}
              aria-label={musicMuted ? "إلغاء كتم الموسيقى" : "كتم الموسيقى"}
              aria-pressed={musicMuted}
              className="grid h-9 min-w-9 place-items-center rounded-full px-2 text-sm transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {musicMuted ? "🔇" : "🔊"}
            </button>
          </div>
          <button
            type="button"
            onClick={onBackToLetter}
            className="rounded-full border border-[#ffe6bd40] bg-[#4d342fa8] px-3 py-2 text-xs shadow-lg backdrop-blur-md transition-colors hover:bg-[#6b4942c4] sm:px-4 sm:text-sm"
          >
            العودة للرسالة
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showHint && webglSupported === true && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : 0.45 }}
            className="pointer-events-none absolute left-1/2 top-24 z-20 w-[min(90vw,36rem)] -translate-x-1/2 rounded-2xl border border-[#ffe5bd35] bg-[#49312ca8] px-4 py-3 text-center text-sm leading-7 text-[#fff7e7] shadow-xl backdrop-blur-md sm:text-base"
            role="status"
          >
            اسحبي يمينًا ويسارًا للتلفت حول الصور، وتقدمي داخل الحديقة واضغطي على أي صورة لتكبيرها 🌸
          </motion.div>
        )}
      </AnimatePresence>

      {webglSupported === true && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center bg-gradient-to-t from-[#241713b8] to-transparent px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-12">
          <div className="pointer-events-auto flex touch-none select-none flex-wrap items-center justify-center gap-2 rounded-3xl border border-[#ffe3b936] bg-[#4b322da8] p-2 shadow-2xl backdrop-blur-lg sm:gap-3 sm:p-3">
            <button
              type="button"
              {...holdHandlers("forward")}
              className="garden-control-button"
              aria-label="استمري بالضغط للتقدم"
            >
              ↑ تقدم
            </button>
            <button
              type="button"
              {...holdHandlers("backward")}
              className="garden-control-button"
              aria-label="استمري بالضغط للرجوع"
            >
              ↓ رجوع
            </button>
            <span className="mx-0.5 h-7 w-px bg-[#ffe8c22e]" aria-hidden="true" />
            <button
              type="button"
              {...holdHandlers("lookRight")}
              className="garden-control-button"
            >
              التفتي يمينًا
            </button>
            <button
              type="button"
              {...holdHandlers("lookLeft")}
              className="garden-control-button"
            >
              التفتي يسارًا
            </button>
            <button
              type="button"
              aria-pressed={controls.autoStroll}
              onClick={() => {
                setShowHint(false);
                setControls((current) => ({
                  ...current,
                  autoStroll: !current.autoStroll,
                }));
              }}
              className={`garden-control-button ${
                controls.autoStroll ? "garden-control-button-active" : ""
              }`}
            >
              جولة هادئة
            </button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {selectedPhoto && selectedIndex !== null && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-[#1f1412d9] p-3 backdrop-blur-md sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.28 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedIndex(null);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={`الصورة ${selectedIndex + 1} من ${GARDEN_PHOTOS.length}`}
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
              transition={{ duration: reduceMotion ? 0 : 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-[min(94vw,64rem)] rounded-[1.75rem] border border-[#ffe8c94a] bg-[#fff9ef] p-3 text-[#704844] shadow-[0_35px_100px_#00000070] sm:p-5"
            >
              <button
                type="button"
                onClick={() => setSelectedIndex(null)}
                aria-label="إغلاق الصورة"
                className="absolute -top-3 -left-3 z-10 grid h-11 w-11 place-items-center rounded-full border border-[#ead1b5] bg-[#fffaf2] text-xl shadow-lg hover:bg-white"
              >
                ×
              </button>
              <LightboxPhoto key={selectedPhoto.id} item={selectedPhoto} />
              <div className="flex items-center justify-between gap-3 px-1 pb-1 pt-4 sm:px-2">
                <button
                  type="button"
                  onClick={() => moveSelection(-1)}
                  className="rounded-full border border-[#d5ad7c] px-4 py-2 text-sm hover:bg-[#f7e8d8]"
                >
                  السابق
                </button>
                <div className="min-w-0 text-center">
                  <p className={`${captionFont.className} truncate text-xl sm:text-2xl`}>
                    {selectedPhoto.caption}
                  </p>
                  <p className="mt-1 text-sm tabular-nums text-[#9a7066]">
                    {selectedIndex + 1} / {GARDEN_PHOTOS.length}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => moveSelection(1)}
                  className="rounded-full border border-[#d5ad7c] px-4 py-2 text-sm hover:bg-[#f7e8d8]"
                >
                  التالي
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .garden-control-button {
          min-height: 42px;
          border: 1px solid rgba(255, 229, 190, 0.22);
          border-radius: 999px;
          background: rgba(255, 248, 232, 0.08);
          padding: 0.55rem 0.75rem;
          color: #fff8e9;
          font-size: 0.78rem;
          line-height: 1;
          transition: background 160ms ease, transform 160ms ease, border-color 160ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .garden-control-button:hover,
        .garden-control-button:active,
        .garden-control-button-active {
          border-color: rgba(255, 220, 164, 0.62);
          background: rgba(218, 157, 103, 0.34);
        }
        .garden-control-button:active {
          transform: scale(0.96);
        }
        .garden-control-button:focus-visible {
          outline: 2px solid #f4c980;
          outline-offset: 3px;
        }
        @media (min-width: 640px) {
          .garden-control-button {
            padding-inline: 1rem;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </section>
  );
}
