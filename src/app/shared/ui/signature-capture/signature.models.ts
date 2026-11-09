/** Normalized in-memory drawing, deliberately independent of any backend payload. */
export interface SignaturePoint {
  readonly x: number;
  readonly y: number;
  readonly pressure: number;
}
export interface SignatureDraft {
  readonly strokes: readonly (readonly SignaturePoint[])[];
}
