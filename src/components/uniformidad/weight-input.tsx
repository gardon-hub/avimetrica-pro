'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUniformidadStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function WeightInput() {
  const { addPeso } = useUniformidadStore();
  const t = useTranslations('weightInput');
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const val = parseFloat(value);
    if (!isNaN(val) && val > 0) {
      addPeso(val);
      setValue('');
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="flex gap-3 mb-4">
      <Input
        ref={inputRef}
        type="number"
        placeholder={t('placeholder')}
        aria-label={t('placeholder')}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-12 text-lg flex-1"
      />
      <Button
        onClick={handleAdd}
        aria-label={t('add')}
        className="h-12 px-6 text-xl font-bold bg-green-600 hover:bg-green-700 text-white shadow-md active:scale-95 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}
