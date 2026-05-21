import {
	ApplicationCommandOptionType,
	ApplicationIntegrationType,
	Button,
	ButtonStyle,
	ChannelType,
	type CommandInteraction,
	CommandWithSubcommandGroups,
	CommandWithSubcommands,
	Container,
	InteractionContextType,
	LinkButton,
	Row,
	Routes,
	Separator,
	TextDisplay,
	type APIMessage,
	type ApplicationCommandOptionAllowedChannelType
} from "@buape/carbon"
import BaseCommand from "./base.js"
import {
	FscRequestNoButton,
	FscRequestYesButton
} from "../components/fscRequestButtons.js"
import { WhoisDeleteButton } from "../components/whoisDeleteButton.js"
import {
	addFscUserToChannel,
	buildFscContainer,
	buildFscRequestContainer,
	createFscChannel,
	fscCategoryId,
	fscRequestChannelId,
	isFscChannel,
	shadowUserId
} from "../utils/fsc.js"

const maintainerRoleId = "1457214688806047756"
const whoisGuildId = "1456350064065904867"
const whoisChannelId = "1482394321100476426"
const fscAddUserOptions = [
	{
		type: ApplicationCommandOptionType.Channel as const,
		name: "channel",
		description: "The Fake Slack Connect channel",
		required: true,
		channel_types: [ChannelType.GuildText as ApplicationCommandOptionAllowedChannelType]
	},
	{
		type: ApplicationCommandOptionType.User as const,
		name: "user",
		description: "The verified user to add",
		required: true
	}
]

const hasMaintainerRole = (interaction: CommandInteraction) =>
	interaction.member?.roles.some((role) => role.id === maintainerRoleId) ?? false

const maintainerRolePreCheck = async (interaction: CommandInteraction) => {
	if (hasMaintainerRole(interaction)) {
		return true
	}

	await interaction.reply({
		components: [
			buildFscContainer("Maintainer role required", [
				`You need <@&${maintainerRoleId}> to use this command.`
			], "#f85149")
		],
		ephemeral: true,
		allowedMentions: { parse: [] }
	})
	return false
}

class JumpToIntroductionButton extends LinkButton {
	label = "Jump to post"
	url: string

	constructor(url: string) {
		super()
		this.url = url
	}
}

class PromptButton extends Button {
	customId: string
	label: string
	style: ButtonStyle

	constructor(customId: string, label: string, style: ButtonStyle) {
		super()
		this.customId = customId
		this.label = label
		this.style = style
	}

	run() { }
}

export default class MaintainerCommand extends CommandWithSubcommandGroups {
	name = "maintainer"
	description = "Maintainer commands"
	integrationTypes = [ApplicationIntegrationType.GuildInstall]
	contexts = [InteractionContextType.Guild]
	ephemeral = true
	subcommandGroups = [new MaintainerFsc()]
	subcommands = [new MaintainerWhois()]
}

export class MaintainerFsc extends CommandWithSubcommands {
	name = "fsc"
	description = "Fake Slack Connect commands"
	ephemeral = true
	subcommands = [new MaintainerFscAddUser(), new MaintainerFscRequestChannel()]
}

export class MaintainerFscAddUser extends BaseCommand {
	name = "add-user"
	description = "Add a verified user to a Fake Slack Connect channel"
	ephemeral = true
	preCheck = maintainerRolePreCheck

	options = fscAddUserOptions

