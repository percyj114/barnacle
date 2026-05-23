import { getFormAuthProviders, renderFormText } from "../forms.js"
import type { FormConfig, FormField } from "../types.js"
import {
	Alert,
	Button,
	ButtonLink,
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	Input,
	Select,
	Textarea
} from "../components/ui.js"

const FieldInput = ({
	field,
	values
}: {
	field: FormField
	values?: Record<string, string>
}) => {
	if (field.type === "checkbox") {
		return <Input className="h-5 w-5 p-0" id={field.id} name={field.id} required={field.required} type="checkbox" value={field.value ?? "on"} />
	}
	if (field.type === "autofill") {
		return (
			<Input
				id={field.id}
				value={values?.[field.contextKey] ?? ""}
				placeholder={field.placeholder ? renderFormText(field.placeholder, values) : undefined}
				disabled
				readOnly
			/>
		)
	}
	if (field.type === "textarea") {
		return <Textarea id={field.id} name={field.id} required={field.required} placeholder={field.placeholder ? renderFormText(field.placeholder, values) : undefined} />
	}
	if (field.type === "select") {
		return (
			<Select id={field.id} name={field.id} required={field.required}>
				<option value="">Select one</option>
				{field.options.map((option) => <option key={option}>{option}</option>)}
			</Select>
		)
	}
	return <Input id={field.id} name={field.id} required={field.required} placeholder={field.placeholder ? renderFormText(field.placeholder, values) : undefined} />
}

const providerName = (provider: "discord" | "github" | "reddit") => {
	if (provider === "github") return "GitHub"
	if (provider === "reddit") return "Reddit"
	return "Discord"
}


export const AuthGateRoute = ({ form, error }: { form: FormConfig; error?: string }) => (
	<Card className="w-full">
		<CardHeader>
			{error ? <Alert>{error}</Alert> : null}
			<h1 className="m-0 text-2xl font-semibold tracking-tight">{form.title}</h1>
			<CardDescription>Sign in to continue.</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-wrap gap-3">
			{getFormAuthProviders(form).map((provider) => (
				<ButtonLink href={`/oauth/${provider}/start?form=${form.id}`} key={provider}>
					Sign in with {providerName(provider)}
				</ButtonLink>
			))}
		</CardContent>
	</Card>
)

export const FormRoute = ({
	form,
	session,
	user,
	values,
	error
}: {
	form: FormConfig
	session: string
	user: { username: string }
	values?: Record<string, string>
	error?: string
}) => (
	<Card className="w-full">
		<CardHeader>
			{error ? <Alert>{error}</Alert> : null}
			<h1 className="m-0 text-2xl font-semibold tracking-tight">{form.title}</h1>
			<CardDescription>Signed in as {user.username}</CardDescription>
		</CardHeader>
		<CardContent>
			<form className="grid gap-4" method="post" action={`/${form.id}/submit`}>
				<input type="hidden" name="session" value={session} />
				{form.fields.map((field) => (
					<section className="grid gap-2" key={field.id}>
						<label className="text-[0.9375rem] font-semibold leading-tight tracking-tight text-foreground" htmlFor={field.id}>
							{renderFormText(field.label, values)}
						</label>
						<FieldInput field={field} values={values} />
					</section>
				))}
				<Button className="w-fit" type="submit">Submit</Button>
			</form>
		</CardContent>
	</Card>
)
