import { createHash } from "node:crypto"
import {
	access,
	mkdir,
	readFile,
	readdir,
	rename,
	rm,
	stat
} from "node:fs/promises"
import { dirname, join } from "node:path"
import {
	slapConfig,
	slapOutcomesForRarity,
	slapSceneVariants,
	type SlapOutcome,
	type SlapSceneVariant
} from "../src/config/slap.js"

const inputDir = Bun.argv[2] ?? "output/imagegen/slap-scenes"
const outputDir = Bun.argv[3] ?? "tmp/imagegen/slap-scenes-final"
const scratchDir = Bun.argv[4] ?? "tmp/imagegen/slap-scenes-png"
const metadataPath =
	Bun.argv[5] ?? "tmp/imagegen/slap-scenes-v2.metadata.json"
const manifestPath = Bun.argv[6] ?? `${outputDir}.manifest.json`
const workerCount = 8

type ExpectedScene = {
	sourceName: string
	fishSlug: string
	outcome: SlapOutcome
	variant: SlapSceneVariant
	finalPath: string
}

type SceneMetadata = {
	out: string
	promptSha256: string
	sceneKey: string
	fishSlug: string
	outcome: SlapOutcome
	variant: SlapSceneVariant
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
}

type SourceManifest = {
	version: number
	seed: string
	sourceSize: string
	finalSize: string
	jobs: SceneMetadata[]
}

const expectedScenes: ExpectedScene[] = slapConfig.fish.flatMap((fish) =>
	slapOutcomesForRarity(fish.rarity).flatMap((outcome) =>
		slapSceneVariants.map((variant) => {
			const suffix = `${outcome}-${variant.toString().padStart(2, "0")}.webp`
			return {
				sourceName: `${fish.slug}--${suffix}`,
				fishSlug: fish.slug,
				outcome,
				variant,
				finalPath: `${fish.slug}/${suffix}`
			}
		})
	)
)

const run = async (command: string[]) => {
	const process = Bun.spawn(command, {
		stdout: "pipe",
		stderr: "pipe"
	})
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text()
	])
	if (exitCode === 0) {
		return stdout.trim()
	}
	throw new Error(`${command[0]} failed (${exitCode}): ${stderr.trim()}`)
}

