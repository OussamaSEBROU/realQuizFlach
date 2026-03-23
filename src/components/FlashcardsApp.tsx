import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'motion/react';
import { Layout, BookOpen, Layers, Trash2, Play, Settings2, FolderPlus, Folder, ChevronRight, Plus, Edit3, X, AlertCircle, GripVertical } from 'lucide-react';
import LZString from 'lz-string';
import { Flashcard, FlashcardSet, ViewMode, Language, AppMode } from '../types';
import { FlashcardComponent } from './Flashcard';
import { FlashcardForm } from './FlashcardForm';
import { PresentationView } from './PresentationView';
import { translations } from '../translations';

interface FlashcardsAppProps {
  lang: Language;
  onBackToHome: () => void;
}

export const FlashcardsApp: React.FC<FlashcardsAppProps> = ({ lang, onBackToHome }) => {
  const [sets, setSets] = useState<FlashcardSet[]>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cards')) return [];
    const saved = localStorage.getItem('flashcard_sets');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [activeSetId, setActiveSetId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cards')) return 'shared-set';
    const saved = localStorage.getItem('active_set_id');
    return saved || null;
  });

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('cards')) return 'present';
    return 'manage';
  });
  
  const t = translations[lang];
  
  // Modals State
  const [isNewSetModalOpen, setIsNewSetModalOpen] = useState(false);
  const [isEditSetModalOpen, setIsEditSetModalOpen] = useState(false);
  const [isDeleteSetModalOpen, setIsDeleteSetModalOpen] = useState(false);
  const [isEditCardModalOpen, setIsEditCardModalOpen] = useState(false);
  const [isDeleteCardModalOpen, setIsDeleteCardModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Data State for Modals
  const [newSetName, setNewSetName] = useState('');
  const [setToEdit, setSetToEdit] = useState<FlashcardSet | null>(null);
  const [setToDeleteId, setSetToDeleteId] = useState<string | null>(null);
  const [cardToEdit, setCardToEdit] = useState<Flashcard | null>(null);
  const [cardToDeleteId, setCardToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('flashcard_sets', JSON.stringify(sets.filter(s => s.id !== 'shared-set')));
  }, [sets]);

  useEffect(() => {
    if (activeSetId) {
      localStorage.setItem('active_set_id', activeSetId);
    } else {
      localStorage.removeItem('active_set_id');
    }
  }, [activeSetId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCards = params.get('cards');
    if (sharedCards) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedCards);
        let parsed;
        try {
          parsed = JSON.parse(decompressed);
        } catch {
          parsed = decompressed.split('\x1E').map(cardStr => cardStr.split('\x1F'));
        }

        const cards: Flashcard[] = parsed.map((item: any) => {
          if (Array.isArray(item)) {
            return {
              id: crypto.randomUUID(),
              question: item[0],
              answer: item[1],
              createdAt: Date.now()
            };
          }
          return item;
        });
        const sharedSet: FlashcardSet = {
          id: 'shared-set',
          title: params.get('title') || t.sharedSet || 'Shared Set',
          cards,
          createdAt: Date.now(),
        };
        
        setSets(prev => [...prev.filter(s => s.id !== 'shared-set'), sharedSet]);
        setActiveSetId('shared-set');
        setViewMode('present');
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse shared cards', e);
      }
    }
  }, [t.sharedSet]);

  // Set Operations
  const createSet = () => {
    if (!newSetName.trim()) return;
    const newSet: FlashcardSet = {
      id: crypto.randomUUID(),
      title: newSetName.trim(),
      cards: [],
      createdAt: Date.now(),
    };
    setSets([newSet, ...sets]);
    setActiveSetId(newSet.id);
    setNewSetName('');
    setIsNewSetModalOpen(false);
  };

  const updateSet = () => {
    if (!setToEdit || !setToEdit.title.trim()) return;
    setSets(sets.map(s => s.id === setToEdit.id ? { ...s, title: setToEdit.title.trim() } : s));
    setIsEditSetModalOpen(false);
    setSetToEdit(null);
  };

  const confirmDeleteSet = (id: string) => {
    setSetToDeleteId(id);
    setIsDeleteSetModalOpen(true);
  };

  const deleteSet = () => {
    if (!setToDeleteId) return;
    setSets(sets.filter(s => s.id !== setToDeleteId));
    if (activeSetId === setToDeleteId) setActiveSetId(null);
    setIsDeleteSetModalOpen(false);
    setSetToDeleteId(null);
  };

  // Card Operations
  const addCard = (question: string, answer: string) => {
    if (!activeSetId) return;
    const newCard: Flashcard = {
      id: crypto.randomUUID(),
      question,
      answer,
      createdAt: Date.now(),
    };
    setSets(sets.map(s => s.id === activeSetId ? { ...s, cards: [newCard, ...s.cards] } : s));
  };

  const updateCard = () => {
    if (!cardToEdit || !activeSetId) return;
    setSets(sets.map(s => s.id === activeSetId ? {
      ...s,
      cards: s.cards.map(c => c.id === cardToEdit.id ? cardToEdit : c)
    } : s));
    setIsEditCardModalOpen(false);
    setCardToEdit(null);
  };

  const confirmDeleteCard = (id: string) => {
    setCardToDeleteId(id);
    setIsDeleteCardModalOpen(true);
  };

  const deleteCard = () => {
    if (!cardToDeleteId || !activeSetId) return;
    setSets(sets.map(s => s.id === activeSetId ? { ...s, cards: s.cards.filter(c => c.id !== cardToDeleteId) } : s));
    setIsDeleteCardModalOpen(false);
    setCardToDeleteId(null);
  };

  const clearActiveSet = () => {
    if (!activeSetId) return;
    setSets(sets.map(s => s.id === activeSetId ? { ...s, cards: [] } : s));
    setIsClearModalOpen(false);
  };

  const moveCardUp = (id: string) => {
    if (!activeSetId) return;
    setSets(sets.map(s => {
      if (s.id !== activeSetId) return s;
      const index = s.cards.findIndex(c => c.id === id);
      if (index <= 0) return s;
      const newCards = [...s.cards];
      [newCards[index], newCards[index - 1]] = [newCards[index - 1], newCards[index]];
      return { ...s, cards: newCards };
    }));
  };

  const moveCardDown = (id: string) => {
    if (!activeSetId) return;
    setSets(sets.map(s => {
      if (s.id !== activeSetId) return s;
      const index = s.cards.findIndex(c => c.id === id);
      if (index === -1 || index >= s.cards.length - 1) return s;
      const newCards = [...s.cards];
      [newCards[index], newCards[index + 1]] = [newCards[index + 1], newCards[index]];
      return { ...s, cards: newCards };
    }));
  };

  const handleReorderCards = (newCards: Flashcard[]) => {
    if (!activeSetId) return;
    setSets(sets.map(s => s.id === activeSetId ? { ...s, cards: newCards } : s));
  };

  const activeSet = sets.find(s => s.id === activeSetId);

  return (
    <div className="w-full">
      {/* Modals */}
      <AnimatePresence>
        {isNewSetModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl border border-accent/20"
            >
              <h3 className="text-2xl font-black text-black dark:text-white mb-6">{t.newFile}</h3>
              <input
                autoFocus
                type="text"
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createSet()}
                placeholder={t.placeholderSetName}
                className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 text-black dark:text-white focus:border-accent outline-none transition-all mb-8 font-bold"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setIsNewSetModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-bold hover:bg-zinc-200 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={createSet}
                  className="flex-1 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/30"
                >
                  {t.create}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditSetModalOpen && setToEdit && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl border border-accent/20"
            >
              <h3 className="text-2xl font-black text-black dark:text-white mb-6">{t.editFile}</h3>
              <input
                autoFocus
                type="text"
                value={setToEdit.title}
                onChange={(e) => setSetToEdit({ ...setToEdit, title: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && updateSet()}
                className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-800 text-black dark:text-white focus:border-accent outline-none transition-all mb-8 font-bold"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setIsEditSetModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-bold hover:bg-zinc-200 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={updateSet}
                  className="flex-1 py-4 rounded-2xl bg-accent text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-accent/30"
                >
                  {t.update}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteSetModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl border border-red-500/20 text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-black dark:text-white mb-2">{t.deleteFile}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">{t.deleteFileDesc}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteSetModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-bold hover:bg-zinc-200 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={deleteSet}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                >
                  {t.confirmDelete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditCardModalOpen && cardToEdit && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-3d dark:shadow-3d-dark border border-accent/20 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-accent" />
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-black dark:text-white tracking-tighter">{t.editCard}</h2>
                <button onClick={() => setIsEditCardModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-accent hover:text-black dark:hover:text-white transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="block text-xs font-black text-accent uppercase tracking-widest mr-1">{t.question}</label>
                  <textarea
                    value={cardToEdit.question}
                    onChange={(e) => setCardToEdit({ ...cardToEdit, question: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 text-black dark:text-white focus:border-accent outline-none transition-all resize-none h-32 font-medium"
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-xs font-black text-accent uppercase tracking-widest mr-1">{t.answer}</label>
                  <textarea
                    value={cardToEdit.answer}
                    onChange={(e) => setCardToEdit({ ...cardToEdit, answer: e.target.value })}
                    className="w-full px-6 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border-2 border-zinc-100 dark:border-zinc-800 text-black dark:text-white focus:border-accent outline-none transition-all resize-none h-32 font-medium"
                  />
                </div>
                <button
                  onClick={updateCard}
                  className="w-full py-5 bg-accent text-white rounded-2xl font-black text-lg hover:bg-blue-600 transition-all shadow-xl shadow-accent/20"
                >
                  {t.updateCardBtn}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteCardModalOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-3xl border border-red-500/20 text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-black dark:text-white mb-2">{t.deleteCard}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">{t.deleteCardDesc}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsDeleteCardModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-bold hover:bg-zinc-200 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={deleteCard}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
                >
                  {t.confirmDelete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotateX: -20 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.9, rotateX: -20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[2rem] p-8 shadow-3d dark:shadow-3d-dark border border-accent/20 text-center preserve-3d"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trash2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-black dark:text-white mb-2">{t.clearFile}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-medium">{t.clearFileDesc}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsClearModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-accent font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={clearActiveSet}
                  className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all active:scale-95 shadow-lg shadow-red-500/30"
                >
                  {t.confirmDelete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-accent text-sm font-black uppercase tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all"
        >
          <ChevronRight size={16} className={lang === 'en' ? 'rotate-180' : ''} />
          <span>{t.backToHome || 'Home'}</span>
        </button>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-[1rem] md:rounded-[1.25rem] border border-accent/10">
          <button
            onClick={() => setViewMode('manage')}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'manage' ? 'bg-white dark:bg-zinc-800 text-primary shadow-md' : 'text-accent hover:text-black dark:hover:text-zinc-200'}`}
          >
            <Settings2 size={16} />
            <span className="hidden md:inline">{t.setup}</span>
          </button>
          <button
            onClick={() => setViewMode('present')}
            className={`flex items-center gap-1 md:gap-2 px-2 md:px-5 py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${viewMode === 'present' ? 'bg-white dark:bg-zinc-800 text-primary shadow-md' : 'text-accent hover:text-black dark:hover:text-zinc-200'}`}
          >
            <Play size={16} />
            <span className="hidden md:inline">{t.present}</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'manage' ? (
          <motion.div
            key="manage"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, type: 'spring' }}
          >
            {/* Folders Sidebar/Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 md:gap-12">
              <aside className="space-y-6 md:space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-black dark:text-white">{t.myFiles}</h3>
                  <button 
                    onClick={() => setIsNewSetModalOpen(true)}
                    className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                  >
                    <FolderPlus size={20} />
                  </button>
                </div>
                
                <div className="space-y-3">
                  {sets.map(set => (
                    <div key={set.id} className="group relative">
                      <button
                        onClick={() => setActiveSetId(set.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-right ${activeSetId === set.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-zinc-50 dark:bg-zinc-900 text-accent dark:text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
                      >
                        <Folder size={20} className={activeSetId === set.id ? 'text-white' : 'text-primary'} />
                        <div className="flex-1 overflow-hidden">
                          <p className="font-bold truncate">{set.title}</p>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${activeSetId === set.id ? 'text-white/60' : 'text-accent'}`}>{set.cards.length} {t.cardsCount}</p>
                        </div>
                        <ChevronRight size={16} className={`${activeSetId === set.id ? 'text-white' : 'text-accent'} ${lang === 'en' ? 'rotate-180' : ''}`} />
                      </button>
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {set.id !== 'shared-set' && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSetToEdit(set); setIsEditSetModalOpen(true); }}
                              className="p-2 text-primary hover:bg-primary/10 rounded-xl"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); confirmDeleteSet(set.id); }}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {sets.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl">
                      <p className="text-xs font-bold text-accent">{t.noFiles}</p>
                    </div>
                  )}
                </div>
              </aside>

              <div className="space-y-6 md:space-y-12">
                {activeSet ? (
                  <>
                    <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-accent/10 text-accent text-[10px] font-black uppercase tracking-widest mb-2 md:mb-4 border border-accent/20">
                          <BookOpen size={12} />
                          <span>{t.activeFile}</span>
                        </div>
                        <h2 className={`font-black text-black dark:text-white tracking-tighter ${lang === 'ar' ? 'text-2xl md:text-4xl' : 'text-2xl md:text-5xl'}`}>
                          {activeSet.title}
                        </h2>
                      </div>
                      {activeSet.id !== 'shared-set' && (
                        <button
                          onClick={() => setIsClearModalOpen(true)}
                          className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 text-xs md:text-sm font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl md:rounded-2xl transition-all w-fit"
                        >
                          <Trash2 size={16} className="md:w-[18px] md:h-[18px]" />
                          <span>{t.clearFile}</span>
                        </button>
                      )}
                    </header>

                    {activeSet.id !== 'shared-set' && <FlashcardForm onAdd={addCard} lang={lang} />}

                    <Reorder.Group 
                      axis="y" 
                      values={activeSet.cards} 
                      onReorder={handleReorderCards}
                      className="flex flex-col gap-4 md:gap-8"
                    >
                      <div className="flex flex-col gap-4 md:gap-8">
                        {activeSet.cards.map((card, index) => {
                          const dragControls = useDragControls();
                          return (
                            <Reorder.Item
                              key={card.id}
                              value={card}
                              dragListener={false}
                              dragControls={dragControls}
                              className="relative cursor-grab active:cursor-grabbing"
                            >
                              <div 
                                onPointerDown={(e) => dragControls.start(e)}
                                className={`absolute bottom-4 ${lang === 'ar' ? 'right-4' : 'left-4'} z-20 bg-black/10 dark:bg-white/10 text-black dark:text-white w-10 h-10 rounded-full flex items-center justify-center font-black cursor-grab active:cursor-grabbing`}
                              >
                                <GripVertical size={20} />
                              </div>
                              <FlashcardComponent 
                                card={card} 
                                onDelete={confirmDeleteCard} 
                                onEdit={(c) => { setCardToEdit(c); setIsEditCardModalOpen(true); }} 
                                lang={lang}
                                readonly={activeSet.id === 'shared-set'}
                              />
                            </Reorder.Item>
                          );
                        })}
                      </div>
                    </Reorder.Group>

                    {activeSet.cards.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-32 text-zinc-200 dark:text-zinc-800">
                        <Plus size={48} className="mb-4 opacity-20" />
                        <p className="text-xl font-black opacity-30">{t.newCard}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-32 text-center">
                    <div className="w-24 h-24 bg-accent/5 rounded-full flex items-center justify-center mb-8">
                      <Folder size={48} className="text-accent opacity-20" />
                    </div>
                    <h2 className="text-3xl font-black text-black dark:text-white mb-4">{t.chooseFile}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-medium">
                      {t.chooseFileDesc}
                    </p>
                    <button 
                      onClick={() => setIsNewSetModalOpen(true)}
                      className="mt-8 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                    >
                      {t.newFile}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="present"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.6 }}
          >
            {activeSet ? (
              <>
                <header className="mb-16 text-center">
                  <button 
                    onClick={() => setActiveSetId(null)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent text-white text-xs font-black uppercase tracking-widest mb-8 shadow-xl hover:scale-105 transition-all"
                  >
                    <ChevronRight size={16} className={lang === 'en' ? 'rotate-180' : ''} />
                    <span>{t.backToFiles}</span>
                  </button>
                  <h2 className={`font-black text-black dark:text-white mb-6 tracking-tighter ${lang === 'ar' ? 'text-3xl md:text-5xl' : 'text-5xl md:text-6xl'}`}>
                    {t.presentingFile}: <span className="text-primary">{activeSet.title}</span>
                  </h2>
                  <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium">
                    {activeSet.cards.length} {t.cardsReady}
                  </p>
                </header>
                <PresentationView cards={activeSet.cards} lang={lang} setTitle={activeSet.title} />
              </>
            ) : (
              <div className="max-w-4xl mx-auto">
                <header className="mb-16 text-center">
                  <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent/10 text-accent text-xs font-black uppercase tracking-widest mb-8 border border-accent/20">
                    <Play size={16} fill="currentColor" />
                    <span>{t.libraryDesc}</span>
                  </div>
                  <h2 className={`font-black text-black dark:text-white mb-6 tracking-tighter ${lang === 'ar' ? 'text-3xl md:text-5xl' : 'text-5xl md:text-6xl'}`}>
                    {t.library} <span className="text-primary">{t.present}</span>
                  </h2>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sets.map(set => (
                    <motion.button
                      key={set.id}
                      whileHover={{ scale: 1.05, y: -10 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveSetId(set.id)}
                      className="group relative bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border-2 border-zinc-50 dark:border-zinc-800 shadow-3d dark:shadow-3d-dark text-right overflow-hidden transition-all hover:border-primary"
                    >
                      <div className="absolute top-0 left-0 w-full h-2 bg-primary opacity-20 group-hover:opacity-100 transition-opacity" />
                      <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                        <Folder size={32} className="text-accent group-hover:text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-black dark:text-white mb-2 truncate">{set.title}</h3>
                      <p className="text-sm font-bold text-accent uppercase tracking-widest">{set.cards.length} {t.cardsCount}</p>
                      
                      <div className="mt-8 flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                        <span>{t.startNow}</span>
                        <ChevronRight size={14} className={lang === 'ar' ? 'rotate-180' : ''} />
                      </div>
                    </motion.button>
                  ))}
                </div>

                {sets.length === 0 && (
                  <div className="text-center py-32">
                    <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-8">
                      <Layers size={48} className="text-zinc-200 dark:text-zinc-800" />
                    </div>
                    <h3 className="text-2xl font-black text-black dark:text-white mb-4">{t.noFilesReady}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 mb-8">{t.noFilesReadyDesc}</p>
                    <button 
                      onClick={() => setViewMode('manage')}
                      className="px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20"
                    >
                      {t.goToManage}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
