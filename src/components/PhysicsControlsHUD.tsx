import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Camera,
  Play,
  Pause,
  Gauge,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Palette,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { PhysicsParams, SkinStyle } from '../types';

interface PhysicsControlsHUDProps {
  params: PhysicsParams;
  onUpdateParams: (newParams: Partial<PhysicsParams>) => void;
  skinStyle: SkinStyle;
  onSelectSkin: (skin: SkinStyle) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isDebugOpen: boolean;
  onToggleDebug: () => void;
  onOpenHelp: () => void;
  onExportScreenshot: () => void;
  isSlowMo: boolean;
  onToggleSlowMo: () => void;
}

export const PhysicsControlsHUD: React.FC<PhysicsControlsHUDProps> = ({
  params,
  onUpdateParams,
  skinStyle,
  onSelectSkin,
  isMuted,
  onToggleMute,
  isDebugOpen,
  onToggleDebug,
  onOpenHelp,
  onExportScreenshot,
  isSlowMo,
  onToggleSlowMo,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div id="controls-hud-container" className="fixed right-3 top-3 z-30 flex flex-col items-end gap-2 select-none">
      {/* Top quick action cluster */}
      <div className="flex items-center gap-1.5 bg-[#F8F7F3] border-2 border-[#25262A] rounded-xl p-1.5 shadow-[4px_4px_0px_#25262A]">
        {/* Slow-mo Toggle */}
        <button
          id="btn-toggle-slowmo"
          onClick={onToggleSlowMo}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${
            isSlowMo
              ? 'bg-[#F5C84B] text-[#25262A] border-[#25262A]'
              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
          }`}
          title="Alternar Câmera Lenta (0.25x)"
        >
          <Gauge className="w-3.5 h-3.5" />
          <span>{isSlowMo ? '0.25x SLOW' : '1.0x NORMAL'}</span>
        </button>

        {/* Audio Mute Toggle */}
        <button
          id="btn-toggle-audio"
          onClick={onToggleMute}
          className={`p-1.5 rounded-lg border transition-all ${
            isMuted
              ? 'bg-zinc-200 text-zinc-500 border-zinc-300'
              : 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100'
          }`}
          title={isMuted ? 'Desmutar Áudio' : 'Mutar Áudio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Screenshot capture */}
        <button
          id="btn-screenshot"
          onClick={onExportScreenshot}
          className="p-1.5 rounded-lg border bg-white hover:bg-zinc-100 text-zinc-800 border-zinc-300 transition-all"
          title="Capturar Foto da Experiência"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Debug Toggle */}
        <button
          id="btn-toggle-debug"
          onClick={onToggleDebug}
          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-all ${
            isDebugOpen
              ? 'bg-[#25262A] text-[#FFFDF7] border-[#25262A]'
              : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
          }`}
          title="Ativar Telemetria e Hitboxes (Tecla D)"
        >
          DEBUG [D]
        </button>

        {/* Expand Sliders Drawer */}
        <button
          id="btn-toggle-sliders"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-xs font-bold ${
            isExpanded
              ? 'bg-[#4C8DFF] text-white border-[#25262A]'
              : 'bg-white text-zinc-800 border-zinc-300 hover:bg-zinc-100'
          }`}
          title="Ajustar Parâmetros de Física"
        >
          <Sliders className="w-4 h-4" />
          <span className="hidden sm:inline">Parâmetros</span>
        </button>

        {/* Help */}
        <button
          id="btn-open-help"
          onClick={onOpenHelp}
          className="p-1.5 rounded-lg border bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-300 transition-all"
          title="Guia de Comandos e Física"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded Laboratory Sliders & Skin Drawer */}
      {isExpanded && (
        <div
          id="hud-sliders-panel"
          className="w-80 bg-[#F8F7F3] border-2 border-[#25262A] rounded-xl p-3 shadow-[4px_4px_0px_#25262A] text-[#25262A] flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between border-b border-zinc-300 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#4C8DFF]" />
              Calibração de Laboratório
            </span>
            <button
              onClick={() => {
                onUpdateParams({
                  gravityY: 1.5,
                  gravityX: 0,
                  jointStiffness: 0.6,
                  explosionRadius: 220,
                  explosionMagnitude: 0.12,
                });
              }}
              className="text-[10px] text-zinc-500 hover:text-zinc-900 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Padrões
            </button>
          </div>

          {/* Skin Style Switcher */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
              <Palette className="w-3 h-3" />
              Skin do Ragdoll
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'dummy', label: 'Crash Dummy', desc: 'Marcadores de teste' },
                { id: 'stickman', label: 'Stickman', desc: 'Clássico minimalista' },
                { id: 'blueprint', label: 'Blueprint', desc: 'Plantas técnicas' },
                { id: 'debug', label: 'Wireframe', desc: 'Polígonos Matter' },
              ].map((skin) => (
                <button
                  key={skin.id}
                  id={`skin-option-${skin.id}`}
                  onClick={() => onSelectSkin(skin.id as SkinStyle)}
                  className={`p-1.5 rounded-lg border text-left text-xs transition-all ${
                    skinStyle === skin.id
                      ? 'bg-[#25262A] text-white font-bold border-[#25262A]'
                      : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  <div className="font-semibold text-[11px]">{skin.label}</div>
                  <div className="text-[9px] opacity-75 truncate">{skin.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Gravity Y Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Gravidade Vertical (Y)</span>
              <span className="font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-[11px]">
                {params.gravityY.toFixed(1)}x
              </span>
            </div>
            <input
              id="slider-gravity-y"
              type="range"
              min="-2.0"
              max="4.0"
              step="0.1"
              value={params.gravityY}
              onChange={(e) => onUpdateParams({ gravityY: parseFloat(e.target.value) })}
              className="accent-[#4C8DFF] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
              <span>-2.0 (Invertida)</span>
              <span>0 (Gravidade Zero)</span>
              <span>4.0 (Hiperpesado)</span>
            </div>
          </div>

          {/* Ragdoll Joint Stiffness Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Rigidez das Juntas (Stiffness)</span>
              <span className="font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-[11px]">
                {Math.round(params.jointStiffness * 100)}%
              </span>
            </div>
            <input
              id="slider-joint-stiffness"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={params.jointStiffness}
              onChange={(e) => onUpdateParams({ jointStiffness: parseFloat(e.target.value) })}
              className="accent-[#4C8DFF] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-zinc-400 font-mono">
              <span>Mole (Mola)</span>
              <span>Calibrado (0.6)</span>
              <span>Rígido (Firme)</span>
            </div>
          </div>

          {/* Explosion Radius Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Raio da Onda de Choque</span>
              <span className="font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-[11px]">
                {params.explosionRadius}px
              </span>
            </div>
            <input
              id="slider-explosion-radius"
              type="range"
              min="80"
              max="400"
              step="10"
              value={params.explosionRadius}
              onChange={(e) => onUpdateParams({ explosionRadius: parseInt(e.target.value) })}
              className="accent-[#E85D5D] cursor-pointer"
            />
          </div>

          {/* Explosion Force Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Potência Explosiva</span>
              <span className="font-mono bg-zinc-200 px-1.5 py-0.5 rounded text-[11px]">
                {(params.explosionMagnitude * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="slider-explosion-force"
              type="range"
              min="0.03"
              max="0.25"
              step="0.01"
              value={params.explosionMagnitude}
              onChange={(e) => onUpdateParams({ explosionMagnitude: parseFloat(e.target.value) })}
              className="accent-[#E85D5D] cursor-pointer"
            />
          </div>

          {/* Performance & Object Eviction Section */}
          <div className="pt-2 border-t border-zinc-300 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Anti-Lag & Evicção de Objetos
              </span>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">
                60 FPS PROTECTED
              </span>
            </div>

            {/* FIFO Max Props Capacity */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">Limite Máximo na Tela (FIFO)</span>
                <span className="font-mono text-[11px] font-bold">
                  {params.maxUserObjects > 0 ? `${params.maxUserObjects} itens` : 'Ilimitado'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { val: 30, label: '30' },
                  { val: 60, label: '60' },
                  { val: 100, label: '100' },
                  { val: 200, label: '200' },
                  { val: 0, label: 'Off' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    id={`btn-fifo-${opt.val}`}
                    onClick={() => onUpdateParams({ maxUserObjects: opt.val })}
                    className={`py-1 rounded text-center text-xs font-semibold border transition-all ${
                      params.maxUserObjects === opt.val
                        ? 'bg-[#25262A] text-white border-[#25262A]'
                        : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Object Lifespan (TTL) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  Tempo de Vida (Auto-Limpeza)
                </span>
                <span className="font-mono text-[11px] font-bold">
                  {params.objectLifespanSec > 0 ? `${params.objectLifespanSec}s` : 'Infinito'}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[
                  { val: 0, label: 'Off' },
                  { val: 15, label: '15s' },
                  { val: 30, label: '30s' },
                  { val: 60, label: '60s' },
                  { val: 120, label: '2min' },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    id={`btn-ttl-${opt.val}`}
                    onClick={() => onUpdateParams({ objectLifespanSec: opt.val })}
                    className={`py-1 rounded text-center text-xs font-semibold border transition-all ${
                      params.objectLifespanSec === opt.val
                        ? 'bg-[#4C8DFF] text-white border-[#25262A]'
                        : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-zinc-500 leading-tight">
              Objetos excedentes ou expirados desmaterializam suavemente com partículas e som sutil, liberando cálculos de colisão no processador.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
