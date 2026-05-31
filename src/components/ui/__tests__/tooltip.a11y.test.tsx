import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

it('shows tooltip content on focus (keyboard accessible)', async () => {
  const user = userEvent.setup();
  render(
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent>Explanatory text</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
  await user.tab();
  expect(await screen.findByText('Explanatory text')).toBeInTheDocument();
});
