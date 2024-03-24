# btc-utils

`btc-utils` is a utility library that aims to provide helper functions for bitcoin transactions.

## Goals:

- Dependency-free, as far as possible
- Easy to read and understand, provide links to corresponding information in the code whenever possible

## Helpers:

- `estimateTransactionVSizeAfterSign`: helps to estimate the virtual size (`vSize`) of a bitcoin transaction before user signs it
- `getOutputDustThreshold`: helps to determine the minimum amount of Bitcoin per output in a bitcoin transaction
