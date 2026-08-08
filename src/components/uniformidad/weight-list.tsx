'use client';

import { useState, useRef, useEffect } from 'react';
import { useUniformidadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Pencil, Check } from 'lucide-react';

export function WeightList() {
  const { pesos, stats, removePeso, updatePeso } = useUniformidadStore();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus the edit input when it appears
  useEffect(() => {
    if (editingIndex !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingIndex]);

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(pesos[index].toString());
  };

  const confirmEdit = () => {
    if (editingIndex === null) return;
    const val = parseFloat(editValue);
    if (!isNaN(val) && val > 0) {
      updatePeso(editingIndex, val);
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  if (pesos.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm border py-4 px-5 text-center text-muted-foreground mb-4 text-sm">
        Ingresa pesos para empezar...
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border mb-4 overflow-hidden">
      {/* Fixed header */}
      <div className="px-4 py-2 bg-green-700 text-white text-sm font-bold flex items-center justify-between">
        <span>Lista de Pesos</span>
        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{pesos.length} aves</span>
      </div>
      {/* Scrollable body with comfortable height */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: 'min(400px, 60vh)' }}
      >
        <div className="divide-y divide-border">
          {pesos.map((p, index) => {
            const desviacion = p - stats.promedio;
            let claseDesviacion = 'text-muted-foreground text-xs';
            let textoDesv = '✓ En rango';
            let bgClass = 'bg-card hover:bg-muted/50';

            if (p < stats.limiteInf) {
              claseDesviacion = 'text-red-600 dark:text-red-400 font-semibold text-xs';
              textoDesv = `↓ ${Math.abs(desviacion).toFixed(1)}g`;
              bgClass = 'bg-red-50/60 dark:bg-red-950/30 hover:bg-red-50 dark:hover:bg-red-950/50';
            } else if (p > stats.limiteSup) {
              claseDesviacion = 'text-green-700 dark:text-green-400 font-semibold text-xs';
              textoDesv = `↑ +${desviacion.toFixed(1)}g`;
              bgClass = 'bg-green-50/60 dark:bg-green-950/30 hover:bg-green-50 dark:hover:bg-green-950/50';
            }

            const isEditing = editingIndex === index;

            return (
              <div
                key={index}
                className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${isEditing ? 'bg-amber-50 ring-1 ring-amber-300' : bgClass}`}
              >
                <span className="text-[11px] text-muted-foreground w-5 shrink-0 text-right">{index + 1}</span>

                {isEditing ? (
                  <Input
                    ref={editInputRef}
                    type="number"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleEditKeyDown}
                    onBlur={confirmEdit}
                    className="h-7 text-sm flex-1 min-w-0"
                    step="1"
                  />
                ) : (
                  <span className="font-bold text-sm text-foreground flex-1 min-w-0">{p.toFixed(1)} g</span>
                )}

                <span className={`min-w-[70px] text-right shrink-0 ${claseDesviacion}`}>{textoDesv}</span>

                {isEditing ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={confirmEdit}
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-800 shrink-0"
                    title="Confirmar"
                  >
                    <Check className="h-3.5 w-3.5 pointer-coarse:h-5 pointer-coarse:w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(index)}
                    className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-amber-500 shrink-0"
                    title="Editar peso"
                  >
                    <Pencil className="h-3 w-3 pointer-coarse:h-4.5 pointer-coarse:w-4.5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePeso(index)}
                  className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-red-500 shrink-0"
                  title="Eliminar peso"
                >
                  <X className="h-3.5 w-3.5 pointer-coarse:h-5 pointer-coarse:w-5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
