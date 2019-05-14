#!/usr/bin/env bash
yarn build
cd ~/.config/coc/extensions
yarn remove coc-calc
yarn add ~/Projects/coc-calc
