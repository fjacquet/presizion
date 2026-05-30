import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

function Fixture() {
  return (
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Body</DialogDescription>
        <button type="button">Inside</button>
      </DialogContent>
    </Dialog>
  );
}

it('opens on trigger and exposes a dialog role with an accessible name', async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByText('Open'));
  const dialog = await screen.findByRole('dialog');
  expect(dialog).toHaveAccessibleName('Title');
});

it('closes on Escape (base-ui keyboard handling retained)', async () => {
  const user = userEvent.setup();
  render(<Fixture />);
  await user.click(screen.getByText('Open'));
  expect(await screen.findByRole('dialog')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
