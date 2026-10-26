import { useCallback, useMemo } from 'react';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountData } from '../hooks/useAccountData';
import { useMatrixClient } from '../hooks/useMatrixClient';

type SoundFavoritesContent = { favorites?: unknown };

const parseFavorites = (content: SoundFavoritesContent | undefined): string[] =>
  Array.isArray(content?.favorites)
    ? content.favorites.filter((k): k is string => typeof k === 'string')
    : [];

/** The user's favourite soundboard sounds (keys, see Sound), synced as account data. */
export const useSoundFavorites = (): [Set<string>, (key: string) => void] => {
  const mx = useMatrixClient();
  const event = useAccountData(AccountDataEvent.PinnipedSoundFavorites);
  const list = useMemo(() => parseFavorites(event?.getContent<SoundFavoritesContent>()), [event]);
  const favorites = useMemo(() => new Set(list), [list]);

  const toggle = useCallback(
    (key: string) => {
      const next = favorites.has(key) ? list.filter((k) => k !== key) : [...list, key];
      mx.setAccountData(AccountDataEvent.PinnipedSoundFavorites, { favorites: next }).catch(
        () => undefined
      );
    },
    [mx, list, favorites]
  );

  return [favorites, toggle];
};
