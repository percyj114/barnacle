import { type CommandInteraction, TextDisplay } from "@buape/carbon"
import BaseCommand from "./base.js"

const guideLink = "https://discord.com/channels/1456350064065904867/@home"

export default class GuideCommand extends BaseCommand {
	name = "guide"
	description = "Share the server guide"

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplay(`➡️ [SERVER GUIDE](${guideLink})`)
			]
		})
	}
}
