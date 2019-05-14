import { calculate, decimalP, unaryExpressionP, atomicP } from './calc-parser';

const tryParseValue = (parser: any, s: string) => {
  try {
    return parser.tryParse(s).result.valueOf();
  } catch (err) {
    console.log(`parse "${s}" error`);
    throw err;
  }
}

const calValue = (s: string) => {
  try {
    return calculate(s).result;
  } catch (err) {
    console.log(`parse "${s}" error`);
    throw err;
  }
};

test('parse decimal', () => {
  expect(tryParseValue(decimalP, '1')).toEqual('1');
  expect(tryParseValue(decimalP, '3.141592653589793')).toEqual('3.141592653589793');
  expect(tryParseValue(decimalP, '1.2e5')).toEqual('120000');
  expect(tryParseValue(decimalP, '1.2e+5')).toEqual('120000');
  expect(tryParseValue(decimalP, '1.2e-5')).toEqual('0.000012');
});

test('parse atomic', () => {
  expect(tryParseValue(atomicP, 'PI')).toEqual('3.141592653589793');
  expect(tryParseValue(atomicP, 'sin(PI/2)')).toEqual('1');
});

test('parse unaryExpression', () => {
  expect(tryParseValue(unaryExpressionP, '1')).toEqual('1');
  expect(tryParseValue(unaryExpressionP, '+1')).toEqual('1');
  expect(tryParseValue(unaryExpressionP, '-1')).toEqual('-1');
  expect(tryParseValue(unaryExpressionP, '+3.141592653589793')).toEqual('3.141592653589793');
  expect(tryParseValue(unaryExpressionP, '-1.2e5')).toEqual('-120000');
  expect(tryParseValue(unaryExpressionP, '-1.2e+5')).toEqual('-120000');
  expect(tryParseValue(unaryExpressionP, '1.2e-5')).toEqual('0.000012');
});

test('calc base', () => {
  expect(calValue('1')).toEqual('1');
  expect(calValue('1.321')).toEqual('1.321');
  expect(calValue('( (( - 1.321e2) ))')).toEqual('-132.1');
  expect(calValue('0.2+ (0.1)')).toEqual('0.3');
  expect(calValue('( 0.2) + (0.1)')).toEqual('0.3');
  expect(calValue('( 0.2) + ( 0.1)')).toEqual('0.3');
  expect(calValue('0.1 ++0.1++ 0.1')).toEqual('0.3');
  expect(calValue('0.1 - 0.1 - 0.1')).toEqual('-0.1');
  expect(calValue('0.1 - 0.1 - + ( 0.1 )')).toEqual('-0.1');
  expect(calValue('0.1 - 0.1 - - 0.1')).toEqual('0.1');
  expect(calValue('0.1 - (0.1 - 0.1)')).toEqual('0.1');
  expect(calValue('0.1 - (0.1 - 0.1)')).toEqual('0.1');
  expect(calValue('0.1 - ((0.1 - (0.2 + 0.1)))')).toEqual('0.3');
  expect(calValue('0.1 * 0.2')).toEqual('0.02');
  expect(calValue('0.2 / 0.1')).toEqual('2');
  expect(calValue('2 ** 2')).toEqual('4');
  expect(calValue('4 % 3')).toEqual('1');
});

test('calc with error', () => {
  expect(() => calculate('0.1 +++ 10')).toThrow();
  expect(() => calculate('0.1 *** 10')).toThrow();
  expect(() => calculate('unvalid0.1')).toThrow();
});

test('calc with constant', () => {
  expect(calValue('PI')).toEqual('3.141592653589793');
  expect(calValue('-PI')).toEqual('-3.141592653589793');
  expect(calValue('E')).toEqual('2.718281828459045');
  expect(calValue('+E')).toEqual('2.718281828459045');
});

test('calc with function', () => {
  expect(calValue('sin(PI/2)')).toEqual('1');
  expect(calValue('add(1, 2)')).toEqual('3');
  expect(calValue('add(1, add(2, 1))')).toEqual('4');
  expect(calValue('add(add(1, 2), add(2, 1))')).toEqual('6');
  expect(calValue('add(add(1, 2), add(2, add(2, 1)))')).toEqual('8');
});

test('calc with invalid text', () => {
  expect(calculate('some text 1.321')).toEqual({
    skip: 10,
    result: '1.321',
  });
  expect(calculate('invalid text 1.321 = ')).toEqual({
    skip: 13,
    result: '1.321'
  });
  expect(calculate('invalid text\t1.321=')).toEqual({
    skip: 13,
    result: '1.321'
  });
});
