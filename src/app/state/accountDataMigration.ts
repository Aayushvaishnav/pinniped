import { MatrixClient } from 'matrix-js-sdk';
import { LEGACY_ACCOUNT_DATA_MIGRATIONS } from '../../types/matrix/accountData';

/**
 * Copies pre-rename `im.kibby.*` account data to the `club.stablecat.pinniped.*`
 * types. Never overwrites existing new-type data, and leaves the legacy events
 * in place (account data can't be deleted) so older builds keep working.
 */
export const migrateLegacyAccountData = async (mx: MatrixClient): Promise<void> => {
  const pending = LEGACY_ACCOUNT_DATA_MIGRATIONS.filter(
    ([legacy, current]) => mx.getAccountData(legacy) && !mx.getAccountData(current)
  );
  await Promise.all(
    pending.map(([legacy, current]) =>
      mx.setAccountData(current, mx.getAccountData(legacy)?.getContent() ?? {})
    )
  );
};
