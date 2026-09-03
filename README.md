# Minimal for Gala

Minimal is an official Gala appearance theme with a monochrome Swiss utility aesthetic, flat
surfaces, compact controls, and a deliberate list-style index. It changes presentation only:
Gala's managed templates, authentication, analytics, accessibility behavior, security policy, and
publishing workflow remain authoritative.

## Compatibility

- Theme release: `1.0.0`
- Gala framework: `>=2.0.32` and `<3.0.0`
- License: MIT

## Verify a release

Requires Node.js 22 or later. The verifier checks the exact manifest schema, CSS size and UTF-8,
self-containment, SHA-256 pin, supported framework range, and light/dark WCAG contrast.

```sh
npm test
```

After editing `theme.css`, update its immutable manifest digest and verify again:

```sh
npm run hash
npm test
```

Increment `version` in both `package.json` and `gala-theme.json` for every published change.

## Register with Gala

1. Publish this repository as `rathnasgala/theme-minimal`.
2. Copy the exact 40-character commit SHA containing the verified release.
3. As a Gala ROOT user, open `https://app.gala67.com/s/admin/configuration#official-themes`.
4. Enter repository `theme-minimal`, enter the exact SHA, and select **Verify release**.
5. Authors can then select **Minimal** in their publication's Appearance settings when its
   framework version is compatible.

Gala pins the commit and CSS digest; it never follows a branch or moving tag. Register a new
version and exact commit for later releases.
