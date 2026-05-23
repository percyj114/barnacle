import {
	Card,
	CardContent,
	CardDescription,
	CardHeader
} from "../components/ui.js"
import { getAvailableFormConfigs } from "../forms.js"

export const HomeRoute = () => (
	<Card className="w-full">
		<CardHeader>
			<h1 className="m-0 text-2xl font-semibold tracking-tight">OpenClaw Forms</h1>
		</CardHeader>
		<CardContent className="grid gap-3">
			{getAvailableFormConfigs().map((form) => (
				<a
					className="rounded-lg border border-border p-4 no-underline transition-colors hover:bg-accent hover:text-accent-foreground"
					href={`/${form.id}`}
					key={form.id}
				>
					<h2 className="m-0 text-base font-medium">{form.title}</h2>
					<CardDescription className="mt-1">{form.description}</CardDescription>
				</a>
			))}
		</CardContent>
	</Card>
)
