import React from 'react';
import { Check } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-text/95 text-base shadow-lg text-xs font-medium backdrop-blur-sm pointer-events-none transition-all duration-150 animate-in fade-in slide-in-from-bottom-2">
      <Check size={13} className="text-green stroke-[2.5]" />
      <span>{message}</span>
    </div>
  );
};
