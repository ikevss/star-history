import React from "react"
import Header from "../components/header"
import Footer from "../components/footer"
import RightSidebar from "../components/RightSidebar"
import RepoSearch from "../components/RepoSearch"
import StarboardHome from "../components/StarboardHome"
import type { NextPage } from "next"
import Head from "next/head"
import { SITE_URL } from "../helpers/consts"

const Index: NextPage = () => {
    const metadata = {
        title: "Starboard · 现在什么技术在起飞",
        description: "不用搜、不用注册，打开就能看到全球开源项目里谁在涨、涨多快。面向产品经理、投资人和 AI 从业者的技术热度雷达。",
        imageURL: `${SITE_URL}/assets/star-history-preview.webp`,
    }

    return (
        <>
            <Head>
                <title>{metadata.title}</title>
                <meta name="description" content={metadata.description} />

                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content={SITE_URL} />
                <meta property="og:title" content={metadata.title} />
                <meta property="og:description" content={metadata.description} />
                <meta property="og:image" content={metadata.imageURL} />

                {/* Twitter */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content={SITE_URL} />
                <meta name="twitter:title" content={metadata.title} />
                <meta name="twitter:description" content={metadata.description} />
                <meta name="twitter:image" content={metadata.imageURL} />
            </Head>
            <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-[#FFFDF7]">
                <Header />

                <main className="w-full grow">
                    <StarboardHome />

                    <section id="lookup" className="mx-auto mt-14 w-full max-w-3xl px-4">
                        <div className="text-center">
                            <h2 className="text-xl font-bold text-neutral-900" style={{ fontFamily: "xkcd, cursive" }}>
                                想查某个具体项目？
                            </h2>
                            <p className="mt-1 text-sm text-neutral-600">
                                输入项目名，看它从第一天到今天的完整增长曲线。
                            </p>
                        </div>
                        <RepoSearch />
                    </section>

                    <div className="mx-auto mt-10 hidden w-full max-w-md px-4 xl:block">
                        <RightSidebar />
                    </div>
                </main>

                <Footer />
            </div>
        </>
    )
}

export default Index
