import { formSettings } from "../../forms.config.js"
import type { FormConfig } from "./types.js"
import { getRuntimeEnv } from "../runtime/env.js"
import { getGitHubHeaders } from "../utils/githubAuth.js"
import { getRedditModerationContext, normalizeRedditUsername } from "./redditContext.js"

const discordApiBase = "https://discord.com/api/v10"
const githubApiBase = "https://api.github.com"
const noListedReason = "No listed reason found."
const notAvailable = "Not available"

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
	return {
		action: "banned",
		unaction: "unbanned",
		punishment: "Ban",
		duration: "Permanent",
		banReason: ban.data.reason || noListedReason,
		moderationReason: ban.data.reason || noListedReason,
		caseId: notAvailable,
		moderator: notAvailable,
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
	return {
		action: "muted",
		unaction: "unmuted",
		punishment: "Mute",
		duration: `Until ${member.data.communication_disabled_until}`,
		banReason: noListedReason,
		moderationReason: noListedReason,
		caseId: notAvailable,
		moderator: notAvailable,
		account: member.data.user?.global_name ?? member.data.user?.username ?? userId
	}
}

const latestDiscordContext = async (user: { id: string; username: string }) =>
	await latestDiscordBan(user.id) ?? await latestDiscordTimeout(user.id) ?? {
		action: "moderated",
		unaction: "reviewed",
		punishment: "Unknown",
		duration: notAvailable,
		banReason: noListedReason,
		moderationReason: "No active ban or timeout found.",
		caseId: notAvailable,
		moderator: notAvailable,
		account: user.username
	}

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
	if (form.id === "discord") {
		return latestDiscordContext(user)
	}
	if (form.id === "github") {
		return latestGitHubContext(user.username)
	}
	if (form.id === "reddit") {
		return latestRedditContext(user.username)
	}
	return {}
}
