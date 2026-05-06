import { useState, useEffect } from "react";
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
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg p-6 sm:p-12 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center text-center text-foreground"
              >
                <div className="mb-8 p-4 rounded-full bg-accent text-accent-foreground">
                  {(() => {
                    const Icon = INTRO_SLIDES[currentSlide].icon;
                    return <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />;
                  })()}
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-semibold mb-4 tracking-tight">
                  {INTRO_SLIDES[currentSlide].title}
                </h2>
                
                <p className="text-muted-foreground text-lg mb-10 leading-relaxed text-balance max-w-md">
                  {INTRO_SLIDES[currentSlide].desc}
                </p>

                <div className="flex flex-col items-center w-full gap-4">
                  <Button 
                    size="lg" 
                    onClick={handleNext}
                    className="w-full sm:w-auto min-w-[160px]"
                  >
                    {INTRO_SLIDES[currentSlide].button}
                  </Button>
                  
                  <div className="flex items-center gap-2 mt-4">
                    {INTRO_SLIDES.map((_, i) => (
                      <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full ${i === currentSlide ? "bg-primary" : "bg-primary/20"}`}
                        animate={{ 
                          scale: i === currentSlide ? 1.2 : 1,
                          opacity: i === currentSlide ? 1 : 0.5
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
