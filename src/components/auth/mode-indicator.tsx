'use client';

import { useSession } from 'next-auth/react';
import { Badge } from '@/components/ui/badge';

export function ModeIndicator() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (!session?.user) {
    return (
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground border-muted-foreground/30">
        Local Mode
      </Badge>
    );
  }

  return null;
}
