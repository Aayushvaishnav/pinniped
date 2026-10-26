import React from 'react';
import { Box, Text, IconButton, Icon, Icons, Scroll } from 'folds';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SystemNotification } from './SystemNotification';
import { SoundToggles } from './SoundToggles';
import { ResetNotification } from './ResetNotification';

type NotificationsProps = {
  requestClose: () => void;
};
export function Notifications({ requestClose }: NotificationsProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Notifications
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <SystemNotification />
              <SoundToggles />
              <ResetNotification />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
