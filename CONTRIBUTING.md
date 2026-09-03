# Contributing

Keep this repository a self-contained CSS appearance layer. Do not add JavaScript, templates,
fonts, images, network resources, `@import`, `url(...)`, or `!important` declarations.

1. Make the smallest necessary change in `theme.css`.
2. Check light and dark modes, narrow and wide viewports, keyboard focus, and print output.
3. Run `npm run hash` after the final CSS edit.
4. Increment the release version in `package.json` and `gala-theme.json` when release bytes change.
5. Run `npm test` and submit the CSS, manifest digest, and version update together.

The manifest is exact and intentionally closed to extra fields. Compatibility claims must be
validated against the minimum and every currently released included Gala framework version.
