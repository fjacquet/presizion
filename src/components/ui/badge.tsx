/* eslint-disable react-refresh/only-export-components */
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-primary-500 focus-visible:ring-[3px] focus-visible:ring-primary-500/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-util-high aria-invalid:ring-util-high/20 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary-600 text-white dark:bg-primary-500 [a]:hover:bg-primary-700',
        secondary:
          'bg-slate-100 text-slate-900 dark:bg-surface-700 dark:text-slate-100 [a]:hover:bg-slate-200',
        destructive:
          'bg-util-high/10 text-util-high focus-visible:ring-util-high/20 [a]:hover:bg-util-high/20',
        outline:
          'border border-slate-300 text-slate-900 dark:border-surface-700 dark:text-slate-100 [a]:hover:bg-slate-100 [a]:hover:text-slate-500',
        ghost:
          'hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-surface-700 dark:hover:text-slate-400',
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
