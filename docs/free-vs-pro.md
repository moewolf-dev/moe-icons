# Free vs Pro

Moe Icons has a Free tier that needs no account and a Pro tier that unlocks the
remaining style groups. This page summarises the differences and how to use each
tier.

## Comparison

| | Free | Pro |
| --- | --- | --- |
| Style groups | `moe-outline`, `moe-lite-outline`, `moe-solid`, `moe-colored` | All groups: adds `moe-3d-metal`, `moe-3d-plastic-green`, `moe-duotone`, `moe-pixel-lite-outline`, `moe-pixel-outline`, `moe-pixel-solid`, `moe-sticker` |
| Icon count | 554 per group | 554 per group |
| Formats | SVG | SVG; Metal and Plastic Green are PNG/WebP bitmaps (128/256/512) |
| Available now via | npm component package (Moe Outline), website downloads, and the CLI | Website downloads and the CLI for an active Pro account |
| Website search | Browse, copy and download Free groups | Browse, copy and download every group |
| Updates | Free line | Per the license shown at purchase |
| Price | Free | One-time payment |

The website [pricing page](https://moeicons.com/pricing) is the source of truth
for the current price and product description. The license shown at checkout
("Moe Icons License Agreement") is the source of truth for usage rights. At the
time of writing (2026-10-01) the Pro plan is a one-time purchase shown as
**$39 USD**. Confirm the live price on the pricing page.

The CLI (`@moewolf/moe-icons-cli@0.0.6`, icon resources `0.0.19`) installs Free
and Pro resources and generates local components for React, Vue and Vanilla.
Free installation needs no account; Pro installation signs in and checks your
entitlement. See [CLI release status](/cli#release-status).

## Free access

- No account or login is required.
- Use the published components (`moe-icons/react`, `moe-icons/vue`) for the Moe
  Outline style set. See [Quick start](/getting-started).
- Download the other Free groups from the [search page](/website-search).

## Pro access

### Purchase and activate

1. Go to [moeicons.com/pricing](https://moeicons.com/pricing).
2. Click **Buy Moeicons Pro**. If you are signed out, sign in first, then
   confirm the purchase.
3. Complete payment on the provider's hosted checkout page.
4. Return to the site and wait for your account to become active, then open
   [moeicons.com/account](https://moeicons.com/account).

### Using Pro resources

On the website, an active Pro account unlocks every group for browsing, copy
and download. Pro groups are not part of the published npm component package,
which ships only the Moe Outline set.

### Allowed uses

- **In your own products:** the license permits integrating the icons in
  software, apps, websites and other materials you own or control. See the
  license text shown at checkout.
- **Never publish credentials:** do not put account tokens or other credentials
  in front-end source or a public repository. This is a security rule, not a
  restriction on using the icons.
- **No standalone redistribution:** do not resell or redistribute the icons, or
  let others extract them as individual files. See the license for the exact
  terms.

Do not rely on this page for legal terms. The license at checkout and the
[Terms of Service](https://moeicons.com/terms) are the authoritative texts.

## Account state

- Group access follows your account entitlement. If a group is locked, the
  account is not active or does not cover that group.
- If access ends, the website locks Pro groups again. What you may keep and use
  is defined by the license text, not by this page.
