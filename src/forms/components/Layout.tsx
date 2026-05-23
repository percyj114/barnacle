import type { ReactNode } from "react"
import { styles, stylesId } from "../styles.generated.js"

export const Layout = ({ title, children }: { title: string; children: ReactNode }) => (
	<html lang="en">
		<head>
			<meta charSet="utf-8" />
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<title>{title}</title>
			<meta name="forms-css-id" content={stylesId} />
			<style data-forms-css={stylesId}>{styles}</style>
		</head>
		<body>
			<main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
				{children}
			</main>
		</body>
	</html>
)
