const path = require("node:path")
const fs = require("node:fs")

exports.createPages = async ({ actions }) => {
  const data = JSON.parse(fs.readFileSync(path.resolve("data/directory.json"), "utf8"))
  const { attachProposals, summarizeUmbrella } = await import('./src/lib/enrichment.mjs')
  const resources = JSON.parse(fs.readFileSync(path.resolve('data/proposals.json'),'utf8'))
  const umbrellas = JSON.parse(fs.readFileSync(path.resolve('data/umbrellas.json'),'utf8'))
  const logos = JSON.parse(fs.readFileSync(path.resolve('data/logos.json'),'utf8')).logos
  const proposals = attachProposals(data.organizations, resources.proposals)
  for (const org of data.organizations) {
    org.localLogo=logos[org.slug]?.path || ''
    org.logoKind=logos[org.slug]?.kind || ''
    org.proposals=proposals.filter(p=>p.organizationSlug===org.slug)
    const group=umbrellas.groups.find(g=>g.parentSlug===org.slug)
    org.subOrganizations=group?summarizeUmbrella(org,group,data.organizations):[]
    org.umbrellaSource=group?.sourceUrl || ''
    org.umbrellaProgram=group?.program || 'gsoc'
  }
  const compactOrganizations = data.organizations.map(org => ({
    id: org.id, slug: org.slug, name: org.name, aliases: org.aliases || [], description: org.description,
    logoUrl: org.logoUrl, localLogo:org.localLogo,logoKind:org.logoKind, category: org.category, technologies: org.technologies, topics: org.topics,
    proposalCount:org.proposals.length,subOrganizationCount:org.subOrganizations.length,subOrganizationNames:org.subOrganizations.map(child=>child.name),
    participations: org.participations.map(p => ({
      program: p.program, year: p.year,
      ...(p.status === "open" ? { status: p.status, verifiedAt: p.verifiedAt, applicationDeadline: p.applicationDeadline, applicationStart: p.applicationStart } : {}),
    })),
  }))
  actions.createPage({path:'/proposals/',component:path.resolve('src/templates/proposals.jsx'),context:{proposals,sources:resources.sources}})
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
