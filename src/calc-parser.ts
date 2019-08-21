import P from 'parsimmon';
import { Decimal as DecimalLib } from 'decimal.js';

export type BinaryExponentOptSyms = '**';
export const BinaryExponentOptSyms: BinaryExponentOptSyms[] = ['**'];

export type BinaryMulOptSyms = '%' | '*' | '/';
export const BinaryMulOptSyms: BinaryMulOptSyms[] = ['%', '*', '/'];

export type BinaryAddOptSyms = '+' | '-';
export const BinaryAddOptSyms: BinaryAddOptSyms[] = ['+', '-'];

export type BinaryOptSyms =
  | BinaryExponentOptSyms
  | BinaryMulOptSyms
  | BinaryAddOptSyms;
export const BinaryOptSyms = [
  ...BinaryExponentOptSyms,
  ...BinaryMulOptSyms,
  ...BinaryAddOptSyms,
];

export class BinaryExponentOptClass {
  '**': never;
}
export type UnaryOptSyms = '+' | '-';
export const UnaryOptSyms: UnaryOptSyms[] = ['+', '-'];

export type ConstSyms =
  | 'E'
  | 'LN2'
  | 'LN10'
  | 'LOG2E'
  | 'LOG10E'
  | 'PI'
  | 'SQRT1_2'
  | 'SQRT2';
