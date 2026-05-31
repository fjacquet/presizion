import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportStore } from '@/store/useImportStore';

export function ScopeBadge() {
  const { t } = useTranslation('step1');
  const scopeOptions = useImportStore((s) => s.scopeOptions);
  const activeScope = useImportStore((s) => s.activeScope);
  const scopeLabels = useImportStore((s) => s.scopeLabels);
  const rawByScope = useImportStore((s) => s.rawByScope);
  const setActiveScope = useImportStore((s) => s.setActiveScope);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<string[]>([]);

  // Only render for multi-scope imports
  if (scopeOptions.length <= 1) return null;

  const formatScopeLabel = (k: string): string => {
    const label = scopeLabels[k] ?? k;
    const hostCount = rawByScope?.get(k)?.existingServerCount;
    return hostCount != null ? `${label} (${hostCount} hosts)` : label;
  };

  const activeLabels = activeScope.map(formatScopeLabel).join(', ');

  const openDialog = () => {
    setPending([...activeScope]);
    setDialogOpen(true);
  };

  const handleApply = () => {
    setActiveScope(pending);
    setDialogOpen(false);
  };

  const toggleScope = (key: string, checked: boolean) => {
    setPending((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  return (
    <div className="flex items-center gap-2 min-w-0 text-sm text-slate-500 dark:text-slate-400">
      <span className="truncate max-w-[200px] sm:max-w-none">
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {t('scopeBadge.label')}:
        </span>{' '}
        {activeLabels}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={openDialog}
        aria-label={t('scopeBadge.editAriaLabel')}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('scopeBadge.dialogTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {scopeOptions.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Checkbox
                  id={`badge-scope-${key}`}
                  checked={pending.includes(key)}
                  onCheckedChange={(checked) => toggleScope(key, Boolean(checked))}
                />
                <label htmlFor={`badge-scope-${key}`} className="text-sm cursor-pointer">
                  {formatScopeLabel(key)}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('scopeBadge.cancelButton')}
            </Button>
            <Button onClick={handleApply} disabled={pending.length === 0}>
              {t('scopeBadge.applyButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
