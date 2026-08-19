'use client';

/**
 * Sección «Cómo citar».
 *
 * Los datos NO se escriben aquí sueltos: salen de un único sitio (CITATION)
 * para que la cita en APA y el BibTeX no puedan divergir entre sí ni respecto
 * de CITATION.cff.
 *
 * El DOI es el de CONCEPTO de Zenodo (2026-08-18): apunta siempre a la última
 * versión archivada, así que sobrevive a las releases futuras sin tocarlo.
 * El de una versión concreta (p. ej. …22005612 para v0.7.1) NO va aquí.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { APP_VERSION } from '@/lib/report-data';
import { Button } from '@/components/ui/button';
import { Quote, Copy, Check } from 'lucide-react';

const CITATION = {
  apellidos: 'Ardón',
  nombres: 'Gustavo Alonso',
  iniciales: 'G. A.',
  titulo: 'Avimétrica Pro',
  anio: 2026,
  editor: 'Universidad Nacional de Agricultura',
  orcid: '0000-0002-1982-4507',
  repo: 'https://github.com/gardon-hub/avimetrica-pro',
  /** DOI de concepto emitido por Zenodo — resuelve a la última versión. */
  doi: '10.5281/zenodo.22005611' as string | null,
};

function apa(tipoSoftware: string, version: string): string {
  const { apellidos, iniciales, titulo, anio, editor, repo, doi } = CITATION;
  const enlace = doi ? `https://doi.org/${doi}` : repo;
  return `${apellidos}, ${iniciales} (${anio}). ${titulo} (${version}) [${tipoSoftware}]. ${editor}. ${enlace}`;
}

function bibtex(version: string): string {
  const { apellidos, nombres, titulo, anio, editor, repo, doi } = CITATION;
  const lineaDoi = doi ? `\n  doi       = {${doi}},` : '';
  return `@software{ardon_avimetrica_${CITATION.anio},
  author    = {${apellidos}, ${nombres}},
  title     = {${titulo}},
  year      = {${anio}},
  version   = {${version}},
  publisher = {${editor}},${lineaDoi}
  url       = {${repo}}
}`;
}

function BloqueCopiable({ texto, etiqueta }: { texto: string; etiqueta: string }) {
  const t = useTranslations('cite');
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase font-bold text-muted-foreground">{etiqueta}</span>
        <Button variant="ghost" size="sm" onClick={copiar} className="h-7 text-[11px]">
          {copiado ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {t(copiado ? 'copied' : 'copy')}
        </Button>
      </div>
      <pre className="text-[11px] bg-muted/50 rounded-md p-2.5 whitespace-pre-wrap break-words font-mono leading-snug">
        {texto}
      </pre>
    </div>
  );
}

export function HowToCite() {
  const t = useTranslations('cite');

  return (
    <div className="bg-card rounded-lg border shadow-sm p-3 sm:p-4 mb-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
        <Quote className="h-4 w-4" /> {t('title')}
      </h2>

      <p className="text-[11px] text-muted-foreground leading-snug mb-3">{t('intro')}</p>

      <div className="space-y-3">
        <BloqueCopiable texto={apa(t('softwareType'), APP_VERSION)} etiqueta={t('apa')} />
        <BloqueCopiable texto={bibtex(APP_VERSION)} etiqueta={t('bibtex')} />
      </div>

      <div className="mt-3 text-[11px] text-muted-foreground space-y-1">
        <div>
          ORCID:{' '}
          <a
            href={`https://orcid.org/${CITATION.orcid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            {CITATION.orcid}
          </a>
          {' · '}
          {t('license', { licencia: 'MIT' })}
        </div>
        {!CITATION.doi && (
          <p className="text-amber-700 leading-snug">{t('doiPending')}</p>
        )}
      </div>
    </div>
  );
}
