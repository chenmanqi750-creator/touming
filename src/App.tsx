/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const IMAGES = [
  '/images/photo1.png',
  '/images/photo2.png',
  '/images/photo3.png',
  '/images/photo4.png',
  '/images/raincoat.png'
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
  };

  return (
    <div 
      className="relative min-h-screen w-full bg-black text-white overflow-hidden font-sans flex flex-col justify-between p-6 md:p-12 cursor-pointer"
      onClick={nextImage}
    >
      <nav className="flex justify-between items-start z-20 w-full relative pointer-events-none">
        <div className="text-xs tracking-[0.4em] font-bold uppercase opacity-80">
          Studio / Gallery
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Collection</p>
          <p className="text-sm font-light">Dark Canvas</p>
        </div>
      </nav>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <AnimatePresence mode="popLayout">
          <motion.img
            key={currentIndex}
            src={IMAGES[currentIndex]}
            alt={`Gallery image ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95, filter: 'invert(1) grayscale(100%) contrast(2) brightness(1.5) blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'invert(1) grayscale(100%) contrast(2) brightness(1.5) blur(0px)' }}
            exit={{ opacity: 0, scale: 1.05, filter: 'invert(1) grayscale(100%) contrast(2) brightness(1.5) blur(10px)' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full object-contain md:max-w-5xl md:max-h-[80vh] p-8 mix-blend-screen"
          />
        </AnimatePresence>
      </div>

      <div className="absolute inset-y-0 left-0 w-32 md:w-64 flex items-center justify-start px-4 md:px-8 z-10">
        <button 
          onClick={prevImage}
          className="p-4 rounded-full bg-black/20 hover:bg-white/10 backdrop-blur-md border border-white/5 text-white/50 hover:text-white transition-all opacity-0 md:opacity-100"
        >
          <ChevronLeft size={24} />
        </button>
      </div>

      <div className="absolute inset-y-0 right-0 w-32 md:w-64 flex items-center justify-end px-4 md:px-8 z-10">
        <button 
          onClick={nextImage}
          className="p-4 rounded-full bg-black/20 hover:bg-white/10 backdrop-blur-md border border-white/5 text-white/50 hover:text-white transition-all opacity-0 md:opacity-100"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20 pointer-events-none">
        {IMAGES.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1 rounded-full transition-all duration-500 ${
              idx === currentIndex ? 'w-8 bg-white' : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>

      <footer className="flex justify-between items-end z-20 w-full relative pointer-events-none">
        <div className="flex flex-col md:flex-row gap-4 md:gap-12 text-[10px] uppercase tracking-[0.2em] opacity-60">
          <div>Click anywhere to advance</div>
        </div>
        <div className="text-xl md:text-3xl font-serif italic flex gap-4 items-end">
          <span className="text-sm opacity-50 block pb-1">No.</span> {String(currentIndex + 1).padStart(2, '0')}
        </div>
      </footer>
    </div>
  );
}
