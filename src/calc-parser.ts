import P from 'parsimmon';
import { Decimal as DecimalLib } from 'decimal.js';

export enum BinaryOptEnum {
  '**',
  '%',
  '+',
  '-',
  '*',
  '/'
}
export type BinaryOptSyms = keyof typeof BinaryOptEnum;

export enum UnaryOptEnum {
  '+',
  '-'
}
export type UnaryOptSyms = keyof typeof UnaryOptEnum;

export enum ConstEnum {
  'E',
  'LN2',
  'LN10',
  'LOG2E',
  'LOG10E',
  'PI',
  'SQRT1_2',
  'SQRT2'
}
export type ConstSyms = keyof typeof ConstEnum;

export class FuncNameClass {
  abs = [1];
  acos = [1];
  acosh = [1];
  add = [2];
  asin = [1];
  asinh = [1];
  atan = [1];
  atanh = [1];
  atan2 = [2];
  cbrt = [1];
  ceil = [1];
  cos = [1];
  cosh = [1];
  div = [2];
  exp = [1];
  floor = [1];
  hypot = [1, Infinity];
  ln = [1];
  log = [1, 2];
  log2 = [1];
  log10 = [1];
  max = [1, Infinity];
  min = [1, Infinity];
  mod = [2];
  mul = [2];
  pow = [2];
  random = [0, 1];
  round = [1];
  sign = [1];
  sin = [1];
  sinh = [1];
  sqrt = [1];
  sub = [2];
  tan = [1];
  tanh = [1];
  trunc = [1];
}
export const FuncNameEnum = new FuncNameClass();
export type FuncNameSyms = keyof typeof FuncNameEnum;

export class BinaryOpt {
  constructor(public raw: BinaryOptSyms) {}
}

export abstract class Node {
  type: string;
  result: DecimalLib;

  constructor() {
    this.type = this.constructor.name;
  }

  registerResult(callback: () => DecimalLib) {
    Object.defineProperty(this, 'result', {
      get: callback,
      enumerable: true
    });
  }
}

export class Decimal extends Node {
  constructor(public raw: string) {
    super();
    this.registerResult(() => new DecimalLib(this.raw));
  }
}

export class Constant extends Node {
  constSym: ConstSyms;

  constructor(public raw: string) {
    super();
    if (!(this.raw in ConstEnum)) {
      throw new Error(`Constant ${this.raw} not exists`);
    }
    this.constSym = this.raw as ConstSyms;
    this.registerResult(() => {
      return new DecimalLib(Math[this.constSym]);
    });
  }
}

export class FuncCall extends Node {
  funcNameSym: FuncNameSyms;
  constructor(public rawFuncName: string, public args: Node[]) {
    super();
    if (!(this.rawFuncName in FuncNameEnum)) {
      throw new Error(`Function ${this.rawFuncName} not exists`);
    }
    this.funcNameSym = this.rawFuncName as FuncNameSyms;
    super();
    this.registerResult(() => {
      // @ts-ignore
      return DecimalLib[this.funcNameSym](...args.map(a => a.result));
    });
  }
}

export class UnaryExp extends Node {
  constructor(public operator: UnaryOptSyms, public value: Decimal | Constant) {
    super();
    this.registerResult(() =>
      this.value instanceof Decimal
        ? new DecimalLib(this.operator + this.value.raw)
        : new DecimalLib(this.operator + this.value.result)
    );
  }
}

export class BinaryExp extends Node {
  static calculate(exp: BinaryExp): DecimalLib {
    const l = exp.left.result;
    const r = exp.right.result;
    return {
      '+': () => l.add(r),
      '-': () => l.minus(r),
      '*': () => l.mul(r),
      '/': () => l.div(r),
      '%': () => l.modulo(r),
      '**': () => l.pow(r)
    }[exp.operator.raw]();
  }

  constructor(
    public left: Node,
    public operator: BinaryOpt,
    public right: Node
  ) {
    super();
    this.registerResult(() => BinaryExp.calculate(this));
  }
}

export type NodeParser = P.Parser<Node>;

export const whitespaceP = P.optWhitespace;

const _ = whitespaceP;

export const leftParenthesisP = P.string('(').trim(_);
export const rightParenthesisP = P.string(')').trim(_);

