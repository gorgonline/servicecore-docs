import { redirect } from 'next/navigation';

// Vercel docs yaklaşımı: kök adres doğrudan dokümantasyona gider
export default function HomePage() {
  redirect('/docs');
}
