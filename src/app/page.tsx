import { redirect } from 'next/navigation';

/**
 * La avicultura sigue siendo la identidad principal de Avimétrica Pro: la raíz
 * entra directamente al módulo de aves. Los demás módulos están siempre a un
 * clic en la navegación superior. Además preserva los marcadores existentes y
 * el start_url "/" de la PWA.
 */
export default function Home() {
  redirect('/aves');
}
