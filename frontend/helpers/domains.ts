export type Domain = "AI" | "前端" | "后端" | "开发工具" | "学习资源" | "其他"

export const DOMAINS: Domain[] = ["AI", "前端", "后端", "开发工具", "学习资源", "其他"]

const AI_TOPICS = [
    "ai", "llm", "llms", "openai", "claude", "gpt", "gpt-4", "chatgpt", "anthropic",
    "machine-learning", "deep-learning", "ml", "agent", "agents", "agent-skills",
    "ai-agents", "ai-agent", "mcp", "rag", "prompt", "prompts", "prompt-engineering",
    "transformer", "transformers", "stable-diffusion", "langchain", "vector-database",
    "embeddings", "neural-network", "computer-vision", "nlp", "generative-ai",
    "copilot", "diffusion", "fine-tuning", "inference", "multimodal", "ai-crawler",
    "ai-scraping", "ai-search",
]

const FRONTEND_TOPICS = [
    "react", "vue", "svelte", "angular", "nextjs", "next.js", "css", "tailwindcss",
    "tailwind", "frontend", "ui", "component", "components", "design-system",
    "web-components", "html", "webpack", "vite", "redux", "nuxt", "astro",
    "solidjs", "ui-library", "animation", "canvas", "svg", "browser", "browser-engine",
]

const BACKEND_TOPICS = [
    "go", "golang", "rust", "docker", "kubernetes", "k8s", "database", "sql",
    "postgres", "postgresql", "mysql", "redis", "server", "microservices",
    "api", "grpc", "nginx", "distributed-systems", "cloud", "devops",
    "infrastructure", "backend", "nodejs", "deno", "bun", "java", "spring",
    "django", "flask", "fastapi", "serverless", "container",
]

const TOOL_TOPICS = [
    "cli", "command-line", "developer-tools", "devtools", "vscode", "editor",
    "ide", "git", "terminal", "shell", "productivity", "automation",
    "build-tool", "linter", "formatter", "testing", "debugger", "tool", "tools",
    "workflow", "neovim", "vim", "tauri-app",
]

const LEARNING_TOPICS = [
    "awesome", "awesome-list", "tutorial", "tutorials", "learning", "education",
    "course", "books", "interview", "roadmap", "cheatsheet", "guide", "guides",
    "resources", "examples", "programming", "free", "book",
]

const AI_DESC = /\b(ai|llm|llms|agent|agents|agentic|claude|gpt|openai|anthropic|chatgpt|copilot|machine learning|deep learning|neural|prompt|prompts|rag|transformer|diffusion|inference|multimodal)\b/i
const FRONTEND_DESC = /\b(react|vue|svelte|angular|css|tailwind|frontend|front-end|ui library|design system|browser|web components)\b/i
const BACKEND_DESC = /\b(database|server|kubernetes|docker|microservice|backend|back-end|distributed|api gateway|runtime|compiler|proxy)\b/i
const TOOL_DESC = /\b(cli|command line|terminal|editor|devtool|developer tool|build tool|linter|formatter|debugger)\b/i
const LEARNING_DESC = /\b(tutorial|course|learn|learning|guide|awesome list|cheat sheet|roadmap|interview|handbook|book)\b/i

const FRONTEND_LANGS = new Set(["TypeScript", "JavaScript", "CSS", "HTML", "Vue", "Svelte", "SCSS"])
const BACKEND_LANGS = new Set(["Go", "Rust", "Java", "C", "C++", "C#", "Ruby", "PHP", "Elixir", "Scala", "Kotlin", "Shell", "Dockerfile"])

const topicHit = (topics: string[], keys: string[]) => {
    if (topics.length === 0) return false
    const set = new Set(topics.map((t) => t.toLowerCase()))
    return keys.some((k) => set.has(k))
}

export function classifyDomain(
    topics: string[] | null | undefined,
    language: string | null | undefined,
    description?: string | null,
): Domain {
    const ts = topics ?? []
    const desc = description ?? ""

    if (topicHit(ts, AI_TOPICS) || AI_DESC.test(desc)) return "AI"
    if (topicHit(ts, FRONTEND_TOPICS) || FRONTEND_DESC.test(desc)) return "前端"
    if (topicHit(ts, BACKEND_TOPICS) || BACKEND_DESC.test(desc)) return "后端"
    if (topicHit(ts, TOOL_TOPICS) || TOOL_DESC.test(desc)) return "开发工具"
    if (topicHit(ts, LEARNING_TOPICS) || LEARNING_DESC.test(desc)) return "学习资源"
    if (language && FRONTEND_LANGS.has(language)) return "前端"
    if (language && BACKEND_LANGS.has(language)) return "后端"
    return "其他"
}

export function formatCount(n: number): string {
    if (!Number.isFinite(n)) return "0"
    if (n >= 100000000) return `${(n / 100000000).toFixed(1).replace(/\.0$/, "")}亿`
    if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, "")}万`
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
    return `${n}`
}

export function formatDelta(n: number): string {
    return `+${n.toLocaleString("en-US")}`
}

export function prettyRepoName(name: string): { owner: string; repo: string } {
    const [owner, ...rest] = name.split("/")
    return { owner, repo: rest.join("/") }
}
