'use client';

/**
 * La avicultura sigue siendo la identidad principal de Avimétrica Pro: la raíz
 * entra directamente al módulo de aves. La redirección es de CLIENTE porque
 * el sitio es estático (no hay servidor que responda 307); el router aplica
 * el basePath solo. Preserva los marcadores existentes y el start_url de la
 * PWA.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/aves');
  }, [router]);
  // Respaldo visible por si el JS aún no corre (o está deshabilitado).
  return (
    <main className="min-h-screen flex items-center justify-center">
      <Link href="/aves" className="text-sm underline">Avimétrica Pro →</Link>
    </main>
  );
}
