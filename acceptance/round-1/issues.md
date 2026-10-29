# Starboard 验收问题清单（Round 1）

- 验收对象：https://star-history-3wn.pages.dev
- 验收方式：CDP 驱动沙箱 Chrome（127.0.0.1:9222，Chrome 150），真实点击/输入/截图
- 验收时间：2026-10-26
- 截图目录：`/workspace/acceptance/round-1/screenshots/`
- 结论摘要：**不通过**（触发 F5、F6 两项一票否决；另有 3 个 P0/严重问题）

---

## 问题总览

| 编号 | 级别 | 标题 | 关联一票否决项 |
|---|---|---|---|
| I-01 | P0 致命 | 首页 20 张卡片中 3 张点击后进入 404 / not found 页 | — |
| I-02 | P0 致命 | 控制台存在 error 级别报错（打开首页即产生） | **F5** |
| I-03 | P1 严重 | 底部搜索框输入后要求填写 GitHub Access Token，核心延展功能死路 | — |
| I-04 | P1 严重 | 首页"本周数据"实为 7 个月前（Feb 23 – Mar 1, 2026），时效性失真 | — |
| I-05 | P1 严重 | 375px 宽度底部搜索行横向溢出并被裁切 | **F6** |
| I-06 | P2 一般 | 中英文案大面积混杂、品牌名不一致（Star-history vs Starboard） | — |
| I-07 | P2 一般 | 关键指标无图例（"关注"= star、"共 X 万"、裸数字 9,647） | F3（边界） |
| I-08 | P2 一般 | 日期/时间格式不统一 | — |
| I-09 | P2 一般 | 领域分类错误（public-apis 被标"后端"） | — |
| I-10 | P3 优化 | 卡片标题/描述硬截断，长仓库名信息丢失 | — |
| I-11 | P3 优化 | 核心结论（AI 占 13/20）不在首屏 | — |
| I-12 | P3 优化 | 首屏 FCP 偏慢（≈2.3s） | — |

---

## I-01 [P0 致命] 首页 3 张卡片是死链（点击后 404 / not found）

**现象**：首页"本周涨得最快的 20 个项目"中，第 12、15、17 名三张卡片点击后进入 404 页面，页面正文为：
> 🔭 Shubhamsaboo/awesome-llm-apps not found
> We only track repositories with over 50k stars. Try another repository above.

**死链清单**：
- #12 `Shubhamsaboo/awesome-llm-apps`（stars_total = 98,994）
- #15 `LadybirdBrowser/ladybird`（stars_total = 60,843）
- #17 `DigitalPlatDev/FreeDomain`（stars_total = 150,177）

**根因**：这 3 个仓库在数据源 `gh/data/repos.json` 中**都存在且 star 数均 > 5 万**（min_stars=50000），本应被正常追踪；但对应页面未在构建产物中生成（`_next/data/*.json` 与页面路由均返回 404）。属于**构建/SSG 漏页**，同时"not found"页宣称"只追踪 >5 万 star 的仓库"，与首页把这三个仓库列为榜单自相矛盾。影响首页 15%（3/20）的内容。

**证据**：
- 截图：`broken-card-11.png`、`broken-card-14.png`、`broken-card-16.png`
- 接口验证：`curl` 三个页面与其 `_next/data/*.json` 均返回 404；`openclaw/openclaw` 返回 200。

**复现步骤**：
1. 打开 https://star-history-3wn.pages.dev
2. 点击第 12 张卡片（Shubhamsaboo/awesome-llm-apps）
3. 观察：跳转到 `https://star-history-3wn.pages.dev/Shubhamsaboo/awesome-llm-apps`，页面显示 "not found"，HTTP 404

**建议**：修复构建流程，对 weekly-ranking 中所有仓库生成对应静态页；或在首页生成时过滤掉无法生成页面的仓库；同时让"not found"文案与实际追踪规则一致。

---

## I-02 [P0 致命] 控制台出现 error 级别报错（触发 F5）

**现象**：仅打开首页（不做任何操作）即产生 3 条 error 级控制台日志；使用搜索框后追加 401 error。零容忍项被触发。

**具体报错**（首页加载即出现）：
```
Failed to load resource: the server responded with a status of 404 ()
  @ /_next/data/zc8w__8phI7T132SyeMyp/Shubhamsaboo/awesome-llm-apps.json?slug=...
Failed to load resource: the server responded with a status of 404 ()
  @ /_next/data/zc8w__8phI7T132SyeMyp/LadybirdBrowser/ladybird.json?slug=...
Failed to load resource: the server responded with a status of 404 ()
  @ /_next/data/zc8w__8phI7T132SyeMyp/DigitalPlatDev/FreeDomain.json?slug=...
```
（搜索 vuejs/core 后追加）
```
Failed to load resource: the server responded with a status of 401 ()
  @ https://api.github.com/repos/vuejs/core/stargazers?per_page=100
Failed to request data: 401 Access Token Unauthorized
```

