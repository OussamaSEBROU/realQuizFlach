import React, { useState, useEffect, Component } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sun, Moon, Layers, Languages, BookOpen, HelpCircle } from 'lucide-react';
import { Theme, Language, AppMode } from './types';
import { translations } from './translations';
import { FlashcardsApp } from './components/FlashcardsApp';
import { QuizzesApp } from './components/QuizzesApp';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class AppErrorBoundary extends Component<any, any> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("AppErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-black text-center">
          <div className="max-w-md">
            <h2 className="text-3xl font-black text-red-500 mb-4">Something went wrong</h2>
            <p className="text-zinc-500 mb-8">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-lg"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && (
              <pre className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl text-xs text-left overflow-auto max-h-40">
                {String(this.state.error)}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'light';
  });

  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lang') as Language;
    return saved || 'en';
  });

  const [appMode, setAppMode] = useState<AppMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cards')) return 'flashcards';
    if (params.get('quiz') || params.get('quizId')) return 'quizzes';
    return 'home';
  });
  
  const t = translations[lang];

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <AppErrorBoundary>
      <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500 font-sans selection:bg-accent selection:text-white" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Navigation */}
        <nav className="sticky top-0 z-40 bg-white/90 dark:bg-black/90 backdrop-blur-xl border-b border-accent/10">
          <div className="max-w-6xl mx-auto px-2 md:px-6 h-auto min-h-[80px] py-2 flex flex-wrap items-center justify-between gap-2">
            <button 
              onClick={() => setAppMode('home')}
              className="flex items-center gap-2 md:gap-4 hover:opacity-80 transition-opacity"
            >
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-2xl flex items-center justify-center shadow-[0_8px_20px_rgba(16,185,129,0.3)]"
              >
                <Layers className="text-white" size={20} md:size={28} />
              </motion.div>
              <div className="flex flex-col text-left">
                <h1 className="text-lg md:text-2xl font-black tracking-tighter text-black dark:text-white leading-none">{t.appName}</h1>
              </div>
            </button>
            
            <div className="flex items-center gap-1 md:gap-6">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLang(prev => prev === 'ar' ? 'en' : 'ar')}
                  className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"
                  title={lang === 'ar' ? 'English' : 'العربية'}
                >
                  <Languages size={18} md:size={22} />
                </button>
                <button
                  onClick={toggleTheme}
                  className="w-9 h-9 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-black dark:text-white hover:bg-primary hover:text-white transition-all shadow-sm active:scale-90"
                >
                  {theme === 'light' ? <Moon size={18} md:size={22} /> : <Sun size={18} md:size={22} />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-6xl mx-auto px-3 md:px-6 py-6 md:py-16">
          <AnimatePresence mode="wait">
            {appMode === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
              >
                <h2 className={`font-black text-black dark:text-white mb-6 tracking-tighter ${lang === 'ar' ? 'text-2xl md:text-5xl' : 'text-4xl md:text-6xl'}`}>
                  {t.homeTitle || 'What do you want to create today?'}
                </h2>
                <p className="text-base md:text-lg text-zinc-500 dark:text-zinc-400 mb-12 max-w-xl">
                  {t.homeDesc || (lang === 'ar' ? 'اختر بين إنشاء بطاقات تعليمية للحفظ أو اختبارات لتقييم المعرفة.' : 'Choose between creating flashcards for memorization or quizzes to test knowledge.')}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                  <button
                    onClick={() => setAppMode('flashcards')}
                    className="group relative bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-3d dark:shadow-3d-dark text-center overflow-hidden transition-all hover:border-primary hover:-translate-y-2"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                      <BookOpen size={40} className="text-primary group-hover:text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-black dark:text-white mb-4">{t.flashcards || 'Flashcards'}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {lang === 'ar' ? 'أنشئ بطاقات تعليمية بوجهين للحفظ السريع والفعال.' : 'Create double-sided flashcards for quick and effective memorization.'}
                    </p>
                  </button>

                  <button
                    onClick={() => setAppMode('quizzes')}
                    className="group relative bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-[2.5rem] border-2 border-zinc-100 dark:border-zinc-800 shadow-3d dark:shadow-3d-dark text-center overflow-hidden transition-all hover:border-accent hover:-translate-y-2"
                  >
                    <div className="absolute top-0 left-0 w-full h-2 bg-accent opacity-20 group-hover:opacity-100 transition-opacity" />
                    <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-accent group-hover:text-white transition-all">
                      <HelpCircle size={40} className="text-accent group-hover:text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-black dark:text-white mb-4">{t.quizzes || 'Quizzes'}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-medium">
                      {lang === 'ar' ? 'أنشئ اختبارات متعددة الخيارات مع وقت محدد لتقييم المعرفة.' : 'Create multiple-choice quizzes with time limits to test knowledge.'}
                    </p>
                  </button>
                </div>
              </motion.div>
            )}

            {appMode === 'flashcards' && (
              <motion.div
                key="flashcards"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <FlashcardsApp lang={lang} onBackToHome={() => setAppMode('home')} />
              </motion.div>
            )}

            {appMode === 'quizzes' && (
              <motion.div
                key="quizzes"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <QuizzesApp lang={lang} onBackToHome={() => setAppMode('home')} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="mt-32 py-16 border-t border-accent/10 text-center">
          <p className="text-accent/40 dark:text-accent/30 text-[10px] font-medium uppercase tracking-widest">
            &copy; {new Date().getFullYear()} {t.allRightsReserved}
          </p>
        </footer>
      </div>
    </AppErrorBoundary>
  );
}
