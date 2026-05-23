import { getRuntimeEnv } from "../runtime/env.js"

const encoder = new TextEncoder()
const decoder = new TextDecoder()
const ttlMs = 15 * 60 * 1000

const toBase64Url = (value: string | ArrayBuffer) => {
	const bytes = typeof value === "string" ? encoder.encode(value) : new Uint8Array(value)
	let binary = ""
	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}
	return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

const fromBase64Url = (value: string) => {
	const binary = atob(
		value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
	)
	const bytes = new Uint8Array(binary.length)
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}
	return decoder.decode(bytes)
}

const sign = async (value: string) => {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(getRuntimeEnv().DEPLOY_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	)
	return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)))
}

export const createSignedToken = async (payload: Record<string, unknown>) => {
	const body = toBase64Url(JSON.stringify(payload))
	return `${body}.${await sign(body)}`
}

export const readSignedToken = async (token: string | null) => {
	if (!token) {
		return null
	}
	const [body, signature] = token.split(".")
	if (!body || !signature || signature !== await sign(body)) {
		return null
	}
	try {
		const payload = JSON.parse(fromBase64Url(body)) as Record<string, unknown>
		return typeof payload.expiresAt === "number" && payload.expiresAt >= Date.now()
			? payload
			: null
	} catch {
		return null
	}
}

export const createOAuthState = (formId: string, origin: string, provider: string) =>
	createSignedToken({ formId, origin, provider, expiresAt: Date.now() + ttlMs })

export const createSession = (input: {
	formId: string
	provider: string
	id: string
	username: string
}) =>
	createSignedToken({
		...input,
		expiresAt: Date.now() + 6 * ttlMs
	})

export const readSession = async (token: string | null, formId: string) => {
	const payload = await readSignedToken(token)
	if (
		!payload ||
		payload.formId !== formId ||
		typeof payload.provider !== "string" ||
		typeof payload.id !== "string" ||
		typeof payload.username !== "string"
	) {
		return null
	}
	return {
		provider: payload.provider,
		id: payload.id,
		username: payload.username
	}
}