	async run(interaction: CommandInteraction) {
		const channel = await interaction.options.getChannel("channel", true)
		const user = interaction.options.getUser("user", true)

		if (!(await isFscChannel(interaction.client, channel.id))) {
			await interaction.reply({
				components: [
					buildFscContainer("Invalid Fake Slack Connect channel", [
						`Only channels under <#${fscCategoryId}> can be used.`
					], "#f85149")
				]
			})
			return
		}

		const result = await interaction.replyAndWaitForComponent({
			components: [
				new Container(
					[
						new TextDisplay("### Confirm Fake Slack Connect access"),
						new TextDisplay(
							`Have you fully verified that <@${user.id}> is definitely part of the group <#${channel.id}> is designated for?`
						),
						new Separator({ divider: true, spacing: "small" }),
						new Row([
							new PromptButton("fsc-add-user-yes", "Yes", ButtonStyle.Success),
							new PromptButton("fsc-add-user-no", "No", ButtonStyle.Danger)
						])
					],
					{ accentColor: "#f1c40f" }
				)
			],
			ephemeral: true,
			allowedMentions: { parse: [] }
		}, 5 * 60 * 1000)

		if (!result.success) {
			await result.message.edit({
				components: [buildFscContainer("Confirmation timed out", ["No permissions were changed."], "#f85149")]
			}).catch(() => null)
			return
		}

		if (result.customId !== "fsc-add-user-yes") {
			await result.message.edit({
				components: [buildFscContainer("Cancelled", ["No permissions were changed."], "#f85149")]
			}).catch(() => null)
			return
		}

		try {
			const actorId = interaction.user?.id ?? interaction.userId ?? shadowUserId
			await addFscUserToChannel(interaction.client, channel.id, user.id)
			const targetChannel = await interaction.client.fetchChannel(channel.id)
			if (targetChannel && "send" in targetChannel) {
				await targetChannel.send({
					content: `<@${actorId}> added <@${user.id}> to this channel!`,
					allowedMentions: { users: [actorId, user.id] }
				})
			}
			await result.message.edit({
				components: [buildFscContainer("User added", [`Added <@${user.id}> to <#${channel.id}>.`], "#3fb950")],
				allowedMentions: { parse: [] }
			}).catch(() => null)
		} catch (error) {
			await result.message.edit({
				components: [buildFscContainer("Could not add user", [error instanceof Error ? error.message : "Unknown error."], "#f85149")]
			}).catch(() => null)
		}
	}
}

export class MaintainerFscRequestChannel extends BaseCommand {
	name = "request-channel"
	description = "Request a new Fake Slack Connect channel"
	ephemeral = true
	preCheck = maintainerRolePreCheck

	options = [
		{
			type: ApplicationCommandOptionType.String as const,
			name: "name",
			description: "The requested Fake Slack Connect channel name",
			required: true,
			max_length: 90
		}
	]

	async run(interaction: CommandInteraction) {
		const name = interaction.options.getString("name", true)
		const requestChannel = await interaction.client.fetchChannel(fscRequestChannelId)
		if (!requestChannel || !("send" in requestChannel)) {
			await interaction.reply({
				components: [buildFscContainer("Request channel not found", [`Could not send to <#${fscRequestChannelId}>.`], "#f85149")]
			})
			return
		}

		await requestChannel.send({
			content: `<@${shadowUserId}>`,
			components: [
				new Container([
					...buildFscRequestContainer(interaction.user?.id ?? interaction.userId ?? shadowUserId, name).components,
					new Separator({ divider: true, spacing: "small" }),
					new Row([new FscRequestYesButton(), new FscRequestNoButton()])
				], { accentColor: "#f1c40f" })
			],
			allowedMentions: { users: [shadowUserId] }
		})

		await interaction.reply({
			components: [buildFscContainer("Request sent", [`Sent the request for **${name}** to <#${fscRequestChannelId}>.`], "#3fb950")]
		})
	}
}

export class MaintainerWhois extends BaseCommand {
	name = "whois"
	description = "Find a user's introduction post"
	ephemeral = (interaction: CommandInteraction) => !hasMaintainerRole(interaction)
	preCheck = maintainerRolePreCheck

	options = [
		{
			type: ApplicationCommandOptionType.User as const,
			name: "user",
			description: "The user to find",
			required: true
		}
	]

