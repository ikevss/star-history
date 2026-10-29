# Starboard 验收问题清单（Round 5）

- 被测地址：https://star-history-3wn.pages.dev
- 验收时间：2026-10-26（沙箱时钟；站点自身钢印日期同为 Oct 26, 2026）
- 验收方式：CDP 驱动真实 Chrome（127.0.0.1:9222），三档宽度真实渲染 + 交互 + 网络/控制台采集
- 截图目录：`/workspace/acceptance/round-5/screenshots/`（共 85 张）

严重度定义：
- **P0**：阻断核心任务或直接让用户得出错误结论
- **P1**：严重损害可用性/信任，用户大概率放弃或投诉
- **P2**：明显缺陷，影响体验但不致命

---

## P0（4 项）

### P0-1 数据严重过期 8 个月，却仍以"现在"和"今天"呈现
- **现象**
  - 首页首屏标注：`数据周期 · Feb 23 – Mar 1, 2026`，并紧跟一句 `当前展示的是最近一次完整统计周期，最新一周仍在采集。`
  - 详情页右上金色钢印：`GLOBAL RANK #340 / Oct 26, 2026`（= 今天，随访问时间生成）。
  - 博客最新文章：`Mar 31, 2026`。
  - 今天为 2026-10-26，数据停留在 2026-02-23 ~ 03-01，**陈旧约 8 个月**。
- **为什么是 P0**：产品定位是"60 秒看懂**现在**什么技术最火"。用户拿到的是一份 2 月的榜单，却被告知"最新一周仍在采集"，同时详情页用"今天的日期"钢印为这份旧数据背书。这会让 PM / 投资人做出错误的技术选型与趋势判断——比"打不开"更危险。
- **证据**：`screenshots/home-1440.png`、`screenshots/home-1440-full.png`、`screenshots/zoom-rank-badge.png`、`screenshots/blog-375-view.png`
- **复现**：打开首页 → 看首屏 pill；再打开任意详情页 → 看右上钢印日期；对比系统日期。

### P0-2 详情页移动端整卡被缩放到 0.286，正文有效字号 4.6px，完全不可读
- **实测**：375×812 下，详情卡是一个固定 1200px 布局，套 `transform: matrix(0.286,...)` 缩到 343px。
  - 描述文字计算字号 16px × 0.286 = **4.6px**
  - 雷达轴标签、`GLOBAL RANK`、"本周 21 关注"等全部在 5–7px
  - 768 下同样缩放 0.613，正文 **9.8px**（仍低于可读阈值）
  - 1440 下缩放 0.853，正文 13.6px（正常）
- **为什么是 P0**：手机端详情页不是"挤"，而是"字小到看不清"，等同于该页面在移动端不可用；且页面 docHeight 恰好等于视口高度，用户连放大滚动的余地都没有。
- **证据**：`screenshots/detail-375-vuejs-core.png`、`screenshots/detail-768-vuejs-core.png`、`screenshots/detail-1440-vuejs-core.png`
- **复现**：375 宽打开 https://star-history-3wn.pages.dev/vuejs/core

### P0-3 详情页"本周 关注/提交/已解决"与首页同项目同周数据自相矛盾，且把 0–100 评分当"次数"展示
- **实测（同一项目、同一"本周"）**
  | 项目 | 首页卡片 | 详情页 |
  |---|---|---|
  | openclaw | `+7,184 关注 · 本周` | `本周 99 关注 · 98 提交 · 98 已解决` |
  | sindresorhus/awesome | `+577 关注 · 本周` | `本周 95 关注 · 43 提交 · 0 已解决` |
  | anomalyco/opencode | `+1,397 关注 · 本周` | `本周 97 关注 · 94 提交 · 97 已解决` |
- **数值分布异常**：7 个抽样项目的"新增关注/代码提交/已解决/贡献者"全部落在 0–100（93–99 密集），明显是 0–100 相对评分，而非次数。
  - 佐证：`vuejs/core` 显示"贡献者 32"，但 Vue core 实际贡献者数百人；`torvalds/linux` 显示"贡献者 93"，Linux 实际贡献者数千人。
  - 佐证：首页说明文明确写"第一名 openclaw 一周新增 7,184 个关注，平均每小时约 43 个"（7184/168≈42.8，确为次数），详情页却是 99。
