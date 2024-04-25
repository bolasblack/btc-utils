# btc-utils

`btc-utils` is a utility library that aims to provide helper functions for bitcoin transactions.

## Goals:

- Dependency-free, as far as possible
- Easy to read and understand, provide links to corresponding information in the code whenever possible

## Modules

- `@c4/btc-utils`:

    - `estimateTransactionVSizeAfterSign`: helps to estimate the virtual size (`vSize`) of a bitcoin transaction before users sign it

        Check out the [unit tests](src/estimateTransactionVSizeAfterSign.spec.ts) for more details

    - `getOutputDustThreshold`: helps to determine the minimum amount of Bitcoin per output in a bitcoin transaction

        Check out the [unit tests](src/getOutputDustThreshold.spec.ts) for more details

- `@c4/btc-utils/btcSignerHelpers`:

    - `estimateInputVSizeAfterSign`: use `@scure/btc-signer` to estimate input size

      Check out the [unit tests](src/btcSignerHelpers.spec.ts) for more details
