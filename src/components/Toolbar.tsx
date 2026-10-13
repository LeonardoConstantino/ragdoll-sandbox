import React from 'react';
import {
  Hand,
  Bomb,
  Crosshair,
  Box,
  Circle,
  Triangle,
  RotateCcw,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Flame,
  Clock,
  Compass,
} from 'lucide-react';
import { SceneId, SpawnableObjectType, ToolMode } from '../types';
import { SCENE_CONFIGS } from '../scenes/scenePresets';

interface ToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  selectedSpawnObject: SpawnableObjectType;
  onSelectSpawnObject: (type: SpawnableObjectType) => void;
  currentScene: SceneId;
  onSelectScene: (scene: SceneId) => void;
  onResetRagdoll: () => void;
  onResetScene: () => void;
  onClearUserObjects: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  userObjectCount?: number;
  maxUserObjects?: number;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  currentTool,
  onSelectTool,
  selectedSpawnObject,
  onSelectSpawnObject,
  currentScene,
  onSelectScene,
  onResetRagdoll,
  onResetScene,
  onClearUserObjects,
  isOpen,
  onToggleOpen,
  userObjectCount = 0,
  maxUserObjects = 60,
}) => {
  const spawnObjects: { type: SpawnableObjectType; label: string; icon: React.ReactNode }[] = [
    { type: 'small_box', label: 'Caixa Madeira', icon: <Box className="w-4 h-4" /> },
    { type: 'heavy_box', label: 'Carga Pesada', icon: <Box className="w-4 h-4 stroke-[2.5]" /> },
    { type: 'bouncy_ball', label: 'Bola Quicante', icon: <Circle className="w-4 h-4 text-emerald-600" /> },
    { type: 'bowling_ball', label: 'Esfera de Ferro', icon: <Circle className="w-4 h-4 fill-zinc-800 text-zinc-900" /> },
    { type: 'triangle_spike', label: 'Rampa / Cunha', icon: <Triangle className="w-4 h-4" /> },
    { type: 'explosive_barrel', label: 'Barril TNT', icon: <Flame className="w-4 h-4 text-red-500" /> },
    { type: 'pendulum', label: 'Pêndulo Teto', icon: <Clock className="w-4 h-4 text-blue-600" /> },
    { type: 'ragdoll', label: '+1 Dummy', icon: <UserPlus className="w-4 h-4 text-amber-600" /> },
  ];

  const scenes: { id: SceneId; name: string }[] = [
    { id: 'arena', name: 'Arena (Caixas)' },
    { id: 'tower', name: 'Torre (Queda)' },
    { id: 'domino', name: 'Dominó (Reação)' },
    { id: 'seesaw', name: 'Gangorra (Catapulta)' },
    { id: 'free', name: 'Sandbox Livre' },
  ];

  return (
    <div
      id="toolbar-container"
      className={`fixed left-3 top-3 z-30 transition-transform duration-200 flex items-start ${
        isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-2.5rem)]'
      }`}
    >
      <div
        id="toolbar-card"
        className="w-64 bg-[#F8F7F3] border-2 border-[#25262A] rounded-xl shadow-[4px_4px_0px_#25262A] p-3 text-[#25262A] flex flex-col gap-3 max-h-[94vh] overflow-y-auto select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#25262A]/20 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#25262A] flex items-center justify-center text-[#FFFDF7] font-bold text-xs">
              RS
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase">Ragdoll Sandbox</h1>
              <p className="text-[10px] text-zinc-600 font-mono">LAB INSTRUMENT V1.0</p>
            </div>
          </div>
          <button
            id="toolbar-toggle-btn"
            onClick={onToggleOpen}
            title="Recolher / Expandir Toolbar"
            className="p-1 rounded-md hover:bg-zinc-200 text-[#25262A] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Interactive Tools */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block">
            Modo de Interação
          </span>
          <div className="grid grid-cols-3 gap-1">
            <button
              id="tool-drag"
              onClick={() => onSelectTool('drag')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                currentTool === 'drag'
                  ? 'bg-[#4C8DFF] text-white border-[#25262A] shadow-[2px_2px_0px_#25262A]'
                  : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <Hand className="w-4 h-4 mb-1" />
              Arrastar
            </button>

            <button
              id="tool-throw"
              onClick={() => onSelectTool('throw')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                currentTool === 'throw'
                  ? 'bg-[#4C8DFF] text-white border-[#25262A] shadow-[2px_2px_0px_#25262A]'
                  : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <Crosshair className="w-4 h-4 mb-1" />
              Lançador
            </button>

            <button
              id="tool-explode"
              onClick={() => onSelectTool('explode')}
              className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg border text-[11px] font-semibold transition-all ${
                currentTool === 'explode'
                  ? 'bg-[#E85D5D] text-white border-[#25262A] shadow-[2px_2px_0px_#25262A]'
                  : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-800'
              }`}
            >
              <Bomb className="w-4 h-4 mb-1" />
              Detonador
            </button>
          </div>
        </div>

        {/* Object Spawner Palette */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center justify-between">
            <span>Spawn de Objetos</span>
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                maxUserObjects > 0 && userObjectCount >= maxUserObjects * 0.9
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-zinc-200 text-zinc-700'
              }`}
              title="Quantidade de props na tela vs limite FIFO"
            >
              {userObjectCount}{maxUserObjects > 0 ? `/${maxUserObjects}` : ''}
            </span>
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {spawnObjects.map((obj) => {
              const isSelected = selectedSpawnObject === obj.type && currentTool === 'spawn';
              return (
                <button
                  key={obj.type}
                  id={`spawn-btn-${obj.type}`}
                  onClick={() => {
                    onSelectSpawnObject(obj.type);
                    onSelectTool('spawn');
                  }}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-[#F5C84B] text-[#25262A] font-bold border-[#25262A] shadow-[2px_2px_0px_#25262A]'
                      : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {obj.icon}
                  <span className="truncate">{obj.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scene Presets */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Cenas de Teste
          </span>
          <div className="flex flex-col gap-1">
            {scenes.map((s) => {
              const isActive = currentScene === s.id;
              return (
                <button
                  key={s.id}
                  id={`scene-btn-${s.id}`}
                  onClick={() => onSelectScene(s.id)}
                  className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                    isActive
                      ? 'bg-[#25262A] text-[#FFFDF7] font-bold border-[#25262A]'
                      : 'bg-white border-zinc-300 hover:bg-zinc-100 text-zinc-700'
                  }`}
                >
                  <span>{s.name}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-[#4C8DFF]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 border-t border-zinc-300 flex flex-col gap-1.5">
          <button
            id="btn-reset-ragdoll"
            onClick={onResetRagdoll}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-xs font-semibold text-zinc-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            Reposicionar Dummy (R)
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              id="btn-clear-objects"
              onClick={onClearUserObjects}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-xs text-zinc-700 font-medium"
              title="Limpa caixas e esferas adicionadas"
            >
              <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
              Limpar {userObjectCount > 0 ? `(${userObjectCount})` : 'Criados'}
            </button>
            <button
              id="btn-reset-scene"
              onClick={onResetScene}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg text-xs text-zinc-700 font-medium"
              title="Recarrega a cena inteira"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-500" />
              Resetar Cena
            </button>
          </div>
        </div>
      </div>

      {/* Floating expand tab when collapsed */}
      {!isOpen && (
        <button
          id="toolbar-expand-tab"
          onClick={onToggleOpen}
          className="ml-2 mt-2 bg-[#F8F7F3] border-2 border-[#25262A] p-2 rounded-lg shadow-[3px_3px_0px_#25262A] hover:bg-[#4C8DFF] hover:text-white transition-all text-[#25262A]"
          title="Abrir Ferramentas"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};
