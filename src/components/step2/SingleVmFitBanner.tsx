import { useTranslation } from 'react-i18next';
import type { SingleVmFit } from '@/lib/sizing/singleVmFit';

interface SingleVmFitBannerProps {
  fit: SingleVmFit;
  nameplateRamGb: number;
}

export function SingleVmFitBanner({ fit, nameplateRamGb }: SingleVmFitBannerProps) {
  const { t } = useTranslation('step2');

  if (fit.overall !== 'warn' && fit.overall !== 'fail') return null;

  const isFail = fit.overall === 'fail';
  const fitTitle = isFail ? t('singleVmFit.titleFail') : t('singleVmFit.titleWarn');
  const fitLines: string[] = [];
  if (fit.vcpu === 'warn') {
    fitLines.push(
      t('singleVmFit.vcpuWarn', {
        vcpu: fit.largestVmVcpus,
        cores: fit.coresPerServer,
        logical: fit.logicalCpus,
      }),
    );
  } else if (fit.vcpu === 'fail') {
    fitLines.push(
      t('singleVmFit.vcpuFail', { vcpu: fit.largestVmVcpus, logical: fit.logicalCpus }),
    );
  }
  if (fit.ram === 'warn') {
    fitLines.push(
      t('singleVmFit.ramWarn', {
        ram: fit.largestVmRamGb,
        usable: fit.usableRamGb,
        nameplate: nameplateRamGb,
      }),
    );
  } else if (fit.ram === 'fail') {
    fitLines.push(t('singleVmFit.ramFail', { ram: fit.largestVmRamGb, nameplate: nameplateRamGb }));
  }

  return (
    <div
      className={
        isFail
          ? 'mt-3 flex flex-col gap-1 p-3 rounded border border-util-high/40 bg-util-high/10'
          : 'mt-3 flex flex-col gap-1 p-3 rounded border border-amber-400/40 bg-amber-50/60 dark:bg-amber-950/20'
      }
      role={isFail ? 'alert' : 'status'}
    >
      <p
        className={
          isFail
            ? 'text-sm font-medium text-util-high'
            : 'text-sm font-medium text-amber-700 dark:text-amber-300'
        }
      >
        {fitTitle}
      </p>
      {fitLines.map((line) => (
        <p key={line} className="text-sm text-foreground/80">
          {line}
        </p>
      ))}
    </div>
  );
}
