export function sum(...args: number[]): number {
  return args.reduce((acc, val) => acc + val, 0)
}
