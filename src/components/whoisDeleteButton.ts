import {
	Button,
	type ButtonInteraction,
	ButtonStyle,
	type ComponentData,
	Container,
	PermissionFlagsBits,
	TextDisplay
} from "@buape/carbon"

const hasManageMessages = (interaction: ButtonInteraction) => {
	const permissions = interaction.rawData.member?.permissions
	if (!permissions) {
		return false
	}

	return (BigInt(permissions) & PermissionFlagsBits.ManageMessages) === PermissionFlagsBits.ManageMessages
}

export class WhoisDeleteButton extends Button {
	customId = "whois-delete"
	label = "Delete"
	emoji = { name: "🗑️" }
	style = ButtonStyle.Danger
	ephemeral = true

	constructor(ownerId?: string) {
		super()
		if (ownerId) {
			this.customId = `whois-delete:ownerId=s${ownerId}`
		}
	}

	async run(interaction: ButtonInteraction, data: ComponentData) {
		const ownerId =
			typeof data.ownerId === "string" && data.ownerId.startsWith("s")
				? data.ownerId.slice(1)
				: null
		const userId = interaction.user?.id ?? interaction.userId

		if (userId !== ownerId && !hasManageMessages(interaction)) {
			await interaction.reply({
				components: [
					new Container([
						new TextDisplay("Only the command user or someone with Manage Messages can delete this.")
					], { accentColor: "#f85149" })
				],
				ephemeral: true,
				allowedMentions: { parse: [] }
			})
			return
		}

		await interaction.acknowledge()
		await interaction.message?.delete().catch(() => null)
	}
}

export const whoisDeleteComponents = [new WhoisDeleteButton()]
