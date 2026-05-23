import { Alert, ButtonLink, Card, CardContent, CardHeader } from "../components/ui.js"

export const ResultRoute = ({ title, message, ok = true }: { title: string; message: string; ok?: boolean }) => (
	<Card className="w-full">
		<CardHeader>
			<Alert ok={ok}>{message}</Alert>
			<h1 className="m-0 text-2xl font-semibold tracking-tight">{title}</h1>
		</CardHeader>
		<CardContent>
			<ButtonLink href="/">Back</ButtonLink>
		</CardContent>
	</Card>
)
