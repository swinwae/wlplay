# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此仓库中工作时提供指引。

## 常用命令

- `npm run dev` — 启动 Vite 开发服务器
- `npm run build` — 先用 vue-tsc 做类型检查，再用 Vite 构建
- `npm run preview` — 本地预览生产构建产物

## 架构

WLPlay 是一个基于 Vue 3 + TypeScript + Vite 的**门户/启动器应用**。侧边栏提供导航标签页，每个标签页通过 iframe 加载一个独立子项目。

整个 UI 集中在单个组件 `src/App.vue` 中，没有使用路由。标签页切换通过 CSS（opacity + pointer-events）控制 iframe 的显示/隐藏，所有 iframe 同时保持存活。

### 子项目（通过 iframe 加载）

| 标签页 | iframe 路径 |
|--------|------------|
| Claude Learn | `/claude-learn/` |
| ECC Explorer | `/ecc-explorer/` |
| Superpowers | `/superpowers-explorer/` |

这些子项目**不属于**本仓库，需要在对应路径上提供服务（例如通过反向代理或并置的静态构建产物）。

### 设计系统

- 暗色主题，GitHub 风格的颜色 token，以 CSS 自定义属性定义在 `src/style.css` 中
- 字体：Outfit（正文）、JetBrains Mono（代码/等宽元素）
- 关键变量：`--bg`、`--accent`、`--sidebar-w`、`--topbar-h`、`--radius`
