import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let innerTimer: ReturnType<typeof setTimeout>;
    const outerTimer = setTimeout(() => {
      setIsVisible(false);
      innerTimer = setTimeout(onComplete, 1200); // 0.4s logo exit + 0.8s background exit
    }, 2800); 

    return () => {
      clearTimeout(outerTimer);
      if (innerTimer) clearTimeout(innerTimer);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.8, delay: 0.4, ease: "easeInOut" } }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 0.15, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2, transition: { duration: 0.4 } }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute shrink-0 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[100px]"
          />

          <motion.div
            initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)", transition: { duration: 0.4, ease: "easeIn" } }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} 
            className="relative flex flex-col items-center z-10"
          >
            <motion.div 
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              className="relative w-24 h-24 mb-6 shadow-2xl shadow-primary/20 rounded-[24px] overflow-hidden"
            >
              <img src="/logo.svg" alt="Lumina Logo" className="w-full h-full object-cover" />
            </motion.div>
            
            <motion.div className="flex flex-col items-center overflow-hidden">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60"
              >
                Lumina
              </motion.h1>
              
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "40px", opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeInOut" }}
                className="h-1 bg-primary/50 mt-4 rounded-full"
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