- **tooltip 语义反转**：`title="新增关注：99 · 超过 1%"`、`title="已解决问题：0 · 超过 100%"`——"超过 X%"到底是"超过了 X% 项目"还是"被 X% 项目超过"，用户无法判断。
- **连带错误**：详情页 `og:description` 自动生成成 `本周新增 21 关注，78 次代码提交，32 位贡献者`，把评分写成了事实。
- **为什么是 P0**：这是详情页最核心的三个数字，用户点进卡片就是为了看"涨多快"。现在同一个"本周"，首页说 +7,184、详情说 99，相差 72 倍，且无任何口径说明。
- **证据**：`screenshots/detail-1440-vuejs-core.png`、`screenshots/detail-1440-torvalds-linux.png`、`screenshots/detail-1440-sindresorhus-awesome.png`

### P0-4 anomalyco/opencode 详情页稳定抛出 9 条 React 运行时异常
- **实测**：3/3 次冷启动复现，每次 9 条 error 级异常：
  - `Minified React error #425` ×1（文本内容 hydration 不匹配）
  - `Minified React error #418` ×7（hydration 不匹配）
  - `Minified React error #423` ×1（hydration 失败）
  - 来源：`/_next/static/chunks/framework-64ad27b21261a9ce.js`
- **全量扫描**：20 个详情页逐个打开，仅该页报错；首页、其余 19 个详情页、blog 均 0 error。
- **为什么是 P0**：验收规则为零容忍；且 hydration 失败意味着该页首屏是"服务端旧内容 + 客户端重渲染"，与 P0-3 的数据口径混乱可能同源。
- **证据**：`screenshots/opencode-repro-1.png`、`opencode-repro-2.png`、`opencode-repro-3.png`
- **复现**：`https://star-history-3wn.pages.dev/anomalyco/opencode`（清缓存后打开，控制台必现）

---

## P1（10 项）

### P1-1 每个详情页顶部搜索框都在泄漏 star-history 品牌
- **现象**：详情页 / 404 页顶部搜索框 placeholder 恒为
  `star-history or star-history/star-history or https://github.com/star-history/star-history`
  按钮文案为英文 `Go`。
- **影响**：这是详情页第一行可见内容。用户从 Starboard 首页点进来，第一眼看到的是"star-history"和一个英文 Go 按钮，品牌认知直接断裂；首页搜索框 placeholder 却是正常的中文"输入项目名，例如 vuejs/core"。
- **证据**：`screenshots/zoom-badge-search.png`、`screenshots/detail-1440-vuejs-core.png`、`screenshots/notfound-notexist.png`

### P1-2 分享卡片品牌错误 / 图片直接打不开
- **首页** `og:image` = `/assets/star-history-preview.webp`，打开后是 **star-history.com 的 logo 大图**（绿星 + 手写体 star-history.com）。任何把 Starboard 链接分享到 X / 微信的人，卡片上显示的都是另一个品牌。
- **详情页** `og:image` = `https://star-history-api.onrender.com/svg?repos=vuejs/core&style=landscape1`，实测该域名 **完全不可达**（curl 25s / 12s 均 HTTP 000 超时，两次），分享详情页时卡片无图。
- **证据**：`/workspace/acceptance/round-5/og.webp`（已下载的首页分享图）

### P1-3 "使用说明"指向 2023 年的英文旧站文章，且教用户填 GitHub Token
- **现象**：header 唯一的帮助入口"使用说明" → `/blog/how-to-use-github-star-history`
  - 标题：`📕 How to use GitHub Star History`（英文，旧品牌）
  - 目录：`On this page / User Manual / How to add a repo using 3 different formats / How to add your GitHub personal access token to remove GitHub API limits / Chrome extension`
  - 正文出现 `personal access token` 12 次、`token` 40 次
- **影响**：产品首屏承诺"不用搜、不用注册"，唯一的帮助文档却在教用户配置 GitHub 个人访问令牌；中文 PM 点进去即弃。
- **证据**：`screenshots/howto.png`

