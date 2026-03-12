import { useCallback } from 'react';

const SOUNDS = {
  SWIPE: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  NEXT: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  REVEAL: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
  CLICK: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  FLIP: 'https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3',
  CORRECT: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  INCORRECT: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  SCORE: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  TRANSITION: 'https://assets.mixkit.co/active_storage/sfx/2014/2014-preview.mp3',
};

export const useSound = () => {
  const playSound = useCallback((soundKey: keyof typeof SOUNDS) => {
    const audio = new Audio(SOUNDS[soundKey]);
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Audio playback failed:', err));
  }, []);

  return { playSound };
};
