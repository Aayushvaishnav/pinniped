import React, { ReactNode } from 'react';
import { Box } from 'folds';
import { useAtomValue } from 'jotai';
import { TopBar } from './TopBar';
import { callFullscreenAtom } from '../../state/callEmbed';

type ClientLayoutProps = {
  nav: ReactNode;
  children: ReactNode;
};
export function ClientLayout({ nav, children }: ClientLayoutProps) {
  const callFullscreen = useAtomValue(callFullscreenAtom);

  return (
    <Box grow="Yes" direction="Column">
      <div style={{ display: callFullscreen ? 'none' : 'contents' }}>
        <TopBar />
      </div>
      <Box grow="Yes">
        <Box shrink="No" style={{ display: callFullscreen ? 'none' : undefined }}>
          {nav}
        </Box>
        <Box grow="Yes" direction="Column">
          {children}
        </Box>
      </Box>
    </Box>
  );
}