### P1-4 博客整站是旧品牌英文站
- **现象**：`/blog` 的 `<title>` 与页面大标题均为 `Star History Blog`；`Subscribe`、`FEATURED`、日期 `Mar 31, 2026` 全英文；订阅链接指向 `newsletter.star-history.com`。
- **影响**：header 第二项就是 Blog，点进去品牌从 Starboard 变成 Star History，且内容全英文。
- **证据**：`screenshots/blog.png`、`screenshots/blog-375-view.png`

### P1-5 异常搜索 4 种全部"静默无反应"
- **实测（已按原生 setter + input + Enter 触发 React onChange）**
  | 输入 | 结果 |
  |---|---|
  | `vuejs/core` | ✅ 直接跳转 `/vuejs/core`，无令牌弹窗 |
  | `notexist/notexist` | ❌ URL 不变、无提示、无 404、无"未找到" |
  | `star-history/star-history` | ❌ 同上（该仓库确实不在收录范围） |
  | 空串 | ❌ 无反应（可接受） |
  | `!!@@##` | ❌ 无反应、无任何校验提示 |
- **附加**：首页搜索**没有任何联想/下拉**（输入 `vue` 1.5s 后仍无建议）；详情页却有联想下拉。
- **影响**：用户输错一个字母，回车后页面"什么都没发生"，会反复回车 → 暴躁用户在此关闭页面。
- **证据**：`screenshots/s-home-notexist.png`、`screenshots/s-home-junk.png`、`screenshots/search-notexist-typed.png`

### P1-6 首页搜索入口埋在 20 张卡片 + 广告之后，移动端菜单也没有搜索
- **实测**：搜索输入框位置
  - 1440：`y≈1892px`，页面总高 3227px（约在 59% 处）
  - 375：`y≈4238px`，页面总高 4445px（约在 95% 处）
  - 移动端汉堡菜单只有：`Blog / Blog（重复）/ 使用说明 / 9,649`，**没有搜索**
- **影响**：想查某个具体项目的用户，必须先滑过全部 20 张卡片 + 说明 + 广告才能搜索；这是"详情页有搜索、首页没有"的入口割裂。
- **证据**：`screenshots/mobile-search-area.png`、`screenshots/mobile-menu-open.png`

### P1-7 1440 宽度下"使用说明"文章右侧广告栏被裁切
- **实测**：`/blog/how-to-use-github-star-history` 右侧 sidebar 右边界 `x=1473`，而视口 clientWidth=1425；外层 `overflow-x:hidden` 导致被硬裁。
- **可见后果**：SerpApi 卡片、Bytebase 卡片右半边被切掉（截图可见）。
- **证据**：`screenshots/howto.png`、`screenshots/howto-overflow.png`

### P1-8 详情页首屏存在多个未解释英文/技术术语
- 逐项实测（详情页首屏即可见）：
  - `GLOBAL RANK`（手写体、约 5px、还渲染了两份）
  - `Go`（搜索按钮）
  - `MIT` / `Apache-2.0` / `NOASSERTION` / `CC0-1.0`（许可证，NOASSERTION 是 GitHub API 原始枚举值）
  - `复刻`（fork 的官方译法，但非开发者无法理解）
  - `Oct 26, 2026`、`始于 Jun 2018`（英文月份）
  - `TypeScript` / `Rust` / `C` / `Shell`（语言，可接受）
- **证据**：`screenshots/detail-1440-torvalds-linux.png`（NOASSERTION）、`screenshots/detail-1440-vuejs-core.png`

### P1-9 首页 20 张卡片简介 100% 英文，且 2 行截断
- **实测**：20 张卡片 description 全部为英文原文（GitHub 描述直出），中文界面里没有翻译；768/1440 下第 2、5、7、8 张被 `...` 截断。
- **影响**：目标用户是中文 PM / 投资人，"Your own personal AI assistant. Any OS. Any Platform. The lobster way. 🦞"这类描述无法在 60 秒内判断"这项目到底解决什么问题"。
- **证据**：`screenshots/home-1440.png`、`screenshots/home-768.png`