**根因**：与 I-01 同源（漏页 JSON）；搜索框走 GitHub API 未带有效 token 导致 401。

**证据**：`load-result.json` 的 `consoleErrors` / `networkErrors`；`interact-result.json` 的 `errors` / `badResponses`。

**复现步骤**：
1. 打开 DevTools Console
2. 访问首页 → Console 出现 3 条红色 404 error
3. 滚到底部搜索框输入 `vuejs/core` 回车 → 追加 401 error

**建议**：修复漏页（消除 404）；对 GitHub API 未授权场景做降级（缓存数据 / 友好提示），避免抛 error 级日志。

---

## I-03 [P1 严重] 底部搜索框是"死路"：要求填写 GitHub Access Token

**现象**：底部"想查某个具体项目？"区域，输入 `vuejs/core` 回车后：
- 顶部弹出橙色横幅 **"Access Token Unauthorized"**
- 页面中央弹出 **"Add GitHub Access Token"** 弹窗，要求用户去 GitHub 创建 personal access token 并粘贴（英文说明）

**问题**：
1. 与首页主打的"**不用搜、不用注册**"直接冲突；
2. 目标用户（产品经理 / 投资人 / AI 从业者）没有 GitHub token，在此**彻底卡死**，无法看到承诺的"完整增长曲线"；
3. 弹窗文案为英文，且自称 "Star-history"（品牌不一致）。

**证据**：截图 `08-search-after.png`；控制台 401 日志。

**复现步骤**：
1. 打开首页 → 滚动到底部"想查某个具体项目？"
2. 在输入框输入 `vuejs/core`
3. 按回车
4. 观察：出现 "Access Token Unauthorized" 与 token 弹窗，图表区域无有效数据

**建议**：改为服务端代理 / 预置数据，使无 token 也能出图；或至少给出中文、可操作的降级提示，而非把用户推向"去 GitHub 建 token"。

---

## I-04 [P1 严重] 首页"本周数据"实为约 7 个月前

**现象**：首页顶部徽章显示 **"本周数据 · Feb 23 – Mar 1, 2026"**，而验收当天为 **2026-10-26**。
即"本周"实为约 7 个月前的数据。同时页面卡片详情页显示日期为 "Oct 26, 2026"（当天），博客角标为 "Mar 31, 2026"，多处时间口径不一致。

**数据源佐证**：
- `gh/data/weekly-ranking.json` → `"updated_at": "Feb 23 – Mar 1, 2026"`（过期）
- `gh/data/star-count.json` / `leaderboard.json` → `"updated_at": "Oct 26, 2026"`（当天）

**影响**：产品定位是"60 秒看懂**现在**什么技术最火"，展示 7 个月前的"本周"榜单会严重误导用户与投资人（早期信号失真）。

**证据**：截图 `01-desktop-1440.png`、`03-mobile-375.png`（徽章区）。

**复现步骤**：打开首页，读取顶部徽章文字；与当天日期对比。

**建议**：让 weekly-ranking 数据与部署同步更新；若无法实时更新，应去掉"本周"字样并明确标注数据截止日期。

---

## I-05 [P1 严重] 375px 宽度底部搜索行横向溢出并被裁切（触发 F6）

**现象**：在 375px 视口下，底部"想查某个具体项目？"的输入行宽度为 **412px**，超出视口 375px：
- 行容器：left = -18，right = 393
- 输入框：left = -17，right = 233
- "View star history" 按钮：left = 233，right = 392（右侧被裁掉约 17px）

页面根节点使用 `overflow-x-hidden` 隐藏了横向滚动条（`documentElement.scrollWidth == innerWidth == 375`），因此**没有横向滚动条**，但内容被**静默裁切**：左侧 placeholder 被切、右侧按钮被切。

**证据**：截图 `09-mobile-lookup-overflow.png`、`10-mobile-footer.png`（可见输入行左右均被裁）。

**复现步骤**：
1. 以 375×812 视口打开首页
2. 滚动到底部"想查某个具体项目？"
3. 观察：输入行超出屏幕两侧，按钮被裁切

**建议**：给该行加 `min-w-0` / `flex-wrap` / 让输入框 `flex-1 min-w-0`、按钮 `shrink-0`，并在小屏改为纵向堆叠。

---

## I-06 [P2 一般] 中英文案大面积混杂、品牌名不一致

