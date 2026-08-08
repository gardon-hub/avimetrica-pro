'use client';

/**
 * Historial de lotes (Fase 5): cada lote agrupa múltiples pesajes con fecha.
 * Permite crear lotes, guardar el pesaje actual, recargar un pesaje al
 * editor, ver la evolución temporal y comparar dos pesajes.
 * El módulo legado de "Sesiones" se mantiene aparte por compatibilidad.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUniformidadStore } from '@/lib/store';
import {
  LoteResumen, PesajeFull, PesajeConLote, TIPO_AVE_LABELS, SEXO_LABELS, MUESTREO_LABELS,
  fetchLotes, fetchPesajes, fetchAllPesajes,
} from '@/lib/lotes-api';
import { GENETIC_LINES } from '@/lib/calculations';
import { calculateStats } from '@/lib/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { AlertTriangle, Archive, Plus, Save, Upload, Trash2, Pencil } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { EvolutionCharts } from './evolution-charts';
import { ComparisonPanel } from './comparison-panel';
import { SpcPanel } from './spc-panel';
import { PesajeEditor } from './pesaje-editor';

export function HistorialPanel() {
  const { pesos, lineaGenetica, edadSemanas, uniformityPct, setPesos, setLineaGenetica, setEdadSemanas } = useUniformidadStore();

  const [lotes, setLotes] = useState<LoteResumen[]>([]);
  const [selectedLoteId, setSelectedLoteId] = useState<string>('');
  const [pesajes, setPesajes] = useState<PesajeFull[]>([]);
  const [loadingPesajes, setLoadingPesajes] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [compareAllLotes, setCompareAllLotes] = useState(false);
  const [allPesajes, setAllPesajes] = useState<PesajeConLote[]>([]);
  const [editPesaje, setEditPesaje] = useState<PesajeFull | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'lote' | 'pesaje'; id: string; label: string } | null>(null);

  // Formulario nuevo lote
  const [fCodigo, setFCodigo] = useState('');
  const [fGranja, setFGranja] = useState('');
  const [fGalpon, setFGalpon] = useState('');
  const [fTipoAve, setFTipoAve] = useState('broiler');
  const [fLinea, setFLinea] = useState(lineaGenetica);
  const [fSexo, setFSexo] = useState('mixto');
  const [fTamano, setFTamano] = useState('');
  const [fObs, setFObs] = useState('');

  // Formulario guardar pesaje
  const [pFecha, setPFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [pEdad, setPEdad] = useState(edadSemanas);
  const [pMuestreo, setPMuestreo] = useState('ns');
  const [pResponsable, setPResponsable] = useState('');
  const [pObs, setPObs] = useState('');

  const selectedLote = lotes.find((l) => l.id === selectedLoteId);

  const refreshLotes = useCallback(async () => {
    try {
      setLotes(await fetchLotes());
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los lotes.', variant: 'destructive' });
    }
  }, []);

  const refreshPesajes = useCallback(async (loteId: string) => {
    if (!loteId) return;
    setLoadingPesajes(true);
    try {
      setPesajes(await fetchPesajes(loteId));
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar los pesajes.', variant: 'destructive' });
    } finally {
      setLoadingPesajes(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial de datos (fetch asíncrono)
    refreshLotes();
  }, [refreshLotes]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- recarga al cambiar de lote (fetch asíncrono)
    if (selectedLoteId) refreshPesajes(selectedLoteId);
    else setPesajes([]);
  }, [selectedLoteId, refreshPesajes]);

  const handleCreateLote = async () => {
    if (!fCodigo.trim()) {
      toast({ title: 'Falta el código', description: 'El código o nombre del lote es obligatorio.', variant: 'destructive' });
      return;
    }
    const res = await fetch('/api/lotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo: fCodigo, granja: fGranja, galpon: fGalpon, tipoAve: fTipoAve,
        lineaGenetica: fLinea, sexo: fSexo, tamanoEstimado: fTamano, observaciones: fObs,
      }),
    });
    if (res.ok) {
      const nuevo = await res.json();
      toast({ title: 'Lote creado', description: `Lote "${nuevo.codigo}" registrado.` });
      setCreateOpen(false);
      setFCodigo(''); setFGranja(''); setFGalpon(''); setFTamano(''); setFObs('');
      await refreshLotes();
      setSelectedLoteId(nuevo.id);
    } else {
      toast({ title: 'Error', description: 'No se pudo crear el lote.', variant: 'destructive' });
    }
  };

  // Advertencias previas al guardado del pesaje actual
  const saveWarnings = useMemo(() => {
    const w: string[] = [];
    if (!selectedLote) return w;
    if (pesos.length < 30) {
      w.push(`Solo ${pesos.length} aves pesadas: se recomienda ≥30 para estimaciones confiables.`);
    }
    if (selectedLote.tamanoEstimado && pesos.length < selectedLote.tamanoEstimado * 0.02) {
      w.push(`La muestra es <2% del lote (${pesos.length}/${selectedLote.tamanoEstimado} aves): puede no ser representativa.`);
    }
    const ultima = pesajes.length > 0 ? new Date(pesajes[pesajes.length - 1].fecha) : null;
    if (ultima && new Date(pFecha + 'T12:00:00') < ultima) {
      w.push(`La fecha indicada es anterior al último pesaje registrado (${ultima.toLocaleDateString()}). Verifica que sea intencional.`);
    }
    if (selectedLote.lineaGenetica !== lineaGenetica) {
      w.push(`La línea del editor (${lineaGenetica}) no coincide con la del lote (${selectedLote.lineaGenetica}).`);
    }
    const uniques = new Set(pesos).size;
    if (pesos.length >= 20 && uniques <= pesos.length * 0.3) {
      w.push('Muchos valores repetidos: posible redondeo excesivo de la báscula o digitación.');
    }
    return w;
  }, [selectedLote, pesos, pesajes, pFecha, lineaGenetica]);

  const handleSavePesaje = async () => {
    if (!selectedLoteId || pesos.length === 0) return;
    const res = await fetch('/api/pesajes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loteId: selectedLoteId,
        fecha: pFecha,
        edadSemanas: pEdad,
        metodoMuestreo: pMuestreo,
        responsable: pResponsable,
        observaciones: pObs,
        criterioPct: uniformityPct,
        unidadOriginal: 'g',
        pesos,
      }),
    });
    if (res.ok) {
      toast({ title: 'Pesaje guardado', description: `${pesos.length} pesos registrados en "${selectedLote?.codigo}".` });
      setSaveOpen(false);
      setPObs('');
      refreshPesajes(selectedLoteId);
      refreshLotes();
    } else {
      toast({ title: 'Error', description: 'No se pudo guardar el pesaje.', variant: 'destructive' });
    }
  };

  const handleLoadPesaje = (p: PesajeFull) => {
    const activos = p.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
    setPesos(activos);
    if (selectedLote) setLineaGenetica(selectedLote.lineaGenetica);
    if (p.edadSemanas) setEdadSemanas(String(p.edadSemanas));
    toast({ title: 'Pesaje cargado', description: `${activos.length} pesos del ${new Date(p.fecha).toLocaleDateString()} cargados en el editor.` });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const url = deleteTarget.kind === 'lote' ? `/api/lotes?id=${deleteTarget.id}` : `/api/pesajes?id=${deleteTarget.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: deleteTarget.kind === 'lote' ? 'Lote eliminado' : 'Pesaje eliminado' });
      if (deleteTarget.kind === 'lote') {
        setSelectedLoteId('');
        refreshLotes();
      } else {
        refreshPesajes(selectedLoteId);
        refreshLotes();
      }
    }
    setDeleteTarget(null);
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Archive className="h-4 w-4" /> Historial de lotes
        </h2>
        <Button size="sm" variant="outline" onClick={() => { setFLinea(lineaGenetica); setCreateOpen(true); }} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> Nuevo lote
        </Button>
      </div>

      {lotes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          Aún no hay lotes. Crea uno para empezar a guardar pesajes con fecha y comparar la evolución.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Lote</Label>
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger className="h-10 text-xs"><SelectValue placeholder="Seleccionar lote…" /></SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.codigo}{l.granja ? ` · ${l.granja}` : ''}{l.galpon ? ` · galpón ${l.galpon}` : ''} · {l.pesajes.length} pesaje(s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLote && (
            <>
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{TIPO_AVE_LABELS[selectedLote.tipoAve] ?? selectedLote.tipoAve}</span>
                <span>{selectedLote.lineaGenetica}</span>
                <span>{SEXO_LABELS[selectedLote.sexo] ?? selectedLote.sexo}</span>
                {selectedLote.tamanoEstimado && <span>{selectedLote.tamanoEstimado.toLocaleString()} aves</span>}
                <button
                  className="text-red-500 hover:text-red-700 underline ml-auto"
                  onClick={() => setDeleteTarget({ kind: 'lote', id: selectedLote.id, label: `el lote "${selectedLote.codigo}" y todos sus pesajes` })}
                >
                  eliminar lote
                </button>
              </div>

              <Tabs defaultValue="pesajes">
                <TabsList className="w-full flex h-auto gap-1">
                  <TabsTrigger value="pesajes" className="text-xs flex-1">Pesajes</TabsTrigger>
                  <TabsTrigger value="evolucion" className="text-xs flex-1">Evolución</TabsTrigger>
                  <TabsTrigger value="comparar" className="text-xs flex-1">Comparar</TabsTrigger>
                  <TabsTrigger value="control" className="text-xs flex-1">Control</TabsTrigger>
                </TabsList>

                <TabsContent value="pesajes" className="pt-3 space-y-3">
                  <Button
                    onClick={() => { setPEdad(edadSemanas); setSaveOpen(true); }}
                    disabled={pesos.length === 0}
                    className="w-full h-9 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Guardar el pesaje actual ({pesos.length} aves) en este lote
                  </Button>

                  {loadingPesajes ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Cargando…</p>
                  ) : pesajes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Este lote aún no tiene pesajes.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b font-bold text-muted-foreground">
                            <th className="py-1 text-left">Fecha</th>
                            <th className="py-1 text-right">Edad (sem)</th>
                            <th className="py-1 text-right">n</th>
                            <th className="py-1 text-right">Media (g)</th>
                            <th className="py-1 text-right">CV (%)</th>
                            <th className="py-1 text-right">Unif. (%)</th>
                            <th className="py-1 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pesajes.map((p) => {
                            const activos = p.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
                            const st = calculateStats(activos, p.criterioPct);
                            return (
                              <tr key={p.id} className="border-b border-border/50">
                                <td className="py-1.5">{new Date(p.fecha).toLocaleDateString()}</td>
                                <td className="py-1.5 text-right tabular-nums">{p.edadSemanas ?? '—'}</td>
                                <td className="py-1.5 text-right tabular-nums">{st.totalAves}</td>
                                <td className="py-1.5 text-right tabular-nums">{st.promedio.toFixed(1)}</td>
                                <td className="py-1.5 text-right tabular-nums">{st.cv.toFixed(2)}</td>
                                <td className="py-1.5 text-right tabular-nums">{st.uniformidad.toFixed(1)}</td>
                                <td className="py-1.5 text-right whitespace-nowrap">
                                  <button
                                    title="Cargar en el editor de la pantalla principal"
                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                    onClick={() => handleLoadPesaje(p)}
                                  >
                                    <Upload className="h-3.5 w-3.5 inline" />
                                  </button>
                                  <button
                                    title="Editar pesos individuales (corregir / excluir con motivo)"
                                    className="text-emerald-600 hover:text-emerald-800 mr-2"
                                    onClick={() => setEditPesaje(p)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 inline" />
                                  </button>
                                  <button
                                    title="Eliminar pesaje"
                                    className="text-red-400 hover:text-red-600"
                                    onClick={() => setDeleteTarget({ kind: 'pesaje', id: p.id, label: `el pesaje del ${new Date(p.fecha).toLocaleDateString()} (${p.pesos.length} aves)` })}
                                  >
                                    <Trash2 className="h-3.5 w-3.5 inline" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="evolucion" className="pt-3">
                  <EvolutionCharts
                    pesajes={pesajes}
                    lineaGenetica={selectedLote.lineaGenetica}
                    lote={{
                      codigo: selectedLote.codigo,
                      granja: selectedLote.granja,
                      galpon: selectedLote.galpon,
                    }}
                  />
                </TabsContent>

                <TabsContent value="comparar" className="pt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="compare-all-lotes"
                      checked={compareAllLotes}
                      onCheckedChange={async (v) => {
                        const on = v === true;
                        setCompareAllLotes(on);
                        if (on && allPesajes.length === 0) {
                          try {
                            setAllPesajes(await fetchAllPesajes());
                          } catch {
                            toast({ title: 'Error', description: 'No se pudieron cargar los pesajes de todos los lotes.', variant: 'destructive' });
                            setCompareAllLotes(false);
                          }
                        }
                      }}
                    />
                    <Label htmlFor="compare-all-lotes" className="text-xs cursor-pointer">
                      Incluir pesajes de <b>todos los lotes</b> (comparación entre lotes o galpones)
                    </Label>
                  </div>
                  <ComparisonPanel
                    pesajes={compareAllLotes ? allPesajes : pesajes}
                    showLote={compareAllLotes}
                    loteActual={{
                      codigo: selectedLote.codigo,
                      lineaGenetica: selectedLote.lineaGenetica,
                    }}
                  />
                </TabsContent>

                <TabsContent value="control" className="pt-3">
                  <SpcPanel pesajes={pesajes} lineaGenetica={selectedLote.lineaGenetica} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      )}

      {/* Diálogo: nuevo lote */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo lote</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Código o nombre *</Label>
              <Input value={fCodigo} onChange={(e) => setFCodigo(e.target.value)} placeholder="Ej: Lote 2026-08-A" className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Granja</Label>
              <Input value={fGranja} onChange={(e) => setFGranja(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Galpón</Label>
              <Input value={fGalpon} onChange={(e) => setFGalpon(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de ave</Label>
              <Select value={fTipoAve} onValueChange={setFTipoAve}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_AVE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Sexo</Label>
              <Select value={fSexo} onValueChange={setFSexo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEXO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Línea genética</Label>
              <Select value={fLinea} onValueChange={setFLinea}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GENETIC_LINES.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Tamaño estimado (aves)</Label>
              <Input type="number" min={1} value={fTamano} onChange={(e) => setFTamano(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Observaciones</Label>
              <Textarea value={fObs} onChange={(e) => setFObs(e.target.value)} className="min-h-16 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLote} className="bg-green-600 hover:bg-green-700 text-white">Crear lote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: guardar pesaje actual */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Guardar pesaje en &quot;{selectedLote?.codigo}&quot;</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Fecha del pesaje</Label>
              <Input type="date" value={pFecha} onChange={(e) => setPFecha(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Edad (semanas)</Label>
              <Input type="number" min={0} step={0.5} value={pEdad} onChange={(e) => setPEdad(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Método de muestreo</Label>
              <Select value={pMuestreo} onValueChange={setPMuestreo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MUESTREO_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Responsable</Label>
              <Input value={pResponsable} onChange={(e) => setPResponsable(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Observaciones</Label>
              <Textarea value={pObs} onChange={(e) => setPObs(e.target.value)} className="min-h-16 text-sm" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Se guardarán <b>{pesos.length}</b> pesos con el criterio de uniformidad ±{uniformityPct}%.
          </div>
          {saveWarnings.length > 0 && (
            <Alert className="border-amber-300 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-[11px] text-amber-900 space-y-0.5">
                {saveWarnings.map((w, i) => (
                  <div key={i}>• {w}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePesaje} className="bg-green-600 hover:bg-green-700 text-white">Guardar pesaje</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor de pesos individuales del pesaje */}
      {editPesaje && (
        <PesajeEditor
          pesaje={editPesaje}
          open={editPesaje !== null}
          onOpenChange={(o) => !o && setEditPesaje(null)}
          onSaved={() => refreshPesajes(selectedLoteId)}
        />
      )}

      {/* Confirmación de eliminación */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.kind === 'lote' ? 'lote' : 'pesaje'}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará {deleteTarget?.label}. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
