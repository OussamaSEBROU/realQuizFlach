import React from 'react';
import { motion } from 'motion/react';
import { QuizQuestion, Language } from '../types';
import { RotateCcw, Trash2, Edit3, ChevronUp, ChevronDown, CheckCircle2 } from 'lucide-react';
import { translations } from '../translations';

interface QuizQuestionProps {
  question: QuizQuestion;
  onDelete: (id: string) => void;
  onEdit: (question: QuizQuestion) => void;
  lang: Language;
  readonly?: boolean;
}

export const QuizQuestionComponent: React.FC<QuizQuestionProps> = ({ question, onDelete, onEdit, lang, readonly }) => {
  const t = translations[lang];

  return (
    <div className="relative w-full group">
      <motion.div
        className="w-full relative bg-white dark:bg-zinc-900 border-2 border-accent/10 dark:border-accent/5 rounded-[2rem] shadow-3d dark:shadow-3d-dark flex flex-col p-4 md:p-8 overflow-hidden"
        initial={false}
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
        <span className="absolute top-4 right-6 md:top-6 md:right-8 text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-accent">{t.question}</span>
        
        <h3 className="text-lg md:text-xl font-bold text-black dark:text-zinc-100 leading-snug mt-6 mb-4">
          {question.question}
        </h3>
        
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isCorrect = question.correctOptionIndices ? question.correctOptionIndices.includes(index) : question.correctOptionIndex === index;
            return (
              <div 
                key={index} 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${isCorrect ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'}`}>
                  {isCorrect ? <CheckCircle2 size={14} /> : <span className="text-xs font-bold">{index + 1}</span>}
                </div>
                <span className={`font-medium text-sm ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}>
                  {option}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
      
      {!readonly && (
        <div className="absolute -top-2 -left-2 md:-top-3 md:-left-3 flex flex-col gap-1 md:gap-2 opacity-0 group-hover:opacity-100 transition-all z-10">
          <motion.button
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(question.id);
            }}
            className="p-2 md:p-3 bg-red-500 text-white rounded-xl md:rounded-2xl shadow-xl hover:bg-red-600"
          >
            <Trash2 size={14} md:size={18} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(question);
            }}
            className="p-2 md:p-3 bg-accent text-white rounded-xl md:rounded-2xl shadow-xl hover:bg-blue-600"
          >
            <Edit3 size={14} md:size={18} />
          </motion.button>
        </div>
      )}
    </div>
  );
};
