---
title: Project update — 5 October 2026
date: 2026-10-05
description: Moe Icons ships 554 semantic SVG icons across four Free style groups, a published React/Vue component package, and a published CLI with Free and Pro install flows.
---

# Project update — 5 October 2026

This is the first entry in the Moe Icons developer log. It summarises what is
public today and what is still in progress. Everything below is verified against
the released packages and the live website, not against the working tree.

## Available now

- **554 semantic SVG icons per style group.** The same icon ID (for example
  `ui-search`) exists across style groups, so a project can switch styles
  without renaming imports.
- **Four Free style groups:** `moe-outline`, `moe-lite-outline`, `moe-solid`
  and `moe-colored`. Free needs no account or sign-in.
- **Published component package `moe-icons@0.0.17`** for React and Vue, plus
  Vanilla DOM usage. Install it with `npm install moe-icons`.
- **Published CLI `@moewolf/moe-icons-cli@0.0.3`**, using icon resources
  `0.0.18`. `moeicons install free` needs no account; Pro install signs in and
  checks the account entitlement. Generated projects are verified for Vite
  React/Vue and Next.js App Router / Nuxt SSR.
- **Website search and downloads** for every group, with copy-ready code
  snippets and per-icon downloads.

## In progress

- **VS Code extension:** completion and diagnostics for CLI-generated exports
  are in development and not published to the marketplace yet. Treat it as a
  preview, not a working install path.
- **Figma plugin and more style groups:** planned; not released.

## Notes

- The website pricing page is the source of truth for the current price. The
  license shown at checkout is the source of truth for usage rights.
- We publish only behaviour verified against released packages. Unverified
  framework targets stay marked as manual examples.
