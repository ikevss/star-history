# Starboard 验收问题清单（Round 3）

- 被验产品：Starboard — https://star-history-3wn.pages.dev
- 验收方式：CDP 驱动沙箱 Chrome（127.0.0.1:9222），真实操作 + 截图 + 网络/控制台采集
- 截图目录：`/workspace/acceptance/round-3/screenshots/`
- 原始数据：`testA.json` `testB.json` `testCards.json` `testMenu.json` `testMenu3` `testSearch.json` `testProject` `test404` `testFinal.json`

> 说明：以下所有结论均来自真实浏览器操作，非代码推测。

---

## P0

### ISSUE-001 [P0] 项目详情页 100% 英文，首屏出现未解释的技术术语（触发 F3 一票否决）
- **描述**：从首页点击任意卡片（或搜索 `vuejs/core`）进入项目详情页后，整个页面 **没有任何一个中文字符**（`document.body.innerText` 中文匹配数 = 0）。雷达图六个维度标签 `Stars / New Stars / Forks / Issues Closed / Pushes / Contributors`，以及 `WEEKLY 21 stars · 78 pushes · 57 issues closed`、`GLOBAL RANK`、`Back to home`、`Share`、`Tracking repos with 50k+ stars` 全部为英文且**无任何中文注释或图例**。首页专门用「这些数字意味着什么？」解释了「关注」，但详情页的这些指标完全未解释。
- **影响**：产品定位「不搜仓库、不写代码」，目标用户含非技术产品经理/投资人。点进核心结果页后，`Forks / Pushes / Issues Closed` 对「傻瓜用户」是天书，直接违背「60 秒看懂」的承诺。
- **截图**：`screenshots/project-vuejs-375.png`、`screenshots/project-vuejs-375-full.png`、`screenshots/search-vuejs-core.png`
- **复现步骤**：
  1. 打开 https://star-history-3wn.pages.dev/
  2. 点击任意卡片（如第 1 名 openclaw/openclaw），或搜索 `vuejs/core`
  3. 观察详情页雷达图标签与统计行
- **建议**：为雷达图维度、WEEKLY 统计行、返回/分享等 UI 文案提供中文（如 `Stars→标星`、`Forks→复刻`、`Pushes→提交`、`Issues Closed→已关闭议题`、`Contributors→贡献者`），或在图内/图下加一行中文图例；至少保证 UI chrome 与首页语言一致。

---

## P1

### ISSUE-002 [P1] 品牌名不一致：首页「Starboard」 vs 详情页/404 页「star-history.com」
- **描述**：首页左上角品牌为绿色星号 + `Starboard`；进入项目详情页后，顶栏品牌变为绿色星号 + `star-history.com`。同一产品内两个品牌名，用户会误以为被跳转到了另一个网站。
- **截图**：`screenshots/home-1440.png`（Starboard）对比 `screenshots/project-vuejs-375.png`（star-history.com）、`screenshots/search-vuejs-core.png`
- **复现步骤**：首页看左上角 → 点击任意卡片 → 再看左上角品牌名。
- **建议**：全站统一品牌标识（统一为 Starboard，或统一为 star-history.com）。

### ISSUE-003 [P1] 广告卡片无任何「广告/推广/Sponsored」标注
- **描述**：首页中下部有 3 张带 `utm_source` 的广告卡（SerpApi / Dify / Bytebase），页面文本中 **不含** `广告 / 推广 / Sponsored` 任何字样（`bodyHasSponsor=false`），唯一相关文案是页脚的 `Promote your project`（招商邮箱）。广告与内容混排，用户无法区分。
- **截图**：`screenshots/home-1440-full.png`、`screenshots/search-empty.png`（Dify 广告紧邻搜索框）、`screenshots/search-notexist.png`（SerpApi 广告）
- **复现步骤**：打开首页 → 滚动到搜索框下方 → 观察 3 张大图卡。
- **建议**：为广告位加「广告 / Sponsored / 推广」角标，并与自然内容做视觉区隔。

---

## P2

### ISSUE-004 [P2] 首页头部「9,648」为无解释的 GitHub 外链徽标，易被误解为登录/连接入口
- **描述**：顶栏右侧显示 GitHub 图标 + `9,648`，实际是 `star-history/star-history` 仓库的 star 数外链（`aria-label="Star star-history/star-history on GitHub"`）。视觉上像一个孤立数字徽标，无任何文字说明；严格说它是「GitHub 相关入口」，虽非「连接/登录」门槛，但易让傻瓜用户误以为是账号/连接状态。
- **截图**：`screenshots/home-375.png`、`screenshots/menu-open-375.png`
- **复现步骤**：打开首页，观察右上角 GitHub 图标 + 数字。
- **建议**：加 tooltip/说明（如「我们在 GitHub 上的 star 数」），或弱化/移除该元素；确保不产生「需要登录 GitHub」的误解。

### ISSUE-005 [P2] 长仓库名被省略号截断且无 tooltip，关键信息丢失
- **描述**：卡片标题对超长仓库名使用 `truncate`（省略号）。例如第 2 名完整名 `system-prompts-and-models-of-ai-tools`，在 375/768/1440 三档下均显示为 `system-prompts-and-mode…`，且**无 title/tooltip**，用户无法看到完整项目名。
- **截图**：`screenshots/home-375.png`、`screenshots/home-768.png`、`screenshots/home-1440.png`
- **复现步骤**：打开首页，查看第 2 名卡片标题。
- **建议**：为截断文本加 `title` 属性或 hover 提示；或允许标题换行/放宽宽度。

