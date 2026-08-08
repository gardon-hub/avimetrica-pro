'use client';

import Image from 'next/image';
import { ThemeToggle } from './theme-toggle';

export function LogoHeader() {
  return (
    <div className="relative flex flex-col items-center mb-4 mt-2">
      <div className="absolute right-0 top-0">
        <ThemeToggle />
      </div>
      <div className="bg-white rounded-xl px-4 py-2 shadow-sm">
        <Image
          src="/logo-avimetrica.png"
          alt="Avimétrica Pro — Analítica de peso, uniformidad y desempeño avícola"
          width={280}
          height={192}
          className="h-auto w-56 sm:w-64"
          priority
        />
      </div>
    </div>
  );
}
