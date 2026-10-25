import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';

/** Message export is a developer feature: it needs Developer Tools and its own switch. */
export const useMessageExportEnabled = (): boolean => {
  const [developerTools] = useSetting(settingsAtom, 'developerTools');
  const [messageExport] = useSetting(settingsAtom, 'messageExport');
  return developerTools && messageExport;
};