**现象**（同一屏内混杂）：
- 首页主体中文，但 header 的 **"How to use this site"、"Blog"** 为英文；
- 底部搜索框 placeholder 与按钮为英文（"star-history or star-history/star-history or https://github.com/..." / **"View star history"**），而上方标题却是中文"想查某个具体项目？"；
- 卡片详情页整页英文（"GLOBAL RANK"、"WEEKLY stars / pushes"）；
- 404 页整页英文；
- token 弹窗整页英文，且自称 **"Star-history"** 而非 "Starboard"。

**影响**：中文目标用户理解成本升高，品牌可信度下降。

**证据**：`01-desktop-1440.png`、`06-search-before.png`、`broken-card-14.png`、`08-search-after.png`。

**建议**：全站统一语言策略（至少中文站全中文）；修正 token 弹窗品牌名。

---

## I-07 [P2 一般] 关键指标无图例（F3 边界）

**现象**：首屏出现但无任何解释的指标/数字：
- 卡片上的 **"关注 · 本周"**（实为 GitHub star 增量）——用户不知道"关注"指什么；
- **"共 24.6万"**（总 star）——无单位说明；
- header 右侧裸数字 **"9,647"**（star-history/star-history 仓库 star 数）——无任何标签，与"技术热度榜"主题无关，用户完全无法理解。

**判定**：原始英文术语（stargazers / forks / commits / repo slug）**未**出现，故 F3 未明确触发；但"关注"属未解释的指标词，构成理解障碍，作为 F3 边界风险记录。

**证据**：`01-desktop-1440.png`、`03-mobile-375.png`。

**建议**：在榜单上方加一行图例，如"关注 = GitHub Star（星标）"；给 header 数字加说明或移除。

---

## I-08 [P2 一般] 日期/时间格式不统一

**现象**：
- 徽章用英文："Feb 23 – Mar 1, 2026"；
- 博客角标："Mar 31, 2026"；
- 卡片详情页："Oct 26, 2026"；
- 正文/按钮为中文。

**建议**：统一为中文日期格式（如"2026年2月23日 – 3月1日"）。

---

## I-09 [P2 一般] 领域分类错误

**现象**：`public-apis/public-apis`（"A collective list of free APIs"，偏学习资源/工具）被分类为 **"后端"**。根因是分类规则中 topic `"api"` 命中后端词表，优先级高于语义。

**影响**：影响"按领域筛选"的可信度。

**证据**：`01-desktop-1440.png`（第 9 张卡片右下角"后端"标签）。

**建议**：调整领域判定优先级与词表，或引入描述语义兜底。

---

## I-10 [P3 优化] 卡片标题/描述硬截断

**现象**：长仓库名被截断为 "system-prompts-and-models-..."，描述被截断为 "...Devin AI, Junie..."，信息丢失且无法悬停查看完整内容。

**证据**：`01-desktop-1440.png`、`02-tablet-768.png`。

**建议**：长名用更紧凑字号/换行，或提供 title 悬浮提示。

---

## I-11 [P3 优化] 核心结论不在首屏

**现象**："本周涨得最快的 20 个项目里，有 13 个是 AI 相关"这一核心洞察位于页面下方"这些数字意味着什么？"区块，首屏（不滚动）看不到。首屏仅能从筛选胶囊 "AI 13" 间接推测。

**证据**：`01-desktop-1440.png`（首屏）对比 `06-search-before.png`（下方便区块）。

**建议**：把"13/20 是 AI"提到首屏副标题或首屏卡片区顶部。

---

## I-12 [P3 优化] 首屏 FCP 偏慢

**现象**：沙箱实测 FCP ≈ 2296ms，卡片就绪 ≈ 3597ms，页面 load ≈ 3595ms。核心任务仍远快于 60s，但首屏体感偏慢。

**证据**：`load-result.json` 的 `fcp` / `tCardsMs` / `tLoadMs`。

**建议**：优化字体加载（xkcd.ttf）与首屏资源体积。

---

## 附：通过项（记录以作对照）

- 三档宽度（375/768/1440）**首屏**均无错位、遮挡、横向滚动（桌面/平板 overflowingCount=0；移动端溢出仅出现在底部搜索行，见 I-05）。
- 汉堡菜单在 375px 下可正常展开/收起（`aria-expanded` 正确切换，`menuDisplay: none → flex`）。见 `04-mobile-menu-closed.png` / `05-mobile-menu-open.png`。
- 5 张正常卡片点击跳转正确（200，无 404）：openclaw/openclaw、x1xhlol/...、firecrawl/firecrawl、github/spec-kit、torvalds/linux。见 `click-card-*.png`。
- 底部搜索框机械上可输入并回车（hash 更新为 `#vuejs/core&type=date&legend=top-left`），但结果触发 token 死路（见 I-03）。
- 核心任务（不输入即可看到榜单）可在 ≈3.6s 内完成，满足 60s 目标。
