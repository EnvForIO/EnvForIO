/** A machine's display name: This PC, a WSL distribution, or an SSH host. */
import { useTranslation } from 'react-i18next'
import type { MonitorTarget } from '@/lib/tauri-bindings'

export function useMachineLabel() {
  const { t } = useTranslation()
  return (target: MonitorTarget) =>
    target.kind === 'local'
      ? t('monitor.thisPc')
      : target.kind === 'wsl'
        ? `${target.distro} (WSL)`
        : target.host
}
