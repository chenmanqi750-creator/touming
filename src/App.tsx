/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Settings, X, Download, Upload } from 'lucide-react';

import { useLocalStorage } from './hooks';
import { claimQueue, type QueueClaim } from './queue';

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

// 预设方案定义 - 透明度统一为 83%
const PRESETS = {
  gentle: { opacity: 0.83, scale: 0.85, wobbleAmplitude: 3, wobbleFrequency: 0.6, blendScreen: false },
  pulse: { opacity: 0.83, scale: 1.5, wobbleAmplitude: 8, wobbleFrequency: 1.2, blendScreen: false },
  flow: { opacity: 0.83, scale: 1.0, wobbleAmplitude: 5, wobbleFrequency: 0.8, blendScreen: true }
};

const PRESET_ICONS: Record<keyof typeof PRESETS, { label: string; svg: string }> = {
  gentle: { label: 'Gentle', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20M5.64 5.64l14.14 14.14M18.36 5.64L4.22 19.78"/></svg>' },
  pulse: { label: 'Pulse', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2-4 2 8 2-4h8M6 19l2-2m6 2l2-2"/></svg>' },
  flow: { label: 'Flow', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c0-4 4-6 8-6 2 0 3 1 4 2 1-1 2-2 4-2 4 0 8 2 8 6M6 20c2-1 3-3 6-3s4 2 6 3"/></svg>' }
};

export default function App() {
  const [deviceId, setDeviceId] = useLocalStorage<string>('touming-device-id', ensureDeviceId());
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [queueClaim, setQueueClaim] = useState<QueueClaim | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isRejoiningQueue, setIsRejoiningQueue] = useState(false);
  const [imageOpacities, setImageOpacities] = useLocalStorage<Record<number, number>>('imageOpacities', {});
  const [useBlendScreens, setUseBlendScreens] = useLocalStorage<Record<number, boolean>>('useBlendScreens', {});
  const [imageScales, setImageScales] = useLocalStorage<Record<number, number>>('imageScales', {});
  const [filterIntensities, setFilterIntensities] = useLocalStorage<Record<number, number>>('filterIntensities', {});
  const [wobbleAmplitudes, setWobbleAmplitudes] = useLocalStorage<Record<number, number>>('wobbleAmplitudes', {});
  const [wobbleFrequencies, setWobbleFrequencies] = useLocalStorage<Record<number, number>>('wobbleFrequencies', {});
  const [isControlsOpen, setIsControlsOpen] = useLocalStorage<boolean>('isControlsOpen', true);
  const [selectedPreset, setSelectedPreset] = useLocalStorage<Record<number, string>>('selectedPreset', {});

  useEffect(() => {
    let cancelled = false;

    const syncQueue = async () => {
      try {
        const claim = await claimQueue(deviceId);
        if (cancelled) return;

        setQueueClaim(claim);
        setQueueError(null);
        setCurrentIndex((prev) => prev ?? ((claim.queuePosition - 1) % IMAGES.length));
      } catch (error) {
        if (cancelled) return;

        console.error('Failed to claim queue slot:', error);
        setQueueError('队列服务不可用，已切回本地模式。');
        setCurrentIndex((prev) => prev ?? 0);
      } finally {
        if (!cancelled) setIsQueueLoading(false);
      }
    };

    syncQueue();
    const timer = window.setInterval(syncQueue, 15000);
    window.addEventListener('focus', syncQueue);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', syncQueue);
    };
  }, [deviceId]);

  const activeIndex = currentIndex ?? 0;
  const currentOpacity = imageOpacities[activeIndex] ?? 0.83;
  const currentBlendScreen = useBlendScreens[activeIndex] ?? false;
  const currentScale = imageScales[activeIndex] ?? 1;
  const currentFilterIntensity = filterIntensities[activeIndex] ?? 0.8;
  const currentWobbleAmplitude = wobbleAmplitudes[activeIndex] ?? 0;
  const currentWobbleFrequency = wobbleFrequencies[activeIndex] ?? 1;
  const queueBadge = queueClaim
    ? `排队 #${String(queueClaim.queuePosition).padStart(2, '0')}`
    : queueError ?? '正在连接...';

  const handleOpacityChange = (val: number) => setImageOpacities(prev => ({ ...prev, [activeIndex]: val }));
  const handleBlendScreenChange = (val: boolean) => setUseBlendScreens(prev => ({ ...prev, [activeIndex]: val }));
  const handleScaleChange = (val: number) => {
    setImageScales(prev => ({ ...prev, [activeIndex]: val }));
  };
  const handleFilterIntensityChange = (val: number) => setFilterIntensities(prev => ({ ...prev, [activeIndex]: val }));
  const handleWobbleAmplitudeChange = (val: number) => setWobbleAmplitudes(prev => ({ ...prev, [activeIndex]: val }));
  const handleWobbleFrequencyChange = (val: number) => setWobbleFrequencies(prev => ({ ...prev, [activeIndex]: val }));

  const applyPreset = (presetName: keyof typeof PRESETS) => {
    const preset = PRESETS[presetName];
    setImageOpacities(prev => ({ ...prev, [activeIndex]: preset.opacity }));
    setImageScales(prev => ({ ...prev, [activeIndex]: preset.scale }));
    setWobbleAmplitudes(prev => ({ ...prev, [activeIndex]: preset.wobbleAmplitude }));
    setWobbleFrequencies(prev => ({ ...prev, [activeIndex]: preset.wobbleFrequency }));
    setUseBlendScreens(prev => ({ ...prev, [activeIndex]: preset.blendScreen }));
    setSelectedPreset(prev => ({ ...prev, [activeIndex]: presetName }));
  };

  const nextImage = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    if (isQueueLoading && currentIndex === null) return;
    setCurrentIndex((prev) => ((prev ?? 0) + 1) % IMAGES.length);
  };

  const prevImage = (e?: MouseEvent) => {
    if (e) e.stopPropagation();
    if (isQueueLoading && currentIndex === null) return;
    setCurrentIndex((prev) => {
      const current = prev ?? 0;
      return current === 0 ? IMAGES.length - 1 : current - 1;
    });
  };

  const rejoinQueue = async (e: MouseEvent) => {
    e.stopPropagation();
    setIsRejoiningQueue(true);
    setIsQueueLoading(true);
    setQueueClaim(null);
    setQueueError(null);
    setCurrentIndex(null);

    const nextDeviceId = window.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setDeviceId(nextDeviceId);

    try {
      const claim = await claimQueue(nextDeviceId);
      setQueueClaim(claim);
      setCurrentIndex((claim.queuePosition - 1) % IMAGES.length);
    } catch (error) {
      console.error('Failed to rejoin queue:', error);
      setQueueError('队列服务不可用，已切回本地模式。');
      setCurrentIndex(0);
    } finally {
      setIsQueueLoading(false);
      setIsRejoiningQueue(false);
    }
  };


  const exportData = (e: MouseEvent) => {
    e.stopPropagation();
    const data = {
      imageOpacities,
      useBlendScreens,
      imageScales,
      filterIntensities,
      wobbleAmplitudes,
      wobbleFrequencies
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gallery-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importData = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.imageOpacities) setImageOpacities(data.imageOpacities);
        if (data.useBlendScreens) setUseBlendScreens(data.useBlendScreens);
        if (data.imageScales) setImageScales(data.imageScales);
        if (data.filterIntensities) setFilterIntensities(data.filterIntensities);
        if (data.wobbleAmplitudes) setWobbleAmplitudes(data.wobbleAmplitudes);
        if (data.wobbleFrequencies) setWobbleFrequencies(data.wobbleFrequencies);
      } catch (error) {
        console.error("Failed to parse settings JSON");
        alert("Failed to parse settings JSON.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
        <div className="text-right flex flex-col gap-4 items-end pointer-events-auto">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Collection</p>
            <p className="text-sm font-light">Dark Canvas</p>
          </div>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md">
            {queueBadge}
          </div>
          <button
            onClick={rejoinQueue}
            disabled={isQueueLoading || isRejoiningQueue}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white/75 backdrop-blur-md transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRejoiningQueue ? '重新排队中...' : '重新排队'}
          </button>
          <div className="flex gap-2">
            <label className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md cursor-pointer transition-colors" title="Import Settings">
              <Upload size={14} />
              <input type="file" accept=".json" className="hidden" onChange={importData} onClick={e => e.stopPropagation()} />
            </label>
            <button onClick={exportData} className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md transition-colors" title="Export Settings">
              <Download size={14} />
            </button>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={activeIndex}
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
              src={IMAGES[activeIndex]}
              alt={`Gallery image ${activeIndex + 1}`}
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
              <motion.div
                key="preset-buttons"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-row gap-3 items-center"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setIsControlsOpen(true); }}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center transition-all border border-white/30 text-white/70 hover:text-white"
                  title="Open Settings"
                >
                  <Settings size={18} />
                </button>
                <div className="flex flex-row gap-2">
                  {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(presetName => (
                    <motion.button
                      key={`preset-icon-${presetName}`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => { e.stopPropagation(); applyPreset(presetName); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
                        selectedPreset[activeIndex] === presetName
                          ? 'bg-white text-black border-white/80'
                          : 'bg-white/10 text-white/70 border-white/20 hover:bg-white/20 hover:border-white/40'
                      }`}
                      title={PRESET_ICONS[presetName].label}
                    >
                      <div
                        className="w-5 h-5"
                        dangerouslySetInnerHTML={{ __html: PRESET_ICONS[presetName].svg }}
                      />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
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
                  <label className="text-[10px] uppercase tracking-widest text-white/70">Presets</label>
                  <div className="flex gap-2 flex-wrap">
                    {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map(presetName => (
                      <button
                        key={presetName}
                        onClick={() => applyPreset(presetName)}
                        className={`px-2 py-1 text-[9px] uppercase tracking-widest rounded transition-all ${
                          selectedPreset[activeIndex] === presetName
                            ? 'bg-white text-black font-semibold'
                            : 'bg-white/20 text-white/70 hover:bg-white/30'
                        }`}
                      >
                        {presetName}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-white/10" />

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
          <span className="text-sm opacity-50 block pb-1">No.</span> {currentIndex === null ? '--' : String(activeIndex + 1).padStart(2, '0')}
        </div>
      </footer>
    </div>
  );
}

function ensureDeviceId() {
  const existing = window.localStorage.getItem('touming-device-id');
  if (existing) return existing;

  const value = window.crypto?.randomUUID?.() ?? `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem('touming-device-id', value);
  return value;
}
