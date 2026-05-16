import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAudio } from './hooks/useAudio';
import { useHandTracking } from './hooks/useHandTracking';
import { motion, AnimatePresence } from 'motion/react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ParticleScene } from './components/Visuals/ParticleScene';
import { TransparentObjectLayer } from './components/TransparentObjectLayer';
import { loadTransparentSettings, getTransparentStyleConfig, defaultSettings, DEFAULT_TRANSPARENT_IMAGE, type TransparentSettings, migrateToumingVisualSettings } from './lib/transparentConfig';
import { useLocalStorage } from './hooks/useLocalStorage';
import * as Tone from 'tone';
import * as THREE from 'three';
import { db, handleFirestoreError, OperationType, isFirebaseEnabled } from './lib/firebase';
import { doc, onSnapshot, setDoc, getDocFromServer } from 'firebase/firestore';
import { Camera, CameraOff } from 'lucide-react';

export default function App() {
  const { isStarted, startAudio, triggerNote, setMusicEvolution, evolution, getAudioData } = useAudio();
  const { isHandOpen, hasHandDetected, isCameraActive, startCamera, stopCamera } = useHandTracking();
  const [audioData, setAudioData] = useState(new Float32Array(1024));
  const [activeNodes, setActiveNodes] = useState<string[]>([]);
  const [interactionPoint, setInteractionPoint] = useState<THREE.Vector3 | null>(null);
  const [sourcePositions, setSourcePositions] = useState<THREE.Vector3[]>([]);
  const [isExploding, setIsExploding] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageFadedOut, setImageFadedOut] = useState(false);
  const [transparentSettings, setTransparentSettings] = useState<TransparentSettings>(defaultSettings);
  // per-image persisted visual overrides (whitelist only)
  const [lsImageOpacities, setLsImageOpacities] = useLocalStorage<Record<number, number>>('imageOpacities', {});
  const [lsUseBlendScreens, setLsUseBlendScreens] = useLocalStorage<Record<number, boolean>>('useBlendScreens', {});
  const [lsImageScales, setLsImageScales] = useLocalStorage<Record<number, number>>('imageScales', {});
  const [lsFilterIntensities, setLsFilterIntensities] = useLocalStorage<Record<number, number>>('filterIntensities', {});
  const [lsWobbleAmplitudes, setLsWobbleAmplitudes] = useLocalStorage<Record<number, number>>('wobbleAmplitudes', {});
  const [lsWobbleFrequencies, setLsWobbleFrequencies] = useLocalStorage<Record<number, number>>('wobbleFrequencies', {});
  const [importPreview, setImportPreview] = useState<null | { willImport: string[]; willIgnore: string[]; visual: Partial<TransparentSettings> }>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [lastImportBackupKey, setLastImportBackupKey] = useState<string | null>(null);
  const [mode, setMode] = useState<'idle' | 'interaction' | 'flow' | 'climax'>('idle');
  const [intensity, setIntensity] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'error' | 'connecting'>('connecting');
  const intensityRef = useRef(0);
  const requestRef = useRef<number>(null);
  const explosionTimeoutRef = useRef<number | null>(null);
  const restoreTimeoutRef = useRef<number | null>(null);
  const explosionConfig = React.useMemo(
    () => ({
      originalFadeDuration: 1200,
      particleExplosionDuration: 2200,
      restoreDelay: 450,
      cycleDelay: 2800,
    }),
    [],
  );

  useEffect(() => {
    let active = true;

    loadTransparentSettings().then((settings) => {
      if (active) setTransparentSettings(settings);
    });

    return () => {
      active = false;
    };
  }, []);

  const imageSources = transparentSettings.imageSources.length > 0 ? transparentSettings.imageSources : [DEFAULT_TRANSPARENT_IMAGE];
  const imageIndex = currentImageIndex % imageSources.length;
  const currentImageSource = imageSources[imageIndex] ?? DEFAULT_TRANSPARENT_IMAGE;
  const currentImageStyle = getTransparentStyleConfig(transparentSettings, imageIndex);

  // Build effective style by applying localStorage overrides (whitelist only) on top of loaded settings
  const effectiveStyle = {
    ...currentImageStyle,
    opacity: lsImageOpacities[imageIndex] ?? currentImageStyle.opacity,
    scale: lsImageScales[imageIndex] ?? currentImageStyle.scale,
    filterIntensity: lsFilterIntensities[imageIndex] ?? currentImageStyle.filterIntensity,
    useBlendScreen: lsUseBlendScreens[imageIndex] ?? currentImageStyle.useBlendScreen,
    wobbleAmplitude: lsWobbleAmplitudes[imageIndex] ?? currentImageStyle.wobbleAmplitude,
    wobbleFrequency: lsWobbleFrequencies[imageIndex] ?? currentImageStyle.wobbleFrequency,
  };

  useEffect(() => {
    setSourcePositions([]);
  }, [currentImageSource]);

  // Connectivity check
  const checkConnection = useCallback(async () => {
    if (!isFirebaseEnabled || !db) {
      setConnectionStatus('connected');
      return;
    }

    setConnectionStatus('connecting');
    try {
      const stateRef = doc(db, 'global', 'state');
      await getDocFromServer(stateRef);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Connection failed:', err);
      setTimeout(async () => {
        try {
          await getDocFromServer(doc(db, 'global', 'state'));
          setConnectionStatus('connected');
        } catch {
          setConnectionStatus('error');
        }
      }, 2000);
    }
  }, []);
  const lastSyncTimeRef = useRef<number>(Date.now());
  const clientId = useRef(Math.random().toString(36).substring(7));

  useEffect(() => {
    if (!isFirebaseEnabled || !db) {
      setConnectionStatus('connected');
      return;
    }

    checkConnection();
    const unsub = onSnapshot(doc(db, 'global', 'state'), (snapshot) => {
      if (snapshot.exists()) {
        setConnectionStatus('connected');
        const data = snapshot.data();
        
        // Sync evolution
        if (typeof data.evolution === 'number') {
           setMusicEvolution(data.evolution);
        }

        // Sync mode
        if (data.mode) setMode(data.mode);

        // Sync intensity
        if (typeof data.intensity === 'number') {
          intensityRef.current = data.intensity;
          setIntensity(data.intensity);
        }

        // Sync interaction point
        if (data.lastInteraction && data.lastInteraction.timestamp > lastSyncTimeRef.current) {
          lastSyncTimeRef.current = data.lastInteraction.timestamp;
          const point = new THREE.Vector3(data.lastInteraction.x, data.lastInteraction.y, data.lastInteraction.z);
          setInteractionPoint(point);
          triggerNote("C3");
        }

        // Sync active nodes
        if (data.activeNodes) setActiveNodes(data.activeNodes);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'global/state');
    });

    return () => unsub();
  }, [triggerNote, setMusicEvolution]);

  const syncToFirebase = useCallback(async (updates: any) => {
    if (!isFirebaseEnabled || !db) return;
    try {
      await setDoc(doc(db, 'global', 'state'), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'global/state');
    }
  }, []);

  // Animation frame for audio visualizer data and intensity decay
  const animate = useCallback(() => {
    setAudioData(getAudioData());
    
    // Decay intensity - slower decay for more "lingering" feel
    intensityRef.current = Math.max(0, intensityRef.current - 0.005);
    setIntensity(intensityRef.current);

    requestRef.current = requestAnimationFrame(animate);
  }, [getAudioData]);

  useEffect(() => {
    if (isStarted || true) { // Always run for intensity tracking on splash
      requestRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isStarted, animate]);

  const handleSplashPointerDown = async (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, label')) return;
    const target = e.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (!isStarted) {
      await startAudio();
    }

    await Tone.start();
    const notes = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "A5"];
    triggerNote(notes[Math.floor(Math.random() * notes.length)]);

    if (isExploding || imageFadedOut) return;

    const click = {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
    const point = new THREE.Vector3(
      click.x * 2 - 1,
      -(click.y * 2 - 1),
      0
    ).multiplyScalar(14);

    setInteractionPoint(point);
    setImageFadedOut(true);
    setMode('interaction');
    setIsExploding(true);

    const newIntensity = Math.min(1, intensityRef.current + 0.35);
    const newEvolution = Math.min(1, evolution + 0.05);
    intensityRef.current = newIntensity;
    setIntensity(newIntensity);
    setMusicEvolution(newEvolution);

    if (explosionTimeoutRef.current) {
      window.clearTimeout(explosionTimeoutRef.current);
    }
    if (restoreTimeoutRef.current) {
      window.clearTimeout(restoreTimeoutRef.current);
    }

    const nextIndex = (currentImageIndex + 1) % imageSources.length;
    explosionTimeoutRef.current = window.setTimeout(() => {
      setIsExploding(false);
      setMode('idle');
    }, explosionConfig.particleExplosionDuration);

    restoreTimeoutRef.current = window.setTimeout(() => {
      setInteractionPoint(null);
      setCurrentImageIndex(nextIndex);
      setImageFadedOut(false);
    }, explosionConfig.cycleDelay);

    syncToFirebase({
      lastInteraction: { x: point.x, y: point.y, z: point.z, timestamp: Date.now() },
      intensity: newIntensity,
      evolution: newEvolution,
      mode: 'interaction',
    });
  };

  const handleSplashPointerMove = (e: React.PointerEvent) => {
    if (mode === 'interaction' && e.currentTarget) {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const point = new THREE.Vector3(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
        0
      ).multiplyScalar(14);
      setInteractionPoint(point);
    }
  };

  const handleSplashPointerUp = () => {
    if (isExploding) return;
    setTimeout(() => {
      setInteractionPoint(null);
      setMode('idle');
    }, 100);
  };

  return (
    <div 
      className="fixed inset-0 bg-[#02040a] cursor-crosshair overflow-hidden select-none"
      onPointerDown={handleSplashPointerDown}
      onPointerMove={handleSplashPointerMove}
      onPointerUp={handleSplashPointerUp}
    >
      {/* Visual Canvas Layer */}
      <div className="absolute inset-0 z-12 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 15], fov: 60 }} dpr={[1, 2]} gl={{ antialias: false }}>
          <ambientLight intensity={0.5} />
          <ParticleScene 
            audioData={audioData} 
            interactionPoint={interactionPoint} 
            mode={evolution > 0.8 ? 'climax' : mode} 
            intensity={intensity}
            isStarted={true}
            isPaused={!isHandOpen}
            sourcePositions={sourcePositions}
            isExploding={isExploding}
          />
          <EffectComposer>
            <Bloom intensity={1.5 + intensity * 2} luminanceThreshold={0.2} luminanceSmoothing={0.9} />
          </EffectComposer>
        </Canvas>
      </div>

      <TransparentObjectLayer
        imageSrc={currentImageSource}
        imageConfig={effectiveStyle}
        isFadedOut={imageFadedOut}
        fadeDurationMs={explosionConfig.originalFadeDuration}
        onSourceReady={setSourcePositions}
        style={{ zIndex: 10 }}
      />

      {/* Import / Export visual settings (touming JSON) - safe whitelist import */}
      <div className="absolute top-6 right-6 pointer-events-auto z-40 flex items-center gap-2">
        <label title="Import visual settings" className="p-2 rounded bg-white/10 hover:bg-white/20 cursor-pointer">
          Import Visuals
          <input
            id="visual-import-input"
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const text = await file.text();
                const raw = JSON.parse(text);

                const visual = migrateToumingVisualSettings(raw as any) as Partial<TransparentSettings>;

                const allowedKeys = new Set(["imageOpacities", "imageScales", "filterIntensities", "useBlendScreens", "wobbleAmplitudes", "wobbleFrequencies", "opacity", "scale", "filterIntensity", "blendScreen", "mixBlendMode", "wobbleAmplitude", "wobbleFrequency"]);
                const rawKeys = raw && typeof raw === 'object' ? Object.keys(raw) : [];
                const willImport: string[] = [];
                const willIgnore: string[] = [];
                rawKeys.forEach(k => { if (allowedKeys.has(k)) willImport.push(k); else willIgnore.push(k); });

                setImportPreview({ willImport, willIgnore, visual });
                setShowImportModal(true);
                // keep input value for future imports
                e.currentTarget.value = '';
              } catch (err) {
                console.error('Failed to parse settings JSON', err);
                window.alert('Failed to parse settings JSON.');
                e.currentTarget.value = '';
              }
            }}
          />
        </label>

        <button
          title="Export visual settings"
          onClick={() => {
            // Build export object from current effective settings + ls overrides
            const exportObj: any = {};
            // merge transparentSettings base with ls overrides
            exportObj.imageOpacities = { ...(transparentSettings.imageOpacities || {}), ...(lsImageOpacities || {}) };
            exportObj.imageScales = { ...(transparentSettings.imageScales || {}), ...(lsImageScales || {}) };
            exportObj.filterIntensities = { ...(transparentSettings.filterIntensities || {}), ...(lsFilterIntensities || {}) };
            exportObj.useBlendScreens = { ...(transparentSettings.useBlendScreens || {}), ...(lsUseBlendScreens || {}) };
            exportObj.wobbleAmplitudes = { ...(transparentSettings.wobbleAmplitudes || {}), ...(lsWobbleAmplitudes || {}) };
            exportObj.wobbleFrequencies = { ...(transparentSettings.wobbleFrequencies || {}), ...(lsWobbleFrequencies || {}) };

            const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'baofa-visuals-export.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
          className="p-2 rounded bg-white/10 hover:bg-white/20"
        >
          Export Visuals
        </button>

        {lastImportBackupKey && (
          <button
            title="Undo last visual import"
            onClick={() => {
              try {
                const raw = localStorage.getItem(lastImportBackupKey);
                if (!raw) {
                  window.alert('No backup found to undo.');
                  setLastImportBackupKey(null);
                  return;
                }
                const prev = JSON.parse(raw);
                if (prev.imageOpacities) setLsImageOpacities(prev.imageOpacities);
                if (prev.imageScales) setLsImageScales(prev.imageScales);
                if (prev.filterIntensities) setLsFilterIntensities(prev.filterIntensities);
                if (prev.useBlendScreens) setLsUseBlendScreens(prev.useBlendScreens);
                if (prev.wobbleAmplitudes) setLsWobbleAmplitudes(prev.wobbleAmplitudes);
                if (prev.wobbleFrequencies) setLsWobbleFrequencies(prev.wobbleFrequencies);
                // also restore runtime transparentSettings pieces
                setTransparentSettings(prev.transparentSettings || transparentSettings);
                window.alert('Restored previous visual settings from backup.');
                localStorage.removeItem(lastImportBackupKey);
                setLastImportBackupKey(null);
              } catch (err) {
                console.error('Undo failed', err);
                window.alert('Failed to undo import.');
              }
            }}
            className="p-2 rounded bg-white/10 hover:bg-white/20"
          >
            Undo Import
          </button>
        )}

      </div>

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowImportModal(false); setImportPreview(null); }} />
          <div className="relative bg-white/5 border border-white/10 rounded-lg p-4 w-96 z-60 text-white backdrop-blur-md">
            <h3 className="text-sm font-bold mb-2">Import Visual Settings Preview</h3>
            <div className="text-xs mb-2">Will apply visual fields: <span className="font-mono">{importPreview.willImport.join(', ') || 'none'}</span></div>
            <div className="text-xs mb-4">Will ignore fields: <span className="font-mono">{importPreview.willIgnore.join(', ') || 'none'}</span></div>
            <div className="max-h-40 overflow-auto text-[12px] mb-3 bg-black/10 p-2 rounded">
              <pre className="whitespace-pre-wrap">{JSON.stringify(importPreview.visual, null, 2)}</pre>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-white/10" onClick={() => { setShowImportModal(false); setImportPreview(null); }}>Cancel</button>
              <button className="px-3 py-1 rounded bg-cyan-500" onClick={() => {
                // backup current visuals
                const backupKey = `visuals_backup_${Date.now()}`;
                const backup = {
                  imageOpacities: lsImageOpacities,
                  imageScales: lsImageScales,
                  filterIntensities: lsFilterIntensities,
                  useBlendScreens: lsUseBlendScreens,
                  wobbleAmplitudes: lsWobbleAmplitudes,
                  wobbleFrequencies: lsWobbleFrequencies,
                  transparentSettings
                };
                try {
                  localStorage.setItem(backupKey, JSON.stringify(backup));
                  setLastImportBackupKey(backupKey);
                } catch (err) {
                  console.warn('Backup failed', err);
                }

                const visual = importPreview.visual;
                const written: string[] = [];
                if (visual.imageOpacities && Object.keys(visual.imageOpacities).length > 0) {
                  setLsImageOpacities(prev => ({ ...prev, ...visual.imageOpacities }));
                  setTransparentSettings(prev => ({ ...prev, imageOpacities: { ...prev.imageOpacities, ...visual.imageOpacities } }));
                  written.push('imageOpacities');
                }
                if (visual.imageScales && Object.keys(visual.imageScales).length > 0) {
                  setLsImageScales(prev => ({ ...prev, ...visual.imageScales }));
                  setTransparentSettings(prev => ({ ...prev, imageScales: { ...prev.imageScales, ...visual.imageScales } }));
                  written.push('imageScales');
                }
                if (visual.filterIntensities && Object.keys(visual.filterIntensities).length > 0) {
                  setLsFilterIntensities(prev => ({ ...prev, ...visual.filterIntensities }));
                  setTransparentSettings(prev => ({ ...prev, filterIntensities: { ...prev.filterIntensities, ...visual.filterIntensities } }));
                  written.push('filterIntensities');
                }
                if (visual.useBlendScreens && Object.keys(visual.useBlendScreens).length > 0) {
                  setLsUseBlendScreens(prev => ({ ...prev, ...visual.useBlendScreens }));
                  setTransparentSettings(prev => ({ ...prev, useBlendScreens: { ...prev.useBlendScreens, ...visual.useBlendScreens } }));
                  written.push('useBlendScreens');
                }
                if (visual.wobbleAmplitudes && Object.keys(visual.wobbleAmplitudes).length > 0) {
                  setLsWobbleAmplitudes(prev => ({ ...prev, ...visual.wobbleAmplitudes }));
                  setTransparentSettings(prev => ({ ...prev, wobbleAmplitudes: { ...prev.wobbleAmplitudes, ...visual.wobbleAmplitudes } }));
                  written.push('wobbleAmplitudes');
                }
                if (visual.wobbleFrequencies && Object.keys(visual.wobbleFrequencies).length > 0) {
                  setLsWobbleFrequencies(prev => ({ ...prev, ...visual.wobbleFrequencies }));
                  setTransparentSettings(prev => ({ ...prev, wobbleFrequencies: { ...prev.wobbleFrequencies, ...visual.wobbleFrequencies } }));
                  written.push('wobbleFrequencies');
                }

                setShowImportModal(false);
                setImportPreview(null);
                window.alert(`Imported and wrote keys: ${written.join(', ') || 'none'}`);
              }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* Interface Layer */}
      <div className="absolute inset-0 z-20 flex pointer-events-none">
        <div className="absolute top-6 left-6 pointer-events-auto">
          <button
            onClick={() => isCameraActive ? stopCamera() : startCamera()}
            className={`p-3 rounded-full border transition-all duration-500 backdrop-blur-md ${isCameraActive ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400' : 'border-white/10 bg-white/5 text-white/40 hover:border-white/20 hover:bg-white/10'}`}
          >
            {isCameraActive ? <Camera size={18} /> : <CameraOff size={18} />}
          </button>
          
          {isCameraActive && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mt-3 px-3 py-1 bg-black/40 border border-white/10 rounded font-mono text-[8px] uppercase tracking-widest text-white/60"
            >
              System: {hasHandDetected ? (isHandOpen ? 'Open / 展开' : 'Closed / 握紧 (PAUSED)') : 'Searching for hand... / 搜寻手部...'}
            </motion.div>
          )}
        </div>
      </div>

      {/* Minimal Sync Status Overlay */}
      {connectionStatus === 'error' && (
        <div className="absolute bottom-4 right-4 text-[8px] font-mono text-red-500/40 uppercase tracking-widest animate-pulse pointer-events-none">
          Sync_Offline
        </div>
      )}
      {/* Particles Control Indicator */}
      <div className="fixed bottom-6 right-6 flex flex-col items-end gap-2 pointer-events-none z-50">
        <div className={`px-3 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase transition-all duration-500 border ${
          isCameraActive ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-gray-900/50 border-white/5 text-white/20'
        }`}>
          {isCameraActive ? (
            <span className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${hasHandDetected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'bg-gray-600'}`} />
              Motion: {hasHandDetected ? (isHandOpen ? 'Tracking' : 'Paused') : 'Scanning...'}
            </span>
          ) : (
            'Camera Offline'
          )}
        </div>
      </div>
    </div>
  );
}
