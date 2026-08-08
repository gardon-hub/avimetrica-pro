'use client';

/** Sección visible de fuentes técnicas y trazabilidad (Fase 7 / sección 20). */

import { useState } from 'react';
import { FUENTES_TECNICAS, FECHA_INCORPORACION, VERSION_DATOS } from '@/lib/fuentes';
import { APP_VERSION } from '@/lib/report-data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { BookOpen, ChevronDown } from 'lucide-react';

export function FuentesPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full h-9 text-sm font-bold uppercase tracking-wide text-muted-foreground justify-between px-1">
            <span className="flex items-center gap-1.5"><BookOpen className="h-4 w-4" /> Fuentes técnicas</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b font-bold text-muted-foreground">
                  <th className="py-1.5 text-left">Línea genética</th>
                  <th className="py-1.5 text-left">Documento</th>
                  <th className="py-1.5 text-left">Origen del dato</th>
                  <th className="py-1.5 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {FUENTES_TECNICAS.map((f) => (
                  <tr key={f.lineaGenetica} className="border-b border-border/50 align-top">
                    <td className="py-1.5 pr-2 font-semibold">{f.lineaGenetica}</td>
                    <td className="py-1.5 pr-2">{f.documento}</td>
                    <td className="py-1.5 pr-2">{f.detalle}</td>
                    <td className="py-1.5">
                      {f.estado === 'oficial' ? (
                        <span className="text-green-700 font-semibold">Oficial</span>
                      ) : (
                        <span className="text-amber-700 font-semibold">⚠️ Aproximado</span>
                      )}
                      {f.notas && <div className="text-muted-foreground">{f.notas}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-muted-foreground bg-muted/50 rounded-md p-2.5 space-y-0.5">
            <div>Incorporación de datos: {FECHA_INCORPORACION}</div>
            <div>Versión interna de datos de referencia: <b>{VERSION_DATOS}</b> · Versión de la aplicación: <b>{APP_VERSION}</b></div>
            <div>
              Donde la tabla no cita año, edición o página es porque el registro del proyecto no lo anotó:
              se indica el origen tal como quedó documentado, sin completar datos no verificados.
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
