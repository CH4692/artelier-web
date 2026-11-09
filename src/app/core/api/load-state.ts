/** Empty results are loaded data (for example []); failures never masquerade as empty results. */
export type ApiLoadState<T> =
  | { status: 'loading' }
  | { status: 'loaded'; data: T }
  | { status: 'error'; message: string; notFound: boolean };
