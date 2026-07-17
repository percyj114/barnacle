import { createHash } from "node:crypto"
import {
	readFileSync,
	readdirSync,
	statSync
} from "node:fs"
import { join, relative } from "node:path"
import { describe, expect, it } from "bun:test"
import {
	slapConfig,
	slapOutcomesForRarity,
	slapSceneVariants
} from "../src/config/slap.js"

const assetRoot = "assets/slap/scenes"
const manifestPath = "assets/slap/scenes.manifest.json"

const expectedPaths = slapConfig.fish.flatMap((fish) =>
	slapOutcomesForRarity(fish.rarity).flatMap((outcome) =>
		slapSceneVariants.map((variant) =>
			join(
				fish.slug,
				`${outcome}-${variant.toString().padStart(2, "0")}.webp`
			)
		)
	)
).sort()

const actualPaths = readdirSync(assetRoot, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.flatMap((directory) =>
		readdirSync(join(assetRoot, directory.name), {
			withFileTypes: true
		})
			.filter((entry) => entry.isFile())
			.map((entry) =>
				relative(
					assetRoot,
					join(assetRoot, directory.name, entry.name)
				)
			)
	)
	.sort()

const readUint24LE = (buffer: Buffer, offset: number) =>
	buffer[offset] |
	(buffer[offset + 1] << 8) |
	(buffer[offset + 2] << 16)

const webpDimensions = (buffer: Buffer) => {
	if (
		buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
		buffer.subarray(8, 12).toString("ascii") !== "WEBP"
	) {
		throw new Error("Invalid WebP container")
	}
	if (buffer.readUInt32LE(4) + 8 !== buffer.length) {
		throw new Error("Invalid WebP container length")
	}

	const chunk = buffer.subarray(12, 16).toString("ascii")
	if (chunk === "VP8X") {
		return {
			width: readUint24LE(buffer, 24) + 1,
			height: readUint24LE(buffer, 27) + 1
		}
	}
	if (chunk === "VP8 ") {
		if (
			buffer[23] !== 0x9d ||
			buffer[24] !== 0x01 ||
			buffer[25] !== 0x2a
		) {
			throw new Error("Invalid lossy WebP frame header")
		}
		return {
			width: buffer.readUInt16LE(26) & 0x3fff,
			height: buffer.readUInt16LE(28) & 0x3fff
		}
	}
	if (chunk === "VP8L") {
		if (buffer[20] !== 0x2f) {
			throw new Error("Invalid lossless WebP frame header")
		}
		const bits = buffer.readUInt32LE(21)
		return {
			width: (bits & 0x3fff) + 1,
			height: ((bits >>> 14) & 0x3fff) + 1
		}
	}
	throw new Error(`Unsupported WebP chunk: ${chunk}`)
}

type SceneManifest = {
	version: number
	seed: string
	sourceSize: string
	finalSize: string
	jobs: Array<{
		out: string
		promptSha256: string
		sceneKey: string
		fishSlug: string
		outcome: string
		variant: number
		worldId: string
		settingFamily: string
		era: string
		mediumId: string
		castId: string
		actorGender: string
		targetGender: string | null
		cameraId: string
		toneId: string
		lightingId: string
		paletteId: string
		stagingId: number
		sourceSha256: string
		finalSha256: string
		finalBytes: number
		finalPath: string
	}>
}

describe("slap scene assets", () => {
	it("ships the exact complete 768x512 scene matrix within budget", () => {
		expect(actualPaths).toEqual(expectedPaths)
		expect(actualPaths).toHaveLength(327)

		let totalBytes = 0
		const hashes = new Set<string>()
		for (const relativePath of actualPaths) {
			const path = join(assetRoot, relativePath)
			const bytes = readFileSync(path)
			const size = statSync(path).size
			const dimensions = webpDimensions(bytes)

			expect(dimensions).toEqual({ width: 768, height: 512 })
			expect(size).toBeGreaterThanOrEqual(20_000)
			expect(size).toBeLessThanOrEqual(120_000)
			totalBytes += size
			hashes.add(createHash("sha256").update(bytes).digest("hex"))
		}

		expect(totalBytes).toBeLessThanOrEqual(25 * 1024 * 1024)
		expect(hashes.size).toBe(actualPaths.length)
	})

	it("records deterministic visual diversity for every scene", () => {
		const manifest = JSON.parse(
			readFileSync(manifestPath, "utf8")
		) as SceneManifest
		expect(manifest.version).toBe(2)
		expect(manifest.seed).toBe("FISH_SLAP_LIBRARY_V2")
		expect(manifest.sourceSize).toBe("1152x768")
		expect(manifest.finalSize).toBe("768x512")
		expect(manifest.jobs).toHaveLength(327)

		const expectedOutputs = expectedPaths.map((path) =>
			path.replace("/", "--")
		)
		expect(manifest.jobs.map((job) => job.out).sort()).toEqual(
			expectedOutputs.sort()
		)
		expect(manifest.jobs.map((job) => job.finalPath).sort()).toEqual(
			expectedPaths
		)

		const jobsByPath = new Map(
			manifest.jobs.map((job) => [job.finalPath, job])
		)
		for (const relativePath of actualPaths) {
			const path = join(assetRoot, relativePath)
			const bytes = readFileSync(path)
			const job = jobsByPath.get(relativePath)
			expect(job).toBeDefined()
			expect(job?.finalBytes).toBe(bytes.length)
			expect(job?.finalSha256).toBe(
				createHash("sha256").update(bytes).digest("hex")
			)
			expect(job?.promptSha256).toMatch(/^[a-f0-9]{64}$/)
			expect(job?.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
		}
		expect(new Set(manifest.jobs.map((job) => job.promptSha256)).size)
			.toBe(manifest.jobs.length)
		expect(new Set(manifest.jobs.map((job) => job.sourceSha256)).size)
			.toBe(manifest.jobs.length)
		expect(new Set(manifest.jobs.map((job) => job.finalSha256)).size)
			.toBe(manifest.jobs.length)

		expect(new Set(manifest.jobs.map((job) => job.mediumId)).size)
			.toBeGreaterThanOrEqual(15)
		expect(new Set(manifest.jobs.map((job) => job.worldId)).size)
			.toBeGreaterThanOrEqual(40)
		expect(new Set(manifest.jobs.map((job) => job.castId)).size)
			.toBeGreaterThanOrEqual(20)
		expect(new Set(manifest.jobs.map((job) => job.cameraId)).size).toBe(12)
		expect(new Set(manifest.jobs.map((job) => job.toneId)).size).toBe(12)
		expect(
			manifest.jobs.filter(
				(job) =>
					job.actorGender === "woman" ||
					job.targetGender === "woman"
			)
		).toHaveLength(244)

		const sceneTuples = manifest.jobs.map((job) =>
			[
				job.worldId,
				job.mediumId,
				job.castId,
				job.cameraId,
				job.toneId,
				job.lightingId,
				job.paletteId,
				job.stagingId
			].join(":")
		)
		expect(new Set(sceneTuples).size).toBe(sceneTuples.length)

		const groups = Map.groupBy(
			manifest.jobs,
			(job) => `${job.fishSlug}:${job.outcome}`
		)
		for (const jobs of groups.values()) {
			expect(jobs).toHaveLength(3)
			expect(new Set(jobs.map((job) => job.mediumId)).size).toBe(3)
			expect(new Set(jobs.map((job) => job.worldId)).size).toBe(3)
			expect(new Set(jobs.map((job) => job.castId)).size).toBe(3)
			expect(new Set(jobs.map((job) => job.cameraId)).size).toBe(3)
			expect(new Set(jobs.map((job) => job.toneId)).size).toBe(3)
		}
	})
})
