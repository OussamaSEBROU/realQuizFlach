import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Language } from '../types';
import { translations } from '../translations';

interface FlashcardFormProps {
  onAdd: (question: string, answer: string) => void;
  lang: Language;
}

export const FlashcardForm: React.FC<FlashcardFormProps> = ({ onAdd, lang }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const t = translations[lang];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim() && answer.trim()) {
      onAdd(question, answer);
      setQuestion('');
      setAnswer('');
      setIsOpen(false);
    }
  };

  return (
    <div className="mb-12">
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full py-5 px-8 bg-accent text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(59,130,246,0.25)] hover:bg-blue-600 transition-all"
      >
        <Plus size={24} strokeWidth={3} />
        <span className="text-lg tracking-tight">{t.newCard}</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-3d dark:shadow-3d-dark border border-accent/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">{t.newCard}</h2>
                <button 
                  onClick={() => setIsOpen(false)} 
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1">{t.question}</label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-accent dark:focus:border-accent outline-none transition-all resize-none h-24 md:h-32 font-medium"
                    placeholder={t.placeholderQuestion}
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mr-1">{t.answer}</label>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-white focus:border-accent dark:focus:border-accent outline-none transition-all resize-none h-24 md:h-32 font-medium"
                    placeholder={t.placeholderAnswer}
                    required
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full py-5 bg-accent text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-accent/20"
                >
                  {t.save}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
