import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsWorld } from './physics/PhysicsWorld';
import { JuiceRenderer } from './renderer/JuiceRenderer';
import { soundEngine } from './audio/SoundEngine';
import { Toolbar } from './components/Toolbar';
import { PhysicsControlsHUD } from './components/PhysicsControlsHUD';
import { DebugPanel } from './components/DebugPanel';
import { ControlsHelpModal } from './components/ControlsHelpModal';
import {
  ToolMode,
  SpawnableObjectType,
  SceneId,
  PhysicsParams,
  SkinStyle,
  DebugStats,
} from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<PhysicsWorld | null>(null);
  const rendererRef = useRef<JuiceRenderer | null>(null);

  // Application State
  const [currentTool, setCurrentTool] = useState<ToolMode>('drag');
  const [selectedSpawnObject, setSelectedSpawnObject] = useState<SpawnableObjectType>('small_box');
  const [currentScene, setCurrentScene] = useState<SceneId>('arena');
  const [skinStyle, setSkinStyle] = useState<SkinStyle>('dummy');
  const [isToolbarOpen, setIsToolbarOpen] = useState<boolean>(true);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSlowMo, setIsSlowMo] = useState<boolean>(false);

  // Aiming / Slingshot throw state
  const [aimState, setAimState] = useState<{
    isAiming: boolean;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    isAiming: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  // Telemetry Stats
  const [debugStats, setDebugStats] = useState<DebugStats>({
    fps: 60,
    bodyCount: 0,
    constraintCount: 0,
    ragdollSpeed: 0,
    ragdollCenterY: 0,
    collisionEventsLastSec: 0,
    userObjectCount: 0,
    maxUserObjects: 60,
    evictedCount: 0,
    objectLifespanSec: 30,
  });

  const [physicsParams, setPhysicsParams] = useState<PhysicsParams>({
    gravityY: 1.5,
    gravityX: 0,
    jointStiffness: 0.6,
    ragdollMassScale: 1.0,
    explosionRadius: 220,
    explosionMagnitude: 0.12,
    timeScale: 1.0,
    airResistance: 0.015,
    maxUserObjects: 60,
    objectLifespanSec: 30,
  });

  // Initialize Physics and Canvas Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 1000;
    const height = container.clientHeight || 700;

    canvas.width = width;
    canvas.height = height;

    const world = new PhysicsWorld(width, height);
    const renderer = new JuiceRenderer(canvas, world);
    renderer.skinStyle = 'dummy';

    worldRef.current = world;
    rendererRef.current = renderer;

    // Fixed timestep game loop (GDD Section 7.2)
    const FIXED_DT = 1000 / 60; // 16.67ms
    let accumulator = 0;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;
    let animFrameId: number;

    const tick = (currentTime: number) => {
      const delta = Math.min(currentTime - lastTime, 50);
      lastTime = currentTime;
      accumulator += delta;

      frameCount++;
      if (currentTime - lastFpsUpdate >= 500) {
        currentFps = Math.round((frameCount * 1000) / (currentTime - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = currentTime;

        // Telemetry update
        const primaryRagdoll = world.ragdolls[0];
        let speed = 0;
        let cY = 0;
        if (primaryRagdoll) {
          const chest = primaryRagdoll.parts.chest;
          speed = Math.hypot(chest.velocity.x, chest.velocity.y);
          cY = chest.position.y;
        }

        setDebugStats({
          fps: currentFps,
          bodyCount: world.engine.world.bodies.length,
          constraintCount: world.engine.world.constraints.length,
          ragdollSpeed: speed,
          ragdollCenterY: cY,
          collisionEventsLastSec: 0,
          userObjectCount: world.userBodies.length,
          maxUserObjects: world.params.maxUserObjects,
          evictedCount: world.evictedCount,
          objectLifespanSec: world.params.objectLifespanSec,
        });
      }

      // Physics steps
      while (accumulator >= FIXED_DT) {
        world.update(FIXED_DT);
        accumulator -= FIXED_DT;
      }

      // Draw with interpolation alpha
      const alpha = accumulator / FIXED_DT;
      renderer.render(alpha);

      // Render aiming vector arrow if in throw mode
      if (aimState.isAiming) {
        drawAimVector(renderer.ctx, aimState.startX, aimState.startY, aimState.currentX, aimState.currentY);
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);

    // Responsive Canvas Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 100 && newH > 100) {
          canvas.width = newW;
          canvas.height = newH;
          world.resize(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  // Sync Skin Style changes
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.skinStyle = skinStyle;
    }
  }, [skinStyle]);

  // Sync Physics Params
  const handleUpdatePhysicsParams = useCallback((newParams: Partial<PhysicsParams>) => {
    setPhysicsParams((prev) => {
      const updated = { ...prev, ...newParams };
      worldRef.current?.updateParameters(updated);
      return updated;
    });
  }, []);

  // Direct keyboard motor controls & shortcuts (GDD Section 5.4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is in an input or modal
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const key = e.key.toLowerCase();
      const world = worldRef.current;
      if (!world) return;

      soundEngine.ensureRunning();

      if (key === 'w' || e.key === 'ArrowUp') {
        world.triggerDirectControl('up');
      } else if (key === 'a' || e.key === 'ArrowLeft') {
        world.triggerDirectControl('left');
      } else if (key === 'd' && !e.ctrlKey && !e.metaKey && e.code === 'KeyD') {
        // Direct control right impulse
        world.triggerDirectControl('right');
      } else if (e.code === 'Space') {
        e.preventDefault();
        world.triggerDirectControl('jump');
      } else if (key === 'r') {
        world.resetRagdollPosition();
      } else if (key === 'g') {
        // Toggle gravity between normal 1.5, inverted -1.5, and zero-G
        const nextG = physicsParams.gravityY > 0 ? -1.5 : physicsParams.gravityY < 0 ? 0 : 1.5;
        handleUpdatePhysicsParams({ gravityY: nextG });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [physicsParams.gravityY, handleUpdatePhysicsParams]);

  // Helper to draw slingshot trajectory arrow
  const drawAimVector = (
    ctx: CanvasRenderingContext2D,
    sx: number,
    sy: number,
    cx: number,
    cy: number
  ) => {
    const dx = sx - cx;
    const dy = sy - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return;

    ctx.save();
    ctx.strokeStyle = '#4C8DFF';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + dx * 1.5, sy + dy * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow head
    const angle = Math.atan2(dy, dx);
    const headLen = 14;
    const tipX = sx + dx * 1.5;
    const tipY = sy + dy * 1.5;

    ctx.fillStyle = '#4C8DFF';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX - headLen * Math.cos(angle - Math.PI / 6), tipY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tipX - headLen * Math.cos(angle + Math.PI / 6), tipY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();

    // Pull-back power ring
    ctx.strokeStyle = '#F5C84B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.min(dist * 0.4, 40), 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  };

  // Canvas Mouse & Touch Interaction Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    soundEngine.ensureRunning();

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Right-click or Shift-Click -> Radial explosion
    if (e.button === 2 || e.shiftKey || currentTool === 'explode') {
      e.preventDefault();
      world.applyExplosion(x, y, physicsParams.explosionRadius, physicsParams.explosionMagnitude);
      return;
    }

    if (currentTool === 'throw') {
      // Start slingshot aim
      setAimState({
        isAiming: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
      });
      return;
    }

    if (currentTool === 'spawn') {
      // Spawn object immediately at cursor
      world.spawnObject(selectedSpawnObject, x, y);
      soundEngine.playThrow();
      return;
    }

    // Default: Drag interaction
    world.dragStart(x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (aimState.isAiming) {
      setAimState((prev) => ({ ...prev, currentX: x, currentY: y }));
      return;
    }

    world.dragMove(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!canvas || !world) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (aimState.isAiming) {
      const impulseVector = {
        x: (aimState.startX - x) * 0.8,
        y: (aimState.startY - y) * 0.8,
      };

      world.spawnObject(selectedSpawnObject, aimState.startX, aimState.startY, impulseVector);
      soundEngine.playThrow();

      setAimState({
        isAiming: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
      });
      return;
    }

    world.dragEnd();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent browser context menu so right click cleanly detonates!
  };

  // Scene Selection Handler
  const handleSelectScene = (sceneId: SceneId) => {
    setCurrentScene(sceneId);
    worldRef.current?.loadScene(sceneId);
  };

  // Reset Actions
  const handleResetRagdoll = () => {
    worldRef.current?.resetRagdollPosition();
  };

  const handleResetScene = () => {
    worldRef.current?.resetCurrentScene();
  };

  const handleClearUserObjects = () => {
    worldRef.current?.clearUserObjects();
  };

  // Audio Toggle
  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  // Slow-Mo Toggle
  const handleToggleSlowMo = () => {
    const nextSlowMo = !isSlowMo;
    setIsSlowMo(nextSlowMo);
    handleUpdatePhysicsParams({ timeScale: nextSlowMo ? 0.25 : 1.0 });
  };

  // Screenshot Export
  const handleExportScreenshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `ragdoll-sandbox-${currentScene}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.warn('Screenshot export failed:', err);
    }
  };

  return (
    <main
      id="ragdoll-sandbox-app"
      className="relative w-screen h-screen overflow-hidden bg-[#F2EFE6] font-sans select-none"
    >
      {/* Left Collapsible Tools & Spawner Toolbar */}
      <Toolbar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        selectedSpawnObject={selectedSpawnObject}
        onSelectSpawnObject={setSelectedSpawnObject}
        currentScene={currentScene}
        onSelectScene={handleSelectScene}
        onResetRagdoll={handleResetRagdoll}
        onResetScene={handleResetScene}
        onClearUserObjects={handleClearUserObjects}
        isOpen={isToolbarOpen}
        onToggleOpen={() => setIsToolbarOpen(!isToolbarOpen)}
        userObjectCount={debugStats.userObjectCount}
        maxUserObjects={physicsParams.maxUserObjects}
      />

      {/* Top Right Physics HUD & Sliders */}
      <PhysicsControlsHUD
        params={physicsParams}
        onUpdateParams={handleUpdatePhysicsParams}
        skinStyle={skinStyle}
        onSelectSkin={setSkinStyle}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isDebugOpen={isDebugOpen}
        onToggleDebug={() => setIsDebugOpen(!isDebugOpen)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onExportScreenshot={handleExportScreenshot}
        isSlowMo={isSlowMo}
        onToggleSlowMo={handleToggleSlowMo}
      />

      {/* Floating Bottom Quick Motor Controls Bar (Euphoria Key Shortcuts) */}
      <div
        id="quick-motor-bar"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-1.5 bg-[#F8F7F3]/90 backdrop-blur border-2 border-[#25262A] rounded-xl px-3 py-1.5 shadow-[3px_3px_0px_#25262A] text-xs text-[#25262A]"
      >
        <span className="font-bold text-[10px] text-zinc-500 uppercase tracking-wider mr-1">
          Músculos:
        </span>
        <button
          id="motor-btn-up"
          onClick={() => worldRef.current?.triggerDirectControl('up')}
          className="px-2 py-0.5 rounded bg-white hover:bg-zinc-100 border border-zinc-300 font-mono text-[11px] font-bold shadow-sm"
          title="Erguer Torso (W)"
        >
          [W] Erguer
        </button>
        <button
          id="motor-btn-left"
          onClick={() => worldRef.current?.triggerDirectControl('left')}
          className="px-2 py-0.5 rounded bg-white hover:bg-zinc-100 border border-zinc-300 font-mono text-[11px] font-bold shadow-sm"
          title="Inclinar Esquerda (A)"
        >
          [A] Girar ◄
        </button>
        <button
          id="motor-btn-right"
          onClick={() => worldRef.current?.triggerDirectControl('right')}
          className="px-2 py-0.5 rounded bg-white hover:bg-zinc-100 border border-zinc-300 font-mono text-[11px] font-bold shadow-sm"
          title="Inclinar Direita (D)"
        >
          [D] Girar ►
        </button>
        <button
          id="motor-btn-jump"
          onClick={() => worldRef.current?.triggerDirectControl('jump')}
          className="px-2 py-0.5 rounded bg-[#F5C84B] hover:bg-amber-400 border border-[#25262A] font-mono text-[11px] font-bold shadow-sm"
          title="Salto / Chute (Espaço)"
        >
          [Espaço] Salto
        </button>
      </div>

      {/* Telemetry Debug Panel */}
      {isDebugOpen && (
        <DebugPanel
          stats={debugStats}
          showHitboxes={rendererRef.current?.showDebugHitboxes || false}
          onToggleHitboxes={(val) => {
            if (rendererRef.current) rendererRef.current.showDebugHitboxes = val;
          }}
          showVectors={rendererRef.current?.showForceVectors || false}
          onToggleVectors={(val) => {
            if (rendererRef.current) rendererRef.current.showForceVectors = val;
          }}
          showGrid={rendererRef.current?.showGrid ?? true}
          onToggleGrid={(val) => {
            if (rendererRef.current) rendererRef.current.showGrid = val;
          }}
          onClose={() => setIsDebugOpen(false)}
        />
      )}

      {/* Keyboard Controls & Philosophy Guide Modal */}
      <ControlsHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Main Physics Simulation Canvas Container */}
      <div
        ref={containerRef}
        id="canvas-viewport"
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
      >
        <canvas
          ref={canvasRef}
          id="physics-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={handleContextMenu}
          className="block w-full h-full"
        />
      </div>
    </main>
  );
}
