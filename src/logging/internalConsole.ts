/**
 * Referências ao console original — usadas pelo appLogger e pelo patch global
 * para evitar recursão quando console.* é redirecionado ao Better Stack.
 */
export const internalConsole = {
  log: console.log.bind(console),
  info: (console.info ?? console.log).bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: (console.debug ?? console.log).bind(console),
};
