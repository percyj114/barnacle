import type { ComponentPropsWithoutRef, ReactNode } from "react"

export const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(" ")

export const Card = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
	<div
		className={cn(
			"rounded-lg border border-border bg-card text-card-foreground shadow-md",
			className
		)}
		{...props}
	/>
)

export const CardHeader = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
	<div className={cn("flex flex-col space-y-2 p-6 pb-5", className)} {...props} />
)

export const CardTitle = ({ className, ...props }: ComponentPropsWithoutRef<"h2">) => (
	<h2 className={cn("m-0 text-2xl font-semibold tracking-tight", className)} {...props} />
)

export const CardDescription = ({ className, ...props }: ComponentPropsWithoutRef<"p">) => (
	<p className={cn("m-0 text-sm text-muted-foreground", className)} {...props} />
)

export const CardContent = ({ className, ...props }: ComponentPropsWithoutRef<"div">) => (
	<div className={cn("px-6 pb-6 pt-0", className)} {...props} />
)

export const Button = ({ className, ...props }: ComponentPropsWithoutRef<"button">) => (
	<button
		className={cn(
			"inline-flex h-11 items-center justify-center rounded-lg border border-primary/30 bg-accent px-5 py-2 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-50",
			className
		)}
		{...props}
	/>
)

export const ButtonLink = ({ className, ...props }: ComponentPropsWithoutRef<"a">) => (
	<a
		className={cn(
			"inline-flex h-11 items-center justify-center rounded-lg border border-primary/30 bg-accent px-5 py-2 text-sm font-semibold text-primary no-underline transition-colors hover:border-primary/50 hover:bg-primary/15",
			className
		)}
		{...props}
	/>
)

export const Input = ({ className, ...props }: ComponentPropsWithoutRef<"input">) => (
	<input
		className={cn(
			"flex h-12 w-full rounded-lg border border-input bg-secondary px-4 py-3 text-base ring-offset-background transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
			className
		)}
		{...props}
	/>
)

export const Textarea = ({ className, ...props }: ComponentPropsWithoutRef<"textarea">) => (
	<textarea
		className={cn(
			"flex min-h-28 w-full rounded-lg border border-input bg-secondary px-4 py-3 text-base ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
			className
		)}
		{...props}
	/>
)

export const Select = ({ className, children, ...props }: ComponentPropsWithoutRef<"select"> & { children: ReactNode }) => (
	<select
		className={cn(
			"flex h-12 w-full rounded-lg border border-input bg-secondary px-4 py-3 text-base ring-offset-background transition-colors focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
			className
		)}
		{...props}
	>
		{children}
	</select>
)

export const Label = ({ className, ...props }: ComponentPropsWithoutRef<"label">) => (
	<label className={cn("text-sm font-medium leading-none", className)} {...props} />
)

export const Alert = ({ children, ok = false }: { children: ReactNode; ok?: boolean }) => (
	<div
		className={cn(
			"mb-4 rounded-lg border p-4 text-sm",
			ok
				? "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
				: "border-destructive/50 bg-destructive/10 text-red-100"
		)}
	>
		{children}
	</div>
)
