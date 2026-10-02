export const HISTORY_REVISION = '12546ba681b14e158d839b30e03525689ea2323e'
export const HISTORY_TERMS = [
  ['2019/README.md', 2019, 'CommunityBridge pilot'],
  ['2020/q1/README.md', 2020, 'Q1 · CommunityBridge'],
  ['2020/q2/selected_projects.md', 2020, 'Q2 · CommunityBridge'],
  ['2020/q3-q4/selected_projects.md', 2020, 'Q3–Q4 · CommunityBridge'],
  ['2021/01-Spring/README.md', 2021, 'Term 1 · March–May'],
  ['2021/02-Summer/README.md', 2021, 'Term 2 · June–August'],
  ['2021/03-Fall/README.md', 2021, 'Term 3 · September–November'],
  ['2022/01-Spring/README.md', 2022, 'Term 1 · March–May'],
  ['2022/02-Summer/README.md', 2022, 'Term 2 · June–August'],
  ['2022/03-Sept-Nov/README.md', 2022, 'Term 3 · September–November'],
]
const plain = text => text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '').trim()
export function parseLfxHistory(text, sourceUrl, year, file) {
  // Two reviewed formatting errors in the published archive: a project uses
  // organization heading depth, and a second KubeArmor project has no heading.
  text = text.replace(/^#### Support remote Terraform HCL \(Git repo or ConfigMap\) in Terraform Controller$/m, '##### Support remote Terraform HCL (Git repo or ConfigMap) in Terraform Controller')
  text = text.replace(/\n- Description: \[KubeArmor\](?=[^\n]*annotations)/, '\n##### Pod annotations with mutating webhooks\n\n- Description: [KubeArmor]')
  const rows = []
  if (year === 2019 || file.includes('2020/q1')) {
    const completed = text.split(/#{3,4} Completed Projects/i)[1]?.split(/\n#{2,4} /)[0] || ''
    for (const line of completed.split('\n')) {
      if (!line.trim().startsWith('|')) continue
      const cells = line.split('|').slice(1,-1).map(plain)
      if (cells.length < 2 || /CNCF Projects|^[-: ]+$/.test(cells[0])) continue
      if (cells[0] && cells[1]) rows.push({name:cells[0],title:cells[1],url:sourceUrl})
    }
    return rows
  }
  const section = text.match(/^#{2,3} (?:List of Selected Projects|Participating Projects|Accepted Projects)\s*$/im)
  if (!section) throw new Error(`Missing selected-project section: ${file}`)
  const content = text.slice(section.index + section[0].length)
  const headings = [...content.matchAll(/^(#{3,6})\s+(.+)$/gm)]
  const depth = Math.min(...headings.map(m => m[1].length))
  let name = ''
  for (let i=0; i<headings.length; i++) {
    const heading=headings[i]
    if (heading[1].length===depth) { name=plain(heading[2]); continue }
    const body=content.slice(heading.index+heading[0].length,headings[i+1]?.index || content.length)
    // Intermediate SIG/group headings contain no project description.
    if (!/Description\*{0,2}\s*:/i.test(body) && !/https:\/\/mentorship\.lfx/.test(heading[2])) continue
    const applicationUrl=(heading[2]+'\n'+body).match(/https:\/\/(?:mentorship\.lfx\.linuxfoundation\.org|people\.communitybridge\.org)\/project\/[^\s<>\])]+/)?.[0]
    const issueLine=body.match(/(?:Upstream )?Issue[^:\n]*:\s*([^\n]*(?:\n[ \t]+[^\n]*)?)/i)?.[1] || ''
    const issue=issueLine.match(/https:\/\/github\.com\/[^\s<>\])]+/)?.[0]
    if (year >= 2021 && !applicationUrl) continue
    rows.push({name,title:plain(heading[2]),url:issue || applicationUrl || sourceUrl,applicationUrl})
  }
  return rows
}
