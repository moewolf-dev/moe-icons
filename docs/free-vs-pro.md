# Free vs Pro

Moe Icons has a Free tier that needs no account and a Pro tier that unlocks the
remaining style groups with a one-time license. This page summarises the
differences and how Pro activation works.

## Comparison

| | Free | Pro |
| --- | --- | --- |
| Style groups | `moe-outline`, `moe-lite-outline`, `moe-solid`, `moe-colored` | All groups: adds `moe-3d-metal`, `moe-duotone`, `moe-pixel-lite-outline`, `moe-pixel-outline`, `moe-pixel-solid`, `moe-sticker` |
| Icon count | 554 per group | 554 per group |
| Formats | SVG | SVG plus bitmap PNG/WebP (3D metal, 128/256/512) |
| Targets | React, Vue, Vanilla, raw assets | React, Vue, raw assets (bitmap is not available for Vanilla) |
| CLI | `moeicons install free` | `moeicons install pro` after login |
| Website search | Browse and download Free groups | Browse and download every group |
| Updates | Free line | Lifetime access to the Pro library, including future additions |
| Support | Community | Per the plan listed on the pricing page |
| Price | Free | One-time payment |

The website [pricing page](https://moeicons.com/pricing) is the source of truth
for the current price and license text. At the time of writing (2026-10-01) the
Pro plan is a one-time purchase shown as **$39 USD** with lifetime access. It is
not a subscription. Always confirm the live price on the pricing page.

## Free access

- No account or login is required.
- `npx moeicons install free` downloads and verifies the Free release.
- The website serves Free SVG previews anonymously from its public asset host.

## Pro access

### Purchase and activate

1. Go to [moeicons.com/pricing](https://moeicons.com/pricing).
2. Click **Buy Moeicons Pro**. If you are signed out, you are sent through login
   first, then asked to confirm the purchase.
3. Complete payment on the provider's hosted checkout page.
4. The `payment-success` page polls your entitlement for up to 30 seconds and
   confirms activation. Entitlement is granted by the server webhook, not by
   the browser.

### Using Pro resources

The published component package (`moe-icons@0.0.17`) contains only the default
style set, so Pro groups are not available through it. On the website, an
active Pro account unlocks every group for browsing, copy and download. See
[Website search](/website-search).

The CLI offers `login` / `install pro`, but its `0.0.1` release is not
consumable with the published packages. See
[CLI release status](/cli#release-status).

### Check your entitlement

```sh
npx moeicons account
```

Or open [moeicons.com/account](https://moeicons.com/account), which is available
only to active Pro accounts.

## License and safety

- The Pro license is for the icon resources; purchasing also requires accepting
  the terms shown at checkout.
- Never embed Pro credentials or tokens in front-end source. The CLI stores
  sessions in the OS keychain and keeps tokens out of project files.
- Pro assets are delivered through an entitlement-checked endpoint. Previewing
  a Pro icon on the website does not by itself grant download rights.

## Downgrade and expiry

When an entitlement is no longer active:

- The website closes the detail view, aborts in-flight Pro requests, revokes
  downloaded blobs and re-locks Pro groups.
- The CLI blocks new Pro installs and updates but keeps cached archives on
  disk. Re-authenticate with `moeicons login` to regain access.

Existing generated files in your project are not deleted automatically; remove
them yourself if your license ends.
