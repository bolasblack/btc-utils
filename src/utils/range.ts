export const range = (start: number, end: number): number[] => {
  return Array.from({ length: end - start }, (_, i) => i + start)
}

// export const range = (start, end) => {
//   return Array.from({ length: end - start }, (_, i) => i + start)
// }
