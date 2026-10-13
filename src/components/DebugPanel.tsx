import React from 'react';
import { Activity, Eye, Compass, X } from 'lucide-react';
import { DebugStats } from '../types';

interface DebugPanelProps {
  stats: DebugStats;
  showHitboxes: boolean;
  onToggleHitboxes: (val: boolean) => void;
  showVectors: boolean;
  onToggleVectors: (val: boolean) => void;
  showGrid: boolean;
  onToggleGrid: (val: boolean) => void;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  stats,
  showHitboxes,
  onToggleHitboxes,
  showVectors,
  onToggleVectors,
  showGrid,
  onToggleGrid,
  onClose,
}) => {
  return (
    <div
      id="debug-panel-card"
      className="fixed bottom-3 right-3 z-30 w-72 bg-[#25262A]/95 backdrop-blur border border-zinc-700 rounded-xl p-3 text-[#FFFDF7] shadow-xl font-mono text-xs select-none"
    >
      <div className="flex items-center justify-between border-b border-zinc-700 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>TELEMETRIA FÍSICA</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-0.5 rounded transition-colors"
          title="Fechar Debug Panel (Tecla D)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-2.5 bg-black/40 p-2 rounded-lg border border-zinc-800">
        <div>
          <span className="text-[10px] text-zinc-400 block">TAXA FPS</span>
          <span className={`text-base font-bold ${stats.fps >= 55 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats.fps}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 block">CORPOS TOTAIS</span>
          <span className="text-base font-bold text-cyan-400">{stats.bodyCount}</span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 block">PROPS CRIADOS</span>
          <span className={`text-sm font-semibold ${stats.userObjectCount >= (stats.maxUserObjects || 999) * 0.9 ? 'text-amber-300' : 'text-zinc-200'}`}>
            {stats.userObjectCount} / {stats.maxUserObjects > 0 ? stats.maxUserObjects : '∞'}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 block">EVICÇÕES (EXPURGOS)</span>
          <span className="text-sm font-semibold text-purple-400">
            {stats.evictedCount}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 block">CONSTRAINTS</span>
          <span className="text-sm font-semibold text-zinc-200">{stats.constraintCount}</span>
        </div>
        <div>
          <span className="text-[10px] text-zinc-400 block">VEL. DUMMY</span>
          <span className="text-sm font-semibold text-amber-300">{stats.ragdollSpeed.toFixed(1)} px/f</span>
        </div>
      </div>

      {/* Eviction Engine Status */}
      <div className="mb-2.5 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] flex items-center justify-between text-zinc-300">
        <span className="text-zinc-400">POLÍTICA DE EVICÇÃO:</span>
        <span className="font-semibold text-emerald-400">
          {stats.maxUserObjects > 0 ? `FIFO ${stats.maxUserObjects}` : 'SEM FIFO'} | {stats.objectLifespanSec > 0 ? `TTL ${stats.objectLifespanSec}s` : 'SEM TTL'}
        </span>
      </div>

      {/* Visual Toggles */}
      <div className="flex flex-col gap-1.5 border-t border-zinc-800 pt-2 text-[11px]">
        <label className="flex items-center justify-between cursor-pointer hover:text-white">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-red-400" />
            Hitboxes Poligonais
          </span>
          <input
            id="debug-toggle-hitboxes"
            type="checkbox"
            checked={showHitboxes}
            onChange={(e) => onToggleHitboxes(e.target.checked)}
            className="accent-red-500 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-400" />
            Vetores de Velocidade
          </span>
          <input
            id="debug-toggle-vectors"
            type="checkbox"
            checked={showVectors}
            onChange={(e) => onToggleVectors(e.target.checked)}
            className="accent-blue-500 cursor-pointer"
          />
        </label>

        <label className="flex items-center justify-between cursor-pointer hover:text-white">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-zinc-400 border-dashed rounded-sm inline-block" />
            Grade Métrica Laboratório
          </span>
          <input
            id="debug-toggle-grid"
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onToggleGrid(e.target.checked)}
            className="accent-zinc-400 cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
};
