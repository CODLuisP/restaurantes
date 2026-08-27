'use client';

import { Plus, GripVertical, Eye, EyeOff, X, Layers } from 'lucide-react';
import { type BlockType, type TicketBlock, BLOCK_META, ADDABLE } from './ticketData';

interface BlockListPanelProps {
  blocks: TicketBlock[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  showAdd: boolean;
  onToggleAdd: (show: boolean) => void;
  onAddBlock: (type: BlockType) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
  dragIndex: number | null;
  overIndex: number | null;
  onDragStart: (idx: number) => void;
  onDragOver: (idx: number) => void;
  onDrop: (idx: number) => void;
  onDragEnd: () => void;
}

/** Panel izquierdo del editor: lista reordenable de bloques + selector para añadir uno nuevo. */
export default function BlockListPanel({
  blocks, selectedId, onSelect, showAdd, onToggleAdd, onAddBlock, onToggleVisible, onRemove,
  dragIndex, overIndex, onDragStart, onDragOver, onDrop, onDragEnd,
}: BlockListPanelProps) {
  return (
    <div className="bg-white flex flex-col min-h-0">
      <div className="p-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 mb-3 px-1 text-slate-700">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-bold uppercase tracking-wide">Bloques</span>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5 ml-auto">{blocks.length}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => onToggleAdd(!showAdd)}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 py-2.5 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> Añadir bloque
          </button>
          {showAdd && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => onToggleAdd(false)} />
              <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-white rounded-xl border border-slate-200 shadow-dropdown py-1.5 max-h-72 overflow-y-auto">
                {ADDABLE.map(type => {
                  const meta = BLOCK_META[type];
                  const Icon = meta.icon;
                  return (
                    <button key={type} onClick={() => onAddBlock(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                      <span className="h-6 w-6 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                      </span>
                      <span className="text-xs font-medium text-slate-700">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {blocks.map((block, idx) => {
          const meta = BLOCK_META[block.type];
          const Icon = meta.icon;
          const isSel = block.id === selectedId;
          const isOver = overIndex === idx && dragIndex !== null && dragIndex !== idx;
          return (
            <div
              key={block.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={e => { e.preventDefault(); onDragOver(idx); }}
              onDrop={() => onDrop(idx)}
              onDragEnd={onDragEnd}
              onClick={() => onSelect(block.id)}
              className={`group relative flex items-center gap-2 pl-3 pr-2 py-2 rounded-lg cursor-pointer transition-all border-l-[3px] ${
                isSel ? 'border-l-blue-500 bg-blue-50/70' : 'border-l-transparent hover:bg-slate-50'
              } ${isOver ? 'shadow-[inset_0_2px_0_0_theme(colors.blue.400)]' : ''} ${dragIndex === idx ? 'opacity-40' : ''} ${
                !block.visible ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="h-3.5 w-3.5 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isSel ? 'text-blue-600' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold leading-tight truncate ${isSel ? 'text-blue-900' : 'text-slate-700'}`}>{meta.label}</p>
                <p className="text-[10px] text-slate-400 truncate">{meta.subtitle(block)}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onToggleVisible(block.id); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                title={block.visible ? 'Ocultar' : 'Mostrar'}
              >
                {block.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={e => { e.stopPropagation(); onRemove(block.id); }}
                className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
