import React from 'react';
import { as, Badge, color, Icon, Icons, Text } from 'folds';

const TITLE = 'Not end-to-end encrypted';

/** Compact icon for dense lists. */
export const UnencryptedIcon = as<'span'>(({ as: AsIcon = 'span', ...props }, ref) => (
  <AsIcon
    title={TITLE}
    aria-label={TITLE}
    style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}
    ref={ref}
    {...props}
  >
    <Icon size="50" src={Icons.Warning} style={{ color: color.Warning.Main }} filled />
  </AsIcon>
));

/** Labelled badge for headers. */
export const UnencryptedBadge = as<'div'>(({ as: AsBadge = 'div', ...props }, ref) => (
  <Badge as={AsBadge} variant="Warning" fill="Soft" radii="300" title={TITLE} {...props} ref={ref}>
    <Text as="span" size="L400" truncate>
      Unencrypted
    </Text>
  </Badge>
));
