import { type CommandInteraction, TextDisplay } from "@buape/carbon"
import BaseCommand from "./base.js"

export default class ModelCommand extends BaseCommand {
	name = "model"
	description = "Point to the model discussion channel"

	async run(interaction: CommandInteraction) {
		await interaction.reply({
			components: [
				new TextDisplay(
					"All discussion about models **must** be in <#1456704705219661980>."
				)
			]
		})
	}
}
