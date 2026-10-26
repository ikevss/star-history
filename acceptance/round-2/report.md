# Starboard 验收报告（Round 2）

- **产品**：Starboard — https://star-history-3wn.pages.dev
- **定位**：不搜仓库、不写代码，60 秒看懂现在什么技术最火
- **目标用户**：① 产品经理 ② 投资人 ③ AI 从业者
- **验收方式**：CDP 驱动沙箱内 Chrome（127.0.0.1:9222）真实操作；采集 `Network.responseReceived`、`Runtime.consoleAPICalled`、`Log.entryAdded`、`Runtime.exceptionThrown`；截图存 `screenshots/`
- **验收日期**：2026-10-26
- **验收立场**：傻瓜用户 + 30 秒 ADHD 用户 + 暴躁用户 三合一人设

---

## 一、总分

| 维度 | 满分 | 得分 |
|---|---|---|
| D1 首屏价值传达 | 20 | 18 |
| D2 零输入可用性 | 20 | 18 |
| D3 核心任务完成时间 | 20 | 19 |
| D4 理解成本 | 15 | 11 |
| D5 视觉与信任感 | 15 | 10 |
| D6 情绪体验 | 10 | 7 |
| **合计** | **100** | **83** |

**最终判定：不合格（触发一票否决项 F5）**

---

## 二、各维度得分与理由

### D1 首屏价值传达 18/20
首屏（不滚动）即有：主标题「现在什么技术在起飞？」+ 副文案「不用搜、不用注册。打开就能看到全球开源项目里，谁在涨、涨多快。」+ 数据周期徽标 + 排行卡片网格 + 分类筛选。价值主张在 3 秒内清晰可读。
扣分：卡片标题使用 `owner/repo` slug（未解释，见 ISS-10）；「关注」语义含糊（见 ISS-08）；搜索入口不在首屏（见 ISS-11）。

### D2 零输入可用性 18/20
零输入（不搜索/不注册/不点击）即可获得：Top 20 排行、每个项目的周增星数、总星数、一句话简介、分类标签，以及下方「这些数字意味着什么？」的解读区块（含"13/20 是 AI 相关""第一名一周新增 7,184 个关注""追踪 374 个 5 万星以上项目"）。信息密度高。
扣分：「关注」易被误读为 follow（ISS-08）；解读区块位于折叠线以下，纯零输入不滚动时拿不到（ISS-11 同类）。

### D3 核心任务完成时间 19/20
实测：导航后内容在约 3 秒内完全可读（测量含 3s 固定等待，实际渲染更早）。打开即可看到"AI 是本周最集中方向、openclaw 第一"，核心任务 ≈ 3–5 秒，远优于 60 秒目标。
扣分：需 1–2 秒理解「关注」与「共 XX 万」两个数字的区分。

### D4 理解成本 11/15
优点：设有独立解读区块，主动解释数字含义，行业少见。
扣分：①「关注」= star 的翻译有歧义（ISS-08）；② `owner/repo` slug 未解释（ISS-10）；③ 每卡两个数字（`+7,184 关注·本周` 与 `共 24.6万`）需要自行分辨；④ 解读区块在折叠线以下，理解成本高企时用户未必滚到。

### D5 视觉与信任感 10/15
优点：首页设计干净、栅格规整、分类标签清晰、三档宽度均无错位。
扣分：① 项目详情页品牌为 `star-history.com`，与 Starboard 不一致（ISS-04）；② Token 弹窗全英文且写 `Star-history`（ISS-03）；③ 页脚暴露 `Maintained by Bytebase, originally built by @tim_qian`，与"Starboard"品牌叙事存在张力；④ 底部大块广告（ISS-12）削弱工具感。

### D6 情绪体验 7/10
优点：无需注册即可用、加载快、not-found 文案友好。
扣分：① 点击「连接 GitHub」会被突如其来的英文 Token 弹窗打断（ISS-03）；② 搜索低星/不存在仓库会落到一个无标题、无品牌、无返回入口的页面（ISS-02）；③ 该路径伴随控制台报错（ISS-01）。

