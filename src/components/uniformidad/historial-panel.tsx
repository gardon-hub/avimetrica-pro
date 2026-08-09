'use client';

/**
 * Historial de lotes (Fase 5): cada lote agrupa múltiples pesajes con fecha.
 * Permite crear lotes, guardar el pesaje actual, recargar un pesaje al
 * editor, ver la evolución temporal y comparar dos pesajes.
 * El módulo legado de "Sesiones" se mantiene aparte por compatibilidad.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import {
  LoteResumen, PesajeFull, PesajeConLote, TIPO_AVE_KEYS, SEXO_KEYS, MUESTREO_KEYS,
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
  const t = useTranslations('history');
  const tTipo = useTranslations('birdType');
  const tSexo = useTranslations('sex');
  const tMuestreo = useTranslations('sampling');

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
      toast({ title: t('errorTitle'), description: t('errorLoadFlocks'), variant: 'destructive' });
    }
  }, [t]);

  const refreshPesajes = useCallback(async (loteId: string) => {
    if (!loteId) return;
    setLoadingPesajes(true);
    try {
      setPesajes(await fetchPesajes(loteId));
    } catch {
      toast({ title: t('errorTitle'), description: t('errorLoadWeighIns'), variant: 'destructive' });
    } finally {
      setLoadingPesajes(false);
    }
  }, [t]);

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
      toast({ title: t('missingCodeTitle'), description: t('missingCodeBody'), variant: 'destructive' });
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
      toast({ title: t('createdTitle'), description: t('createdBody', { codigo: nuevo.codigo }) });
      setCreateOpen(false);
      setFCodigo(''); setFGranja(''); setFGalpon(''); setFTamano(''); setFObs('');
      await refreshLotes();
      setSelectedLoteId(nuevo.id);
    } else {
      toast({ title: t('errorTitle'), description: t('errorCreate'), variant: 'destructive' });
    }
  };

  // Advertencias previas al guardado del pesaje actual
  const saveWarnings = useMemo(() => {
    const w: string[] = [];
    if (!selectedLote) return w;
    if (pesos.length < 30) {
      w.push(t('warnFewBirds', { n: pesos.length }));
    }
    if (selectedLote.tamanoEstimado && pesos.length < selectedLote.tamanoEstimado * 0.02) {
      w.push(t('warnSmallSample', { n: pesos.length, total: selectedLote.tamanoEstimado }));
    }
    const ultima = pesajes.length > 0 ? new Date(pesajes[pesajes.length - 1].fecha) : null;
    if (ultima && new Date(pFecha + 'T12:00:00') < ultima) {
      w.push(t('warnBackdated', { fecha: ultima.toLocaleDateString() }));
    }
    if (selectedLote.lineaGenetica !== lineaGenetica) {
      w.push(t('warnLineMismatch', { editor: lineaGenetica, lote: selectedLote.lineaGenetica }));
    }
    const uniques = new Set(pesos).size;
    if (pesos.length >= 20 && uniques <= pesos.length * 0.3) {
      w.push(t('warnRepeated'));
    }
    return w;
  }, [selectedLote, pesos, pesajes, pFecha, lineaGenetica, t]);

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
      toast({ title: t('savedTitle'), description: t('savedBody', { n: pesos.length, codigo: selectedLote?.codigo ?? '' }) });
      setSaveOpen(false);
      setPObs('');
      refreshPesajes(selectedLoteId);
      refreshLotes();
    } else {
      toast({ title: t('errorTitle'), description: t('errorSave'), variant: 'destructive' });
    }
  };

  const handleLoadPesaje = (p: PesajeFull) => {
    const activos = p.pesos.filter((w) => !w.excluido).map((w) => w.gramos);
    setPesos(activos);
    if (selectedLote) setLineaGenetica(selectedLote.lineaGenetica);
    if (p.edadSemanas) setEdadSemanas(String(p.edadSemanas));
    toast({
      title: t('loadedTitle'),
      description: t('loadedBody', { n: activos.length, fecha: new Date(p.fecha).toLocaleDateString() }),
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const url = deleteTarget.kind === 'lote' ? `/api/lotes?id=${deleteTarget.id}` : `/api/pesajes?id=${deleteTarget.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      toast({ title: t(deleteTarget.kind === 'lote' ? 'deletedFlock' : 'deletedWeighIn') });
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
          <Archive className="h-4 w-4" /> {t('title')}
        </h2>
        <Button size="sm" variant="outline" onClick={() => { setFLinea(lineaGenetica); setCreateOpen(true); }} className="h-8 text-xs">
          <Plus className="h-3.5 w-3.5 mr-1" /> {t('newFlock')}
        </Button>
      </div>

      {lotes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">{t('empty')}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('flock')}</Label>
            <Select value={selectedLoteId} onValueChange={setSelectedLoteId}>
              <SelectTrigger className="h-10 text-xs"><SelectValue placeholder={t('selectFlock')} /></SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {t('flockOption', {
                      // El galpón lleva su rótulo: un «· 3» suelto no dice nada.
                      codigo: [l.codigo, l.granja, l.galpon ? t('housePrefix', { galpon: l.galpon }) : null]
                        .filter(Boolean)
                        .join(' · '),
                      pesajes: l.pesajes.length,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLote && (
            <>
              <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                <span>{(TIPO_AVE_KEYS as readonly string[]).includes(selectedLote.tipoAve) ? tTipo(selectedLote.tipoAve) : selectedLote.tipoAve}</span>
                <span>{selectedLote.lineaGenetica}</span>
                <span>{(SEXO_KEYS as readonly string[]).includes(selectedLote.sexo) ? tSexo(selectedLote.sexo) : selectedLote.sexo}</span>
                {selectedLote.tamanoEstimado && <span>{t('birds', { n: selectedLote.tamanoEstimado.toLocaleString() })}</span>}
                <button
                  className="text-red-500 hover:text-red-700 underline ml-auto"
                  onClick={() => setDeleteTarget({ kind: 'lote', id: selectedLote.id, label: t('deleteLabelFlock', { codigo: selectedLote.codigo }) })}
                >
                  {t('deleteFlock')}
                </button>
              </div>

              <Tabs defaultValue="pesajes">
                <TabsList className="w-full flex h-auto gap-1">
                  <TabsTrigger value="pesajes" className="text-xs flex-1">{t('tabWeighIns')}</TabsTrigger>
                  <TabsTrigger value="evolucion" className="text-xs flex-1">{t('tabTrend')}</TabsTrigger>
                  <TabsTrigger value="comparar" className="text-xs flex-1">{t('tabCompare')}</TabsTrigger>
                  <TabsTrigger value="control" className="text-xs flex-1">{t('tabControl')}</TabsTrigger>
                </TabsList>

                <TabsContent value="pesajes" className="pt-3 space-y-3">
                  <Button
                    onClick={() => { setPEdad(edadSemanas); setSaveOpen(true); }}
                    disabled={pesos.length === 0}
                    className="w-full h-9 text-xs font-bold bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    {t('saveCurrent', { n: pesos.length })}
                  </Button>

                  {loadingPesajes ? (
                    <p className="text-xs text-muted-foreground text-center py-2">{t('loading')}</p>
                  ) : pesajes.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">{t('noWeighIns')}</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-[11px] border-collapse">
                        <thead>
                          <tr className="border-b font-bold text-muted-foreground">
                            <th className="py-1 text-left">{t('colDate')}</th>
                            <th className="py-1 text-right">{t('colAge')}</th>
                            <th className="py-1 text-right">{t('colN')}</th>
                            <th className="py-1 text-right">{t('colMean')}</th>
                            <th className="py-1 text-right">{t('colCv')}</th>
                            <th className="py-1 text-right">{t('colUnif')}</th>
                            <th className="py-1 text-right">{t('colActions')}</th>
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
                                    title={t('loadIntoEditor')}
                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                    onClick={() => handleLoadPesaje(p)}
                                  >
                                    <Upload className="h-3.5 w-3.5 inline" />
                                  </button>
                                  <button
                                    title={t('editWeights')}
                                    className="text-emerald-600 hover:text-emerald-800 mr-2"
                                    onClick={() => setEditPesaje(p)}
                                  >
                                    <Pencil className="h-3.5 w-3.5 inline" />
                                  </button>
                                  <button
                                    title={t('deleteWeighIn')}
                                    className="text-red-400 hover:text-red-600"
                                    onClick={() => setDeleteTarget({
                                      kind: 'pesaje',
                                      id: p.id,
                                      label: t('deleteLabelWeighIn', { fecha: new Date(p.fecha).toLocaleDateString(), n: p.pesos.length }),
                                    })}
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
                            toast({ title: t('errorTitle'), description: t('errorLoadAll'), variant: 'destructive' });
                            setCompareAllLotes(false);
                          }
                        }
                      }}
                    />
                    <Label htmlFor="compare-all-lotes" className="text-xs cursor-pointer">
                      {t.rich('includeAllFlocks', { b: (c) => <b>{c}</b> })}
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
            <DialogTitle>{t('newFlock')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('code')}</Label>
              <Input value={fCodigo} onChange={(e) => setFCodigo(e.target.value)} placeholder={t('codePlaceholder')} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('farm')}</Label>
              <Input value={fGranja} onChange={(e) => setFGranja(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('house')}</Label>
              <Input value={fGalpon} onChange={(e) => setFGalpon(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('birdTypeLabel')}</Label>
              <Select value={fTipoAve} onValueChange={setFTipoAve}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPO_AVE_KEYS.map((v) => (
                    <SelectItem key={v} value={v}>{tTipo(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('sexLabel')}</Label>
              <Select value={fSexo} onValueChange={setFSexo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEXO_KEYS.map((v) => (
                    <SelectItem key={v} value={v}>{tSexo(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('lineLabel')}</Label>
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
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('estimatedSize')}</Label>
              <Input type="number" min={1} value={fTamano} onChange={(e) => setFTamano(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('notes')}</Label>
              <Textarea value={fObs} onChange={(e) => setFObs(e.target.value)} className="min-h-16 text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleCreateLote} className="bg-green-600 hover:bg-green-700 text-white">{t('createFlock')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: guardar pesaje actual */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('saveWeighInTitle', { codigo: selectedLote?.codigo ?? '' })}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('weighInDate')}</Label>
              <Input type="date" value={pFecha} onChange={(e) => setPFecha(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('age')}</Label>
              <Input type="number" min={0} step={0.5} value={pEdad} onChange={(e) => setPEdad(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('samplingMethod')}</Label>
              <Select value={pMuestreo} onValueChange={setPMuestreo}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MUESTREO_KEYS.map((v) => (
                    <SelectItem key={v} value={v}>{tMuestreo(v)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('responsible')}</Label>
              <Input value={pResponsable} onChange={(e) => setPResponsable(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{t('notes')}</Label>
              <Textarea value={pObs} onChange={(e) => setPObs(e.target.value)} className="min-h-16 text-sm" />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t.rich('willSave', { n: pesos.length, pct: uniformityPct, b: (c) => <b>{c}</b> })}
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
            <Button variant="outline" onClick={() => setSaveOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSavePesaje} className="bg-green-600 hover:bg-green-700 text-white">{t('saveWeighIn')}</Button>
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
            <AlertDialogTitle>{t(deleteTarget?.kind === 'lote' ? 'deleteTitleFlock' : 'deleteTitleWeighIn')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteBody', { objeto: deleteTarget?.label ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
