import { Client } from "@buape/carbon"
import { GatewayIntents, GatewayPlugin } from "@buape/carbon/gateway"
import { createServer } from "@buape/carbon/adapters/bun"
import GithubCommand from "./commands/github.js"
import GuideCommand from "./commands/guide.js"
import HelpCommand from "./commands/help.js"
import ModelCommand from "./commands/model.js"
import ServerFaqCommand from "./commands/serverFaq.js"
import StuckCommand from "./commands/stuck.js"
import ApplicationAuthorized from "./events/authorized.js"
import AutoModerationActionExecution from "./events/autoModerationActionExecution.js"
import Ready from "./events/ready.js"

const gateway = new GatewayPlugin({
	intents:
		GatewayIntents.Guilds |
		GatewayIntents.GuildMessages |
		GatewayIntents.MessageContent |
		GatewayIntents.AutoModerationExecution,
	autoInteractions: true
})

const client = new Client(
	{
		baseUrl: "http://localhost:3000",
		deploySecret: "unused",
		clientId: process.env.DISCORD_CLIENT_ID,
		publicKey: "unused",
		token: process.env.DISCORD_BOT_TOKEN,
		autoDeploy: true,
		disableDeployRoute: true,
		disableInteractionsRoute: true,
		disableEventsRoute: true,
		devGuilds: process.env.DISCORD_DEV_GUILDS?.split(","), // Optional: comma-separated list of dev guild IDs
	},
	{
		commands: [
			new GithubCommand(),
			new GuideCommand(),
			new HelpCommand(),
			new ModelCommand(),
			new ServerFaqCommand(),
			new StuckCommand()
		],
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