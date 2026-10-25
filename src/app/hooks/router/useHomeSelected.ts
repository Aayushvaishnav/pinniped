import { useMatch } from 'react-router-dom';
import {
  getHomeCreatePath,
  getHomeInvitesPath,
  getHomeJoinPath,
  getHomePath,
  getHomeSearchPath,
} from '../../pages/pathUtils';

export const useHomeSelected = (): boolean => {
  const homeMatch = useMatch({
    path: getHomePath(),
    caseSensitive: true,
    end: false,
  });

  return !!homeMatch;
};

export const useHomeCreateSelected = (): boolean => {
  const match = useMatch({
    path: getHomeCreatePath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeJoinSelected = (): boolean => {
  const match = useMatch({
    path: getHomeJoinPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeSearchSelected = (): boolean => {
  const match = useMatch({
    path: getHomeSearchPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeInvitesSelected = (): boolean => {
  const match = useMatch({
    path: getHomeInvitesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useHomeIndexSelected = (): boolean => {
  const match = useMatch({
    path: getHomePath(),
    caseSensitive: true,
    end: true,
  });

  return !!match;
};
