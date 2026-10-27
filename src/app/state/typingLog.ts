/** One console line per typing event, so a missing indicator can be traced to where it was dropped. */
export const logTyping = (message: string) => {
  // eslint-disable-next-line no-console
  console.info(`[typing] ${message}`);
};
