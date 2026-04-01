/**
 * declarations.d.ts — TypeScript module declarations for non-TS file types.
 * Tells TypeScript that CSS module imports return a Record of class name strings.
 */
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
