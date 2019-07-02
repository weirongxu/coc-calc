# coc-calc

Calculate extension for coc.nvim

[![Build Status](https://travis-ci.com/weirongxu/coc-calc.svg?branch=master)](https://travis-ci.com/weirongxu/coc-calc)

## Features

* Support bignumber, use [decimal.js](https://github.com/MikeMcl/decimal.js)
* Suppoort [Mathematics functions](http://mikemcl.github.io/decimal.js/#methods)

## Screenshot

![screenshot](https://user-images.githubusercontent.com/1709861/60494409-55a59380-9ce1-11e9-9f7e-769588f8e756.png)
![screenshot](https://user-images.githubusercontent.com/1709861/60494462-740b8f00-9ce1-11e9-8d21-ca241bbc4d68.png)

## Usage

1. Install by coc.nvim command:
    ```
    :CocInstall coc-calc
    ```
2. Input calculate expression in any buffer
    ```
    sin(PI / 2) =
    ```

## Configurations

* `calc.priority`, calc priority, default: `99`
* `calc.highlight`, enable calc highlight, default: `true`

## Operators

Precedence is from highest to lowest.

| Operator                              | Example                                     |
|---------------------------------------|---------------------------------------------|
| exponentiation `**`                   | `4 ** 3 ** 2` equivalent to `4 ** (3 ** 2)` |
| unary `+ -`                           | `-2` `+2`                                   |
| multiply / divide / remainder `* / %` | `4 % 3` `4 * 3`                             |
| addition / subtraction                | `.2 - .1` `.1 + .2`                         |

## Mathematics Constant

* `E`
* `PI`

## Mathematics Functions

```
abs, acos, acosh, add, asin,
asinh, atan, atanh, atan2, cbrt
ceil, cos, cosh, div, exp,
floor, hypot, ln, log, log2,
log10, max, min, mod, mul,
pow, random, round, sign, sin,
sinh, sqrt, sub, tan, tanh, trunc
```

Details: http://mikemcl.github.io/decimal.js/#methods

## License

MIT
