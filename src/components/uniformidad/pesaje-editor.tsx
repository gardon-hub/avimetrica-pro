'use client';

/**
 * Editor individual de los pesos de un pesaje histórico (pendiente menor):
 * corregir el valor en gramos, registrar sector y excluir/reincluir con
 * motivo documentado. La exclusión conserva el dato (no lo borra).
 */

import { useEffect, useState } from 'react';
import { PesajeFull, BirdWeightRow } from '@/lib/lotes-api';
import { calculateStats } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Info } from 'lucide-react';

interface Props {
  pesaje: PesajeFull;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void; // recarga los pesajes del lote
}

export function PesajeEditor({ pesaje, open, onOpenChange, onSaved }: Props) {
  const [rows, setRows] = useState<BirdWeightRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza el formulario al abrir el diálogo con un pesaje distinto
      setRows(pesaje.pesos.map((p) => ({ ...p })));
      setDirty(new Set());
    }
  }, [open, pesaje]);

  const activos = rows.filter((r) => !r.excluido).map((r) => r.gramos);
  const stats = activos.length >= 1 ? calculateStats(activos, pesaje.criterioPct) : null;

  const patch = (id: string, patchObj: Partial<BirdWeightRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patchObj } : r)));
    setDirty((prev) => new Set(prev).add(id));
  };

  const handleSave = async () => {
    setSaving(true);
    let ok = 0;
    for (const id of dirty) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      const res = await fetch(`/api/pesos?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gramos: row.gramos,
          sector: row.sector ?? '',
          excluido: row.excluido,
          motivoExcl: row.motivoExcl ?? '',
        }),
      });
      if (res.ok) ok++;
    }
    setSaving(false);
    toast({ title: `${ok} peso(s) actualizado(s)` });
    setDirty(new Set());
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar pesaje del {new Date(pesaje.fecha).toLocaleDateString()}</DialogTitle>
        </DialogHeader>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-[11px] text-blue-900 leading-snug">
            Excluir un ave <b>no borra el dato</b>: lo marca como excluido con su motivo y lo saca de los
            cálculos, conservando la trazabilidad. Corrige el peso solo si hubo un error de digitación o báscula.
          </AlertDescription>
        </Alert>

        {stats && (
          <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 flex flex-wrap gap-x-3">
            <span>Activas: <b>{stats.totalAves}</b></span>
            <span>Media: <b>{stats.promedio.toFixed(1)} g</b></span>
            <span>CV: <b>{stats.cv.toFixed(2)}%</b></span>
            <span>Unif.: <b>{stats.uniformidad.toFixed(1)}%</b></span>
          </div>
        )}

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-[11px] border-collapse">
            <thead className="sticky top-0 bg-background">
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">#</th>
                <th className="py-1 text-right">Peso (g)</th>
                <th className="py-1 text-left pl-2">Sector</th>
                <th className="py-1 text-center">Excluir</th>
                <th className="py-1 text-left pl-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-border/50 ${r.excluido ? 'opacity-50' : ''}`}>
                  <td className="py-1">{r.orden}</td>
                  <td className="py-1 text-right">
                    <Input
                      type="number"
                      value={r.gramos}
                      onChange={(e) => patch(r.id, { gramos: parseFloat(e.target.value) || 0 })}
                      className="h-7 w-20 text-[11px] text-right ml-auto"
                    />
                  </td>
                  <td className="py-1 pl-2">
                    <Input
                      value={r.sector ?? ''}
                      onChange={(e) => patch(r.id, { sector: e.target.value })}
                      className="h-7 w-16 text-[11px]"
                      placeholder="—"
                    />
                  </td>
                  <td className="py-1 text-center">
                    <Checkbox
                      checked={r.excluido}
                      onCheckedChange={(v) => patch(r.id, { excluido: v === true })}
                      aria-label={`Excluir ave ${r.orden}`}
                    />
                  </td>
                  <td className="py-1 pl-2">
                    <Input
                      value={r.motivoExcl ?? ''}
                      onChange={(e) => patch(r.id, { motivoExcl: e.target.value })}
                      className="h-7 text-[11px]"
                      placeholder={r.excluido ? 'Motivo de exclusión' : ''}
                      disabled={!r.excluido}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={saving || dirty.size === 0}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? 'Guardando…' : `Guardar ${dirty.size} cambio(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