	async run(interaction: CommandInteraction) {
		const user = interaction.options.getUser("user", true)
		let before: string | undefined

		for (let page = 0; page < 30; page += 1) {
			const messages = (await interaction.client.rest.get(
				Routes.channelMessages(whoisChannelId),
				before ? { limit: 100, before } : { limit: 100 }
			)) as APIMessage[]

			const match = messages.find((message) => message.author.id === user.id)
			if (match) {
				const postUrl = `https://discord.com/channels/${whoisGuildId}/${whoisChannelId}/${match.id}`
				const content = match.content.trim() || "No text content."
				const snippet = content.length > 1000 ? `${content.slice(0, 999)}…` : content

				await interaction.reply({
					components: [
						new Container([
							new TextDisplay(`## <@${user.id}>'s introduction post\n\n${snippet}`),
							new Separator({ divider: true, spacing: "small" }),
							new Row([
								new JumpToIntroductionButton(postUrl),
								new WhoisDeleteButton(interaction.user?.id ?? interaction.userId ?? shadowUserId)
							])
						])
					],
					allowedMentions: { parse: [] }
				})
				return
			}

			if (messages.length < 100) {
				break
			}
			before = messages.at(-1)?.id
		}

		await interaction.reply({
			components: [new Container([new TextDisplay(`No introduction post by <@${user.id}> was found in <#${whoisChannelId}>.`)])],
			allowedMentions: { parse: [] }
		})
	}
}

export class AdminFscCreateChannel extends BaseCommand {
	name = "create-channel"
	description = "Create a Fake Slack Connect channel immediately"
	ephemeral = true

	options = [
		{
			type: ApplicationCommandOptionType.String as const,
			name: "name",
			description: "The Fake Slack Connect channel name",
			required: true,
			max_length: 90
		}
	]

	async run(interaction: CommandInteraction) {
		try {
			const guildId = interaction.rawData.guild_id
			if (!guildId) {
				throw new Error("This command can only be used in a server.")
			}
			const name = interaction.options.getString("name", true)
			const channelId = await createFscChannel(
				interaction.client,
				guildId,
				name,
				interaction.user?.id ?? interaction.userId ?? shadowUserId
			)
			await interaction.reply({
				components: [buildFscContainer("Channel created", [`Created <#${channelId}>.`], "#3fb950")]
			})
		} catch (error) {
			await interaction.reply({
				components: [buildFscContainer("Could not create channel", [error instanceof Error ? error.message : "Unknown error."], "#f85149")]
			})
		}
	}
}

export class AdminFscAddUser extends BaseCommand {
	name = "add-user"
	description = "Add a user to a Fake Slack Connect channel immediately"
	ephemeral = true

	options = fscAddUserOptions

	async run(interaction: CommandInteraction) {
		const channel = await interaction.options.getChannel("channel", true)
		const user = interaction.options.getUser("user", true)

		try {
			const actorId = interaction.user?.id ?? interaction.userId ?? shadowUserId
			await addFscUserToChannel(interaction.client, channel.id, user.id)
			const targetChannel = await interaction.client.fetchChannel(channel.id)
			if (targetChannel && "send" in targetChannel) {
				await targetChannel.send({
					content: `<@${actorId}> added <@${user.id}> to this channel!`,
					allowedMentions: { users: [actorId, user.id] }
				})
			}
			await interaction.reply({
				components: [buildFscContainer("User added", [`Added <@${user.id}> to <#${channel.id}>.`], "#3fb950")],
				allowedMentions: { parse: [] }
			})
		} catch (error) {
			await interaction.reply({
				components: [buildFscContainer("Could not add user", [error instanceof Error ? error.message : "Unknown error."], "#f85149")]
			})
		}
	}
}

export class AdminFsc extends CommandWithSubcommands {
	name = "fsc"
	description = "Fake Slack Connect admin commands"
	ephemeral = true
	subcommands = [new AdminFscCreateChannel(), new AdminFscAddUser()]
}
