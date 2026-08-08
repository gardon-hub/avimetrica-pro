'use client';

/**
 * Datos de contexto del conjunto (Fase 9): identifican el muestreo en los
 * reportes y las comparaciones. Ninguno es obligatorio para calcular.
 */

import { useState } from 'react';
import type { DatasetStore } from '@/lib/dataset-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ClipboardList } from 'lucide-react';

export function DatasetContextForm({ store }: { store: DatasetStore }) {
  const { contexto, setContexto } = store();
  const [abierto, setAbierto] = useState(false);

  const campos: Array<{ key: keyof typeof contexto; label: string; type?: string }> = [
    { key: 'nombre', label: 'Nombre del muestreo' },
    { key: 'origen', label: 'Granja / galpón / origen' },
    { key: 'fecha', label: 'Fecha', type: 'date' },
    { key: 'responsable', label: 'Responsable' },
  ];

  const llenos = campos.filter((c) => contexto[c.key]).length;

  return (
    <Collapsible open={abierto} onOpenChange={setAbierto} className="mb-4">
      <CollapsibleTrigger asChild>
        <Button variant="outline" className="w-full h-10 text-sm font-semibold border-dashed">
          <ClipboardList className="h-4 w-4 mr-2" />
          Datos del muestreo{llenos > 0 ? ` (${llenos} completados)` : ''}
          <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${abierto ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">
        <div className="bg-card rounded-lg border shadow-sm p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {campos.map((c) => (
            <div key={c.key} className="flex flex-col gap-1">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">{c.label}</Label>
              <Input
                type={c.type ?? 'text'}
                value={contexto[c.key]}
                onChange={(e) => setContexto({ [c.key]: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
          ))}
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Observaciones</Label>
            <Textarea
              value={contexto.observaciones}
              onChange={(e) => setContexto({ observaciones: e.target.value })}
              className="min-h-16 text-sm"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