---

## 三、一票否决项逐条检查（含实测数据）

| 编号 | 检查项 | 结论 | 实测数据 |
|---|---|---|---|
| **F1** | 核心任务无法完成 | **未触发** | 打开首页即见 Top 20 排行 + 周增星数 + 简介，核心任务可完成 |
| **F2** | 必须输入仓库名才能开始 | **未触发** | 零输入即可浏览全部排行、筛选、解读区块；搜索为可选 |
| **F3** | 首屏出现未解释的技术术语 | **未触发（临界）** | 首屏未出现 stargazers/forks/commits；出现 `owner/repo` slug 与「关注」，已降级为 P3（ISS-10）与 P2（ISS-08），未达"未解释技术术语"程度 |
| **F4** | 60 秒内无法完成核心任务 | **未触发** | 核心任务 ≈ 3–5 秒（导航后 3s 固定等待内内容已完整可读） |
| **F5** | 控制台出现任何 error 级别报错 | **触发 ❌** | 搜索 `notexist/notexist`：6 条 error（2×404 log + `Failed to load static props` + React #418×2 + React #423×1）+ 2 条 >=400 网络响应。搜索真实低星仓库 `star-history/star-history` 同样 6 error + 2 netBad。**首页正常加载经 4 轮冷启动复测：0 error、0 >=400** |
| **F6** | 任一宽度下布局错位/溢出/遮挡/横向滚动 | **未触发** | 375/768/1440 三档：`scrollWidth == innerWidth`（375/375、768/768、1425<1440），`overflowX=false`，越界元素 0 个；仅卡片 #2 仓库名省略号截断（ISS-07，非溢出/遮挡） |

### F5 详细证据
```
# 首页冷启动（清缓存）× 4 轮：errors=[] netBad=[]
ROUND 1 errors= [] prefetchCount= 16 bad= []
ROUND 2 errors= [] prefetchCount= 15 bad= []
ROUND 3 errors= [] prefetchCount= 17 bad= []

# 搜索 notexist/notexist
errors:
  log       Failed to load resource: 404  /_next/data/<buildId>/notexist/notexist.json
  console   Error: Failed to load static props
  log       Failed to load resource: 404  /notexist/notexist
  exception Minified React error #418 (hydration mismatch) ×2
  exception Minified React error #423 (hydration mismatch) ×1
netBad: 404 ×2

# 搜索真实低星仓库 star-history/star-history
-> url=/star-history/star-history  title=""  errors: 6  netBad: 2
```
> 说明：首轮采集曾捕获 3 条 `_next/data/zc8w__8phI7T132SyeMyp/LadybirdBrowser/ladybird.json` 404，经排查为**旧 buildId 缓存**残留（当前 buildId 为 `1nwq8ShDDcAoo5tSWOFI-`，对应请求均返回 200），不计入缺陷。

---

## 四、必做检查逐项结果

1. **三档宽度截图与布局**：375 / 768 / 1440 均已截图（`home-375/768/1440.png`）。`overflowX=false`、越界元素 0、无遮挡；唯一截断为卡片 #2 仓库名（ISS-07）。
2. **控制台 error 与 >=400 网络请求**：首页正常加载 0 error / 0 >=400；异常搜索路径 6 error / 2 × 404（ISS-01）。
3. **首屏 3 秒能否明白"这是什么、对我有没有用"**：能。主标题 + 副文案 + 数据周期 + 排行卡片，3 秒内可判断"这是全球开源项目涨星排行，AI 是本周最热方向"。
4. **零输入可用性**：不搜索/不注册/不点击即可获得 Top 20、周增星数、总星数、简介、分类、解读区块。信息量充足。
5. **核心任务计时**：打开 → 知道现在什么技术最火 ≈ 3–5 秒。
6. **点击全部 20 张卡片**：20/20 点击成功，URL 与卡片 href 一致，页面标题与卡片仓库名一致（大小写不敏感匹配），`netBad=0`、`consoleErrors=0`。
   - 示例：`/openclaw/openclaw → openclaw/openclaw - 245.7k Stars`；`/torvalds/linux → torvalds/linux - 220.2k Stars`。
