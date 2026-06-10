declare module "bn.js" {
  export default class BN {
    constructor(value: number | string | bigint, base?: number);
    add(value: BN): BN;
    div(value: BN): BN;
    isNeg(): boolean;
    mod(value: BN): BN;
    mul(value: BN): BN;
    pow(value: BN): BN;
    toNumber(): number;
    toString(base?: number): string;
  }
}
