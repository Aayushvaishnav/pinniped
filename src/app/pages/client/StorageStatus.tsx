import React from 'react';
import { Box, config, Line, Text } from 'folds';
import { useClientStorageError } from '../../../client/storageStatus';
import { ContainerColor } from '../../styles/ContainerColor.css';

export function StorageStatus() {
  const storageError = useClientStorageError();

  if (!storageError) return null;

  return (
    <Box direction="Column" shrink="No" role="alert">
      <Box
        className={ContainerColor({ variant: 'Critical' })}
        style={{ padding: `${config.space.S100} ${config.space.S300}` }}
        alignItems="Center"
        justifyContent="Center"
      >
        <Text size="L400" align="Center">
          The local message cache could not be read, so Pinniped is running without it. Rooms reload
          from the server, and startup may be slower until the cache is repaired.
        </Text>
      </Box>
      <Line variant="Critical" size="300" />
    </Box>
  );
}