export const ofStringArrayP = <T extends string = string>(
  ...strs: string[]
): P.Parser<T> => P.alt(...strs.map(s => P.string(s))) as P.Parser<T>;

export const ofEnumP = <T extends Record<string, any>>(enum_: T) =>
  ofStringArrayP(...Object.keys(enum_)) as P.Parser<keyof T>;

export const optionalParenthesisP = <T extends any>(
  parser: P.Parser<T>
): P.Parser<T> => {
  return P.alt(
    P.lazy(() =>
      optionalParenthesisP(parser).wrap(leftParenthesisP, rightParenthesisP)
    ),
    parser.wrap(leftParenthesisP, rightParenthesisP),
    parser
  );
};

export const decimalP = P.regexp(
  /(\d+(\.\d+)?|(\.\d+))(e[-+]?\d+)?(p[-+]?\d+)?/
)
  .map(str => new Decimal(str))
  .desc('decimal');

export const constantP = P.regexp(/[A-Z_][A-Z_0-9]*/)
  .map(str => new Constant(str))
  .desc('constant');

export const funcNameP = P.regexp(/[A-Z_a-z]\w*/).desc('functionName');

export const funcCallP = P.lazy(() =>
  P.seq(
    funcNameP,
    P.sepBy(expressionP, P.string(',').trim(_)).wrap(
      leftParenthesisP,
      rightParenthesisP
    )
  ).map(([name, args]) => new FuncCall(name, args))
).desc('constant');

export const atomicP: P.Parser<Decimal | Constant> = optionalParenthesisP(
  P.alt(funcCallP, constantP, decimalP)
).desc('atomic');

export const unaryOperatorP = ofEnumP(UnaryOptEnum)
  .trim(_)
  .desc('unaryOperator');

export const unaryExpressionP = optionalParenthesisP(
  P.alt(
    P.seq(unaryOperatorP, atomicP).map(
      ([unaryOperator, decimal]) => new UnaryExp(unaryOperator, decimal)
    ),
    atomicP
  )
).desc('unaryExpression');

export const binaryOperatorP = ofEnumP(BinaryOptEnum)
  .trim(_)
  .map(str => new BinaryOpt(str))
  .desc('binaryOperator');

export const binaryOperatorExpressionP: P.Parser<BinaryExp> = P.lazy(() =>
  optionalParenthesisP(
    P.seqMap(
      unaryExpressionP,
      P.seq(
        binaryOperatorP,
        P.alt(
          binaryOperatorExpressionP.wrap(leftParenthesisP, rightParenthesisP),
          unaryExpressionP
        )
      ).atLeast(1),
      (left, [[op, right], ...rest]) =>
        rest.reduce(
          (exp, [op, cur]) => new BinaryExp(exp, op, cur),
          new BinaryExp(left, op, right)
        )
    ).trim(_)
  )
).desc('binaryOperatorExpression');

export type RootExp = BinaryExp | UnaryExp;

export const expressionP: P.Parser<RootExp> = P.alt(
  binaryOperatorExpressionP,
  unaryExpressionP
)
  .trim(_)
  .desc('expression');

export const expressionSkipEqualSignP = expressionP.skip(
  P.string('=')
    .trim(_)
    .times(0, 1)
);

export const skipInvalidTextP = (
  skip: number = 0
): P.Parser<{
  skip: number;
  ast: RootExp;
}> =>
  P.lazy(() =>
    P.alt(
      P.seq(P.whitespace, expressionSkipEqualSignP).map(([s, ast]) => ({
        skip: skip + s.length,
        ast
      })),
      P.any.then(skipInvalidTextP(skip + 1))
    )
  ).desc('main');

export const mainP = P.alt(
  expressionSkipEqualSignP.map(ast => ({
    skip: 0,
    ast
  })),
  skipInvalidTextP()
).desc('main');

export const parse = (text: string) => mainP.tryParse(text);

export const printAst = (text: string) => {
  const { ast } = parse(text);
  console.log(JSON.stringify(ast, null, 2));
};

export const calculate = (text: string) => {
  const { skip, ast } = parse(text);
  return {
    skip,
    result: ast.result.valueOf()
  };
};
