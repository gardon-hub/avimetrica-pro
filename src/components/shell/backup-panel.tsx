'use client';

/**
 * Respaldo y restauración de TODOS los datos locales (ver lib/respaldo.ts).
 *
 * Vive en las tres rutas porque el respaldo cubre los tres módulos a la vez:
 * lotes y pesajes de aves, muestreos de huevos y conjuntos de docencia.
 *
 * La restauración pide confirmación mostrando QUÉ contiene el archivo antes
 * de tocar nada, y al terminar recarga la página: las listas en pantalla se
 * rellenan desde IndexedDB al montarse, igual que tras cambiar de idioma.
 */

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DatabaseBackup, Download, Upload } from 'lucide-react';
import type { RespaldoV1, ResumenRespaldo } from '@/lib/respaldo';

export function BackupPanel() {
  const t = useTranslations('backup');
  const locale = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [actual, setActual] = useState<ResumenRespaldo | null>(null);
  const [pendiente, setPendiente] = useState<{ respaldo: RespaldoV1; resumen: ResumenRespaldo } | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const { resumenActual } = await import('@/lib/respaldo');
        const r = await resumenActual();
        if (!cancelado) setActual(r);
      } catch { /* el panel sigue sin el conteo */ }
    })();
    return () => { cancelado = true; };
  }, []);

  const exportar = async () => {
    setOcupado(true);
    try {
      const { exportarRespaldo } = await import('@/lib/respaldo');
      const { contenido, nombre } = await exportarRespaldo();
      const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t('exportedTitle'), description: t('exportedBody', { nombre }) });
    } catch {
      toast({ title: t('errorTitle'), description: t('exportError'), variant: 'destructive' });
    } finally {
      setOcupado(false);
    }
  };

  const alElegirArchivo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const texto = await file.text();
      const { validarRespaldo } = await import('@/lib/respaldo');
      const v = validarRespaldo(JSON.parse(texto));
      if (!v.ok) {
        toast({ title: t('errorTitle'), description: t(v.error), variant: 'destructive' });
        return;
      }
      setPendiente({ respaldo: v.respaldo, resumen: v.resumen });
    } catch {
      toast({ title: t('errorTitle'), description: t('errCorrupt'), variant: 'destructive' });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const restaurar = async () => {
    if (!pendiente) return;
    setOcupado(true);
    try {
      const { aplicarRespaldo } = await import('@/lib/respaldo');
      await aplicarRespaldo(pendiente.respaldo);
      toast({ title: t('restoredTitle'), description: t('restoredBody') });
      // Recarga para que todas las listas se rellenen desde IndexedDB.
      setTimeout(() => window.location.reload(), 800);
    } catch {
      toast({ title: t('errorTitle'), description: t('restoreError'), variant: 'destructive' });
      setOcupado(false);
    }
    setPendiente(null);
  };

  const resumenTexto = (r: ResumenRespaldo) =>
    t('summary', { lotes: r.lotes, pesajes: r.pesajes, pesos: r.pesos, datasets: r.datasets, sesiones: r.flockSessions });

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <DatabaseBackup className="h-4 w-4" /> {t('title')}
      </h2>

      <p className="text-[11px] text-muted-foreground leading-snug mb-1.5">{t('intro')}</p>
      <p className="text-[11px] text-amber-700 leading-snug mb-3">{t('warning')}</p>

      {actual && (
        <p className="text-[11px] text-muted-foreground leading-snug mb-3">
          <b>{t('currentData')}</b> {resumenTexto(actual)}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={exportar}
          disabled={ocupado}
          variant="outline"
          className="flex-1 h-10 text-sm border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/40 font-semibold"
        >
          <Download className="h-4 w-4 mr-1.5" /> {t('exportButton')}
        </Button>
        <Button
          onClick={() => inputRef.current?.click()}
          disabled={ocupado}
          variant="outline"
          className="flex-1 h-10 text-sm font-semibold"
        >
          <Upload className="h-4 w-4 mr-1.5" /> {t('importButton')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => alElegirArchivo(e.target.files?.[0])}
        />
      </div>

      <AlertDialog open={pendiente !== null} onOpenChange={(o) => !o && setPendiente(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {t('fileContains')}{' '}
                <b>{pendiente ? resumenTexto(pendiente.resumen) : ''}</b>
                {pendiente?.resumen.exportadoEl
                  ? ` · ${t('exportedOn', { fecha: new Date(pendiente.resumen.exportadoEl).toLocaleString(locale) })}`
                  : ''}
              </span>
              <span className="block">{t('mergeExplain')}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={restaurar}>{t('confirmRestore')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
