// @refresh reset
"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import HoldToUnlock from "@/components/HoldToUnlock";
import PasswordGate from "@/components/PasswordGate";
import GrandReveal from "@/components/GrandReveal";

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
  const reduceMotion = useReducedMotion();

  const transition = {
    duration: reduceMotion ? 0 : 0.6,
    ease: "easeInOut" as const,
  };

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
            <GrandReveal />
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
      {/* Child mount animations must run to deliver completion callbacks. */}
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </main>
  );
}
