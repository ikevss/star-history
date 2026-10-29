# Starboard 验收问题清单（Round 4）

被测：https://star-history-3wn.pages.dev
验收方式：CDP 驱动沙箱 Chrome 150（127.0.0.1:9222），真实操作 + 截图 + 网络/控制台采集
验收时间：2026-10-26

---

## P0（必须修复，触发一票否决 / 严重损害产品立场）

### P0-1 首屏出现未解释的技术术语与整段英文黑话（触发 F3）
- 位置：首页首屏卡片
- 实测：卡片以 repo slug 形式展示项目名，例如 `openclaw/ openclaw`、`x1xhlol/ system-prompts-and-models-of-ai-tools`；
  项目描述为 GitHub 英文原文，例如 `Your own personal AI assistant. Any OS. Any Platform. The lobster way.`、
  `FULL Augment Code, Claude Code, Cluely, CodeBuddy, Comet, Cursor, Devin AI, Junie, Kiro, Le...`
- 影响：目标用户①产品经理 / ②投资人 / ③AI 从业者之外，"完全不懂技术的傻瓜用户"首屏即被英文与
  `owner/ repo` 格式劝退。F3 明确点名 `repo slug`。
- 证据：home-1440.png / home-375.png / home-768.png

### P0-2 详情页顶部品牌 logo 视觉为 star-history.com，与 Starboard 定位矛盾
- 位置：详情页顶部居中 logo
- 实测：`<img src="/assets/logo-full.svg" alt="Starboard">`，但图片画面文字为 `star-history.com`（见截图）
- 对比：首页 logo 资源为 `/assets/logo-icon.png`（画面为 `Starboard`）
- 影响：产品已改名 Starboard，详情页最显眼位置仍展示旧名/竞品名，品牌一致性崩塌，严重损害信任
- 证据：detail-core-1440.png / detail-core-768.png / detail-core-375.png

---

## P1（重要缺陷）

### P1-1 异常搜索全部静默失败，零提示
- 位置：首页搜索框（y≈1752，首屏之外）
- 实测（桌面 1440，真实键盘 Enter 提交）：
  | 输入 | 是否跳转 | 中文提示 | console error | >=400 |
  |---|---|---|---|---|
  | `notexist/notexist` | 否 | 无 | 0 | 0 |
  | `star-history/star-history` | 否 | 无 | 0 | 0 |
  | 空串 | 否 | 无 | 0 | 0 |
  | `!!@@##` | 否 | 无 | 0 | 0 |
- 影响：用户输入任意内容回车后页面毫无反应，会误判为卡死。暴躁用户会在第 2 步直接关闭页面。
- 证据：search-desktop2.json

### P1-2 详情页搜索框 placeholder 为英文，且诱导输入 GitHub URL
- 实测 placeholder：`star-history or star-history/star-history or https://github.com/star-history/star-history`
- 对比：首页同一控件 placeholder 为中文 `输入项目名，例如 vuejs/core`
- 影响：同一产品两套语言；详情页把"输入 GitHub 仓库地址"这一技术动作直接抛给用户，与"不用搜、不用注册"的定位冲突
- 证据：detail-core-1440.png / detail-core-375.png

### P1-3 详情页搜索按钮为英文 "Go"
- 实测：`<button>Go</button>`（首页无此按钮，仅 Enter 提交）
- 影响：唯一可见的提交动作是英文单词，且与首页交互不一致
- 证据：detail-core-1440.png

### P1-4 徽章图片残留英文 GLOBAL RANK / 英文日期
- 实测：DOM 中无 GLOBAL RANK 文本（`globalRankEls: []`），确认来自图片资源；画面显示 `GLOBAL RANK`、`Oct 26, 2026`
- 证据：detail-core-1440.png

### P1-5 详情页日期为英文
- 实测：`始于 Jun 2018`、徽章 `Oct 26, 2026`
- 影响：中文界面中夹杂英文月份
- 证据：detail-core-1440.png

