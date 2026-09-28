const siteUrl = (process.env.SITE_URL || "https://openorganizations.site").replace(/\/$/, "")

module.exports = {
  siteMetadata: { title: "OpenOrganizations", siteUrl },
  flags: { DEV_SSR: true },
  trailingSlash: "always",
  plugins: [],
}
