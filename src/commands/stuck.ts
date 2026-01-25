import { type CommandInteraction, TextDisplay } from "@buape/carbon"
import BaseCommand from "./base.js"

const stuckLink = "https://docs.clawd.bot/help/faq#im-stuck-whats-the-fastest-way-to-get-unstuck"

export default class StuckCommand extends BaseCommand {
	name = "stuck"
	description = "Share the fastest way to get unstuck"

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplay(
					`The fastest way to get your problem solved is to follow the instructions here: ${stuckLink}`
				)
			]
		})
	}
}
