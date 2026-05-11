import type { Client } from "@buape/carbon"

const clawtributorsRoleId = "1458375944111915051"
const githubOwner = "openclaw"
const githubRepo = "openclaw"
const discordApiBase = "https://discord.com/api/v10"
const stateTtlMs = 10 * 60 * 1000

type ClaimStatePayload = {
	userId: string
	guildId: string
	expiresAt: number
}

type DiscordTokenResponse = {
	access_token?: string
	token_type?: string
}

type DiscordUser = {
	id?: string
}

type DiscordConnection = {
	type?: string
	name?: string
	verified?: boolean
}

type GitHubSearchResponse = {
	total_count?: number
}

const text = (body: string, init?: ResponseInit) =>
	new Response(body, {
		...init,
		headers: {
			"content-type": "text/plain; charset=utf-8",
			...init?.headers
		}
	})

const encodeBase64Url = (value: ArrayBuffer | string) => {
	const bytes =
		typeof value === "string"
			? new TextEncoder().encode(value)
			: new Uint8Array(value)
	let binary = ""

	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}

	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "")
}

const decodeBase64Url = (value: string) => {
	const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
		Math.ceil(value.length / 4) * 4,
		"="
	)
	const binary = atob(padded)
	const bytes = new Uint8Array(binary.length)

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}

	return new TextDecoder().decode(bytes)
}

const getStateSecret = () =>
	process.env.CLAIM_STATE_SECRET ?? process.env.DEPLOY_SECRET

const getBaseUrl = () => process.env.BASE_URL?.replace(/\/$/, "")

const getClaimRoleId = () =>
	process.env.CLAWTRIBUTORS_ROLE_ID ?? clawtributorsRoleId

const sign = async (payload: string) => {
	const secret = getStateSecret()
	if (!secret) {
		throw new Error("CLAIM_STATE_SECRET or DEPLOY_SECRET is required")
	}

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"]
	)
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(payload)
	)

	return encodeBase64Url(signature)
}

export const createClaimState = async (userId: string, guildId: string) => {
	const payload: ClaimStatePayload = {
		userId,
		guildId,
		expiresAt: Date.now() + stateTtlMs
	}
	const encodedPayload = encodeBase64Url(JSON.stringify(payload))
	const signature = await sign(encodedPayload)

	return `${encodedPayload}.${signature}`
}

export const createClaimUrl = async (userId: string, guildId: string) => {
	const baseUrl = getBaseUrl()
	if (!baseUrl) {
		throw new Error("BASE_URL is required")
	}

	const url = new URL("/claim", baseUrl)
	url.searchParams.set("state", await createClaimState(userId, guildId))

	return url.toString()
}

const verifyClaimState = async (state: string): Promise<ClaimStatePayload | null> => {
	const [encodedPayload, signature] = state.split(".")
	if (!encodedPayload || !signature) {
		return null
	}

	const expectedSignature = await sign(encodedPayload)
	if (signature !== expectedSignature) {
		return null
	}

	try {
		const payload = JSON.parse(decodeBase64Url(encodedPayload)) as ClaimStatePayload
		if (
			typeof payload.userId !== "string" ||
			typeof payload.guildId !== "string" ||
			typeof payload.expiresAt !== "number" ||
			payload.expiresAt < Date.now()
		) {
			return null
		}

		return payload
	} catch {
		return null
	}
}

const oauthRedirectUri = () => {
	const baseUrl = getBaseUrl()
	if (!baseUrl) {
		throw new Error("BASE_URL is required")
	}

	return new URL("/claim/callback", baseUrl).toString()
}

const redirectToDiscordOauth = (state: string) => {
	const url = new URL(`${discordApiBase}/oauth2/authorize`)
	url.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID)
	url.searchParams.set("redirect_uri", oauthRedirectUri())
	url.searchParams.set("response_type", "code")
	url.searchParams.set("scope", "identify connections")
	url.searchParams.set("state", state)

	return Response.redirect(url.toString(), 302)
}

const fetchDiscordToken = async (code: string) => {
	const clientSecret = process.env.DISCORD_CLIENT_SECRET
	if (!clientSecret) {
		throw new Error("DISCORD_CLIENT_SECRET is required")
	}

	const response = await fetch(`${discordApiBase}/oauth2/token`, {
		method: "POST",
		headers: {
			"content-type": "application/x-www-form-urlencoded"
		},
		body: new URLSearchParams({
			client_id: process.env.DISCORD_CLIENT_ID,
			client_secret: clientSecret,
			grant_type: "authorization_code",
			code,
			redirect_uri: oauthRedirectUri()
		})
	})

	if (!response.ok) {
		return null
	}

	return (await response.json()) as DiscordTokenResponse
}

