#!/usr/bin/env bash
calc="$(pwd)"
yarn build
cd ~/.config/coc/extensions
yarn remove coc-calc
yarn add $calc
