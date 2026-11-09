import { isDeepStrictEqual } from 'node:util';

/** Ignore only installation-derived software version metadata, never API contract fields. */
export function sameOpenApiContract(expected, actual) {
  const contract = (schema) => {
    const result = structuredClone(schema);
    delete result.info.version;
    return result;
  };
  return isDeepStrictEqual(contract(expected), contract(actual));
}