const fetchDiscordUser = async (accessToken: string) => {
	const response = await fetch(`${discordApiBase}/users/@me`, {
		headers: { authorization: `Bearer ${accessToken}` }
	})

	if (!response.ok) {
		return null
	}

	return (await response.json()) as DiscordUser
}

const fetchDiscordConnections = async (accessToken: string) => {
	const response = await fetch(`${discordApiBase}/users/@me/connections`, {
		headers: { authorization: `Bearer ${accessToken}` }
	})

	if (!response.ok) {
		return null
	}

	return (await response.json()) as DiscordConnection[]
}

const hasMergedPullRequest = async (githubUsername: string) => {
	const query = new URLSearchParams({
		q: `repo:${githubOwner}/${githubRepo} is:pr is:merged author:${githubUsername}`,
		per_page: "1"
	})
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "hermit"
	}

	if (process.env.GITHUB_TOKEN) {
		headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
	}

	const response = await fetch(
		`https://api.github.com/search/issues?${query.toString()}`,
		{ headers }
	)

	if (!response.ok) {
		return false
	}

	const data = (await response.json()) as GitHubSearchResponse
	return (data.total_count ?? 0) > 0
}

const addClawtributorsRole = async (guildId: string, userId: string) => {
	const response = await fetch(
		`${discordApiBase}/guilds/${guildId}/members/${userId}/roles/${getClaimRoleId()}`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
			}
		}
	)

	return response.ok || response.status === 204
}

const renderResult = (title: string, message: string, status = 200) =>
	new Response(
		`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 2rem; max-width: 42rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <h1>${title}</h1>
    <p>${message}</p>
  </body>
</html>`,
		{
			status,
			headers: {
				"content-type": "text/html; charset=utf-8"
			}
		}
	)

const handleClaimCallback = async (request: Request) => {
	const url = new URL(request.url)
	const state = url.searchParams.get("state")
	const code = url.searchParams.get("code")

	if (!state || !code) {
		return text("Missing OAuth code or state.", { status: 400 })
	}

	const payload = await verifyClaimState(state)
	if (!payload) {
		return renderResult("Claim link expired", "Run /claim in Discord again to get a fresh link.", 400)
	}

	const token = await fetchDiscordToken(code)
	const accessToken = token?.access_token
	if (!accessToken) {
		return renderResult("Discord authorization failed", "Please run /claim and try again.", 400)
	}

	const user = await fetchDiscordUser(accessToken)
	if (user?.id !== payload.userId) {
		return renderResult("Wrong Discord account", "Use the same Discord account that ran /claim.", 403)
	}

	const connections = await fetchDiscordConnections(accessToken)
	if (!connections) {
		return renderResult("Could not read connections", "Please run /claim and authorize connections access again.", 400)
	}

	const githubUsernames = connections
		.filter(
			(connection) =>
				connection.type === "github" &&
				connection.verified !== false &&
				typeof connection.name === "string" &&
				connection.name.length > 0
		)
		.map((connection) => connection.name as string)

	if (githubUsernames.length === 0) {
		return renderResult("No GitHub connection found", "Connect GitHub to Discord, then run /claim again.", 403)
	}

	const qualifies = (
		await Promise.all(
			githubUsernames.map((username) => hasMergedPullRequest(username))
		)
	).some(Boolean)

	if (!qualifies) {
		return renderResult(
			"Not eligible yet",
			`No merged pull request was found in ${githubOwner}/${githubRepo} for your linked GitHub account.`,
			403
		)
	}

	const roleAdded = await addClawtributorsRole(payload.guildId, payload.userId)
	if (!roleAdded) {
		return renderResult("Could not add role", "The bot could not add the clawtributors role. Ask a moderator to check bot permissions.", 500)
	}

	return renderResult("Role claimed", "You now have the clawtributors role.")
}

export const registerClaimRoutes = (client: Client) => {
	client.routes.push(
		{
			method: "GET",
			path: "/claim",
			handler: async (request) => {
				const state = new URL(request.url).searchParams.get("state")
				if (!state || !(await verifyClaimState(state))) {
					return renderResult("Claim link expired", "Run /claim in Discord again to get a fresh link.", 400)
				}

				return redirectToDiscordOauth(state)
			}
		},
		{
			method: "GET",
			path: "/claim/callback",
			handler: handleClaimCallback
		}
	)
}
