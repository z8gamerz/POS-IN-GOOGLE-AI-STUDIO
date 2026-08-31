'use client';

import { useAuth } from '@/lib/contexts/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'cashier')[];
  requireAdmin?: boolean;
}

export function AuthGuard({ children, allowedRoles, requireAdmin }: AuthGuardProps) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const effectiveAllowedRoles = requireAdmin ? ['admin' as const] : allowedRoles;

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      } else if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) {
        router.push('/'); // Redirect to home if role not allowed
      }
    }
  }, [user, loading, router, pathname, effectiveAllowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Verifying Session...</p>
      </div>
    );
  }

  if (!user) return null;
  if (effectiveAllowedRoles && !effectiveAllowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
