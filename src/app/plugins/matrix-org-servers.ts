import { getMxIdServer } from '../utils/matrix';

/**
 * Homeservers administered by the Matrix.org Foundation. Edit this list to flag more.
 * A server matches if it equals an entry or is a subdomain of one.
 */
export const MATRIX_ORG_ADMINISTERED_SERVERS: readonly string[] = [
  'matrix.org',
  'matrix.to',
  'mozilla.org',
  'gitter.im',
];

const stripPort = (server: string): string => server.replace(/:\d+$/, '').toLowerCase();

export const isMatrixOrgAdministered = (server?: string): boolean => {
  if (!server) return false;
  const host = stripPort(server);
  return MATRIX_ORG_ADMINISTERED_SERVERS.some(
    (entry) => host === entry || host.endsWith(`.${entry}`)
  );
};

export const isMatrixOrgUser = (userId: string): boolean =>
  isMatrixOrgAdministered(getMxIdServer(userId));
