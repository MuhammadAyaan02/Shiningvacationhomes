import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const cloudflare = defineCloudflareConfig({});

/** Keep the Next/security build on a separate script so `npm run build` can own the OpenNext worker bundle for Cloudflare CI. */
export default {
  ...cloudflare,
  buildCommand: "npm run build:next",
};
