import { MatrixClient } from 'matrix-js-sdk';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountData } from '../hooks/useAccountData';
import { useUserPresence } from '../hooks/useUserPresence';

type StatusMessageContent = { status?: string };

// Servers drop status_msg when presence goes offline or is replaced without one,
// so the user's message is kept in account data and re-sent with every change.
export const getRememberedStatus = (mx: MatrixClient): string =>
  mx.getAccountData(AccountDataEvent.PinnipedStatusMessage)?.getContent<StatusMessageContent>()
    ?.status ?? '';

export const sendPresence = (
  mx: MatrixClient,
  presence: 'online' | 'unavailable' | 'offline',
  statusMsg: string = getRememberedStatus(mx)
) => mx.setPresence({ presence, status_msg: statusMsg });

/** Stores the status message and applies it to the current presence. */
export const saveStatusMessage = async (
  mx: MatrixClient,
  presence: 'online' | 'unavailable' | 'offline',
  status: string
) => {
  await mx.setAccountData(AccountDataEvent.PinnipedStatusMessage, { status });
  await sendPresence(mx, presence, status);
};

/** The user's own status: what the server reports, else the remembered message. */
export const useOwnStatus = (userId: string): string => {
  const presence = useUserPresence(userId);
  const event = useAccountData(AccountDataEvent.PinnipedStatusMessage);
  return presence?.status?.trim() || event?.getContent<StatusMessageContent>().status?.trim() || '';
};
