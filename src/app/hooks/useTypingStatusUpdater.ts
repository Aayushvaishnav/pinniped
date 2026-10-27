import { MatrixClient } from 'matrix-js-sdk';
import { useMemo, useRef } from 'react';
import { TYPING_TIMEOUT_MS } from '../state/typingMembers';
import { logTyping } from '../state/typingLog';

type TypingStatusUpdater = (typing: boolean) => void;

export const useTypingStatusUpdater = (mx: MatrixClient, roomId: string): TypingStatusUpdater => {
  const statusSentTsRef = useRef<number>(0);

  const sendTypingStatus: TypingStatusUpdater = useMemo(() => {
    statusSentTsRef.current = 0;
    return (typing) => {
      if (typing) {
        if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
          return;
        }

        logTyping(`send typing=true in ${roomId}`);
        mx.sendTyping(roomId, true, TYPING_TIMEOUT_MS).catch((err) =>
          logTyping(`send typing=true failed in ${roomId}: ${err}`)
        );
        const sentTs = Date.now();
        statusSentTsRef.current = sentTs;

        // Don't believe server will timeout typing status;
        // Clear typing status after timeout if already not;
        setTimeout(() => {
          if (statusSentTsRef.current === sentTs) {
            logTyping(`send typing=false in ${roomId} (timeout)`);
            mx.sendTyping(roomId, false, TYPING_TIMEOUT_MS).catch((err) =>
              logTyping(`send typing=false failed in ${roomId}: ${err}`)
            );
            statusSentTsRef.current = 0;
          }
        }, TYPING_TIMEOUT_MS);
        return;
      }

      if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
        logTyping(`send typing=false in ${roomId}`);
        mx.sendTyping(roomId, false, TYPING_TIMEOUT_MS).catch((err) =>
          logTyping(`send typing=false failed in ${roomId}: ${err}`)
        );
      }
      statusSentTsRef.current = 0;
    };
  }, [mx, roomId]);

  return sendTypingStatus;
};
