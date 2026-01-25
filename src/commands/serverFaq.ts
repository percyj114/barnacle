import { type CommandInteraction, TextDisplay } from "@buape/carbon"
import BaseCommand from "./base.js"

const guideLink = "https://discord.com/channels/1456350064065904867/@home"

export default class ServerFaqCommand extends BaseCommand {
	name = "server-faq"
	description = "Point to the server FAQ"

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplay(
					`Your question is answered in the server FAQ: [SERVER GUIDE](${guideLink})`
				)
			]
		})
	}
}
