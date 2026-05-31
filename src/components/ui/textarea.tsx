import type * as React from 'react';

import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-1 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-800 dark:text-slate-100 dark:placeholder:text-slate-500',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
