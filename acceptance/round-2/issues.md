# Starboard 验收问题清单（Round 2）

- 产品：Starboard — https://star-history-3wn.pages.dev
- 验收方式：CDP 驱动沙箱内 Chrome（127.0.0.1:9222），真实操作 + 截图 + 网络/控制台事件采集
- 验收时间：2026-10-26
- 结论：**本轮不合格（触发一票否决项 F5）**
- 问题统计：P0 × 1，P1 × 3，P2 × 3，P3 × 3

---

## ISS-01 【P0】搜索不存在 / 低于 5 万星的仓库 → 控制台 error 级报错 + React 水合错误

- **级别**：P0（一票否决 F5）
- **描述**：在首页底部搜索框输入 `notexist/notexist` 回车，页面虽然给出了友好文案，但控制台出现 6 条 error 级记录：
  - `Failed to load resource: 404` × 2（`/_next/data/<buildId>/notexist/notexist.json`、`/notexist/notexist`）
  - `Error: Failed to load static props`（console.error）
  - `Minified React error #418` × 2（hydration 不匹配）
  - `Minified React error #423` × 1（hydration 不匹配）
  - 网络层 >=400 响应 2 条
- **影响面（实测）**：不止"乱输入"才会触发。实测搜索真实存在但 <5 万星的仓库 `star-history/star-history`（9,648 星）同样复现：6 条 error + 2 条 404。即**任何低于 5 万星的仓库都会走进这条有 bug 的路径**，属于高频真实场景。
- **截图**：`screenshots/notexist-errors.png`、`screenshots/search-notexist.png`
- **复现步骤**：
  1. 打开首页，滚动到底部"想查某个具体项目？"搜索框
  2. 输入 `notexist/notexist`，回车
  3. 打开 DevTools Console，可见上述 error；Network 可见 2 条 404
  4. 改用 `star-history/star-history` 重复，结果一致
- **建议**：
  1. not-found 分支改为静态兜底渲染，不要让 `getStaticProps` 抛错；
  2. 修复 #418/#423 水合不匹配（服务端与客户端渲染不一致）；
  3. 对 404 路由返回正确的 404 状态码而非 200 HTML 壳。

---

## ISS-02 【P1】not-found 页面无标题、无品牌、无返回入口，用户被"搁浅"

- **级别**：P1
- **描述**：搜索不存在的项目后，落地页 `document.title` 为空字符串（实测 `title: ""`），页面只有顶部搜索框 + 一句 `notexist/notexist not found / We only track repositories with over 50k stars. Try another repository above.`，**没有 Starboard 品牌、没有"返回首页"入口**（对比正常项目页有 `← Back to home`）。
- **截图**：`screenshots/search-notexist.png`
- **复现步骤**：首页底部搜索框输入 `notexist/notexist` 回车，观察标签页标题与页面内容。
- **建议**：not-found 页补 `<title>项目未找到 · Starboard</title>`、Starboard 头部与"返回首页"链接，与正常项目页保持同一外壳。

---

## ISS-03 【P1】"连接 GitHub" 是可点击 `<span>`，不可键盘访问；点击后弹英文 Token 弹窗

- **级别**：P1
- **描述**：
  1. 首页 header 的 "连接 GitHub" 实测为 `<span class="header-link cursor-pointer ...">连接 GitHub</span>`，**不是 `<a>`/`<button>`，`tabindex=-1`、无 `role`**，键盘 Tab 无法聚焦、读屏无法识别（仅靠 React onclick）。
  2. 点击后弹出模态框，内容**全英文**且品牌写作 **Star-history**：
     - 标题 `Add GitHub Access Token`
     - 正文 `Star-history uses the GitHub API to retrieve repository metadata... Star-history will need your personal access token to unlimit it...`
     - 输入项 `Access Token (will be stored in your local storage)` + `Save`
  3. 全站为中文界面，此弹窗为英文；产品名为 Starboard，弹窗却写 Star-history。
- **截图**：`screenshots/github-token-modal.png`
- **复现步骤**：打开首页 → 点击右上角 "连接 GitHub" → 观察弹窗文案与语言。
- **建议**：改为 `<a>`/`<button>` 并补 `role`/`tabindex`/键盘事件；弹窗中文化；品牌统一为 Starboard；明确标注"可选、仅用于解除 GitHub API 限流、不索取个人数据权限"。

---

## ISS-04 【P1】项目详情页品牌是 "star-history.com"，与 Starboard 不一致

- **级别**：P1
- **描述**：从首页搜索 `vuejs/core` 或点击任意卡片，落地页顶部 logo 为 `✦ star-history.com`，搜索框 placeholder 为 `star-history or star-history/star-history or https://github.com/star-history/star-history`，页脚亦为 `star-history.com`。用户从 "Starboard" 进入，却看到另一个产品名，信任感受损。
- **截图**：`screenshots/search-vuejs-core.png`、`screenshots/project-375.png`
- **复现步骤**：首页搜索 `vuejs/core` → 观察落地页品牌与搜索框 placeholder。
- **建议**：项目页统一为 Starboard 品牌（logo、placeholder、页脚），或在首页明确说明"详情页数据由 star-history 提供"。

