import { ApplicationCommandOptionType, type CommandInteraction } from "@buape/carbon"
import BaseCommand from "./base.js"

export default abstract class GotoCommand extends BaseCommand {
	options = [
		{
			name: "user",
			description: "User to mention",
			type: ApplicationCommandOptionType.User
		}
	]

	protected abstract message: string

	async run(interaction: CommandInteraction) {
		const user = interaction.options.getUser("user")
		const prefix = user ? `<@${user.id}>\n` : ""

		await interaction.reply({
			content: `${prefix}${this.message}`
		})
	}
}
