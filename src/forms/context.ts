import { formSettings } from "../../forms.config.js"
import type { FormConfig } from "./types.js"
import { getRuntimeEnv } from "../runtime/env.js"
import { getGitHubHeaders } from "../utils/githubAuth.js"
import { getRedditModerationContext, normalizeRedditUsername } from "./redditContext.js"

const discordApiBase = "https://discord.com/api/v10"
const githubApiBase = "https://api.github.com"
const noListedReason = "No listed reason found."
const notAvailable = "Not available"
const discordAuditBanAdd = 22
const discordAuditMemberUpdate = 24

const getDiscordHeaders = () => ({
	Authorization: `Bot ${getRuntimeEnv().DISCORD_BOT_TOKEN}`,
	"content-type": "application/json"
})

const fetchDiscord = async <T>(path: string) => {
	const response = await fetch(`${discordApiBase}${path}`, {
		headers: getDiscordHeaders()
	})
	return response.ok ? { status: response.status, data: await response.json() as T } : { status: response.status, data: null }
}

const parseBarnacleReason = (reason?: string | null) => {
	if (!reason) {
		return {}
	}
	const ban = reason.match(/^\[(?<caseId>[^\]]+)]\s+(?<timestamp>\d{2}\/\d{2}\/\d{4}\s+-\s+\d{2}:\d{2})\s+@(?<moderator>\S+)\s+\((?<duration>[^)]+)\):\s*(?<moderationReason>[\s\S]+)$/)
	if (ban?.groups) {
		return {
			caseId: ban.groups.caseId,
			timestamp: ban.groups.timestamp,
			moderator: ban.groups.moderator,
			duration: ban.groups.duration,
			banReason: ban.groups.moderationReason.trim(),
			moderationReason: ban.groups.moderationReason.trim()
		}
	}
	const mute = reason.match(/^(?<moderationReason>[\s\S]*?)\s*\((?<caseId>[A-Za-z0-9_-]+)\)$/)
	if (mute?.groups) {
		return {
			caseId: mute.groups.caseId,
			banReason: mute.groups.moderationReason.trim(),
			moderationReason: mute.groups.moderationReason.trim()
		}
	}
	return {
		banReason: reason,
		moderationReason: reason
	}
}

type DiscordAuditLog = {
	audit_log_entries?: Array<{
		action_type?: number
		target_id?: string | null
		user_id?: string | null
		reason?: string | null
		changes?: Array<{ key?: string; old_value?: unknown; new_value?: unknown }>
	}>
	users?: Array<{ id: string; username?: string; global_name?: string | null }>
}

const latestDiscordAuditEntry = async (input: { guildId: string; userId: string; actionType: number; timeoutOnly?: boolean }) => {
	const audit = await fetchDiscord<DiscordAuditLog>(
		`/guilds/${input.guildId}/audit-logs?action_type=${input.actionType}&limit=25`
	)
	const entry = audit.data?.audit_log_entries?.find((item) => {
		if (item.target_id !== input.userId) {
			return false
		}
		if (!input.timeoutOnly) {
			return true
		}
		return item.changes?.some((change) => change.key === "communication_disabled_until" && Boolean(change.new_value))
	})
	const moderator = entry?.user_id
		? audit.data?.users?.find((user) => user.id === entry.user_id)
		: null
	return entry ? {
		...parseBarnacleReason(entry.reason),
		moderator: moderator?.global_name ?? moderator?.username ?? entry.user_id ?? notAvailable
	} : null
}

