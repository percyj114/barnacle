import { type CommandInteraction, TextDisplay } from "@buape/carbon"
import BaseCommand from "./base.js"

const stuckLink = "https://docs.clawd.bot/help/faq#im-stuck-whats-the-fastest-way-to-get-unstuck"

export default class HelpCommand extends BaseCommand {
	name = "help"
	description = "Share help instructions"

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplay(
					`Use #help for help, but also, The fastest way to get your problem solved is to follow the instructions here: ${stuckLink}`
				)
			]
		})
	}
}