### P1-10 404 页面品牌与导航双双消失
- **现象**：`/notexist/notexist` 返回真 404（正确），但页面：
  - **没有 header、没有 Starboard logo**（`header:false, logo:false`）
  - 顶部只有那个泄漏 star-history 的搜索框 + `Go`
  - 只有一句"我们目前只收录关注数超过 50k 的开源项目"
- **影响**：用户走丢时最需要品牌与导航，此时品牌消失，只剩一个陌生搜索框。
- **证据**：`screenshots/notfound-notexist.png`、`screenshots/notfound-375.png`

---

## P2（11 项）

| # | 问题 | 实测证据 |
|---|---|---|
| P2-1 | Header 右侧 `9,649` 无任何可见标签，点击跳 `github.com/star-history/star-history`（aria-label 为英文 `Star star-history/star-history on GitHub`）。用户无法判断这是"项目数/星数/什么" | `screenshots/home-1440.png` |
| P2-2 | 375 汉堡菜单里 `Blog` 出现两次（header 已有 Blog + 菜单内又一个 Blog） | `screenshots/mobile-menu-open.png` |
| P2-3 | `GLOBAL RANK` 文本在 DOM 中渲染两份（x 差 2px、均 opacity:1 可见），文字发虚/重影 | `screenshots/zoom-rank-badge.png` |
| P2-4 | 卡片标题被截断（`system-prompts-and-model...`），且标题只显示 repo 名不显示 owner；`来自 f`（真实 owner 就是 f）看起来像 bug | `screenshots/home-768.png` |
| P2-5 | 分类存疑：`FreeDomain`（免费域名服务）归"学习资源"，`public-apis`（API 清单）归"后端"，`clash-verge-rev`（代理客户端）归"后端" | `screenshots/home-1440-full.png` |
| P2-6 | 卡片右下 `共 24.6万` 无标签（总关注数？），与左侧 `+7,184 关注·本周` 的关系需要猜 | `screenshots/home-1440.png` |
| P2-7 | 详情页搜索框无 `aria-label`（仅 placeholder）；雷达图 `<img alt="">` 且轴标签烘焙在 SVG 图里，不可选中/不可读屏 | `screenshots/detail-1440-vuejs-core.png` |
| P2-8 | 3 个项目 owner 大小写与首页不一致：首页 `shubhamsaboo / ladybirdbrowser / digitalplatdev`，详情 `Shubhamsaboo / LadybirdBrowser / DigitalPlatDev` | 20 卡片逐页扫描 |
| P2-9 | 详情页搜索后联想下拉不收起，残留悬浮在卡片上方（`vuejs/core ★ 53.1k`） | `screenshots/search-0-vuejs_core.png` |
| P2-10 | 字体加载期（0–1s）H1"现在什么技术在起飞？"、品牌字"Starboard"、"9,649"全部不可见（FOIT） | `screenshots/cold-1440-1000ms.png` |
| P2-11 | 详情页没有 `<h1>`、没有 footer；详情页 `<title>` 不含 Starboard（首页含） | `raw-details.json` |

---

## 一票否决判定

| 项 | 判定 | 依据 |
|---|---|---|
| F1 核心任务无法完成 | **触发** | 交互可走通，但"现在什么技术最火"的答案是 8 个月前的数据（P0-1），语义上任务失败 |
| F2 必须输入仓库名才能开始 | 未触发 | 首页零输入直接渲染 20 张卡片 |
| F3 首屏未解释技术术语 | **触发（详情页首屏）** | `GLOBAL RANK` / `NOASSERTION` / `复刻` / `Go`；首页首屏通过（已把 stars/forks/commits 译为关注/复刻/提交） |
| F4 60 秒内无法完成 | 未触发 | LCP 1.26s，首屏 13 张卡片，找 TOP3 约 2–3s |
| F5 控制台 error | **触发** | `anomalyco/opencode` 9 条 React 异常，3/3 复现 |
| F6 布局错位/溢出/遮挡 | **触发** | 375 详情页整卡缩放至 4.6px 正文；1440 帮助文章右栏被裁切 |