export const ConstSyms: ConstSyms[] = [
  'E',
  'LN2',
  'LN10',
  'LOG2E',
  'LOG10E',
  'PI',
  'SQRT1_2',
  'SQRT2',
];

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
  result!: DecimalLib;

  constructor() {
    this.type = this.constructor.name;
  }

  registerResult(callback: () => DecimalLib) {
    Object.defineProperty(this, 'result', {
      get: callback,
      enumerable: true,
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
    if (!ConstSyms.includes(this.raw as ConstSyms)) {
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
    this.registerResult(() => {
      // @ts-ignore
      return DecimalLib[this.funcNameSym](...args.map((a) => a.result));
    });
  }
}

export class UnaryExpr extends Node {
  constructor(public operators: UnaryOptSyms[], public value: Node) {
    super();
    this.registerResult(() =>
      this.operator === '+'
        ? new DecimalLib(this.value.result)
        : new DecimalLib(0).sub(this.value.result),
    );
  }

  get operator() {
    return this.operators.reduce((ret, o) => ret * (o === '+' ? 1 : -1), 1) ===
      1
      ? '+'
      : '-';
  }
}

export class BinaryExpr extends Node {
  static calculate(expr: BinaryExpr): DecimalLib {
    const l = expr.left.result;
    const r = expr.right.result;
    return {
      '+': () => l.add(r),
      '-': () => l.minus(r),
      '*': () => l.mul(r),
      '/': () => l.div(r),
      '%': () => l.modulo(r),
      '**': () => l.pow(r),
    }[expr.operator.raw]();
  }

  constructor(
    public left: Node,
    public operator: BinaryOpt,
    public right: Node,
  ) {
    super();
    this.registerResult(() => BinaryExpr.calculate(this));
  }
}

export type NodeParser = P.Parser<Node>;

export const whitespaceP = P.optWhitespace;

const _ = whitespaceP;

export const leftParenthesisP = P.string('(').trim(_);
export const rightParenthesisP = P.string(')').trim(_);

export const ofStringArrayP = <T extends string = string>(
  ...strs: string[]
): P.Parser<T> => P.alt(...strs.map((s) => P.string(s))) as P.Parser<T>;

export const optionalParenthesisP = <T extends any>(
  parser: P.Parser<T>,
): P.Parser<T> => {
  return P.alt(
    parser,
    parser.wrap(leftParenthesisP, rightParenthesisP),
    P.lazy(() =>
      optionalParenthesisP(parser).wrap(leftParenthesisP, rightParenthesisP),
    ),
  );
};

export const decimalP = P.regexp(
  /(\d+(\.\d+)?|(\.\d+))(e[-+]?\d+)?(p[-+]?\d+)?/,
)
  .map((str) => new Decimal(str))
  .desc('decimal');

export const includesP = (ss: string[]) => P.alt(...ss.map((s) => P.string(s)));

// export const constantP = P.regexp(/[A-Z_][A-Z_0-9]*/)
export const constantP = includesP(ConstSyms)
  .map((str) => new Constant(str))
  .desc('constant');

// export const funcNameP = P.regexp(/[A-Z_a-z]\w*/).desc('functionName');
export const funcNameP = includesP(Object.keys(FuncNameEnum)).desc(
  'functionName',
);

export const funcCallP = P.lazy(() =>
  P.seq(
    funcNameP,
    P.sepBy(exprP, P.string(',').trim(_)).wrap(
      leftParenthesisP,
      rightParenthesisP,
    ),
  ).map(([name, args]) => new FuncCall(name, args)),
).desc('functionCall');

export const atomicP: P.Parser<Decimal | Constant> = optionalParenthesisP(
  P.alt(funcCallP, constantP, decimalP),
).desc('atomic');

export const unaryOptP = ofStringArrayP<UnaryOptSyms>(...UnaryOptSyms)
  .trim(_)
  .desc('unaryOperator');

export const unaryExprP: P.Parser<UnaryExpr | Decimal | Constant> = P.lazy(() =>
  optionalParenthesisP(
    P.alt(
      P.seq(unaryOptP.many(), atomicP).map(
        ([unaryOperators, decimal]) => new UnaryExpr(unaryOperators, decimal),
      ),
      atomicP,
    ),
  ),
).desc('unaryExpression');

export const binaryOptP = ofStringArrayP<BinaryOptSyms>(...BinaryOptSyms)
  .trim(_)
  .map((str) => new BinaryOpt(str))
  .desc('binaryOperator');

export const binaryCalculate = <N extends Node>(
  left: N,
  ...rest: [BinaryOpt, N][]
) => {
  const nodeStack: Node[] = [];
  const optStack: BinaryOpt[] = [];
  nodeStack.unshift(left);
  const arithmeticCalc = (opts: string[]) => {
    const _nodeStack: Node[] = [];
    const _optStack: BinaryOpt[] = [];
    while (optStack.length && opts.includes(optStack[0].raw)) {
      if (_nodeStack.length === 0) _nodeStack.unshift(nodeStack.shift()!);
      _optStack.unshift(optStack.shift()!);
      _nodeStack.unshift(nodeStack.shift()!);
    }
    if (_nodeStack.length > 0) {
      let left = _nodeStack.shift()!;
      while (_optStack.length > 0) {
        const op = _optStack.shift()!;
        const right = _nodeStack.shift()!;
        left = new BinaryExpr(left, op, right);
      }
      nodeStack.unshift(left);
    }
  };
  const exponentCalc = () => {
    while (
      optStack.length &&
      BinaryExponentOptSyms.includes(optStack[0].raw as BinaryExponentOptSyms)
    ) {
      const op = optStack.shift()!;
      const right = nodeStack.shift()!;
      const left = nodeStack.shift()!;
      nodeStack.unshift(new BinaryExpr(left, op, right));
    }
  };
  while (rest.length > 0) {
    const [op, expr] = rest.shift()!;
    if (BinaryExponentOptSyms.includes(op.raw as BinaryExponentOptSyms)) {
      optStack.unshift(op);
      nodeStack.unshift(expr);
    } else if (BinaryMulOptSyms.includes(op.raw as BinaryMulOptSyms)) {
      exponentCalc();
      optStack.unshift(op);
      nodeStack.unshift(expr);
    } else if (BinaryAddOptSyms.includes(op.raw as BinaryAddOptSyms)) {
      exponentCalc();
      arithmeticCalc(BinaryMulOptSyms);
      optStack.unshift(op);
      nodeStack.unshift(expr);
    }
  }
  exponentCalc();
  arithmeticCalc(BinaryMulOptSyms);
  arithmeticCalc(BinaryAddOptSyms);
  return nodeStack.shift()! as BinaryExpr;
};

export const binaryOptExprP: P.Parser<BinaryExpr | UnaryExpr> = P.lazy(() => {
  const unaryP = <T extends Node>(parser: P.Parser<T>) => {
    return P.alt(
      P.seq(unaryOptP.many(), parser).map(
        ([unaryOpts, expr]) => new UnaryExpr(unaryOpts, expr),
      ),
      parser,
    );
  };
  const exprP = optionalParenthesisP(
    P.seqMap(
      P.alt(
        unaryP(binaryOptExprP.wrap(leftParenthesisP, rightParenthesisP)),
        unaryExprP,
      ) as P.Parser<Node>,
      P.seq(binaryOptP, P.alt(
        unaryP(binaryOptExprP.wrap(leftParenthesisP, rightParenthesisP)),
        unaryExprP,
      ) as P.Parser<Node>).atLeast(1),
      (left, [...rest]) => binaryCalculate(left, ...rest),
    ),
  );
  return unaryP(exprP);
});

export type RootExpr = BinaryExpr | UnaryExpr;

export const exprP: P.Parser<RootExpr> = P.alt(binaryOptExprP, unaryExprP)
  .trim(_)
  .desc('expression');

export const skipEqualSignP = P.string('=')
  .trim(_)
  .times(0, 1);

export const mainP = exprP.skip(skipEqualSignP).desc('main');

export const parse = (text: string) => mainP.tryParse(text);

export const printAst = (text: string) => {
  const ast = parse(text);
  console.log(JSON.stringify(ast, null, 2));
};

const skipEqual = (text: string) => {
  const lastIndex = text.lastIndexOf('=');
  return lastIndex === -1 ? 0 : lastIndex + 1;
};

const skipWord = (text: string) => {
  const index = text.search(/\W/);
  return index === -1 ? text.length : index + 1;
};

export interface CalculateResult {
  skip: number;
  result: string;
}

const calculateRecursion = (
  text: string,
  skipped: number,
  skippedRecords: number[] = [],
  originText: string,
): CalculateResult => {
  try {
    const ast = parse(text);
    return {
      skip: skipped,
      result: ast.result.valueOf(),
    };
  } catch (err) {
    if (err.type === 'ParsimmonError') {
      if (text.length > 0) {
        const skip = skipWord(text);
        const newSkip = skipped + skip;
        return calculateRecursion(
          text.slice(skip),
          newSkip,
          [...skippedRecords, newSkip],
          originText,
        );
      }
    }

    const highlightSkipRecords = Array.from(Array(originText.length))
      .map((_, index) => (skippedRecords.includes(index) ? '✗' : ' '))
      .join('');
    throw new Error(
      ['CalculateError:', originText, highlightSkipRecords].join('\r\n'),
    );
  }
};

export const calculate = (text: string): CalculateResult => {
  const textTrim = text.replace(/[=\s]*$/g, '');
  const skip = skipEqual(textTrim);
  return calculateRecursion(textTrim.slice(skip), skip, [], text);
};
