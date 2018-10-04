import BN = require('bn.js')

export type Num = string | number | BN

export type MathMethods = {
  bn: (a: Num) => BN
  max: (a: Num, ...rest: Num[]) => BN
  min: (a: Num, ...rest: Num[]) => BN
} & {
  [M in keyof BN]: (a: Num, b: Num) => BN
}

export const math: MathMethods = {
  bn: (x: Num) => new BN(x),
  max: (a: Num, ...rest: Num[]) => {
    let res = math.bn(a)
    rest.forEach(x => {
      x = math.bn(x)
      if (res.lt(x))
        res = x
    })
    return res
  },
  min: (a: BN, ...rest: BN[]) => {
    let res = math.bn(a)
    rest.forEach(x => {
      x = math.bn(x)
      if (res.gt(x))
        res = x
    })
    return res
  },
} as any
Object.keys(BN.prototype).forEach(m => {
  (math as any)[m] = (a: any, b: any) => {
    return (new BN(a) as any)[m](new BN(b))
  }
})
