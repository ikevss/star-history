/* eslint-disable @next/next/no-img-element */
import React, { useMemo } from "react"
import InteractiveRadar from "./InteractiveRadar"
import { formatNumber } from "../helpers/format"
import { renderRadarSvg } from "@shared/packages/radar-svg"
import type { RepoCardData } from "@shared/types/gh"

const MONTHS = ["1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月", "8 月", "9 月", "10 月", "11 月", "12 月"]

function formatSince(iso: string | null): string {
    if (!iso) return ""
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ""
    return `始于 ${d.getUTCFullYear()} 年 ${MONTHS[d.getUTCMonth()]}`
}

function svgToDataUrl(svg: string): string {
    const bytes = new TextEncoder().encode(svg)
    let binary = ""
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    return `data:image/svg+xml;base64,${btoa(binary)}`
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
            <div className={`text-lg font-bold leading-6 ${accent ? "text-emerald-600" : "text-neutral-800"}`}>{value}</div>
            <div className="text-[11px] leading-4 text-neutral-500">{label}</div>
        </div>
    )
}

export default function RepoMobileCard({ repo }: { repo: RepoCardData }) {
    const hasAttributes = !!repo.attributes && Object.values(repo.attributes).some((v) => v > 0)
    const since = formatSince(repo.created_at)
    const meta = [repo.language, repo.license, since].filter(Boolean).join(" · ")

    const radarSrc = useMemo(() => {
        if (!repo.attributes || !hasAttributes) return null
        return svgToDataUrl(renderRadarSvg(repo.attributes, 400))
    }, [repo.attributes, hasAttributes])

    return (
        <div className="w-full rounded-2xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0_0_#363636]">
            <div className="flex items-start gap-3">
                <img
                    src={`https://avatars.githubusercontent.com/${repo.owner}?s=120`}
                    alt={repo.owner}
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-full border border-neutral-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                    <a
                        href={`https://github.com/${repo.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-base font-semibold text-neutral-900 hover:underline"
                    >
                        {repo.name}
                    </a>
                    {meta ? <div className="mt-0.5 truncate text-[11px] text-neutral-500">{meta}</div> : null}
                </div>
            </div>

            {repo.description ? (
                <p className="mt-3 text-sm leading-6 text-neutral-600">{repo.description}</p>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2">
                <Stat label="关注" value={formatNumber(repo.stars_total)} />
                <Stat label="复刻" value={formatNumber(repo.forks_count)} />
                <Stat label="本周提交" value={repo.raw ? `${repo.raw.pushes.toLocaleString("en-US")}` : "—"} accent />
                <Stat label="贡献者" value={repo.raw ? formatNumber(repo.raw.contributors) : "—"} />
            </div>

            {radarSrc && repo.attributes ? (
                <div className="relative mx-auto mt-4 aspect-square w-full max-w-[300px]">
                    <img src={radarSrc} alt="项目各维度表现" className="absolute inset-0 h-full w-full" />
                    <div className="absolute inset-0">
                        <InteractiveRadar
                            attributes={repo.attributes}
                            rawValues={{
                                stars: formatNumber(repo.stars_total),
                                forks: formatNumber(repo.forks_count),
                            }}
                        />
                    </div>
                </div>
            ) : null}

            <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-[11px] text-neutral-400">
                <span>
                    第 {repo.rank} / 共 {formatNumber(repo.total_repos)}
                </span>
                <span style={{ fontFamily: "xkcd, cursive" }}>Starboard</span>
            </div>
        </div>
    )
}
