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
		const message = user
			? `${this.formatMention(user.id)}${this.lowercaseFirstLetter(this.message)}`
			: this.message

		await interaction.reply({
			content: message
		})
	}

	private formatMention(userId: string) {
		return `<@${userId}>, `
	}

	private lowercaseFirstLetter(message: string) {
		const match = message.match(/[A-Za-z]/)
		if (match?.index === undefined) {
			return message
		}

		const index = match.index
		return `${message.slice(0, index)}${message.charAt(index).toLowerCase()}${message.slice(index + 1)}`
	}
}
