import { NextPage } from "next"
import { AppProps } from "next/app"
import "../global.css"
import "@fortawesome/fontawesome-free/css/all.css"
import Head from "next/head"
import Script from "next/script"
import ErrorBoundary from "../components/ErrorBoundary"
import { AppStateProvider } from "../store"

export type NextPageWithLayout = NextPage & {
    getLayout?: (_page: React.ReactElement) => React.ReactNode
}

type AppPropsWithLayout = AppProps & {
    Component: NextPageWithLayout
}

const MyApp = ({ Component, pageProps }: AppPropsWithLayout) => {
    // Use the layout defined at the page level, if available
    const getLayout = Component.getLayout ?? ((page) => page)
    return (
        <>
            <Head>
                <link rel="icon" href="/assets/favicon.ico" />
            </Head>
            {process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && (
                <Script defer data-domain={process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.js" strategy="afterInteractive" />
            )}
            <AppStateProvider>
                <ErrorBoundary>
                    {getLayout(<Component {...pageProps} />)}
                </ErrorBoundary>
            </AppStateProvider>
        </>
    )
}

export default MyApp