### P1-6 首页顶部 GitHub 计数残留旧品牌
- 实测：`<a href="https://github.com/star-history/star-history" aria-label="Star star-history/star-history on GitHub">9,649</a>`
- 影响：①旧品牌 star-history 残留；②`9,649` 无任何中文说明，傻瓜用户不知道这是什么；
  ③aria-label 全英文，屏幕阅读器用户听到英文
- 证据：home-1440.png / home-768.png / home-375.png

### P1-7 顶部导航 "Blog" 为英文
- 实测：导航项为 `Blog`（英文）与 `使用说明`（中文）并列；手机端菜单同样为 `Blog`
- 影响：基础导航语言不统一
- 证据：home-1440.png / menu-375-open.png

---

## P2（体验优化）

### P2-1 卡片标题在 768 / 375 被截断且丢失关键信息
- 实测：`system-prompts-and-models-of-ai-tools` → `system-prompts-and-model...`（768）、`system-prompts-and-mode...`（375）
- 证据：home-768.png / home-375.png

### P2-2 详情页 375 项目名换行破碎
- 实测：`vuejs` 与 `/ core` 被拆成两行，视觉割裂
- 证据：detail-core-375.png

### P2-3 分享按钮指向 x.com（境外服务）
- 实测：`<a href="https://x.com/intent/tweet?..." target="_blank">分享</a>`
- 影响：中文语境下该分享渠道不可用；按钮只写"分享"未说明去向

### P2-4 下载按钮仅图标无文字
- 实测：`<button title="下载图片">`（仅图标），无可见文本
- 影响：傻瓜用户难以识别；`title` 已中文化属正向

### P2-5 赞助位文案为英文
- 实测：`Dify: Open-source platform for building LLM apps...`、`Bytebase: Database DevSecOps...`、`Scrape search engine results...`
- 说明：属第三方广告内容，可豁免，但影响整体中文观感

### P2-6 页面无 h1 / h2
- 实测：`headings: []`（详情页与首页均无 h1/h2）
- 影响：可访问性与 SEO 受损

### P2-7 "关注" 用词不当
- 实测：卡片与详情页用"关注"表示 GitHub Star 数（如 `53.1k 关注`、`+7,184 关注·本周`）
- 影响：中文语境下"关注"易被理解为 follow/watch，语义偏差

### P2-8 赞助位品牌区混杂旧名
- 实测：赞助区出现 `Bytebase`、`pgconsole`、`pgschema`、`DBHub`、`@tim_qian` 等英文品牌名
- 说明：属赞助商内容，非产品 UI 问题

---

## 通过项（实测无问题）

- 首页 / 详情页控制台 error：**0**（所有页面、所有宽度）
- >=400 网络请求：**0**
- 横向溢出 / 横向滚动：**无**（375 / 768 / 1440，首页与详情页）
- 遮挡 / 错位：未发现
- 首页 20 张卡片点击：全部跳转正确，URL 与卡片项目名一致（3 处仅 owner 大小写差异，非缺陷）
- 20 个详情页 URL HTTP 状态：**全部 200**
- 搜索 `vuejs/core`：直接跳转详情页，**无令牌弹窗**
- 汉堡菜单（375）：可展开 / 可关闭，按钮 `aria-label="切换菜单"`（中文）
- 详情页「返回首页 / 下载图片 / 分享」：均可见可点；返回首页与分享为中文；下载实际触发，
  文件名 `vuejs-core-stats.png`
- 首页「推广」标注：确实出现在赞助位
- 强制门槛：无注册 / 登录 / 填 token 要求
- 页面 title：首页 `Starboard · 现在什么技术在起飞`；详情页 `vuejs/core · 53.1k 关注`（均为中文）
- 雷达图轴标签：关注 / 复刻 / 本周新增 / 已解决问题 / 贡献者 / 代码提交（全中文）
- 卡片脚注品牌：`Starboard`（正确）
