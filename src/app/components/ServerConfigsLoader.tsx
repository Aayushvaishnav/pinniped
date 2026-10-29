import { ReactNode, useCallback, useMemo } from 'react';
import { Capabilities, ValidatedAuthMetadata } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallbackValue } from '../hooks/useAsyncCallback';
import { useMatrixClient } from '../hooks/useMatrixClient';
import { MediaConfig } from '../hooks/useMediaConfig';
import { promiseFulfilledResult } from '../utils/common';
import { serverVersion } from '../cs-api';
import {
  identifyServerSoftware,
  ServerSoftwareInfo,
  UNKNOWN_SERVER_SOFTWARE,
} from '../hooks/useServerSoftware';

export type ServerConfigs = {
  capabilities?: Capabilities;
  mediaConfig?: MediaConfig;
  authMetadata?: ValidatedAuthMetadata;
  serverSoftware: ServerSoftwareInfo;
};

type ServerConfigsLoaderProps = {
  children: (configs: ServerConfigs) => ReactNode;
};
export function ServerConfigsLoader({ children }: ServerConfigsLoaderProps) {
  const mx = useMatrixClient();
  const fallbackConfigs = useMemo<ServerConfigs>(
    () => ({ serverSoftware: UNKNOWN_SERVER_SOFTWARE }),
    []
  );

  const [configsState] = useAsyncCallbackValue<ServerConfigs, unknown>(
    useCallback(async () => {
      const result = await Promise.allSettled([
        mx.getCapabilities(),
        mx.getMediaConfig(),
        mx.getAuthMetadata(),
        serverVersion(fetch, mx.getHomeserverUrl()),
      ]);

      const capabilities = promiseFulfilledResult(result[0]);
      const mediaConfig = promiseFulfilledResult(result[1]);
      const validatedAuthMetadata = promiseFulfilledResult(result[2]);
      const serverSoftware = identifyServerSoftware(promiseFulfilledResult(result[3]));

      return {
        capabilities,
        mediaConfig,
        authMetadata: validatedAuthMetadata,
        serverSoftware,
      };
    }, [mx])
  );

  const configs: ServerConfigs =
    configsState.status === AsyncStatus.Success ? configsState.data : fallbackConfigs;

  return children(configs);
}
