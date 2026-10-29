# Round 2 总结

- 日期：2026-10-26
- 验收对象：https://star-history-3wn.pages.dev
- 本轮范围：验证 Round 1 修复，未改代码（遵守"第二轮必须在无代码改动下通过"的要求）

## 本轮得分

**83 / 100，不通过**

- 一票否决触发：F5（异常路径控制台 error）
- P0 × 1、P1 × 3、P2 × 3、P3 × 3

## 本轮验收确认已修好的（Round 1 遗留）

| Round 1 问题 | 本轮实测 |
|---|---|
| 3 张卡片死链 | 20/20 卡片全部 200，URL 与标题一致，`netBad=0`、`error=0` |
| 首页控制台 404 | 冷启动 4 轮清缓存复测，**0 error、0 个 ≥400** |
| 搜索触发令牌墙 | 搜 `vuejs/core` 直接跳 `/vuejs/core`，**无登录/Token 弹窗** |
| 数据时效误导 | 已改为"数据周期"，滞后时显示琥珀提示 |
| 375px 搜索行溢出 | 三档宽度 `overflowX=false`，越界元素 0 |

## 本轮发现的问题

**P0 / F5**
- 搜索不存在或低于 5 万星的仓库（`notexist/notexist`、真实的 `star-history/star-history` 均可复现）触发 6 条 console error（404×2、`Failed to load static props`、React 水合错误 #418×2、#423×1）。影响面覆盖全部低星仓库。

**P1**
- header「连接 GitHub」是可点击 `<span>`，`tabindex=-1`、无 role，键盘不可达；点击后弹全英文 Token 弹窗，品牌写作 `Star-history`，与中文界面和 Starboard 品牌双重不一致。
- 404 页 `document.title` 为空、无品牌、无返回首页入口。

**P2 / P3**
- 卡片 #2 仓库名省略号截断。
- 移动端菜单与 header 项重复、缺"使用说明"。
- 页头 GitHub star 数字缺说明。

## 本轮修了什么

1. **P0 搜索低星仓库崩溃**
   根因：`RepoSearch` 无条件 `router.push`，目标页面未预渲染时 Next.js 走 404 + `_next/data` 请求，引发 404 与 React 水合错误。
   修复：`RepoSearch` 引入 `@gh-data/repos.json` 建立收录集合，导航前校验；未收录时原地显示中文提示"暂时没有收录 X。我们目前追踪关注数超过 5 万的开源项目。"，不再发起任何请求。

2. **P1 令牌入口无障碍与品牌不一致**
   根因：首页改造后已不再调用 GitHub API，令牌入口成为纯粹的认知负担。
   修复：从 header 彻底移除「连接 GitHub」入口及其弹窗，桌面端与移动端菜单同步清理。

3. **P1 404 页空白**
   根因：`404.tsx` 没有 `next/head`，文案为英文，无返回入口。
   修复：新增 `<title>页面不存在 · Starboard</title>` + `noindex`，中文文案，加入"返回首页看看什么在起飞"按钮，沿用 xkcd 硬阴影风格。

4. **P2/P3 菜单**
   移动端菜单补齐 Blog / 使用说明 / GitHub Star，移除重复项。

## 还剩什么

- 卡片超长仓库名仍会省略号截断（属合理降级，未再处理）。
- 页头 GitHub star 数字仍无说明（P3）。
- **数据源仍是 2026-W09**，需 BigQuery 刷新，属数据运维。
- 多仓库对比功能仍未恢复（需后端 `/star-data` JSON 接口）。

## 下一步

Round 3：不改代码，验证本轮三项修复是否生效，并确认无回归。
