import { formConfigs as configuredFormConfigs } from "../../forms.config.js"
import type { FormAuthProvider, FormConfig } from "./types.js"

export const formConfigs = configuredFormConfigs

const redditConfigured = () => Boolean(process.env.REDDIT_OAUTH_CLIENT_ID && process.env.REDDIT_OAUTH_CLIENT_SECRET)

export const isFormAuthProviderAvailable = (provider: FormAuthProvider) => {
	if (provider === "reddit") {
		return redditConfigured()
	}
	return true
}

export const getFormAuthProviders = (form: FormConfig) => {
	const providers = Array.isArray(form.auth) ? form.auth : [form.auth]
	return providers.filter(isFormAuthProviderAvailable)
}

export const getAvailableFormConfigs = () =>
	formConfigs.filter((form) => getFormAuthProviders(form).length > 0)

export const renderFormText = (text: string, values?: Record<string, string>) =>
	text
		.replaceAll("{ACTION}", values?.action || values?.ACTION || "moderated")
		.replaceAll("{UNACTION}", values?.unaction || values?.UNACTION || "reviewed")

export const getFormConfig = (id: string) =>
	getAvailableFormConfigs().find((form) => form.id === id) ?? null
