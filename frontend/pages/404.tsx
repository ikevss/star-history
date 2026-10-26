import Head from "next/head"
import Link from "next/link"
import type { GetStaticProps, NextPage } from "next"
import { formatNumber } from "../helpers/format"
import { loadRepos } from "@shared/common/repo-data"
import PageShell from "../components/PageShell"

interface NotFoundProps {
    minStars: number
}

const NotFound: NextPage<NotFoundProps> = ({ minStars }) => {
    const title = "页面不存在 · Starboard"

    return (
        <>
            <Head>
                <title>{title}</title>
                <meta name="robots" content="noindex" />
            </Head>
            <PageShell>
                <div className="w-full max-w-2xl overflow-hidden rounded-2xl border-2 border-neutral-900 bg-white shadow-[4px_4px_0_0_#363636]">
                    <div className="px-5 py-14 text-center">
                        <p className="mb-3 text-4xl" role="img" aria-label="望远镜">🔭</p>
                        <h1 className="text-lg font-semibold text-neutral-800" style={{ fontFamily: "xkcd, cursive" }}>
                            这个页面走丢了
                        </h1>
                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                            我们目前只收录关注数超过 {formatNumber(minStars)} 的开源项目，你想看的项目可能还没进榜。
                        </p>
                        <Link
                            href="/"
                            className="mt-6 inline-flex items-center rounded-lg border-2 border-neutral-900 bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
                        >
                            返回首页看看什么在起飞
                        </Link>
                    </div>
                </div>
            </PageShell>
        </>
    )
}

export const getStaticProps: GetStaticProps<NotFoundProps> = async () => {
    const { min_stars: minStars } = loadRepos()
    return { props: { minStars } }
}

export default NotFound
