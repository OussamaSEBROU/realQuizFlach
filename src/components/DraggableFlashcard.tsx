import React from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical } from 'lucide-react';
import { Flashcard } from '../types';
import { FlashcardComponent } from './Flashcard';

interface DraggableFlashcardProps {
  card: Flashcard;
  lang: 'en' | 'ar';
  onDelete: (id: string) => void;
  onEdit: (card: Flashcard) => void;
  readonly: boolean;
}

export const DraggableFlashcard: React.FC<DraggableFlashcardProps> = ({ card, lang, onDelete, onEdit, readonly }) => {
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
        onDelete={onDelete} 
        onEdit={onEdit} 
        lang={lang}
        readonly={readonly}
      />
    </Reorder.Item>
  );
};
