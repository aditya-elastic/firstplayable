#!/usr/bin/env node

if (process.env.FIRSTPLAYABLE_ALLOW_PUBLISH === "1") {
  process.stdout.write("FIRSTPLAYABLE_PREPUBLISH_GUARD: publish override accepted.\n");
  process.exit(0);
}

process.stderr.write(
  [
    "FIRSTPLAYABLE_PREPUBLISH_GUARD: publishing is intentionally blocked.",
    "",
    "Run the full local gate first:",
    "  npm run check",
    "",
    "When you intentionally decide to publish the single v0.1.1 build, rerun with:",
    "  FIRSTPLAYABLE_ALLOW_PUBLISH=1 npm publish --access public",
    ""
  ].join("\n")
);
process.exit(1);
