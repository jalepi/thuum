import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://jalepi.github.io",
  base: "/thuum",
  integrations: [
    starlight({
      title: "Thuum",
      description:
        "A collection of focused, type-safe TypeScript libraries for functional programming, messaging, and more.",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/jalepi/thuum",
        },
      ],
      sidebar: [
        { label: "Getting Started", slug: "getting-started" },
        {
          label: "Packages",
          items: [
            { label: "@thuum/piper", slug: "packages/piper" },
            { label: "@thuum/decor", slug: "packages/decor" },
            { label: "@thuum/promising", slug: "packages/promising" },
            { label: "@thuum/transport", slug: "packages/transport" },
            { label: "@thuum/channels", slug: "packages/channels" },
          ],
        },
      ],
    }),
  ],
});
