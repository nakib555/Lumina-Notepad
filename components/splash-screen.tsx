import { motion } from "motion/react";
import { useEffect } from "react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: "blur(4px)" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[200] flex flex-col justify-center items-center bg-background"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
      >
        <motion.div 
          initial={{ rotate: -15, scale: 0.5 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ duration: 1, type: "spring", bounce: 0.5 }}
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground">
            <path d="M7 5v14h10" />
          </svg>
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
        >
          Lumina
        </motion.h1>
      </motion.div>
    </motion.div>
  );
}
