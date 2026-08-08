'use client';

import { useUniformidadStore } from '@/lib/store';
import { getUniformityLevel } from '@/lib/calculations';

export function StatsGrid() {
  const { stats } = useUniformidadStore();

  const uniLevel = getUniformityLevel(stats.uniformidad);
  const uniColorClass =
    uniLevel === 'excellent'
      ? 'bg-green-600 text-white'
      : uniLevel === 'regular'
        ? 'bg-amber-500 text-gray-900'
        : 'bg-red-600 text-white';

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <StatCard label="Aves" value={stats.totalAves.toString()} />
      <StatCard label="Promedio" value={stats.promedio.toFixed(1)} />
      <StatCard label="Desv. Est. (n−1)" value={stats.desvEst.toFixed(1)} valueColor="text-foreground/80" />
      <StatCard label={`Media −${stats.criterioPct}%`} value={stats.limiteInf.toFixed(1)} valueColor="text-red-600" />
      <StatCard label={`Media +${stats.criterioPct}%`} value={stats.limiteSup.toFixed(1)} valueColor="text-green-600" />
      <StatCard label="CV (%)" value={stats.cv.toFixed(2)} valueColor="text-foreground/80" />
      <StatCard label="Debajo" value={stats.countDebajo.toString()} valueColor="text-red-600" />
      <StatCard label="Encima" value={stats.countEncima.toString()} valueColor="text-green-600" />
      <StatCard label="En Rango" value={stats.countDentro.toString()} valueColor="text-green-800" />
      <div className="col-span-3">
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm py-3 px-3 text-center">
          <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
            Uniformidad
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mt-0.5 py-1.5 px-3 rounded-lg ${uniColorClass}`}>
            {stats.uniformidad.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueColor = 'text-foreground',
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-card text-card-foreground rounded-lg border shadow-sm py-2 px-2 text-center">
      <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">
        {label}
      </div>
      <div className={`text-base sm:text-lg font-bold mt-0.5 ${valueColor}`}>{value}</div>
    </div>
  );
}
