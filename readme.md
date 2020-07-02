# coc-calc

<p align="center">
  <img src="./logo/calc-logo.svg" alt="coc-calc" width="200">
  <br>
  <a href="https://github.com/weirongxu/coc-calc/actions?query=workflow%3Aci">
    <img src="https://img.shields.io/github/workflow/status/weirongxu/coc-calc/ci" alt="Build Status">
  </a>
  <br>
  Calculate extension for coc.nvim
</p>

## Features

- Support underscores in numbers `10_000_000`
- Support bignumber, use [decimal.js](https://github.com/MikeMcl/decimal.js)
- Support [Mathematics functions](http://mikemcl.github.io/decimal.js/#methods)

![screenshot](https://user-images.githubusercontent.com/1709861/65944119-9ab59f00-e463-11e9-886f-11513a8e01c9.gif)

## Usage

1. Install by coc.nvim command:
   ```
   :CocInstall coc-calc
   ```
2. Input calculate expression in any buffer
   ```
   sin(PI / 2) =
   ```

## Commands

- `calc.appendWithCursor` Calculate and append in front of cursor
- `calc.append` Calculate and append
- `calc.replaceWithCursor` Calculate and replace in front of cursor
- `calc.replace` Calculate and replace
- `calc.calculate` see Vim API

## Keymaps

Create keymappings like:

```vim
" append result on current expression
nmap <Leader>ca <Plug>(coc-calc-result-append)
" replace result on current expression
nmap <Leader>cr <Plug>(coc-calc-result-replace)
```

## Configurations

- `calc.priority`, calc priority, default: `1000`
- `calc.highlight`, enable calc highlight, default: `true`
- `calc.replaceOriginalExpression`, enable relace original expression, default: `true`

## Vim API

### calc.calculate

```vim
let result = CocAction('runCommand', 'calc.calculate', '1.5 * PI')
```

## Operators

Precedence is from highest to lowest.

| Operator                              | Example                                     |
| ------------------------------------- | ------------------------------------------- |
| exponentiation `**`                   | `4 ** 3 ** 2` equivalent to `4 ** (3 ** 2)` |
| unary `+ -`                           | `-2` `+2`                                   |
| multiply / divide / remainder `* / %` | `4 % 3` `4 * 3`                             |
| addition / subtraction                | `.2 - .1` `.1 + .2`                         |

## Mathematics Constant

- `E`
- `PI`

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
