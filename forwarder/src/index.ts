import { Client } from "@buape/carbon"
import {
	GatewayForwarderPlugin,
	GatewayIntents
} from "@buape/carbon/gateway-forwarder"

const {
	BASE_URL,
	DEPLOY_SECRET,
	DISCORD_CLIENT_ID,
	DISCORD_PUBLIC_KEY,
	DISCORD_BOT_TOKEN,
	FORWARDER_PRIVATE_KEY
} = Bun.env

if (
	!BASE_URL ||
	!DEPLOY_SECRET ||
	!DISCORD_CLIENT_ID ||
	!DISCORD_PUBLIC_KEY ||
	!DISCORD_BOT_TOKEN ||
	!FORWARDER_PRIVATE_KEY
) {
	throw new Error("Missing required forwarder env vars")
}

const forwarderFetch = async (input: string | URL | Request, init?: RequestInit) => {
	const startedAt = Date.now()
	const headers = new Headers(init?.headers)
	const eventId = headers.get("X-Carbon-Forwarder-Event-Id") ?? "unknown"
	const eventType = eventId.split(":")[0] || "unknown"
	const attempt = headers.get("X-Carbon-Forwarder-Attempt") ?? "unknown"
	const url = input instanceof Request ? input.url : input.toString()

	console.log(`[gateway-forwarder] sending ${eventType} attempt=${attempt} url=${url}`)

	try {
		const response = await fetch(input, init)
		console.log(
			`[gateway-forwarder] sent ${eventType} status=${response.status} attempt=${attempt} duration=${Date.now() - startedAt}ms`
		)
		return response
	} catch (error) {
		console.error(
			`[gateway-forwarder] failed ${eventType} attempt=${attempt} duration=${Date.now() - startedAt}ms`,
			error
		)
		throw error
	}
}

const client = new Client(
	{
		baseUrl: BASE_URL,
		deploySecret: DEPLOY_SECRET,
		clientId: DISCORD_CLIENT_ID,
		publicKey: DISCORD_PUBLIC_KEY,
		token: DISCORD_BOT_TOKEN
	},
	{},
	[
		new GatewayForwarderPlugin({
			intents:
				GatewayIntents.Guilds |
				GatewayIntents.GuildMessages |
				GatewayIntents.MessageContent,
			webhookUrl: `${BASE_URL}/events`,
			privateKey: FORWARDER_PRIVATE_KEY,
			fetch: forwarderFetch
		})
	]
)

console.log(`Gateway forwarder ready to forward events to ${BASE_URL}/events`)
