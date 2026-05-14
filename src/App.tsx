/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Settings, X } from 'lucide-react';

import { useLocalStorage } from './hooks';

import photo1 from './assets/images/photo1.png';
import photo2 from './assets/images/photo2.png';
import photo3 from './assets/images/photo3.png';
import photo4 from './assets/images/photo4.png';
import raincoat from './assets/images/raincoat.png';

const IMAGES = [
  photo1,
  photo2,
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/1.PNG",
  photo4,
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/17.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/18.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/2.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/3.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/4.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/5.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/6.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/7.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/8.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/9.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/10.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/11.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/19.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/13.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/14.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/15.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/16.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/20.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/21.PNG",
  "https://raw.githubusercontent.com/chenmanqi750-creator/myglb/main/22.PNG",
];

export default function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageOpacities, setImageOpacities] = useLocalStorage<Record<number, number>>("imageOpacities", {});
  const [useBlendScreens, setUseBlendScreens] = useLocalStorage<Record<number, boolean>>("useBlendScreens", {});
  const [imageScales, setImageScales] = useLocalStorage<Record<number, number>>("imageScales", {});
  const [filterIntensities, setFilterIntensities] = useLocalStorage<Record<number, number>>("filterIntensities", {});
  const [wobbleAmplitudes, setWobbleAmplitudes] = useLocalStorage<Record<number, number>>("wobbleAmplitudes", {});
  const [wobbleFrequencies, setWobbleFrequencies] = useLocalStorage<Record<number, number>>("wobbleFrequencies", {});
  const [isControlsOpen, setIsControlsOpen] = useLocalStorage<boolean>("isControlsOpen", true);

  const currentOpacity = imageOpacities[currentIndex] ?? 1;
  const currentBlendScreen = useBlendScreens[currentIndex] ?? false;
  const currentScale = imageScales[currentIndex] ?? 1;
  const currentFilterIntensity = filterIntensities[currentIndex] ?? 0;
  const currentWobbleAmplitude = wobbleAmplitudes[currentIndex] ?? 0;
  const currentWobbleFrequency = wobbleFrequencies[currentIndex] ?? 1;

  const handleOpacityChange = (val: number) => setImageOpacities(prev => ({ ...prev, [currentIndex]: val }));
  const handleBlendScreenChange = (val: boolean) => setUseBlendScreens(prev => ({ ...prev, [currentIndex]: val }));
  const handleScaleChange = (val: number) => {
    setImageScales(prev => ({ ...prev, [currentIndex]: val }));
  };
  const handleFilterIntensityChange = (val: number) => setFilterIntensities(prev => ({ ...prev, [currentIndex]: val }));
  const handleWobbleAmplitudeChange = (val: number) => setWobbleAmplitudes(prev => ({ ...prev, [currentIndex]: val }));
  const handleWobbleFrequencyChange = (val: number) => setWobbleFrequencies(prev => ({ ...prev, [currentIndex]: val }));

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % IMAGES.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
  };

  const filterString = `invert(${currentFilterIntensity}) grayscale(${currentFilterIntensity * 100}%) contrast(${1 + currentFilterIntensity}) brightness(${1 + currentFilterIntensity * 0.5})`;

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
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: currentScale * 0.95, filter: `${filterString} blur(10px)` }}
            animate={{ 
              opacity: currentOpacity, 
              scale: currentScale, 
              filter: `${filterString} blur(0px)`,
              y: currentWobbleAmplitude > 0 ? [0, -currentWobbleAmplitude, 0, currentWobbleAmplitude, 0] : 0,
              rotate: currentWobbleAmplitude > 0 ? [0, currentWobbleAmplitude * 0.1, 0, -currentWobbleAmplitude * 0.1, 0] : 0
            }}
            exit={{ opacity: 0, scale: currentScale * 1.05, filter: `${filterString} blur(10px)` }}
            transition={{ 
              duration: 0.8, 
              ease: [0.22, 1, 0.36, 1],
              y: { repeat: Infinity, duration: 10 / currentWobbleFrequency, ease: "easeInOut" },
              rotate: { repeat: Infinity, duration: 10 / currentWobbleFrequency, ease: "easeInOut" },
            }}
            className="w-full h-full object-contain md:max-w-5xl md:max-h-[80vh] p-8"
          >
            <img
              src={IMAGES[currentIndex]}
              alt={`Gallery image ${currentIndex + 1}`}
              className={`w-full h-full object-contain ${currentBlendScreen ? 'mix-blend-screen' : ''}`}
            />
          </motion.div>
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

      <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 md:gap-2 z-20 pointer-events-none flex-wrap justify-center w-[90%] md:w-auto md:max-w-[50vw]">
        {IMAGES.map((_, idx) => (
          <div 
            key={idx}
            className={`h-1 rounded-full transition-all duration-500 ${
              idx === currentIndex ? 'w-6 md:w-8 bg-white' : 'w-1.5 md:w-2 bg-white/20'
            }`}
          />
        ))}
      </div>

      <footer className="flex justify-between items-end z-20 w-full relative pointer-events-auto">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row gap-4 md:gap-12 text-[10px] uppercase tracking-[0.2em] opacity-60 pointer-events-none">
            <div>Click anywhere to advance</div>
          </div>
          
          {/* 控件已被隐藏，需要时只要移除下面这一行的 `false && (` 即可 */}
          {false && (
          <AnimatePresence mode="wait">
            {!isControlsOpen ? (
              <motion.button
                key="open-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={(e) => { e.stopPropagation(); setIsControlsOpen(true); }}
                className="w-10 h-10 rounded-full bg-white/20 blur-[1px] hover:blur-none backdrop-blur-md flex items-center justify-center transition-all border border-white/30"
              >
                <Settings size={18} className="text-white" />
              </motion.button>
            ) : (
              <motion.div 
                key="controls-panel"
                initial={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                className="flex flex-col gap-4 w-56 md:w-64 bg-black/40 p-4 rounded-xl backdrop-blur-md border border-white/10" 
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-[10px] uppercase tracking-widest text-white/90 font-bold">Settings</span>
                  <button onClick={() => setIsControlsOpen(false)} className="text-white/50 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="opacity-slider" className="text-[10px] uppercase tracking-widest text-white/70">
                      Opacity
                    </label>
                    <span className="text-[10px] text-white/70 font-mono">{Math.round(currentOpacity * 100)}%</span>
                  </div>
                  <input
                    id="opacity-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentOpacity}
                    onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="scale-slider" className="text-[10px] uppercase tracking-widest text-white/70">
                      Scale
                    </label>
                    <span className="text-[10px] text-white/70 font-mono">{currentScale.toFixed(1)}x</span>
                  </div>
                  <input
                    id="scale-slider"
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={currentScale}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="filter-intensity-slider" className="text-[10px] uppercase tracking-widest text-white/70">
                      Special Filter
                    </label>
                    <span className="text-[10px] text-white/70 font-mono">{Math.round(currentFilterIntensity * 100)}%</span>
                  </div>
                  <input
                    id="filter-intensity-slider"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={currentFilterIntensity}
                    onChange={(e) => handleFilterIntensityChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="wobble-amplitude-slider" className="text-[10px] uppercase tracking-widest text-white/70">
                      Wobble Amp
                    </label>
                    <span className="text-[10px] text-white/70 font-mono">{currentWobbleAmplitude}px</span>
                  </div>
                  <input
                    id="wobble-amplitude-slider"
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={currentWobbleAmplitude}
                    onChange={(e) => handleWobbleAmplitudeChange(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between">
                    <label htmlFor="wobble-frequency-slider" className="text-[10px] uppercase tracking-widest text-white/70">
                      Wobble Freq
                    </label>
                    <span className="text-[10px] text-white/70 font-mono">{currentWobbleFrequency}x</span>
                  </div>
                  <input
                    id="wobble-frequency-slider"
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={currentWobbleFrequency}
                    onChange={(e) => handleWobbleFrequencyChange(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <div className="w-full h-px bg-white/10 my-1" />

                <div className="flex items-center justify-between">
                  <label htmlFor="blend-toggle" className="text-[10px] uppercase tracking-widest text-white/70 cursor-pointer">
                    Blend Screen
                  </label>
                  <input
                    id="blend-toggle"
                    type="checkbox"
                    checked={currentBlendScreen}
                    onChange={(e) => handleBlendScreenChange(e.target.checked)}
                    className="cursor-pointer accent-white w-4 h-4 ml-2"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          )}
        </div>
        <div className="text-xl md:text-3xl font-serif italic flex gap-4 items-end pointer-events-none">
          <span className="text-sm opacity-50 block pb-1">No.</span> {String(currentIndex + 1).padStart(2, '0')}
        </div>
      </footer>
    </div>
  );
}
