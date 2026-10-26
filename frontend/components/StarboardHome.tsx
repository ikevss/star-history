/* eslint-disable @next/next/no-img-element */
import React, { useMemo, useState } from "react"
import Link from "next/link"
import weeklyRankingData from "@gh-data/weekly-ranking.json"
import reposData from "@gh-data/repos.json"
import starCountData from "@gh-data/star-count.json"
import { classifyDomain, formatCount, formatDelta, prettyRepoName, DOMAINS, type Domain } from "../helpers/domains"

type RawRepo = {
    name: string
    description: string | null
    language: string | null
    topics: string[] | null
    rank: number | null
}

type Mover = {
    name: string
    newStars: number
    totalStars: number
    description: string
    language: string | null
    domain: Domain
    rank: number | null
}

const weeklyRanking = weeklyRankingData as {
    updated_at: string
    repos: { name: string; new_stars: number; stars_total: number }[]
}
const repos = (reposData as { min_stars: number; repos: RawRepo[] }).repos
const starCount = starCountData as {
    updated_at: string
    tiers: { threshold: number; label: string; count: number }[]
}

const repoMap = new Map<string, RawRepo>(repos.map((r) => [r.name, r]))

const movers: Mover[] = weeklyRanking.repos.map((w) => {
    const meta = repoMap.get(w.name)
    return {
        name: w.name,
        newStars: w.new_stars,
        totalStars: w.stars_total,
        description: meta?.description ?? "",
        language: meta?.language ?? null,
        domain: classifyDomain(meta?.topics, meta?.language, meta?.description),
        rank: meta?.rank ?? null,
    }
})

const totalTracked = repos.length
const tier50k = starCount.tiers.find((t) => t.threshold === 50000)?.count ?? totalTracked

