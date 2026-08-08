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

interface DatasetListItem {
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

export function DatasetLibrary({ store }: { store: DatasetStore }) {
  const s = store();
  const [lista, setLista] = useState<DatasetListItem[]>([]);
  const [guardarAbierto, setGuardarAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [borrar, setBorrar] = useState<DatasetListItem | null>(null);
  const [cargando, setCargando] = useState(false);

  /** Recarga tras guardar o borrar (acciones del usuario, no del montaje). */
  const refrescar = useCallback(async () => {
    try {
      const res = await fetch('/api/datasets');
      if (res.ok) setLista(await res.json());
    } catch {
      /* la biblioteca es opcional: si falla, el análisis en pantalla sigue */
    }
  }, []);

  // Carga inicial: el setState ocurre en el callback del await, no en el
  // cuerpo del efecto, y se descarta si el componente se desmonta antes de
  // que llegue la respuesta.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch('/api/datasets');
        if (!cancelado && res.ok) setLista(await res.json());
      } catch {
        /* biblioteca opcional */
      }
    })();
    return () => { cancelado = true; };
  }, []);

  const guardar = async () => {
    if (!nombre.trim()) {
      toast({ title: 'Falta el nombre', description: 'Ponle un nombre al conjunto.', variant: 'destructive' });
      return;
    }
    const res = await fetch('/api/datasets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre,
        descripcion,
        variableLabel: s.variable.label,
        variableUnit: s.variable.unit,
        decimales: s.variable.decimals,
        valores: s.valores,
        presetId: s.presetId,
        scheme: s.scheme,
        origen: s.contexto.origen,
        responsable: s.contexto.responsable,
        fecha: s.contexto.fecha || null,
        observaciones: s.contexto.observaciones,
        muHipotetica: s.muHipotetica,
      }),
    });
    if (res.ok) {
      toast({ title: 'Conjunto guardado', description: `"${nombre}" con ${s.valores.length} valores.` });
      setGuardarAbierto(false);
      setNombre('');
      setDescripcion('');
      refrescar();
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar.', variant: 'destructive' });
    }
  };

  const cargar = async (item: DatasetListItem) => {
    setCargando(true);
    try {
      const res = await fetch(`/api/datasets?id=${item.id}`);
      if (!res.ok) throw new Error();
      const d = await res.json();
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
      toast({ title: 'Conjunto cargado', description: `${valores.length} valores de "${d.nombre}".` });
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar el conjunto.', variant: 'destructive' });
    } finally {
      setCargando(false);
    }
  };

  const confirmarBorrado = async () => {
    if (!borrar) return;
    const res = await fetch(`/api/datasets?id=${borrar.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: 'Conjunto eliminado' });
      refrescar();
    }
    setBorrar(null);
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Library className="h-4 w-4" /> Conjuntos guardados
        </h2>
        <Button
          size="sm"
          onClick={() => { setNombre(s.contexto.nombre || s.variable.label); setGuardarAbierto(true); }}
          disabled={s.valores.length === 0}
          className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
        >
          <Save className="h-3.5 w-3.5 mr-1" /> Guardar actual
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          Aún no hay conjuntos guardados. Captura datos y pulsa «Guardar actual» para reutilizarlos en otra clase.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b font-bold text-muted-foreground">
                <th className="py-1 text-left">Conjunto</th>
                <th className="py-1 text-left">Variable</th>
                <th className="py-1 text-left">Actualizado</th>
                <th className="py-1 text-right">Acciones</th>
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
                      title="Cargar en el análisis"
                      className="text-blue-600 hover:text-blue-800 mr-2 disabled:opacity-40"
                    >
                      <Upload className="h-3.5 w-3.5 inline" />
                    </button>
                    <button
                      onClick={() => setBorrar(item)}
                      title="Eliminar conjunto"
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5 inline" />
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
          <DialogHeader><DialogTitle>Guardar conjunto de datos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nombre *</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descripción</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Para qué sirve este conjunto, de dónde salió, en qué clase se usa…"
                className="min-h-16 text-sm"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Se guardarán <b>{s.valores.length}</b> valores de «{s.variable.label}» junto con la variable,
              el criterio de clasificación y la media hipotética.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGuardarAbierto(false)}>Cancelar</Button>
            <Button onClick={guardar} className="bg-green-600 hover:bg-green-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={borrar !== null} onOpenChange={(o) => !o && setBorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el conjunto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará «{borrar?.nombre}» de forma permanente. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarBorrado} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
