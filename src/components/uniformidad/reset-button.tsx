'use client';

import { useUniformidadStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

export function ResetButton() {
  const { resetAll } = useUniformidadStore();

  const handleReset = () => {
    if (confirm('¿Estás seguro de que deseas borrar todos los datos e iniciar una nueva prueba?')) {
      resetAll();
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleReset}
      className="w-full h-9 border-red-400 text-red-600 hover:bg-red-50 font-semibold text-sm mb-4"
    >
      <RotateCcw className="h-3.5 w-3.5 mr-2" />
      Iniciar Nueva Prueba
    </Button>
  );
}
