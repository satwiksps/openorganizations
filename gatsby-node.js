const path = require("node:path")
const fs = require("node:fs")

exports.createPages = ({ actions }) => {
  const data = JSON.parse(fs.readFileSync(path.resolve("data/directory.json"), "utf8"))
  const compactOrganizations = data.organizations.map(org => ({
    id: org.id, slug: org.slug, name: org.name, aliases: org.aliases || [], description: org.description,
    logoUrl: org.logoUrl, category: org.category, technologies: org.technologies, topics: org.topics,
    participations: org.participations.map(p => ({
      program: p.program, year: p.year,
      ...(p.status === "open" ? { status: p.status, verifiedAt: p.verifiedAt, applicationDeadline: p.applicationDeadline, applicationStart: p.applicationStart } : {}),
    })),
  }))
  actions.createPage({
    path: "/",
    component: path.resolve("src/templates/directory.jsx"),
    context: { organizations: compactOrganizations, programs: data.programs, generatedAt: data.generatedAt },
  })
  for (const organization of data.organizations) {
    actions.createPage({
      path: `/organizations/${organization.slug}/`,
      component: path.resolve("src/templates/organization.jsx"),
      context: { organization, programs: data.programs },
    })
  }
  for (const page of ["programs", "sources"]) {
    actions.createPage({
      path: `/${page}/`,
      component: path.resolve(`src/templates/${page}.jsx`),
      context: { programs: data.programs, organizations: compactOrganizations, generatedAt: data.generatedAt },
    })
  }
}
