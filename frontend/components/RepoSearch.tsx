import React, { useRef, useState } from "react"
import { useRouter } from "next/router"
import reposData from "@gh-data/repos.json"

const REPO_PATTERN = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i
const SLUG_PATTERN = /^([^/\s]+)\/([^/\s#?]+)$/

const tracked = new Set(
    (reposData as { repos: { name: string }[] }).repos.map((r) => r.name.toLowerCase()),
)
const minStars = (reposData as { min_stars: number }).min_stars
const minStarsLabel = minStars >= 10000 ? `${Math.round(minStars / 10000)} 万` : minStars.toLocaleString("en-US")

function parseRepo(raw: string): string | null {
    const value = raw.trim()
    if (!value) return null

    const urlMatch = value.match(REPO_PATTERN)
    if (urlMatch) return `${urlMatch[1]}/${urlMatch[2]}`.toLowerCase()

    const slugMatch = value.match(SLUG_PATTERN)
    if (slugMatch) return `${slugMatch[1]}/${slugMatch[2]}`.toLowerCase()

    if (/^[^/\s]+$/.test(value)) return `${value}/${value}`.toLowerCase()

    return null
}

export default function RepoSearch() {
    const router = useRouter()
    const [value, setValue] = useState("")
    const [error, setError] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    const submit = () => {
        const first = value.split(",")[0] ?? ""
        const repo = parseRepo(first)
        if (!repo) {
            setError("请输入项目名，例如 vuejs/core")
            inputRef.current?.focus()
            return
        }
        if (!tracked.has(repo)) {
            setError(`暂时没有收录 ${repo}。我们目前追踪关注数超过 ${minStarsLabel}的开源项目。`)
            return
        }
        setError("")
        router.push(`/${repo}`)
    }

    return (
        <div className="mx-auto mt-5 w-full max-w-xl">
            <div className="flex w-full items-stretch overflow-hidden rounded-lg border-2 border-neutral-900 bg-white shadow-[3px_3px_0_0_#363636]">
                <input
                    ref={inputRef}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        if (error) setError("")
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            if (e.nativeEvent.isComposing) return
                            e.preventDefault()
                            submit()
                        }
                    }}
                    className="h-11 min-w-0 grow bg-transparent px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                    type="text"
                    placeholder="输入项目名，例如 vuejs/core"
                    aria-label="搜索开源项目"
                />
                <button
                    onClick={submit}
                    className="h-11 shrink-0 border-l-2 border-neutral-900 bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                >
                    查看
                </button>
            </div>
            {error ? (
                <p className="mt-2 text-center text-xs leading-5 text-rose-600">{error}</p>
            ) : (
                <p className="mt-2 text-center text-xs text-neutral-400">
                    支持 owner/repo、完整 GitHub 链接，或只输入项目名
                </p>
            )}
        </div>
    )
}
