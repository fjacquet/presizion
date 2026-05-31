import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-primary-500 focus-visible:ring-3 focus-visible:ring-primary-500/50 active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-util-high aria-invalid:ring-3 aria-invalid:ring-util-high/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-400',
        outline:
          'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-surface-700 dark:bg-surface-800 dark:text-slate-100 dark:hover:bg-surface-700',
        secondary:
          'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-surface-700 dark:text-slate-100 dark:hover:bg-surface-700',
        ghost: 'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-surface-700',
        destructive:
          'bg-util-high/10 text-util-high hover:bg-util-high/20 focus-visible:border-util-high/40 focus-visible:ring-util-high/20',
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-300',
      },
      size: {
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3',
        icon: 'size-8',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- buttonVariants must be co-exported (shadcn/ui pattern)
export { Button, buttonVariants };
