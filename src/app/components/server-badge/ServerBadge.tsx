import React from 'react';
import { as, Badge, Text } from 'folds';

export const ServerBadge = as<
  'div',
  {
    server: string;
    fill?: 'Solid' | 'None';
  }
>(({ as: AsServerBadge = 'div', fill, server, ...props }, ref) => (
  <Badge as={AsServerBadge} variant="Secondary" fill={fill} radii="300" {...props} ref={ref}>
    <Text as="span" size="L400" truncate>
      {server}
    </Text>
  </Badge>
));

export const MatrixOrgBadge = as<'div', { server: string }>(
  ({ as: AsBadge = 'div', server, ...props }, ref) => (
    <Badge
      as={AsBadge}
      variant="Warning"
      fill="Soft"
      radii="300"
      title={`This user is on ${server}, which is administered by the Matrix.org Foundation`}
      {...props}
      ref={ref}
    >
      <Text as="span" size="L400" truncate>
        Matrix.org
      </Text>
    </Badge>
  )
);

export const MatrixOrgRoomBadge = as<'div', { count: number }>(
  ({ as: AsBadge = 'div', count, ...props }, ref) => (
    <Badge
      as={AsBadge}
      variant="Warning"
      fill="Soft"
      radii="300"
      title={`Not end-to-end encrypted, and ${count} ${
        count === 1 ? 'member is' : 'members are'
      } on servers administered by the Matrix.org Foundation`}
      {...props}
      ref={ref}
    >
      <Text as="span" size="L400" truncate>
        Matrix.org · Unencrypted
      </Text>
    </Badge>
  )
);
