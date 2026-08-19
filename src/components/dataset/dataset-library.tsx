'use client';

/**
 * Biblioteca de conjuntos de datos guardados en la base de datos (Fase 10).
 * Permite al docente preparar ejercicios, reutilizarlos entre clases y
 * recuperarlos desde cualquier equipo que use esta instalación.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DatasetStore } from '@/lib/dataset-store';
import type { ClassificationScheme } from '@/lib/classification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Library, Save, Upload, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface DatasetListItem {
  id: string;
  nombre: string;
  descripcion: string | null;
  variableLabel: string;
  variableUnit: string;
  decimales: number;
  origen: string | null;
  responsable: string | null;
  updatedAt: string;
}

interface Props {
  store: DatasetStore;
  /** Dominio propietario: cada módulo ve y guarda solo sus conjuntos. */
  dominio: 'huevos' | 'generico';
  titulo?: string;
  /** Se invoca tras guardar o borrar, para refrescar vistas dependientes. */
  onCambio?: () => void;
}

export function DatasetLibrary({ store, dominio, titulo, onCambio }: Props) {
  const s = store();
  const t = useTranslations('library');
  const [lista, setLista] = useState<DatasetListItem[]>([]);
  const [guardarAbierto, setGuardarAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [borrar, setBorrar] = useState<DatasetListItem | null>(null);
  const [cargando, setCargando] = useState(false);

  /** Recarga tras guardar o borrar (acciones del usuario, no del montaje). */
  const refrescar = useCallback(async () => {
    try {
      const { listDatasets } = await import('@/lib/local-api');
      setLista(await listDatasets(dominio));
    } catch {
      /* la biblioteca es opcional: si falla, el análisis en pantalla sigue */
    }
  }, [dominio]);

  // Carga inicial: el setState ocurre tras el await, no en el cuerpo del
  // efecto, y se descarta si el componente se desmonta antes de terminar.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { listDatasets } = await import('@/lib/local-api');
        const datos = await listDatasets(dominio);
        if (!cancelado) setLista(datos);
      } catch {
        /* biblioteca opcional */
      }
    })();
    return () => { cancelado = true; };
  }, [dominio]);

  const guardar = async () => {
    if (!nombre.trim()) {
      toast({ title: t('missingNameTitle'), description: t('missingNameBody'), variant: 'destructive' });
      return;
    }
    try {
      const { createDataset } = await import('@/lib/local-api');
      await createDataset({
        nombre,
        descripcion,
        dominio,
        variableLabel: s.variable.label,
        variableUnit: s.variable.unit,
        decimales: s.variable.decimals,
        valores: s.valores,
        presetId: s.presetId,
        scheme: s.scheme,
        origen: s.contexto.origen,
        responsable: s.contexto.responsable,
        fecha: s.contexto.fecha || undefined,
        observaciones: s.contexto.observaciones,
        muHipotetica: s.muHipotetica,
      });
      toast({ title: t('savedTitle'), description: t('savedBody', { nombre, n: s.valores.length }) });
      setGuardarAbierto(false);
      setNombre('');
      setDescripcion('');
      refrescar();
      onCambio?.();
    } catch {
      toast({ title: t('errorTitle'), description: t('saveError'), variant: 'destructive' });
    }
  };

  const cargar = async (item: DatasetListItem) => {
    setCargando(true);
    try {
      const { getDataset } = await import('@/lib/local-api');
      const d = await getDataset(item.id);
      const valores: number[] = JSON.parse(d.valores);
      const scheme: ClassificationScheme | undefined = d.scheme ? JSON.parse(d.scheme) : undefined;
      s.cargar({
        valores,
        variable: { label: d.variableLabel, unit: d.variableUnit, decimals: d.decimales },
        ...(scheme ? { scheme } : {}),
        ...(d.presetId ? { presetId: d.presetId } : {}),
        muHipotetica: d.muHipotetica ?? null,
        contexto: {
          nombre: d.nombre,
          origen: d.origen ?? '',
          responsable: d.responsable ?? '',
          fecha: d.fecha ? String(d.fecha).slice(0, 10) : '',
          observaciones: d.observaciones ?? '',
        },
      });
      toast({ title: t('loadedTitle'), description: t('loadedBody', { n: valores.length, nombre: d.nombre }) });
    } catch {
      toast({ title: t('errorTitle'), description: t('loadError'), variant: 'destructive' });
    } finally {
      setCargando(false);
    }
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    try {
      const { deleteDataset } = await import('@/lib/local-api');
      await deleteDataset(borrar.id);
      toast({ title: t('deletedTitle') });
      refrescar();
      onCambio?.();
    } catch { /* la lista no cambia si falla */ }
    setBorrar(null);
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Library className="h-4 w-4" /> {titulo ?? t('title')}
        </h2>
        <Button
          size="sm"
          onClick={() => { setNombre(s.contexto.nombre || s.variable.label); setGuardarAbierto(true); }}
          disabled={s.valores.length === 0}
          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-3.5 w-3.5 mr-1" /> {t('saveCurrent')}
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">{t('colSet')}</th>
                <th className="py-1 text-left">{t('colVariable')}</th>
                <th className="py-1 text-left">{t('colUpdated')}</th>
                <th className="py-1 text-right">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-1.5">
                    <div className="font-semibold">{item.nombre}</div>
                    {item.descripcion && <div className="text-muted-foreground">{item.descripcion}</div>}
                  </td>
                  <td className="py-1.5">{item.variableLabel}{item.variableUnit && ` (${item.variableUnit})`}</td>
                  <td className="py-1.5 text-muted-foreground">{new Date(item.updatedAt).toLocaleDateString()}</td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => cargar(item)}
                      disabled={cargando}
                      title={t('load')}
                      className="text-blue-600 hover:text-blue-800 mr-2 disabled:opacity-40 inline-flex items-center justify-center align-middle pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                    >
                      <Upload className="h-3.5 w-3.5 pointer-coarse:h-5 pointer-coarse:w-5" />
                    </button>
                    <button
                      onClick={() => setBorrar(item)}
                      title={t('delete')}
                      className="text-red-400 hover:text-red-600 inline-flex items-center justify-center align-middle pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                    >
                      <Trash2 className="h-3.5 w-3.5 pointer-coarse:h-5 pointer-coarse:w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={guardarAbierto} onOpenChange={setGuardarAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('saveTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('name')}</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('description')}</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="min-h-16 text-sm"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t.rich('willSave', {
                n: s.valores.length,
                variable: s.variable.label,
                b: (c) => <b>{c}</b>,
              })}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardarAbierto(false)}>{t('cancel')}</Button>
            <Button onClick={guardar} className="bg-green-600 hover:bg-green-700 text-white">{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={borrar !== null} onOpenChange={(o) => !o && setBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteBody', { nombre: borrar?.nombre ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarBorrado} className="bg-red-600 hover:bg-red-700 text-white">
              {t('deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
