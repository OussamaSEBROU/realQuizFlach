import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { ChevronLeft, ChevronRight, RotateCcw, Maximize2, Minimize2, Timer, TimerOff, Clock, Music, Music2, Share2, Check } from 'lucide-react';
import { Flashcard, Language } from '../types';
import { useSound } from '../hooks/useSound';
import { translations } from '../translations';

interface PresentationViewProps {
  cards: Flashcard[];
  lang: Language;
  setTitle?: string;
}

// Using a more reliable ambient cinematic track
const RELIABLE_CINEMATIC_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'; 

export const PresentationView: React.FC<PresentationViewProps> = ({ cards, lang, setTitle = 'Shared Set' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAutoAdvance, setIsAutoAdvance] = useState(false);
  const [isCinematicSound, setIsCinematicSound] = useState(false);
  const [duration, setDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const { playSound } = useSound();
  const t = translations[lang];

  // Auto Advance Logic
  useEffect(() => {
    if (isAutoAdvance) {
      setTimeLeft(duration);
      
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            nextCard();
            return duration;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoAdvance, currentIndex, duration]);

  const [isCopied, setIsCopied] = useState(false);
  
  // Cinematic Sound Logic
  const toggleCinematicSound = () => {
    const nextState = !isCinematicSound;
    setIsCinematicSound(nextState);

    if (nextState) {
      if (!audioRef.current) {
        audioRef.current = new Audio(RELIABLE_CINEMATIC_URL);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
      }
      audioRef.current.play().catch(err => {
        console.error('Cinematic audio failed:', err);
        setIsCinematicSound(false);
      });
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <p className="text-xl font-medium">{t.noFilesReady}</p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
    playSound('NEXT');
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
    playSound('SWIPE');
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    playSound('FLIP');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[60vh] gap-8 md:gap-12 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-black p-4 md:p-8' : ''}`}>
      {/* Stage Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      {/* Top Controls Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {/* Progress Indicator */}
        <div className="flex items-center gap-3 md:gap-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 md:px-8 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
          <span className="text-xs md:text-sm font-black text-zinc-900 dark:text-white tracking-widest">
            {currentIndex + 1} / {cards.length}
          </span>
          <div className="w-24 md:w-48 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Auto Advance Controls */}
        <div className="flex items-center gap-2 md:gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-3 md:px-6 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
          <button 
            onClick={() => setIsAutoAdvance(!isAutoAdvance)}
            className={`p-2 rounded-full transition-all ${isAutoAdvance ? 'bg-accent text-white shadow-lg shadow-accent/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
            title={t.autoAdvance}
          >
            {isAutoAdvance ? <Timer size={16} md:size={20} /> : <TimerOff size={16} md:size={20} />}
          </button>
          
          <AnimatePresence>
            {isAutoAdvance && (
              <motion.div 
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="flex items-center gap-2 md:gap-3 overflow-hidden whitespace-nowrap"
              >
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />
                <div className="flex items-center gap-1 md:gap-2">
                  <Clock size={14} md:size={16} className="text-accent" />
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-8 md:w-12 bg-transparent text-xs md:text-sm font-black text-zinc-900 dark:text-white outline-none border-b border-accent/30 focus:border-accent text-center"
                  />
                  <span className="text-[8px] md:text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{t.seconds}</span>
                </div>
                
                {/* Countdown Circle */}
                <div className="relative w-6 h-6 md:w-8 md:h-8 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      className="text-zinc-100 dark:text-zinc-800"
                    />
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="transparent"
                      strokeDasharray="63"
                      animate={{ strokeDashoffset: 63 - (63 * timeLeft) / duration }}
                      className="text-accent"
                    />
                  </svg>
                  <span className="absolute text-[8px] font-black text-zinc-900 dark:text-white">{timeLeft}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cinematic Sound Toggle */}
        <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-2 md:px-4 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const minimalString = cards.map(c => `${c.question}\x1F${c.answer}`).join('\x1E');
              const shareableData = LZString.compressToEncodedURIComponent(minimalString);
              const url = `${window.location.origin}${window.location.pathname}?cards=${shareableData}&title=${encodeURIComponent(setTitle)}`;
              navigator.clipboard.writeText(url);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className={`p-2 md:p-3 rounded-full transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            title="Share Presentation"
          >
            {isCopied ? <Check size={16} md:size={20} /> : <Share2 size={16} md:size={20} />}
          </motion.button>
          <div className="w-px h-6 md:h-8 bg-zinc-200 dark:bg-zinc-700 mx-1 md:mx-2" />
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleCinematicSound}
            className={`p-2 md:p-3 rounded-full transition-all relative flex items-center justify-center ${isCinematicSound ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            title={t.cinematicSound}
          >
            {isCinematicSound ? (
              <div className="relative flex items-center justify-center">
                <Music size={16} md:size={20} className="relative z-10" />
                <motion.div 
                  animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-white rounded-full pointer-events-none"
                />
              </div>
            ) : <Music2 size={16} md:size={20} />}
          </motion.button>
        </div>
      </div>

      {/* Main Card Stage */}
      <div className="relative w-[90vw] md:w-full max-w-3xl aspect-[16/10] perspective-2000 group">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            initial={{ opacity: 0, scale: 0.8, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotateX: -20 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="w-full h-full"
          >
            <motion.div
              className="w-full h-full relative preserve-3d cursor-pointer"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.8, type: 'spring', stiffness: 150, damping: 25 }}
              onClick={handleFlip}
            >
              {/* Front */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-zinc-900 border-2 border-accent/10 dark:border-accent/5 rounded-[2rem] md:rounded-[3rem] shadow-3d dark:shadow-3d-dark flex flex-col items-center justify-center p-6 md:p-16 text-center overflow-hidden shining-border">
                <div className="absolute top-0 left-0 w-full h-2 md:h-3 bg-primary" />
                <span className="absolute top-4 md:top-10 right-6 md:right-12 text-[8px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.5em] text-accent/40 dark:text-accent/20">{t.question}</span>
                <h3 className="text-xl md:text-4xl lg:text-5xl font-black text-zinc-900 dark:text-zinc-100 leading-tight tracking-tight">
                  {currentCard.question}
                </h3>
                <div className="mt-8 md:mt-16 flex flex-col items-center gap-2 md:gap-4 text-accent">
                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <RotateCcw size={20} md:size={32} />
                  </motion.div>
                  <span className="text-[8px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.3em] opacity-40">{t.revealAnswer}</span>
                </div>
              </div>

              {/* Back */}
              <div className="absolute inset-0 w-full h-full backface-hidden bg-zinc-950 dark:bg-white border-2 border-accent/20 dark:border-accent/10 rounded-[2rem] md:rounded-[3rem] shadow-3d dark:shadow-3d-dark flex flex-col items-center justify-center p-6 md:p-16 text-center rotate-y-180 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 md:h-3 bg-primary" />
                <span className="absolute top-4 md:top-10 right-6 md:right-12 text-[8px] md:text-xs font-black uppercase tracking-[0.2em] md:tracking-[0.5em] text-white/20 dark:text-black/20">{t.answer}</span>
                <p className="text-xl md:text-4xl lg:text-5xl font-black text-white dark:text-zinc-950 leading-tight tracking-tight">
                  {currentCard.answer}
                </p>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Controls Overlaid */}
        <div className="absolute top-1/2 -translate-y-1/2 -left-16 md:-left-32 hidden sm:block">
          <motion.button 
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={lang === 'ar' ? prevCard : nextCard}
            className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-zinc-900 border-2 border-accent/10 dark:border-accent/5 text-zinc-900 dark:text-white shadow-3d dark:shadow-3d-dark hover:border-accent transition-all"
          >
            {lang === 'ar' ? <ChevronRight size={24} md:size={40} /> : <ChevronLeft size={24} md:size={40} />}
          </motion.button>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -right-16 md:-right-32 hidden sm:block">
          <motion.button 
            whileHover={{ scale: 1.1, x: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={lang === 'ar' ? nextCard : prevCard}
            className="p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-zinc-900 border-2 border-accent/10 dark:border-accent/5 text-zinc-900 dark:text-white shadow-3d dark:shadow-3d-dark hover:border-accent transition-all"
          >
            {lang === 'ar' ? <ChevronLeft size={24} md:size={40} /> : <ChevronRight size={24} md:size={40} />}
          </motion.button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 flex items-center gap-4 md:gap-8">
        <div className="flex sm:hidden gap-4">
          <button onClick={prevCard} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-accent/20 text-zinc-900 dark:text-white shadow-xl">
            {lang === 'ar' ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>
          <button onClick={nextCard} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-accent/20 text-zinc-900 dark:text-white shadow-xl">
            {lang === 'ar' ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
          </button>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-[1.5rem] bg-accent text-white font-black hover:bg-blue-600 transition-all shadow-[0_10px_30px_rgba(59,130,246,0.3)]"
        >
          {isFullscreen ? <Minimize2 size={20} md:size={24} /> : <Maximize2 size={20} md:size={24} />}
          <span className="tracking-widest text-sm md:text-base">{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
        </motion.button>
      </div>
    </div>
  );
};
