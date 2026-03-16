import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LZString from 'lz-string';
import { collection, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Maximize2, Minimize2, Timer, Share2, Check, X, RotateCcw, Trophy, ChevronRight, Music, CheckCircle2, Download, Play } from 'lucide-react';
import { QuizQuestion, Language } from '../types';
import { useSound } from '../hooks/useSound';
import { translations } from '../translations';

interface QuizPresentationViewProps {
  questions: QuizQuestion[];
  timeLimit: number;
  allowedRetries?: number;
  lang: Language;
  onFinish?: () => void;
  isCreator?: boolean;
  quizTitle?: string;
  teacherId?: string;
}

export const QuizPresentationView: React.FC<QuizPresentationViewProps> = ({ questions, timeLimit, allowedRetries = 0, lang, onFinish, isCreator, quizTitle = 'Quiz', teacherId }) => {
  const [hasStarted, setHasStarted] = useState(isCreator);
  const [userName, setUserName] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isCopied, setIsCopied] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [userAnswers, setUserAnswers] = useState<{question: string, selected: string[], correct: string[], isCorrect: boolean}[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [maxRetriesReached, setMaxRetriesReached] = useState(false);

  const quizHash = useMemo(() => {
    return btoa(encodeURIComponent(quizTitle + questions.length + (questions[0]?.question || '')));
  }, [quizTitle, questions]);

  useEffect(() => {
    if (!isCreator) {
      const savedAttempts = parseInt(localStorage.getItem(`quiz_attempts_${quizHash}`) || '0', 10);
      setAttempts(savedAttempts);
      if (allowedRetries > 0 && savedAttempts >= allowedRetries) {
        setMaxRetriesReached(true);
      }
    }
  }, [quizHash, isCreator, allowedRetries]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { playSound } = useSound();
  const t = translations[lang];

  useEffect(() => {
    if (isMusicPlaying) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3'); // Replace with a cinematic track
        audioRef.current.loop = true;
        audioRef.current.volume = 0.15;
      }
      audioRef.current.play().catch(e => console.log(e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isMusicPlaying]);

  useEffect(() => {
    if (hasStarted && !isFinished && !isAnswered && timeLimit > 0) {
      setTimeLeft(timeLimit);
      if (timerRef.current) clearInterval(timerRef.current);
      
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasStarted, currentIndex, isFinished, isAnswered, timeLimit]);

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-zinc-400">
        <p className="text-xl font-medium">{t.noFilesReady}</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  const handleTimeUp = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    playSound('INCORRECT');
    recordAnswer([]);
  };

  const toggleOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOptions(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index];
    });
  };

  const submitAnswer = () => {
    if (isAnswered || selectedOptions.length === 0) return;
    
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    
    const correctIndices = currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex!];
    const isCorrect = selectedOptions.length === correctIndices.length && 
                      selectedOptions.every(val => correctIndices.includes(val));
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      playSound('CORRECT');
    } else {
      playSound('INCORRECT');
    }
    
    recordAnswer(selectedOptions, isCorrect);
  };

  const recordAnswer = (selected: number[], isCorrect: boolean = false) => {
    const correctIndices = currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex!];
    setUserAnswers(prev => [...prev, {
      question: currentQuestion.question,
      selected: selected.map(i => currentQuestion.options[i]),
      correct: correctIndices.map(i => currentQuestion.options[i]),
      isCorrect
    }]);
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptions([]);
      setIsAnswered(false);
      playSound('TRANSITION');
    } else {
      setIsFinished(true);
      playSound('SCORE');
    }
  };

  const hasSavedResult = useRef(false);

  useEffect(() => {
    if (isFinished && userAnswers.length === questions.length && !hasSavedResult.current) {
      hasSavedResult.current = true;
      // Save results to localStorage for the dashboard
      const dateStr = new Date().toISOString();
      const newResult = {
        id: crypto.randomUUID(),
        quizTitle,
        studentName: userName,
        score,
        totalQuestions: questions.length,
        date: dateStr,
        details: userAnswers.map(ans => ({
          question: ans.question,
          selected: ans.selected.join(' | '),
          correct: ans.correct.join(' | '),
          isCorrect: ans.isCorrect
        }))
      };
      
      const existingResults = JSON.parse(localStorage.getItem('quiz_results') || '[]');
      localStorage.setItem('quiz_results', JSON.stringify([...existingResults, newResult]));

      // Save to Firestore
      const saveToFirestore = async () => {
        try {
          const dataToSave: any = {
            quizTitle: newResult.quizTitle,
            studentName: newResult.studentName,
            score: newResult.score,
            totalQuestions: newResult.totalQuestions,
            date: newResult.date,
            details: newResult.details
          };
          if (teacherId) {
            dataToSave.teacherId = teacherId;
          }
          await addDoc(collection(db, 'quiz_results'), dataToSave);
          console.log('Result saved to Firestore', dataToSave);
        } catch (error) {
          console.error('Error saving to Firestore:', error);
          handleFirestoreError(error, OperationType.CREATE, 'quiz_results');
        }
      };
      saveToFirestore();
    }
  }, [isFinished, userAnswers, questions.length, quizTitle, userName, score]);

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOptions([]);
    setIsAnswered(false);
    setScore(0);
    setIsFinished(false);
    setUserAnswers([]);
    hasSavedResult.current = false;
    playSound('TRANSITION');
  };

  const downloadCSV = () => {
    const headers = ['QuizTitle', 'StudentName', 'Score', 'TotalQuestions', 'Date', 'Question', 'Selected', 'Correct', 'IsCorrect'];
    const dateStr = new Date().toISOString();
    
    const escapeCSV = (str: string | number | boolean) => {
      if (str === null || str === undefined) return '""';
      const stringValue = String(str);
      // If the string contains quotes, commas, or newlines, escape it
      if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = userAnswers.map(ans => [
      escapeCSV(quizTitle),
      escapeCSV(userName),
      score,
      questions.length,
      escapeCSV(dateStr),
      escapeCSV(ans.question),
      escapeCSV(ans.selected.join(' | ')),
      escapeCSV(ans.correct.join(' | ')),
      ans.isCorrect
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');
    
    // Use Uint8Array with BOM for proper UTF-8 encoding in Excel
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${userName || 'quiz'}_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[3rem] shadow-3d dark:shadow-3d-dark border-2 border-accent/10 text-center max-w-lg w-full relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          <h2 className={`font-black text-black dark:text-white mb-6 ${lang === 'ar' ? 'text-2xl md:text-4xl' : 'text-3xl md:text-4xl'}`}>
            {lang === 'ar' ? 'مرحباً بك في الاختبار' : 'Welcome to the Quiz'}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-8">
            {lang === 'ar' ? 'يرجى إدخال اسمك ولقبك للبدء. سيبدأ الاختبار ويبدأ عداد الوقت فور الضغط على زر الانطلاق.' : 'Please enter your full name to start. The quiz and timer will begin immediately after clicking start.'}
          </p>
          
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={lang === 'ar' ? 'الاسم واللقب' : 'Full Name'}
            className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 text-black dark:text-white focus:border-accent outline-none transition-all mb-8 font-bold text-center"
          />
          
          <button 
            onClick={() => {
              if (userName.trim()) {
                setHasStarted(true);
                playSound('TRANSITION');
              }
            }}
            disabled={!userName.trim()}
            className="w-full py-4 rounded-2xl bg-primary text-white font-black text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
            <span>{lang === 'ar' ? 'انطلاق' : 'Start'}</span>
          </button>
        </motion.div>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className={`flex flex-col items-center justify-center min-h-[50vh] gap-8 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-black p-4 md:p-8' : ''}`}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[3rem] shadow-3d dark:shadow-3d-dark border-2 border-accent/10 text-center max-w-lg w-full relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Trophy size={48} className="text-primary" />
          </div>
          <h2 className={`font-black text-black dark:text-white mb-2 ${lang === 'ar' ? 'text-2xl md:text-4xl' : 'text-3xl md:text-4xl'}`}>{t.quizResults}</h2>
          
          {isCreator ? (
            <>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium mb-8">{t.score}</p>
              <div className="text-6xl md:text-7xl font-black text-primary mb-4 tracking-tighter">
                {percentage}%
              </div>
              <p className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-10">
                {score} / {questions.length} {t.correct}
              </p>
            </>
          ) : (
            <p className="text-lg font-bold text-zinc-500 dark:text-zinc-400 mb-10 mt-6 max-w-md mx-auto">
              {lang === 'ar' 
                ? 'لقد أكملت الاختبار بنجاح. يرجى تحميل ملف النتيجة وإرساله للأستاذ.' 
                : 'You have successfully completed the quiz. Please download your result file and send it to your teacher.'}
            </p>
          )}
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={downloadCSV}
              className="w-full py-4 rounded-2xl bg-zinc-800 text-white font-black text-lg hover:bg-zinc-700 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Download size={20} />
              <span>{lang === 'ar' ? 'تحميل النتيجة (CSV)' : 'Download Result (CSV)'}</span>
            </button>
            {isCreator && (
              <>
                <button 
                  onClick={restartQuiz}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-black text-lg hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
                >
                  <RotateCcw size={20} />
                  <span>{t.playAgain}</span>
                </button>
                {onFinish && (
                  <button 
                    onClick={onFinish}
                    className="w-full py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-black text-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
                  >
                    <span>{t.backToFiles}</span>
                  </button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center min-h-[50vh] gap-4 md:gap-8 ${isFullscreen ? 'fixed inset-0 z-[100] bg-white dark:bg-black p-4 md:p-8' : ''}`}>
      {/* Stage Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/10 rounded-full blur-[150px]" />
      </div>

      {/* Top Controls Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 md:gap-4 w-full max-w-3xl">
        {/* Progress Indicator */}
        <div className="flex items-center gap-3 md:gap-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 md:px-8 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark flex-1">
          <span className="text-xs md:text-sm font-black text-zinc-900 dark:text-white tracking-widest whitespace-nowrap">
            {currentIndex + 1} / {questions.length}
          </span>
          <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className="h-full bg-accent shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        {timeLimit > 0 && (
          <div className="flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-4 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
            <Timer size={16} className={timeLeft <= 3 && !isAnswered ? 'text-red-500 animate-pulse' : 'text-accent'} />
            <span className={`text-sm font-black w-6 text-center ${timeLeft <= 3 && !isAnswered ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>
              {timeLeft}
            </span>
          </div>
        )}

        {/* Music Toggle */}
        <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-2 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsMusicPlaying(!isMusicPlaying)}
            className={`p-2 rounded-full transition-all ${isMusicPlaying ? 'bg-primary text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            title="Toggle Background Music"
          >
            <Music size={16} className={!isMusicPlaying ? 'opacity-50' : ''} />
          </motion.button>
        </div>

        {/* Share Button */}
        <div className="flex items-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl px-2 py-2 md:py-3 rounded-[2rem] border border-accent/20 shadow-3d dark:shadow-3d-dark">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              const minimalString = questions.map(q => {
                const correctIndices = q.correctOptionIndices ? q.correctOptionIndices.join(',') : q.correctOptionIndex;
                return `${q.question}\x1F${q.options.join('\x1F')}\x1F${correctIndices}`;
              }).join('\x1E');
              const shareableData = LZString.compressToEncodedURIComponent(minimalString);
              const url = `${window.location.origin}${window.location.pathname}?quiz=${shareableData}&time=${timeLimit}&retries=${allowedRetries}&title=${encodeURIComponent(quizTitle)}`;
              navigator.clipboard.writeText(url);
              setIsCopied(true);
              setTimeout(() => setIsCopied(false), 2000);
            }}
            className={`p-2 rounded-full transition-all ${isCopied ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'}`}
            title="Share Quiz"
          >
            {isCopied ? <Check size={16} /> : <Share2 size={16} />}
          </motion.button>
        </div>
      </div>

      {/* Main Quiz Stage */}
      <div className="relative w-[95vw] md:w-full max-w-3xl perspective-2000 group z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="w-full bg-white dark:bg-zinc-900 border-2 border-accent/10 dark:border-accent/5 rounded-[2rem] md:rounded-[3rem] shadow-3d dark:shadow-3d-dark flex flex-col p-6 md:p-12 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-2 md:h-3 bg-primary" />
            <span className="absolute top-4 md:top-8 right-6 md:right-10 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-accent/50">{t.question}</span>
            
            <h3 className={`font-black text-zinc-900 dark:text-zinc-100 leading-snug mt-4 mb-8 text-center ${lang === 'ar' ? 'text-lg md:text-3xl' : 'text-xl md:text-3xl'}`}>
              {currentQuestion.question}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((option, index) => {
                const correctIndices = currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex!];
                let optionState = 'default';
                
                if (isAnswered) {
                  if (correctIndices.includes(index)) {
                    optionState = 'correct';
                  } else if (selectedOptions.includes(index)) {
                    optionState = 'incorrect';
                  } else {
                    optionState = 'disabled';
                  }
                } else if (selectedOptions.includes(index)) {
                  optionState = 'selected';
                }

                return (
                  <motion.button
                    key={index}
                    whileHover={!isAnswered ? { scale: 1.02 } : {}}
                    whileTap={!isAnswered ? { scale: 0.98 } : {}}
                    onClick={() => toggleOption(index)}
                    disabled={isAnswered}
                    className={`relative p-4 md:p-6 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${
                      optionState === 'default' ? 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:border-accent/50 text-zinc-800 dark:text-zinc-200' :
                      optionState === 'selected' ? 'border-accent bg-accent/5 text-accent shadow-md' :
                      optionState === 'correct' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-500/20' :
                      optionState === 'incorrect' ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
                      'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/20 text-zinc-400 dark:text-zinc-600 opacity-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold ${
                      optionState === 'default' ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300' :
                      optionState === 'selected' ? 'bg-accent text-white' :
                      optionState === 'correct' ? 'bg-emerald-500 text-white' :
                      optionState === 'incorrect' ? 'bg-red-500 text-white' :
                      'bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-600'
                    }`}>
                      {optionState === 'correct' ? <Check size={16} /> : 
                       optionState === 'incorrect' ? <X size={16} /> : 
                       optionState === 'selected' ? <Check size={16} /> :
                       String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium text-sm md:text-base flex-1 flex items-center justify-between">
                      <span>{option}</span>
                      {isCreator && correctIndices.includes(index) && !isAnswered && (
                        <CheckCircle2 size={16} className="text-emerald-500/50" />
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {!isAnswered && selectedOptions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mt-8 flex justify-center"
                >
                  <button
                    onClick={submitAnswer}
                    className="px-8 py-4 rounded-full bg-primary text-white font-black hover:bg-primary-dark transition-all shadow-lg shadow-primary/30 flex items-center gap-2"
                  >
                    <span>{lang === 'ar' ? 'تأكيد الإجابة' : 'Submit Answer'}</span>
                    <Check size={20} />
                  </button>
                </motion.div>
              )}
              {isAnswered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 flex flex-col items-center"
                >
                  <div className={`text-lg font-black mb-6 ${
                    selectedOptions.length === 0 ? 'text-red-500' :
                    (selectedOptions.length === (currentQuestion.correctOptionIndices?.length || 1) && 
                     selectedOptions.every(val => (currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex!]).includes(val))) 
                     ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {selectedOptions.length === 0 ? t.timeUp : 
                     (selectedOptions.length === (currentQuestion.correctOptionIndices?.length || 1) && 
                      selectedOptions.every(val => (currentQuestion.correctOptionIndices || [currentQuestion.correctOptionIndex!]).includes(val))) 
                      ? t.correct : t.incorrect}
                  </div>
                  <button
                    onClick={nextQuestion}
                    className="px-8 py-4 rounded-full bg-accent text-white font-black hover:bg-blue-600 transition-all shadow-lg shadow-accent/30 flex items-center gap-2"
                  >
                    <span>{currentIndex < questions.length - 1 ? t.nextQuestion : t.finishQuiz}</span>
                    <ChevronRight size={20} className={lang === 'ar' ? 'rotate-180' : ''} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Controls */}
      <div className="relative z-10 flex items-center gap-4 md:gap-8 mt-4">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleFullscreen}
          className="flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-[1.5rem] bg-zinc-800 dark:bg-white text-white dark:text-zinc-900 font-black hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-all shadow-xl"
        >
          {isFullscreen ? <Minimize2 size={20} md:size={24} /> : <Maximize2 size={20} md:size={24} />}
          <span className="tracking-widest text-sm md:text-base">{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
        </motion.button>
      </div>
    </div>
  );
};
