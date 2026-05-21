import {
	MessageReactionAddListener,
	Routes,
	TextDisplay,
	type Client,
	type ListenerEventData
} from "@buape/carbon"
import {
	buildGitHubSummaryContainer,
	fetchGitHubSummaryData,
	parseGitHubIssueUrls
} from "../utils/githubSummary.js"

const summaryEmojiId = "1506891196436316261"
const deleteHint = "-# React with :x: to remove this message"
const issueNumberRegex = /#(\d{1,6})\b/g

const reactionRouteEmoji = (emoji: ListenerEventData["MESSAGE_REACTION_ADD"]["emoji"]) =>
	encodeURIComponent(emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name ?? "")

const hasDeleteHint = (components: unknown) =>
	JSON.stringify(components).includes(deleteHint)

const parseOpenClawPrNumbers = (content: string) => {
	const seen = new Set<number>()
	return [...content.matchAll(issueNumberRegex)]
		.map((match) => Number(match[1]))
		.filter((number) => {
			if (seen.has(number)) {
				return false
			}
			seen.add(number)
			return true
		})
		.map((number) => ({ owner: "openclaw", repo: "openclaw", type: "pull", number }))
}

export default class GithubSummaryReactionAdd extends MessageReactionAddListener {
	async handle(data: ListenerEventData[this["type"]], client: Client) {
		try {
			if (data.user.bot) {
				return
			}

			if (data.emoji.name === "❌") {
				const message = data.message.partial
					? await data.message.fetch().catch(() => null)
					: data.message
				if (message && hasDeleteHint(message.rawData.components)) {
					await message.delete().catch(() => null)
				}
				return
			}

			if (data.emoji.id !== summaryEmojiId) {
				return
			}

			const message = data.message.partial
				? await data.message.fetch().catch(() => null)
				: data.message
			if (!message) {
				return
			}

			const source = [
				message.content,
				...(message.embeds ?? []).flatMap((embed: { url?: string; title?: string; description?: string }) => [
					embed.url,
					embed.title,
					embed.description
				])
			]
				.filter(Boolean)
				.join("\n")
			const linkMatches = parseGitHubIssueUrls(source)
			const matches = (linkMatches.length > 0
				? linkMatches.filter((match) => {
					// Temporarily skip issues in reaction summaries.
					// return true
					return match.type === "pull"
				})
				: parseOpenClawPrNumbers(source))
				.slice(0, 5)
			if (matches.length === 0) {
				return
			}

			const summaries = (await Promise.all(
				matches.map((match) =>
					fetchGitHubSummaryData(match.owner, match.repo, match.number).catch(() => null)
				)
			)).filter((summary) => summary !== null)
			if (summaries.length === 0) {
				return
			}

			const channel = await client.fetchChannel(data.channel_id).catch(() => null)
			if (!channel || !("send" in channel)) {
				return
			}

			await message.reply({
				components: [
					...summaries.map(buildGitHubSummaryContainer),
					new TextDisplay(deleteHint)
				]
			}).catch(() => null)
			await client.rest.delete(
				Routes.channelMessageUserReaction(
					data.channel_id,
					data.message_id,
					reactionRouteEmoji(data.emoji),
					data.user.id
				)
			).catch(() => null)
		} catch {
			return
		}
	}
}
