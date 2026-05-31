import { Input as InputPrimitive } from '@base-ui/react/input';
import type * as React from 'react';

import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        'data-readout flex h-9 w-full rounded-md border border-slate-300/80 bg-white/70 px-3 py-1 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(20,30,80,0.06)] backdrop-blur-sm transition-all placeholder:text-slate-400 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:shadow-[0_0_0_1px_rgba(80,104,255,0.35),0_0_18px_-4px_rgba(80,104,255,0.55)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700/80 dark:bg-surface-900/50 dark:text-slate-100 dark:placeholder:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
