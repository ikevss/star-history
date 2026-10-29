# Round 3 总结

- 日期：2026-10-26
- 验收对象：https://star-history-3wn.pages.dev
- 本轮范围：验证 Round 2 修复，未改代码

## 本轮得分

**73 / 100，不通过**

- 一票否决触发：F3（项目详情页首屏出现未解释的技术术语，整页 0 中文）
- P0 × 1、P1 × 2、P2 × 3、P3 × 3

## 本轮验收确认已修好的（Round 2 遗留）

| Round 2 问题 | 本轮实测 |
|---|---|
| 异常搜索触发 6 条 console error | 4 种异常输入（不存在仓库、真实低星仓库、空串、乱码）均不跳转、均有中文提示、0 error、0 个 ≥400 |
| 404 页空白 | 直接访问 `/notexist/notexist`：`title=页面不存在 · Starboard`，有返回首页入口 |
| 令牌入口无障碍/品牌不一致 | 页头已无任何 Token/登录入口 |
| 首页控制台 | 冷启动 0 error、0 个 ≥400，`loadEventEnd ≈ 1.26s` |
| 20 张卡片 | 20/20 均 200，标题与 slug 一致 |
| 三档宽度 | `scrollWidth == innerWidth`，越界元素 0 |

## 本轮发现的问题

**P0 / F3**
- 项目详情页 **100% 英文**，整页 0 个中文字符；雷达图 `Forks / Pushes / Issues Closed / Contributors` 无任何中文图例，与"不搜仓库、不写代码"的定位直接冲突。

**P1**
- 品牌不一致：首页 `Starboard`，详情页/404 页 `star-history.com`。
- 3 张广告卡无「广告/推广」标注，与内容混排。

**P2 / P3**
- 顶栏无解释的 `9,648` GitHub 徽标。
- 长仓库名省略号截断且无 tooltip。
- 404 正文无可见品牌。
- 搜索框 placeholder 两页不一致。
- 辅助文案含 `owner/repo` 术语。

## 本轮修了什么

1. **P0 详情页全英文**
   - `shared/packages/radar-svg.ts` + `frontend/components/InteractiveRadar.tsx`：雷达标签改为 关注 / 本周新增 / 已解决问题 / 贡献者 / 代码提交 / 复刻。
   - `shared/packages/card-landscape1.tsx`：`since`→`始于`、`Weekly`→`本周`、`stars`→`关注`、`pushes`→`提交`、`issues closed`→`已解决`；所有 hover tooltip 的 `Top N%` 改为 `超过 N%`；品牌脚注 `star-history.com`→`Starboard`。
   - `frontend/pages/[...slug].tsx`：标题 `X - N Stars`→`X · N 关注`；`Back to home`→`返回首页`；`Download as PNG`→`下载图片`；`Share`→`分享`；`#N of M`→`第 N / 共 M`；`Tracking repos with N+ stars`→`目前追踪关注数超过 N 的开源项目`；`og:locale` en_US→zh_CN；`og:site_name`/logo alt → Starboard；下载失败提示中文化。
   - 修复过程中发现并解决：`btoa()` 无法编码中文，导致构建抛 `InvalidCharacterError`。改为先 `TextEncoder` 转 UTF-8 字节再 `btoa`（`[...slug].tsx` 与 `shared/common/utils.tsx` 两处）。同时因 tsconfig target 为 ES5，`for...of` 迭代 `Uint8Array` 不被允许，改用索引循环。

2. **P1 品牌不一致**
   详情页与卡片脚注统一为 `Starboard`。

3. **P1 广告无标注**
   `RightSidebar` 赞助列表顶部加「推广」标签。

## 还剩什么

- 顶栏 GitHub star 数字无说明（P2）。
- 长仓库名截断无 tooltip（P2）。
- 404 正文无可见品牌（P3，但 title 已有品牌）。
- 搜索框 placeholder 两页不一致（P3）。
- **数据源仍是 2026-W09**，需 BigQuery 刷新。
- 多仓库对比未恢复（需后端 JSON 接口）。

## 下一步

Round 4：不改代码，验证详情页中文化是否彻底、有无回归。
