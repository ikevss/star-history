# Round 1 总结

- 日期：2026-10-26
- 验收对象：https://star-history-3wn.pages.dev
- 本轮范围：首屏改造（Starboard 品牌 + 技术热度雷达）

## 本轮得分

**63 / 100，不通过**

- 一票否决触发：F5（控制台 error）、F6（375px 搜索行溢出）
- P0 致命：2
- P1 严重：3
- P2 一般：4
- P3 优化：3

## 本轮修了什么

1. **P0 死链（3 张卡片 404）**
   根因：`getStaticPaths` 用 `repo.name.toLowerCase()` 生成页面，卡片链接却用原始大小写，Cloudflare Pages 区分大小写。
   修复：卡片链接改为 `mover.name.toLowerCase()`。
   验证：`out/index.html` 中 23 个仓库链接全部小写，无大写 owner。

2. **P0 控制台 404 error（3 条 `_next/data/*.json`）**
   根因：与死链同源——Next.js 对大小写错误的链接做预取，预取 URL 不存在。
   修复：同上，链接小写后预取命中 `out/_next/data/<buildId>/<owner>/<repo>.json`。
   验证：`out/_next/data/*/shubhamsaboo/awesome-llm-apps.json` 存在。

3. **P0 搜索触发令牌墙**
   根因：首页搜索走 `StarChartViewer` → `getRepoData` → 浏览器直连 GitHub API，触发限流后弹窗要求用户创建个人令牌，与"不用搜、不用注册"直接冲突。
   修复：新增 `components/RepoSearch.tsx`，输入后直接跳转到预渲染的仓库详情页（`/{owner}/{repo}`），不再发起任何 GitHub API 请求。首页移除 `RepoInputer` + `StarChartViewer`。
   验证：`out/index.html` 中 "Add access token" / "Access Token" 出现次数为 0。

4. **P1 数据时效性误导**
   根因：徽章写"本周数据 · Feb 23 – Mar 1, 2026"，但实际是约 7 个月前的数据。
   修复：改为"数据周期 · …"，并在数据滞后超过 14 天时显示琥珀色提示"当前展示的是最近一次完整统计周期，最新一周仍在采集"；正文"本周"改为"这个周期"。

5. **P2 超长仓库名截断难看**
   根因：`owner` 与 `repo` 同时 `truncate`，导致 `x1xhl...` 这类残片。
   修复：`owner` 加 `shrink-0`，只让 `repo` 截断。

## 还剩什么（未修，留待后续）

- **P1 数据源本身仍是旧的（2026-W09）**。代码侧已如实标注，但根因是数据管道未刷新，需要 BigQuery + GCP 服务账号才能跑 `star:fetch`。这属于数据运维，不是首屏代码问题。
- **多仓库对比功能**在首页已移除（改为单仓库跳转）。要恢复且不触发令牌墙，需要后端新增 `/star-data` JSON 接口，让浏览器不直连 GitHub。
- 页头 GitHub star 数字（9,647）缺少说明，属 P3。

## 下一步

进入 Round 2 验收：不改代码，验证上述修复是否真的生效，并检查是否引入回归。
