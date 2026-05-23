import { and, eq, sql } from "drizzle-orm"
import { getDb } from "../db.js"
import { redditModerationContexts } from "../db/schema.js"

const now = sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`

export const normalizeRedditUsername = (username: string) =>
	username.trim().replace(/^u\//i, "").toLowerCase()

export const getRedditModerationContext = async (input: { subreddit: string; username: string }) => {
	const [context] = await getDb()
		.select()
		.from(redditModerationContexts)
		.where(and(
			eq(redditModerationContexts.subreddit, input.subreddit.toLowerCase()),
			eq(redditModerationContexts.username, normalizeRedditUsername(input.username))
		))
		.limit(1)

	return context ?? null
}

export const upsertRedditModerationContext = async (input: {
	subreddit: string
	username: string
	action?: string | null
	unaction?: string | null
	banReason?: string | null
	moderator?: string | null
	bannedAt?: string | null
	expiresAt?: string | null
	rawPayload?: string | null
}) => {
	const value = {
		subreddit: input.subreddit.toLowerCase(),
		username: normalizeRedditUsername(input.username),
		action: input.action ?? "moderated",
		unaction: input.unaction ?? "reviewed",
		banReason: input.banReason ?? null,
		moderator: input.moderator ?? null,
		bannedAt: input.bannedAt ?? null,
		expiresAt: input.expiresAt ?? null,
		rawPayload: input.rawPayload ?? null,
		updatedAt: sql<string>`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
	}
	const [context] = await getDb()
		.insert(redditModerationContexts)
		.values(value)
		.onConflictDoUpdate({
			target: [redditModerationContexts.subreddit, redditModerationContexts.username],
			set: {
				action: value.action,
				unaction: value.unaction,
				banReason: value.banReason,
				moderator: value.moderator,
				bannedAt: value.bannedAt,
				expiresAt: value.expiresAt,
				rawPayload: value.rawPayload,
				updatedAt: now
			}
		})
		.returning()

	return context
}
