// @refresh reset
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HoldToUnlock from "@/components/HoldToUnlock";
import PasswordGate from "@/components/PasswordGate";
import GrandReveal from "@/components/GrandReveal";
import GardenReveal from "@/components/GardenReveal";
import { GARDEN_MUSIC_SRC } from "@/data/gardenGallery";

const favicon = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#fff1f2"/><path d="M32 51 12 31C-1 17 18 4 32 19 46 4 65 17 52 31Z" fill="#c28c44"/></svg>',
)}`;

const sceneAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function HomePage() {
  const [step, setStep] = useState(0);
  const [returnToLetter, setReturnToLetter] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicMuted, setMusicMuted] = useState(false);
  const [musicUnavailable, setMusicUnavailable] = useState(false);
  const gardenAudioRef = useRef<HTMLAudioElement>(null);
  const audioFadeFrameRef = useRef<number | null>(null);
  const reduceMotion = useReducedMotion();

  const transition = {
    duration: reduceMotion ? 0 : 0.6,
    ease: "easeInOut" as const,
  };

  const cancelAudioFade = useCallback(() => {
    if (audioFadeFrameRef.current !== null) {
      window.cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeFrameRef.current = null;
    }
  }, []);

  const fadeAudioTo = useCallback(
    (targetVolume: number, duration: number, onComplete?: () => void) => {
      const audio = gardenAudioRef.current;
      if (!audio) return;

      cancelAudioFade();
      const fromVolume = audio.volume;
      const safeTargetVolume = Math.min(1, Math.max(0, targetVolume));
      if (reduceMotion || duration <= 0) {
        audio.volume = safeTargetVolume;
        onComplete?.();
        return;
      }

      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, Math.max(0, (now - startedAt) / duration));
        const eased = 1 - Math.pow(1 - progress, 3);
        const nextVolume = fromVolume + (safeTargetVolume - fromVolume) * eased;
        audio.volume = Math.min(1, Math.max(0, nextVolume));
        if (progress < 1) {
          audioFadeFrameRef.current = window.requestAnimationFrame(tick);
        } else {
          audioFadeFrameRef.current = null;
          onComplete?.();
        }
      };

      audioFadeFrameRef.current = window.requestAnimationFrame(tick);
    },
    [cancelAudioFade, reduceMotion],
  );

  useEffect(() => {
    return () => {
      cancelAudioFade();
      const audio = gardenAudioRef.current;
      if (audio) audio.pause();
    };
  }, [cancelAudioFade]);

  function startGardenMusic() {
    const audio = gardenAudioRef.current;
    if (!audio) return;

    cancelAudioFade();
    audio.muted = musicMuted;
    audio.volume = 0;
    setMusicUnavailable(false);

    // This call intentionally stays synchronous inside the user's click handler.
    const playAttempt = audio.play();
    void playAttempt
      .then(() => {
        setMusicPlaying(true);
        fadeAudioTo(0.65, 2_000);
      })
      .catch(() => {
        cancelAudioFade();
        setMusicPlaying(false);
        setMusicUnavailable(true);
      });
  }

  function handleEnterGarden() {
    startGardenMusic();
    setStep(3);
  }

  function handleBackToLetter() {
    const audio = gardenAudioRef.current;
    if (audio && !audio.paused) {
      fadeAudioTo(0, 650, () => {
        audio.pause();
        setMusicPlaying(false);
      });
    }
    setReturnToLetter(true);
    setStep(2);
  }

  function handleToggleMusic() {
    const audio = gardenAudioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      fadeAudioTo(0, 450, () => {
        audio.pause();
        setMusicPlaying(false);
      });
      return;
    }

    startGardenMusic();
  }

  function handleToggleMute() {
    const audio = gardenAudioRef.current;
    const nextMuted = !musicMuted;
    setMusicMuted(nextMuted);
    if (audio) audio.muted = nextMuted;
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <motion.div
            key={step}
            {...sceneAnimation}
            transition={transition}
            className="min-h-screen w-full"
          >
            <HoldToUnlock onComplete={() => setStep(1)} />
          </motion.div>
        );
      case 1:
        return (
          <motion.div
            key={step}
            {...sceneAnimation}
            transition={transition}
            className="min-h-screen w-full"
          >
            <PasswordGate onSuccess={() => setStep(2)} />
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key={step}
            {...sceneAnimation}
            transition={transition}
            className="min-h-screen w-full"
          >
            <GrandReveal
              onEnterGarden={handleEnterGarden}
              initialShowLetter={returnToLetter}
            />
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, filter: reduceMotion ? "none" : "blur(10px)" }}
            animate={{ opacity: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, filter: reduceMotion ? "none" : "blur(8px)" }}
            transition={{ duration: reduceMotion ? 0 : 0.9, ease: "easeInOut" }}
            className="min-h-screen w-full"
          >
            <GardenReveal
              musicPlaying={musicPlaying}
              musicMuted={musicMuted}
              musicUnavailable={musicUnavailable}
              onToggleMusic={handleToggleMusic}
              onToggleMute={handleToggleMute}
              onBackToLetter={handleBackToLetter}
            />
          </motion.div>
        );
      default:
        return null;
    }
  }

  return (
    <main
      lang="ar"
      dir="rtl"
      className="min-h-screen w-full overflow-hidden bg-black"
    >
      {/* React 19 hoists this link into the document head. */}
      <link rel="icon" type="image/svg+xml" href={favicon} />
      <audio
        ref={gardenAudioRef}
        src={GARDEN_MUSIC_SRC}
        loop
        preload="auto"
        className="hidden"
        onPlay={() => setMusicPlaying(true)}
        onPause={() => setMusicPlaying(false)}
        onError={() => {
          setMusicPlaying(false);
          setMusicUnavailable(true);
        }}
      />
      {/* Child mount animations must run to deliver completion callbacks. */}
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </main>
  );
}
