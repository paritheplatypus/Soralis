
const order = ['mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'] as const;
export function solarOrder(from: string, to: string): string[]{
  const i = order.indexOf(from as any), j = order.indexOf(to as any)
  if(i===-1 || j===-1) return []
  if(i<=j) return order.slice(i, j+1)
  return order.slice(j, i+1).reverse()
}