### ISSUE-006 [P2] 首屏核心指标「关注」未就地解释（解释被折叠在首屏以下）
- **描述**：卡片核心指标 `+7,184 关注 · 本周` 中的「关注」未在首屏解释；对非技术用户，「关注」易被理解为「关注者/粉丝」，而实际含义是 GitHub star。解释文案「这些数字意味着什么？」位于文档约 1476px 处（首屏 900px 以内看不到）。
- **截图**：`screenshots/home-1440.png`（首屏，无解释）对比 `screenshots/home-1440-full.png`（下方解释）
- **复现步骤**：打开首页，首屏观察卡片指标 → 不滚动时看不到解释。
- **建议**：在首屏卡片区就近加一句图例（如「关注 = GitHub star 数」），或把解释区块上移到列表上方。

---

## P3

### ISSUE-007 [P3] 404 页正文缺少可见品牌标识（仅 `<title>` 含 Starboard）
- **描述**：直接访问 `/notexist/notexist`，页面正文（66 字）为 `🔭 这个页面走丢了 / 我们目前只收录… / 返回首页看看什么在起飞`，**正文无 Starboard 字样**（品牌仅存在于 `document.title="页面不存在 · Starboard"`）。
- **截图**：`screenshots/direct-404.png`
- **复现步骤**：访问 https://star-history-3wn.pages.dev/notexist/notexist
- **建议**：在 404 页加可见 Logo/品牌名，避免用户怀疑落到了第三方站点。

### ISSUE-008 [P3] 搜索框 placeholder 在首页与 404 页不一致，404 页示例为自荐项目
- **描述**：首页 placeholder = `输入项目名，例如 vuejs/core`；404 页 placeholder = `star-history or star-history/star-history or https://github.com/star-history/star-history`（无空格分隔、且用自家 star-history 仓库做示例）。两处不一致，404 页示例自荐且不友好。
- **截图**：`screenshots/direct-404.png`
- **复现步骤**：对比首页搜索框与 404 页搜索框 placeholder。
- **建议**：统一 placeholder 风格，使用中立示例（如 `vuejs/core`）。

### ISSUE-009 [P3] 首页搜索区辅助文案含技术术语「owner/repo」
- **描述**：搜索区辅助文案 `支持 owner/repo、完整 GitHub 链接，或只输入项目名` 使用了 `owner/repo` 这一技术写法（位于折叠线以下，非首屏，故未触发 F3）。对「傻瓜用户」仍偏技术。
- **截图**：`screenshots/home-1440-full.png`
- **复现步骤**：首页滚动到「想查某个具体项目？」区块。
- **建议**：改为「支持 项目名/owner+项目名、完整 GitHub 链接，或直接输入项目名」等更通俗表述。

---

## 通过项（无问题，记录以备核查）

| 检查项 | 结果 |
|---|---|
| 1. 375/768/1440 布局 | 三档 `scrollWidth == innerWidth`，无横向溢出、无错位、无遮挡；文字截断仅 ISSUE-005 一处 |
| 2. 冷启动控制台 error / >=400 请求 | 首页冷启动 3 档宽度均 **0 error、0 >=400** |
| 3. 首屏 3 秒内价值传达 | 达标：`现在什么技术在起飞？` + `不用搜、不用注册…` |
| 4. 零输入可用性 | 达标：1440 下 13 张卡片首屏可见；375 下 3 张；完整榜单 20 张 |
| 5. 核心任务计时 | 首页 `loadEvent≈1.26s`；搜索 `vuejs/core`→详情页 <2s |
| 6. 20 张卡片 | 20/20 跳转 **HTTP 200**，标题与项目 slug 一致（3 条仅大小写差异，内容正确） |
| 7. 手机端汉堡菜单 | 展开正常，Blog / 使用说明 / GitHub 各项可点击且跳转正确 |
| 8. 搜索 `vuejs/core` | 直接跳转 `/vuejs/core`，**无令牌/登录弹窗** |
| 9. 异常搜索 ×4 | 均不跳转、均给出中文提示、0 error、0 >=400（详见下表） |
| 10. 直接访问 `/notexist/notexist` | title=`页面不存在 · Starboard`，有返回首页入口，无登录门槛（正文无品牌，见 ISSUE-007） |
| 11. 页头 GitHub/Token/登录入口 | 无「连接 GitHub / Token / 登录」门槛；仅有 GitHub star 外链（ISSUE-004） |
| 12. 强制注册/登录/token 门槛 | 无。全部 20 卡片、搜索、详情页、404 恢复搜索均无需登录 |

### 异常搜索明细（检查 9）

| 输入 | 是否跳转 | 中文提示 | console error | >=400 |
|---|---|---|---|---|
| `notexist/notexist` | 否（停留首页） | 是：`暂时没有收录 notexist/notexist。我们目前追踪关注数超过 5 万的开源项目。` | 0 | 0 |
| `star-history/star-history`（真实低星） | 否 | 是：`暂时没有收录 star-history/star-history。…` | 0 | 0 |
| 空字符串 | 否 | 是：`请输入项目名，例如 vuejs/core` | 0 | 0 |
| `!!@@##`（乱码） | 否 | 是：`暂时没有收录 !!@@##…。…` | 0 | 0 |