---

## ISS-05 【P2】移动端（375）下 "How to use this site" 入口完全不可达

- **级别**：P2
- **描述**：header 中该链接所在容器为 `<div class="hidden md:flex ...">`，在 <768px 被隐藏；同时汉堡菜单打开后也**只有 "连接 GitHub" + 徽标**，不含该链接。手机端用户无法访问使用说明。
- **截图**：`screenshots/home-375.png`、`screenshots/375-menu-open.png`
- **复现步骤**：以 375 宽度打开首页 → 展开右上角汉堡菜单 → 菜单内无 "How to use this site"。
- **建议**：把该链接加入移动端菜单项。

---

## ISS-06 【P2】移动端汉堡菜单内容与 header 重复，无新增价值

- **级别**：P2
- **描述**：375 宽度下 header 已完整显示 `Starboard / Blog / 连接 GitHub`，汉堡菜单打开后仅再显示 `连接 GitHub` + `9,648` 徽标，属于重复内容；菜单未承载任何 header 之外的导航能力。
- **截图**：`screenshots/home-375.png`、`screenshots/375-menu-open.png`
- **复现步骤**：375 宽度打开首页 → 点击汉堡 → 对比菜单内容与 header。
- **建议**：菜单内放置 header 未展示的项（如使用说明、Blog 子页），或在窄屏隐藏重复项。

---

## ISS-07 【P2】卡片 #2 仓库名在所有宽度被省略号截断且无 title 提示

- **级别**：P2
- **描述**：卡片 2 的仓库名 `system-prompts-and-models-of-ai-tools` 在 375/768/1440 三档均被截断为 `system-prompts-and-mode…`（实测 `scrollWidth=298 > clientWidth=217/234/236`，`text-overflow:ellipsis; overflow:hidden; white-space:nowrap`，**无 `title` 属性**），用户既看不到全名也无法悬浮查看。
- **截图**：`screenshots/home-375.png`、`screenshots/home-768.png`、`screenshots/home-1440.png`
- **复现步骤**：任意宽度打开首页 → 查看第 2 张卡片标题。
- **建议**：允许换行、或提供 `title`/悬浮气泡显示完整仓库名。

---

## ISS-08 【P2】"关注" 被用作 star 的翻译，语义含糊易误读

- **级别**：P2
- **描述**：卡片统一显示 `+7,184 关注 · 本周`、`共 24.6万`。"关注" 在中文语境通常指 follow（关注者），而此处实际含义是 GitHub Star（星标/收藏）。目标用户（产品经理、投资人）极可能误读为"粉丝数/订阅数"。全站未出现 "star/星标" 字样。
- **截图**：`screenshots/home-375.png`、`screenshots/home-1440.png`
- **复现步骤**：打开首页 → 查看任意卡片底部数字文案。
- **建议**：改用"星标/收藏"或直接使用 ⭐ 图标，并在首次出现处加一句图例说明。

---

## ISS-09 【P3】header 右侧 "9,648" 徽标含义不明

- **级别**：P3
- **描述**：header 显示 GitHub 图标 + `9,648`，链接指向 `https://github.com/star-history/star-history`。用户无法判断这是本站星数、赞助商星数还是其他含义，也无 tooltip。
- **截图**：`screenshots/home-1440.png`
- **复现步骤**：打开首页 → 观察 header 右侧徽标。
- **建议**：补充 tooltip/aria-label 说明，或移除。

---

## ISS-10 【P3】首屏出现 repo slug（owner/repo）形式项目名，未解释

- **级别**：P3
- **描述**：卡片标题以 `openclaw/openclaw`、`x1xhlol/system-prompts-and-models-of-ai-tools` 形式呈现。对"完全不懂技术"的用户，`owner/repo` 属于未解释的技术术语。
- **截图**：`screenshots/home-1440.png`
- **复现步骤**：打开首页 → 查看卡片标题。
- **建议**：主标题使用人类可读名称，slug 作为副标题/弱化展示，或在首次出现处加图例。

---

## ISS-11 【P3】搜索框位置过深，首屏不可见

- **级别**：P3
- **描述**：首页唯一搜索框位于"想查某个具体项目？"区块，需滚动约 1.5 屏才可见；header 内无搜索入口。ADHD/低耐心用户可能找不到。
- **截图**：`screenshots/home-1440.png`（首屏无搜索框）、`screenshots/home-1440-bottom.png`
- **复现步骤**：打开首页不滚动 → 找不到搜索框；滚动到底部才出现。
- **建议**：在首屏（hero 区或 header）提供搜索入口。

---

## ISS-12 【P3】底部大块赞助商广告占据大量视觉空间

- **级别**：P3
- **描述**：页面底部由 SerpApi、Bytebase、Dify 等大块广告图占据（见整页截图下半部），与"60 秒看懂技术趋势"的定位相比视觉干扰偏大，削弱工具感与信任感。
- **截图**：`screenshots/home-1440-bottom.png`、`screenshots/home-1440-fullpage.png`
- **复现步骤**：打开首页滚动到底部。
- **建议**：弱化广告体量或折叠，保持工具页的克制感。