function weekEndDate(label: string): Date | null {
    const m = label.match(/[–-]\s*([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/)
    if (!m) return null
    const d = new Date(`${m[1]} ${m[2]}, ${m[3]} 23:59:59 UTC`)
    return Number.isNaN(d.getTime()) ? null : d
}

const dataEnd = weekEndDate(weeklyRanking.updated_at)
const dataAgeDays = dataEnd ? Math.floor((Date.now() - dataEnd.getTime()) / 86400000) : 0
const isStale = dataAgeDays > 14

const domainStyles: Record<Domain, string> = {
    AI: "bg-emerald-100 text-emerald-800 border-emerald-300",
    前端: "bg-sky-100 text-sky-800 border-sky-300",
    后端: "bg-violet-100 text-violet-800 border-violet-300",
    开发工具: "bg-amber-100 text-amber-800 border-amber-300",
    学习资源: "bg-rose-100 text-rose-800 border-rose-300",
    其他: "bg-neutral-100 text-neutral-700 border-neutral-300",
}

function DomainPill({ domain }: { domain: Domain }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${domainStyles[domain]}`}>
            {domain}
        </span>
    )
}

function MoverCard({ mover, index }: { mover: Mover; index: number }) {
    const { owner, repo } = prettyRepoName(mover.name)
    return (
        <Link
            href={`/${mover.name.toLowerCase()}`}
            className="group flex flex-col justify-between rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-[3px_3px_0_0_#363636] transition-all hover:-translate-y-0.5 hover:shadow-[5px_5px_0_0_#363636]"
        >
            <div className="flex items-start gap-3">
                <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-50 text-sm font-bold"
                    style={{ fontFamily: "xkcd, cursive" }}
                >
                    {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <span className="truncate text-base font-semibold text-neutral-900">{repo}</span>
                        <DomainPill domain={mover.domain} />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-neutral-400">来自 {owner}</p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-neutral-600">
                        {mover.description || "这个项目还没有写简介"}
                    </p>
                </div>
            </div>

            <div className="mt-3 flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-emerald-600">{formatDelta(mover.newStars)}</span>
                    <span className="text-[11px] text-neutral-500">关注 · 本周</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">共 {formatCount(mover.totalStars)}</span>
                </div>
            </div>
        </Link>
    )
}

export default function StarboardHome() {
    const [activeDomain, setActiveDomain] = useState<Domain | "全部">("全部")

    const filtered = useMemo(
        () => (activeDomain === "全部" ? movers : movers.filter((m) => m.domain === activeDomain)),
        [activeDomain],
    )

    const availableDomains = useMemo(() => {
        const counts = new Map<Domain, number>()
        for (const m of movers) counts.set(m.domain, (counts.get(m.domain) ?? 0) + 1)
        return DOMAINS.filter((d) => (counts.get(d) ?? 0) > 0).map((d) => ({ domain: d, count: counts.get(d) ?? 0 }))
    }, [])

    const aiCount = movers.filter((m) => m.domain === "AI").length
    const top = movers[0]
    const perHour = top ? Math.round(top.newStars / (7 * 24)) : 0

    return (
        <section className="w-full">
            <div className="mx-auto w-full max-w-6xl px-4 pt-10 pb-6 text-center">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3 py-1 text-[11px] text-neutral-600">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isStale ? "bg-amber-500" : "animate-pulse bg-emerald-500"}`} />
                    数据周期 · {weeklyRanking.updated_at}
                </div>
                {isStale && (
                    <p className="mb-1 text-[11px] text-amber-600">当前展示的是最近一次完整统计周期，最新一周仍在采集。</p>
                )}

                <h1 className="text-3xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-4xl md:text-5xl" style={{ fontFamily: "xkcd, cursive" }}>
                    现在什么技术在起飞？
                </h1>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:text-base">
                    不用搜、不用注册。打开就能看到全球开源项目里，谁在涨、涨多快。
                </p>
            </div>

            <div className="mx-auto w-full max-w-6xl px-4">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                        onClick={() => setActiveDomain("全部")}
                        className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-medium transition-colors ${
                            activeDomain === "全部"
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900"
                        }`}
                    >
                        全部 <span className="opacity-60">{movers.length}</span>
                    </button>
                    {availableDomains.map(({ domain, count }) => (
                        <button
                            key={domain}
                            onClick={() => setActiveDomain(domain)}
                            className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-medium transition-colors ${
                                activeDomain === domain
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-900"
                            }`}
                        >
                            {domain} <span className="opacity-60">{count}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="mx-auto mt-6 w-full max-w-6xl px-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filtered.map((m, i) => (
                        <MoverCard key={m.name} mover={m} index={i} />
                    ))}
                </div>

                {filtered.length === 0 && (
                    <p className="py-12 text-center text-sm text-neutral-500">这个领域本周没有进入前 20 的项目。</p>
                )}
            </div>

            <div className="mx-auto mt-10 w-full max-w-6xl px-4">
                <div className="rounded-xl border-2 border-neutral-900 bg-[#FFFDF5] p-5">
                    <h2 className="text-base font-bold text-neutral-900" style={{ fontFamily: "xkcd, cursive" }}>
                        这些数字意味着什么？
                    </h2>
                    <ul className="mt-3 space-y-2 text-[13px] leading-6 text-neutral-700">
                        <li className="flex gap-2">
                            <span className="text-emerald-600">●</span>
                            <span>
                                这个周期涨得最快的 20 个项目里，有 <strong>{aiCount}</strong> 个是 AI 相关——这是当下最集中的技术方向。
                            </span>
                        </li>
                        {top && (
                            <li className="flex gap-2">
                                <span className="text-emerald-600">●</span>
                                <span>
                                    第一名 <strong>{prettyRepoName(top.name).repo}</strong> 一周新增{" "}
                                    <strong>{top.newStars.toLocaleString("en-US")}</strong> 个关注，平均每小时约{" "}
                                    <strong>{perHour}</strong> 个。
                                </span>
                            </li>
                        )}
                        <li className="flex gap-2">
                            <span className="text-emerald-600">●</span>
                            <span>
                                我们持续追踪 <strong>{totalTracked.toLocaleString("en-US")}</strong> 个关注数超过 5 万的项目，
                                相当于全站仅有的 <strong>{tier50k.toLocaleString("en-US")}</strong> 个「头部项目」。
                            </span>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    )
}
