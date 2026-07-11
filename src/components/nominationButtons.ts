import {
	Button,
	type ButtonInteraction,
	ButtonStyle,
	type ComponentData,
	Container,
	Row,
	Separator,
	TextDisplay
} from "@buape/carbon"
import { nominationConfig } from "../config/nominations.js"
import type {
	NominationVote,
	NominationVoteChoice
} from "../data/nominations.js"
import type { Nomination } from "../db/schema.js"

const statusCopy = (nomination: Nomination) => {
	switch (nomination.status) {
		case "granting":
			return "**Status:** Role grant pending"
		case "approved":
			return "**Status:** Approved\nShell Society role granted."
		case "declined":
			return "**Status:** Declined"
		case "expired":
			return "**Status:** Expired"
		default:
			return "**Status:** Open"
	}
}

const statusColor = (nomination: Nomination) => {
	switch (nomination.status) {
		case "approved":
			return "#3fb950"
		case "declined":
			return "#f85149"
		case "expired":
			return "#8b949e"
		case "granting":
			return "#58a6ff"
		default:
			return "#f1c40f"
	}
}

export const buildNominationNoticeContainer = (
	body: string,
	accentColor = "#f1c40f"
) => new Container([new TextDisplay(body)], { accentColor })

const formatVoteSummary = (
	label: string,
	choice: NominationVoteChoice,
	votes: NominationVote[],
	requiredApprovals: number
) => {
	const reviewerIds = votes
		.filter((vote) => vote.choice === choice)
		.map((vote) => vote.reviewerId)
	const reviewers =
		reviewerIds.length > 0
			? reviewerIds.map((reviewerId) => `<@${reviewerId}>`).join(", ")
			: "None"

	return `**${label} (${Math.min(reviewerIds.length, requiredApprovals)}/${requiredApprovals}):** ${reviewers}`
}

export const buildNominationContainer = (
	nomination: Nomination,
	votes: NominationVote[] = []
) => {
	const votingClosed = nomination.status !== "submitted"

	return new Container(
		[
			new TextDisplay(`### ${nominationConfig.copy.title}`),
			new TextDisplay(
				`**Nominee:** <@${nomination.nomineeId}>\n**Nominator:** <@${nomination.nominatorId}>`
			),
			new TextDisplay(`**Reason**\n${nomination.reason}`),
			new Separator({ divider: true, spacing: "small" }),
			new TextDisplay(
				`${formatVoteSummary("Approvals", "approve", votes, nomination.requiredApprovals)}\n${formatVoteSummary("Declines", "decline", votes, nomination.requiredApprovals)}`
			),
			new TextDisplay(statusCopy(nomination)),
			new Separator({ divider: true, spacing: "small" }),
			new Row([
				new NominationApproveButton(nomination.id, votingClosed),
				new NominationDeclineButton(nomination.id, votingClosed)
			])
		],
		{ accentColor: statusColor(nomination) }
	)
}

abstract class NominationVoteButton extends Button {
	abstract choice: NominationVoteChoice
	ephemeral = true
	defer = true
	disabled = false

	async run(interaction: ButtonInteraction, data: ComponentData) {
		const { handleNominationVote } = await import(
			"../services/nominationVoting.js"
		)
		await handleNominationVote(interaction, data, this.choice)
	}
}

export class NominationApproveButton extends NominationVoteButton {
	customId = "nomination-approve"
	label = "👍"
	style = ButtonStyle.Success
	choice = "approve" as const

	constructor(id?: number, disabled = false) {
		super()
		if (typeof id === "number") {
			this.customId = `nomination-approve:id=${id}`
		}
		this.disabled = disabled
	}
}

export class NominationDeclineButton extends NominationVoteButton {
	customId = "nomination-decline"
	label = "👎"
	style = ButtonStyle.Danger
	choice = "decline" as const

	constructor(id?: number, disabled = false) {
		super()
		if (typeof id === "number") {
			this.customId = `nomination-decline:id=${id}`
		}
		this.disabled = disabled
	}
}

export const nominationComponents = [
	new NominationApproveButton(),
	new NominationDeclineButton()
]
