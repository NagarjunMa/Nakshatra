# Runtime font licensing

Nakshatra serves only the runtime font files referenced by
`src/app/globals.css` from `public/fonts`. Complete foundry packages, source
kits, specimens, license documents, and archives must not be placed under
`public`, because Next.js exposes that directory over HTTP.

## Runtime inventory

- `Harmond-ExtraBoldExpanded.otf`
- `Harmond-SemiBoldCondensed.otf`
- `HKGroteskWide-ExtraBold.otf`
- `MangoGrotesque-Light.ttf`
- `MangoGrotesque-Medium.ttf`
- `MangoGrotesque-Regular.ttf`
- `MangoGrotesque-SemiBold.ttf`
- `Ranade-Medium.woff`
- `Ranade-Medium.woff2`

## Release requirement

Repository cleanup does not establish a right to use these fonts
commercially. Before a production launch, the product owner must retain
evidence that each runtime font is covered by an appropriate commercial or
open-source web-font license. In particular, do not assume that a font copied
from a package labelled "free for personal use" is licensed for this product.

Keep purchase receipts, license certificates, and foundry source packages in
the approved private business records location, not in this repository or any
web-served directory.