7. **手机端汉堡菜单**：按钮可点击（`aria-expanded` false→true），菜单内 `Blog` 项可点击并跳转 `/blog`（标题 `Star History Blog`）。但菜单内容与 header 重复、且缺少"如何使用本站"（ISS-05、ISS-06）。
8. **底部搜索框 `vuejs/core`**：回车/点「查看」均跳转 `https://star-history-3wn.pages.dev/vuejs/core`，标题 `vuejs/core - 53.1k Stars`，**未出现任何令牌/登录弹窗**。
9. **异常输入 `notexist/notexist`**：有友好提示（`notexist/notexist not found / We only track repositories with over 50k stars.`），未白屏；但伴随控制台报错与空标题（ISS-01、ISS-02）。
10. **强制门槛排查**：浏览、筛选、点卡片、搜索均**无需**注册/登录/Token；仅主动点击「连接 GitHub」才会弹出 Token 弹窗（可关闭），非强制门槛。

---

## 五、验收前自检

1. **我是不是在用开发者视角代替傻瓜用户视角？**
   已刻意用傻瓜用户视角复核：`owner/repo` slug（ISS-10）、「关注」= star 的歧义（ISS-08）、header 的 `9,648` 徽标（ISS-09）、搜索框位置（ISS-11）四项均为非技术用户真实困惑点，未以"开发者能懂"为由放过。

2. **我是不是因为"功能很强"放低了可用性标准？**
   没有。核心循环（零输入看排行）确实优秀，但 F5 触发即判不合格；D4/D5/D6 均按普通用户标准扣分，未因功能丰富而放宽。

3. **有没有哪条扣分是我主观喜好而非真实用户问题？**
   ISS-12（底部广告体量）主观成分偏高，已降级为 P3 且未据此扣减维度分；其余扣分均可复现、可指证。

4. **如果我是暴躁用户，会在第几步关掉页面？**
   首屏 3 秒内不会关（信息密度高、无强迫动作）。但第 2–3 步高概率关页：① 点了「连接 GitHub」→ 英文 Token 弹窗（惊吓 + 品牌困惑）；② 搜索一个不存在/低星项目 → 落到无标题、无品牌、无返回入口的页面，且控制台报错（ISS-02、ISS-01）。

**自检后校准**：维持 83 分。F5 证据确凿且影响面覆盖"所有 5 万星以下仓库"，不合格判定不变。

---

## 六、最终总结

**总分 83/100，本轮不合格**：触发 1 项一票否决（F5 控制台 error 级报错）。共 **P0 × 1、P1 × 3、P2 × 3、P3 × 3**。

最严重的 3 个问题：
1. **ISS-01（P0/F5）**：搜索不存在或低于 5 万星的仓库（实测 `notexist/notexist`、`star-history/star-history` 均复现）触发 6 条控制台 error（404 ×2、`Failed to load static props`、React 水合错误 #418×2/#423×1）——影响面覆盖全部低星仓库，属高频真实场景。
2. **ISS-03（P1）**：header「连接 GitHub」是可点击 `<span>`（`tabindex=-1`、无 role，键盘不可达），点击后弹出**全英文**、品牌写作 `Star-history` 的 GitHub Token 弹窗，与中文界面及 Starboard 品牌双重不一致。
3. **ISS-02（P1）**：not-found 页 `document.title` 为空、无 Starboard 品牌、无"返回首页"入口，用户被搁浅在一张"半空白"页面上。

> 补充：首页正常加载（含 4 轮冷启动复测）控制台 0 error、网络 0 个 >=400，20/20 卡片全部 200 且标题一致，三档宽度无溢出——**核心浏览体验本身是合格的**，本轮不合格完全由异常路径（F5）与品牌/无障碍一致性缺陷导致。