const latestDiscordBan = async (userId: string) => {
	const guildId = formSettings.discordGuildId
	if (!guildId) {
		return null
	}
	const ban = await fetchDiscord<{
		reason?: string | null
		user?: { id?: string; username?: string; global_name?: string | null }
	}>(`/guilds/${guildId}/bans/${userId}`)
	if (!ban.data) {
		return null
	}
	const audit = await latestDiscordAuditEntry({ guildId, userId, actionType: discordAuditBanAdd })
	return {
		action: "banned",
		unaction: "unbanned",
		punishment: "Ban",
		duration: audit?.duration ?? "Permanent",
		banReason: audit?.banReason || ban.data.reason || noListedReason,
		moderationReason: audit?.moderationReason || ban.data.reason || noListedReason,
		caseId: audit?.caseId ?? notAvailable,
		moderator: audit?.moderator ?? notAvailable,
		...(audit?.timestamp ? { timestamp: audit.timestamp } : {}),
		account: ban.data.user?.global_name ?? ban.data.user?.username ?? userId
	}
}

const latestDiscordTimeout = async (userId: string) => {
	const guildId = formSettings.discordGuildId
	if (!guildId) {
		return null
	}
	const member = await fetchDiscord<{
		communication_disabled_until?: string | null
		user?: { id?: string; username?: string; global_name?: string | null }
	}>(`/guilds/${guildId}/members/${userId}`)
	if (!member.data?.communication_disabled_until) {
		return null
	}
	const audit = await latestDiscordAuditEntry({ guildId, userId, actionType: discordAuditMemberUpdate, timeoutOnly: true })
	return {
		action: "muted",
		unaction: "unmuted",
		punishment: "Mute",
		duration: `Until ${member.data.communication_disabled_until}`,
		banReason: audit?.banReason || noListedReason,
		moderationReason: audit?.moderationReason || noListedReason,
		caseId: audit?.caseId ?? notAvailable,
		moderator: audit?.moderator ?? notAvailable,
		account: member.data.user?.global_name ?? member.data.user?.username ?? userId
	}
}

const emptyDiscordContext = (user: { username: string }, message: string) => ({
	action: "moderated",
	unaction: "reviewed",
	punishment: "Unknown",
	duration: notAvailable,
	banReason: noListedReason,
	moderationReason: message,
	caseId: notAvailable,
	moderator: notAvailable,
	account: user.username
})

const latestGitHubContext = async (username: string) => {
	const org = formSettings.githubOrg
	const headers = await getGitHubHeaders()
	const response = await fetch(`${githubApiBase}/orgs/${encodeURIComponent(org)}/blocks/${encodeURIComponent(username)}`, {
		headers
	})
	const isBlocked = response.status === 204
	return {
		action: isBlocked ? "banned" : "moderated",
		unaction: isBlocked ? "unbanned" : "reviewed",
		githubUser: username,
		banReason: isBlocked ? `Blocked by ${org}.` : noListedReason,
		scope: `${org} organization`,
		links: `https://github.com/${username}`
	}
}

const latestRedditContext = async (username: string) => {
	const subreddit = formSettings.redditSubreddit
	const normalized = normalizeRedditUsername(username)
	const context = await getRedditModerationContext({ subreddit, username: normalized })
	return {
		action: context?.action ?? "moderated",
		unaction: context?.unaction ?? "reviewed",
		redditUser: `u/${normalized}`,
		banReason: context?.banReason || noListedReason,
		moderator: context?.moderator || notAvailable,
		scope: `r/${subreddit}`,
		links: `https://reddit.com/u/${normalized}`,
		...(context?.bannedAt ? { date: context.bannedAt } : {}),
		...(context?.expiresAt ? { expiresAt: context.expiresAt } : {})
	}
}

export const fetchFormContext = async (
	form: FormConfig,
	user: { id: string; username: string }
) => {
	if (form.id === "discord-ban") {
		return await latestDiscordBan(user.id) ?? emptyDiscordContext(user, "No active Discord ban found.")
	}
	if (form.id === "discord-mute") {
		return await latestDiscordTimeout(user.id) ?? emptyDiscordContext(user, "No active Discord mute found.")
	}
	if (form.id === "github") {
		return latestGitHubContext(user.username)
	}
	if (form.id === "reddit") {
		return latestRedditContext(user.username)
	}
	return {}
}
