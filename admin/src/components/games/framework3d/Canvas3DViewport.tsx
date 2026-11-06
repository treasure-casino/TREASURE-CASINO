import React, { useRef, useEffect, useState } from 'react';
import { Scene3DManager } from './Scene3DManager';
import { CameraManager } from './CameraManager';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Canvas3DViewportProps {
  onInit: (sceneManager: Scene3DManager, cameraManager: CameraManager) => void;
  onUpdate?: (delta: number, elapsed: number) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Canvas3DViewport: React.FC<Canvas3DViewportProps> = ({
  onInit,
  onUpdate,
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Verify WebGL availability
    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setWebglSupported(false);
      setErrorMessage('WebGL is disabled or unsupported on this device/browser.');
      return;
    }

    let sceneManager: Scene3DManager | null = null;
    try {
      sceneManager = new Scene3DManager(container, {
        antialias: true,
        alpha: true,
        enableShadows: true,
      });

      const cameraManager = new CameraManager(sceneManager.camera);

      // Register render loop updates
      sceneManager.registerUpdate((delta, elapsed) => {
        cameraManager.update(delta);
        if (onUpdate) {
          onUpdate(delta, elapsed);
        }
      });

      onInit(sceneManager, cameraManager);
    } catch (err: any) {
      console.error('Failed to initialize 3D scene:', err);
      setErrorMessage(err?.message || 'Failed to initialize 3D renderer');
    }

    return () => {
      if (sceneManager) {
        sceneManager.destroy();
      }
    };
  }, []);

  if (!webglSupported || errorMessage) {
    return (
      <div className={`relative flex flex-col items-center justify-center bg-dark-950 p-6 text-center text-white select-none ${className}`}>
        <div className="bg-dark-900 border border-rose-800/60 p-6 rounded-2xl max-w-sm space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <h3 className="text-lg font-bold">3D Graphics Hardware Acceleration Required</h3>
          <p className="text-xs text-gray-400">
            {errorMessage || 'WebGL acceleration is required to play 3D games.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 w-full py-2 bg-dark-800 hover:bg-dark-750 text-gold rounded-xl text-xs font-bold border border-gold/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Graphics</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden w-full h-full min-h-0 select-none ${className}`}>
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-0" />

      {/* HTML / React UI Overlay */}
      {children && <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">{children}</div>}
    </div>
  );
};

