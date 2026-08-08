'use client';

import { useUniformidadStore } from '@/lib/store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const lineasGeneticas = [
  { value: 'Broiler - Cobb', label: 'Broiler - Cobb 500' },
  { value: 'Broiler - Ross', label: 'Broiler - Ross 308' },
  { value: 'Broiler - Hubbard', label: 'Broiler - Hubbard' },
  { value: 'Ponedora - Hy-Line Brown', label: 'Hy-Line Brown' },
  { value: 'Ponedora - Hy-Line W-36', label: 'Hy-Line W-36' },
  { value: 'Ponedora - Lohmann Brown', label: 'Lohmann Brown-Classic' },
  { value: 'Ponedora - Lohmann LSL', label: 'Lohmann LSL-Lite' },
  { value: 'Ponedora - Dekalb Brown', label: 'Dekalb Brown' },
  { value: 'Ponedora - Dekalb White', label: 'Dekalb White' },
  { value: 'Ponedora - Nick Brown', label: 'Nick Brown (H&N)' },
  { value: 'Ponedora - Super Nick', label: 'Super Nick (H&N)' },
];

export function FlockDataInput() {
  const { lineaGenetica, edadSemanas, setLineaGenetica, setEdadSemanas } = useUniformidadStore();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
          Línea Genética
        </Label>
        <Select value={lineaGenetica} onValueChange={setLineaGenetica}>
          <SelectTrigger className="h-11 text-base !w-full">
            <SelectValue placeholder="Seleccionar línea" />
          </SelectTrigger>
          <SelectContent>
            {lineasGeneticas.map((linea) => (
              <SelectItem key={linea.value} value={linea.value}>
                {linea.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs uppercase font-bold text-muted-foreground tracking-wide">
          Edad (semanas)
        </Label>
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="Ej: 22"
          value={edadSemanas}
          onChange={(e) => setEdadSemanas(e.target.value)}
          className="h-11 text-base"
        />
      </div>
    </div>
  );
}
