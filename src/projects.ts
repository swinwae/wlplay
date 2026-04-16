export interface Project {
  slug: string
  name: string
  desc: string
  tags: string[]
  color: string
  path: string
}

export const projects: Project[] = [
  { slug: 'family-ledger', name: '家庭账本', desc: '家庭记账应用 — 记录收支、成员分摊与财务统计', tags: ['Vue', 'Express', 'TypeScript'], color: '#0E7490', path: '/family-ledger/' },
  { slug: 'awesome-claude-code-use', name: 'Awesome Claude Code', desc: 'Claude Code 优秀用法集 — 收录社区精选技巧、技能与工作流', tags: ['Next.js', 'React', 'TypeScript'], color: '#EA580C', path: '/awesome-claude-code-use/' },
  { slug: 'gsd-explorer', name: 'GSD Explorer', desc: 'GSD 可视化学习器 — 交互式探索 GSD 的核心概念与应用', tags: ['Vue', 'TypeScript'], color: '#DC2626', path: '/gsd-explorer/' },
  { slug: 'ecc-explorer', name: 'ECC Explorer', desc: 'ECC 可视化学习器 — 通过交互式图表理解椭圆曲线密码学的核心概念', tags: ['Vue', 'TypeScript', 'D3'], color: '#7C3AED', path: '/ecc-explorer/' },
  { slug: 'claude-learn', name: 'Claude Learn', desc: 'Claude Code 学习站 — 系统学习 Claude Code 的使用技巧和最佳实践', tags: ['Vue', 'Markdown'], color: '#2563EB', path: '/claude-learn/' },
  { slug: 'superpowers-explorer', name: 'Superpowers', desc: 'Superpowers 探索器 — 浏览和理解 Claude Code 的 Superpowers 技能系统', tags: ['Vue', 'TypeScript'], color: '#059669', path: '/superpowers-explorer/' },
]

export function findProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug)
}
