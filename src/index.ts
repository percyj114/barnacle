import { Client } from "@buape/carbon"
import { GatewayIntents, GatewayPlugin } from "@buape/carbon/gateway"
import { createServer } from "@buape/carbon/adapters/bun"
import GithubCommand from "./commands/github.js"
import ApplicationAuthorized from "./events/authorized.js"
import AutoModerationActionExecution from "./events/autoModerationActionExecution.js"
import Ready from "./events/ready.js"

const gateway = new GatewayPlugin({
	intents:
		GatewayIntents.Guilds |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent |
		GatewayIntents.AutoModerationExecution
})

const client = new Client(
	{
		baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
		deploySecret: process.env.DEPLOY_SECRET ?? "unused",
		clientId: process.env.DISCORD_CLIENT_ID ?? "unused",
		publicKey: process.env.DISCORD_PUBLIC_KEY ?? "unused",
		token: process.env.DISCORD_BOT_TOKEN ?? "",
		autoDeploy: true,
		devGuilds: process.env.DISCORD_DEV_GUILDS?.split(","), // Optional: comma-separated list of dev guild IDs
	},
	{
		commands: [new GithubCommand()],
		listeners: [
			new ApplicationAuthorized(),
			new AutoModerationActionExecution(),
			new Ready()
		],
	},
	[gateway]
)

createServer(client, { port: 3000 })

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			BASE_URL: string;
			DEPLOY_SECRET: string;
			DISCORD_CLIENT_ID: string;
			DISCORD_PUBLIC_KEY: string;
			DISCORD_BOT_TOKEN: string;
		}
	}
}