const exists = async (path: string) => {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

const sha256 = (bytes: Uint8Array) =>
	createHash("sha256").update(bytes).digest("hex")

const files = (await readdir(inputDir, { withFileTypes: true }))
	.filter((entry) => entry.isFile())
	.map((entry) => entry.name)
	.filter((file) => file.endsWith(".webp"))
	.sort()

const expectedNames = expectedScenes.map((scene) => scene.sourceName).sort()
const expectedNameSet = new Set(expectedNames)
const actualNameSet = new Set(files)
const missingFiles = expectedNames.filter((file) => !actualNameSet.has(file))
const unexpectedFiles = files.filter((file) => !expectedNameSet.has(file))

if (missingFiles.length > 0 || unexpectedFiles.length > 0) {
	throw new Error(
		[
			`Source directory must contain the exact ${expectedNames.length}-scene matrix.`,
			missingFiles.length > 0
				? `Missing: ${missingFiles.join(", ")}`
				: "",
			unexpectedFiles.length > 0
				? `Unexpected: ${unexpectedFiles.join(", ")}`
				: ""
		].filter(Boolean).join("\n")
	)
}

const sourceManifest = JSON.parse(
	await Bun.file(metadataPath).text()
) as SourceManifest
if (
	sourceManifest.version !== 2 ||
	sourceManifest.seed !== "FISH_SLAP_LIBRARY_V2" ||
	sourceManifest.sourceSize !== "1152x768" ||
	sourceManifest.finalSize !== "768x512"
) {
	throw new Error(`Unexpected source manifest identity in ${metadataPath}`)
}

const metadataByOutput = new Map(
	sourceManifest.jobs.map((job) => [job.out, job])
)
if (
	sourceManifest.jobs.length !== expectedScenes.length ||
	metadataByOutput.size !== expectedScenes.length
) {
	throw new Error(
		`Source manifest must contain ${expectedScenes.length} unique jobs`
	)
}
for (const scene of expectedScenes) {
	const metadata = metadataByOutput.get(scene.sourceName)
	if (
		!metadata ||
		metadata.fishSlug !== scene.fishSlug ||
		metadata.outcome !== scene.outcome ||
		metadata.variant !== scene.variant ||
		!/^[a-f0-9]{64}$/.test(metadata.promptSha256)
	) {
		throw new Error(`Invalid metadata for ${scene.sourceName}`)
	}
}

const stagingDir = `${outputDir}.tmp-${process.pid}`
const stagingManifest = `${manifestPath}.tmp-${process.pid}`
const backupDir = `${outputDir}.backup-${process.pid}`
const backupManifest = `${manifestPath}.backup-${process.pid}`

await mkdir(dirname(outputDir), { recursive: true })
await mkdir(dirname(manifestPath), { recursive: true })
await rm(stagingDir, { recursive: true, force: true })
await rm(stagingManifest, { force: true })
await rm(scratchDir, { recursive: true, force: true })
await mkdir(stagingDir, { recursive: true })
await mkdir(scratchDir, { recursive: true })

let cursor = 0
const installedJobs = new Array<
	SceneMetadata & {
		sourceSha256: string
		finalSha256: string
		finalBytes: number
		finalPath: string
	}
>(expectedScenes.length)

const installNext = async () => {
	while (cursor < expectedScenes.length) {
		const index = cursor++
		const scene = expectedScenes[index]
		const metadata = metadataByOutput.get(scene.sourceName)
		if (!metadata) {
			throw new Error(`Missing metadata for ${scene.sourceName}`)
		}
		const source = join(inputDir, scene.sourceName)
		const destination = join(stagingDir, scene.finalPath)
		const destinationDir = dirname(destination)
		const scratch = join(scratchDir, `${index.toString().padStart(3, "0")}.png`)
		const sourceBytes = await readFile(source)

		await mkdir(destinationDir, { recursive: true })
		await run([
			"magick",
			source,
			"-resize",
			"768x512^",
			"-gravity",
			"center",
			"-extent",
			"768x512",
			"-strip",
			"-colorspace",
			"sRGB",
			scratch
		])
		await run([
			"cwebp",
			"-quiet",
			"-mt",
			"-m",
			"6",
			"-size",
			"75000",
			"-pass",
			"10",
			scratch,
			"-o",
			destination
		])
		const dimensions = await run([
			"magick",
			"identify",
			"-format",
			"%wx%h",
			destination
		])
		if (dimensions !== "768x512") {
			throw new Error(
				`Wrong final dimensions for ${scene.sourceName}: ${dimensions}`
			)
		}
		await run(["dwebp", destination, "-quiet", "-o", "/dev/null"])
		const finalBytes = (await stat(destination)).size
		if (finalBytes < 20_000 || finalBytes > 120_000) {
			throw new Error(
				`Final size outside budget for ${scene.sourceName}: ${finalBytes}`
			)
		}
		const finalContents = await readFile(destination)
		installedJobs[index] = {
			...metadata,
			sourceSha256: sha256(sourceBytes),
			finalSha256: sha256(finalContents),
			finalBytes,
			finalPath: scene.finalPath
		}
		await rm(scratch, { force: true })
	}
}

try {
	await Promise.all(
		Array.from(
			{ length: Math.min(workerCount, expectedScenes.length) },
			installNext
		)
	)

	const totalBytes = installedJobs.reduce(
		(total, job) => total + job.finalBytes,
		0
	)
	if (totalBytes > 25 * 1024 * 1024) {
		throw new Error(`Final scene library exceeds 25 MB: ${totalBytes} bytes`)
	}
	if (
		new Set(installedJobs.map((job) => job.finalSha256)).size !==
		installedJobs.length
	) {
		throw new Error("Final scene library contains duplicate files")
	}

	await Bun.write(
		stagingManifest,
		`${JSON.stringify(
			{
				...sourceManifest,
				jobs: installedJobs
			},
			null,
			2
		)}\n`
	)

	await rm(backupDir, { recursive: true, force: true })
	await rm(backupManifest, { force: true })
	const hadOutput = await exists(outputDir)
	const hadManifest = await exists(manifestPath)
	try {
		if (hadOutput) {
			await rename(outputDir, backupDir)
		}
		if (hadManifest) {
			await rename(manifestPath, backupManifest)
		}
		await rename(stagingDir, outputDir)
		await rename(stagingManifest, manifestPath)
	} catch (error) {
		await rm(outputDir, { recursive: true, force: true })
		await rm(manifestPath, { force: true })
		if (hadOutput && await exists(backupDir)) {
			await rename(backupDir, outputDir)
		}
		if (hadManifest && await exists(backupManifest)) {
			await rename(backupManifest, manifestPath)
		}
		throw error
	}
	await rm(backupDir, { recursive: true, force: true })
	await rm(backupManifest, { force: true })
} finally {
	await rm(stagingDir, { recursive: true, force: true })
	await rm(stagingManifest, { force: true })
	await rm(scratchDir, { recursive: true, force: true })
}

console.log(
	`Installed ${expectedScenes.length} slap scenes from ${inputDir} into ${outputDir}`
)
console.log(`Wrote content-bound manifest to ${manifestPath}`)
