import React from 'react';
import { X, Keyboard, MousePointer, Flame, Zap, ShieldAlert } from 'lucide-react';

interface ControlsHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsHelpModal: React.FC<ControlsHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      id="help-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="help-modal-content"
        className="w-full max-w-lg bg-[#F8F7F3] border-2 border-[#25262A] rounded-2xl shadow-[8px_8px_0px_#25262A] p-5 text-[#25262A] flex flex-col gap-4 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-[#25262A]/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#25262A] text-white flex items-center justify-center font-black">
              RS
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-wider">Manual de Operação</h2>
              <p className="text-xs text-zinc-600 font-mono">FÍSICA TÁTIL & CONTROLES</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            <X className="w-5 h-5 text-zinc-700" />
          </button>
        </div>

        {/* Mouse / Touch Controls */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <MousePointer className="w-4 h-4 text-[#4C8DFF]" />
            Mouse & Toque
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <span className="font-bold block text-zinc-800">Clique & Arraste</span>
              <span className="text-zinc-600">Segure qualquer membro do boneco ou bloco. Solte em velocidade para arremessar.</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <span className="font-bold block text-zinc-800">Botão Direito / Shift+Clique</span>
              <span className="text-zinc-600">Gera uma onda de choque explosiva radial onde clicar.</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <span className="font-bold block text-zinc-800">Ferramenta Lançador</span>
              <span className="text-zinc-600">Selecione o objeto na toolbar, clique e puxe para mirar e disparar projéteis.</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <span className="font-bold block text-zinc-800">Barril TNT</span>
              <span className="text-zinc-600">Barril explode com impacto violento ou proximidade de outra explosão.</span>
            </div>
          </div>
        </div>

        {/* Euphoria Direct Motor Keyboard Controls (GDD Section 5.4) */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
            <Keyboard className="w-4 h-4 text-[#F5C84B]" />
            Ativação Muscular / Teclado (Euphoria)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                W
              </kbd>
              <span className="text-zinc-700">Erguer Torso</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                A / D
              </kbd>
              <span className="text-zinc-700">Girar / Inclinar</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                Espaço
              </kbd>
              <span className="text-zinc-700">Impulso Salto</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                R
              </kbd>
              <span className="text-zinc-700">Resetar Dummy</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                G
              </kbd>
              <span className="text-zinc-700">Inverter Gravidade</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-zinc-200">
              <kbd className="px-1.5 py-0.5 bg-zinc-100 border border-zinc-300 rounded font-mono font-bold text-[11px] mr-1">
                D
              </kbd>
              <span className="text-zinc-700">Painel Debug</span>
            </div>
          </div>
        </div>

        {/* Philosophy Note */}
        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Filosofia de Sandbox:</strong> Não há pontuações, mortes ou vitórias. O objetivo é a experimentação tátil da inércia, das colisões e das reações em cadeia.
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-[#25262A] text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-zinc-800 transition-colors"
        >
          Entendido, começar experimento
        </button>
      </div>
    </div>
  );
};
