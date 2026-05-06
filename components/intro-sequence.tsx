import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Feather, Sparkles, Keyboard } from "lucide-react";
import { Button } from "./ui/button";

const INTRO_SLIDES = [
  {
    icon: Feather,
    title: "Write with clarity",
    desc: "A distraction-free markdown environment designed to help you focus on what matters most—your thoughts.",
    button: "Next"
  },
  {
    icon: Sparkles,
    title: "Beautiful typography",
    desc: "Carefully selected fonts and balanced spacing to make reading and writing a pleasure.",
    button: "Next"
  },
  {
    icon: Keyboard,
    title: "Keyboard-first",
    desc: "Keep your hands on the keyboard with our powerful command palette (Ctrl/Cmd+K) and Markdown shortcuts.",
    button: "Get Started"
  }
];

const slideVariants = {
  enter: { opacity: 0, x: 40 },
  center: { 
    opacity: 1, 
    x: 0, 
    transition: { 
      duration: 0.6, 
      ease: [0.16, 1, 0.3, 1], 
      staggerChildren: 0.15,
      delayChildren: 0.1 
    } 
  },
  exit: { 
    opacity: 0, x: -40, 
    transition: { duration: 0.4, ease: [0.7, 0, 0.84, 0] } 
  }
};

const itemVariants = {
  enter: { opacity: 0, y: 30, filter: "blur(5px)" },
  center: { 
    opacity: 1, y: 0, filter: "blur(0px)", 
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

export function IntroSequence({ onComplete }: { onComplete: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const handleNext = () => {
    if (currentSlide < INTRO_SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      setIsVisible(false);
      setTimeout(() => onComplete(), 500); // Wait for exit animation
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.6 } }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeInOut" } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-xl overflow-hidden"
        >
          {/* Subtle background glows */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none"
          />

          <div className="relative w-full max-w-lg p-6 sm:p-12 z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="flex flex-col items-center text-center text-foreground"
              >
                <motion.div variants={itemVariants} className="mb-8 p-4 rounded-full bg-primary/10 text-primary ring-1 ring-primary/20 shadow-xl shadow-primary/5">
                  {(() => {
                    const Icon = INTRO_SLIDES[currentSlide].icon;
                    return <Icon className="w-10 h-10" strokeWidth={1.5} />;
                  })()}
                </motion.div>
                
                <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold mb-5 tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60">
                  {INTRO_SLIDES[currentSlide].title}
                </motion.h2>
                
                <motion.p variants={itemVariants} className="text-muted-foreground text-lg mb-12 leading-relaxed text-balance max-w-md">
                  {INTRO_SLIDES[currentSlide].desc}
                </motion.p>

                <motion.div variants={itemVariants} className="flex flex-col items-center w-full gap-6">
                  <Button 
                    size="lg" 
                    onClick={handleNext}
                    className="w-full sm:w-auto min-w-[200px] h-12 text-md shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                  >
                    {INTRO_SLIDES[currentSlide].button}
                  </Button>
                  
                  <div className="flex items-center gap-3">
                    {INTRO_SLIDES.map((_, i) => (
                      <motion.div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? "bg-primary w-6" : "bg-primary/20 w-1.5"}`}
                        layout
                      />
                    ))}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
