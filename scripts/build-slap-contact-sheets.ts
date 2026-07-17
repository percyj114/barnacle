import type { Dirent } from "node:fs"
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises"
import { dirname, relative, resolve, sep } from "node:path"
import {
	slapConfig,
	slapOutcomesForRarity,
	slapSceneVariants
} from "../src/config/slap.js"

const defaultInputDir = "tmp/imagegen/slap-scenes-v2-final"
const defaultOutputDir = "tmp/imagegen/slap-scenes-v2-contact-sheets"
const tileWidth = 384
const tileHeight = 256
const tileGap = 12
const columns = slapSceneVariants.length
const fontCandidates = [
	"DejaVu-Sans",
	"Liberation-Sans",
	"Arial",
	"Helvetica",
	"fixed"
] as const

type SceneAsset = {
	label: string
	path: string
}

type FishSheet = {
	slug: string
	name: string
	outcomeCount: number
	assets: SceneAsset[]
}

const compareStrings = (left: string, right: string) =>
	left < right ? -1 : left > right ? 1 : 0

const describeError = (error: unknown) =>
	error instanceof Error ? error.message : String(error)

const quoteArgument = (argument: string) =>
	/^[A-Za-z0-9_./:=+-]+$/.test(argument)
		? argument
		: JSON.stringify(argument)

const run = async (command: string[], description: string) => {
	let process: ReturnType<typeof Bun.spawn>
	try {
		process = Bun.spawn(command, {
			env: {
				...Bun.env,
				MAGICK_THREAD_LIMIT: "1"
			},
			stdout: "pipe",
			stderr: "pipe"
		})
	} catch (error) {
		throw new Error(`${description}: ${describeError(error)}`)
	}

	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(
			process.stdout as ReadableStream<Uint8Array>
		).text(),
		new Response(
			process.stderr as ReadableStream<Uint8Array>
		).text()
	])

	if (exitCode !== 0) {
		const details = stderr.trim() || stdout.trim() || "no diagnostic output"
		throw new Error(
			[
				`${description} (exit ${exitCode})`,
				`Command: ${command.map(quoteArgument).join(" ")}`,
				details
			].join("\n")
		)
	}

	return stdout
}

const isSameOrInside = (path: string, parent: string) => {
	const pathFromParent = relative(parent, path)
	return (
		pathFromParent === "" ||
		(pathFromParent !== ".." &&
			!pathFromParent.startsWith(`..${sep}`))
	)
}

const entryKind = (entry: Dirent<string>) => {
	if (entry.isDirectory()) {
		return "directory"
	}
	if (entry.isFile()) {
		return "file"
	}
	if (entry.isSymbolicLink()) {
		return "symbolic link"
	}
	return "special entry"
}

const buildSheetPlans = (inputDir: string): FishSheet[] =>
	slapConfig.fish.map((fish) => {
		const outcomes = slapOutcomesForRarity(fish.rarity)
		const assets = outcomes.flatMap((outcome) =>
			slapSceneVariants.map((variant) => {
				const label = `${outcome}-${variant.toString().padStart(2, "0")}`
				return {
					label,
					path: resolve(inputDir, fish.slug, `${label}.webp`)
				}
			})
		)

		return {
			slug: fish.slug,
			name: fish.name,
			outcomeCount: outcomes.length,
			assets
		}
	})

const validateStructure = async (
	inputDir: string,
	sheets: FishSheet[]
) => {
	let inputStat
	try {
		inputStat = await stat(inputDir)
	} catch (error) {
		throw new Error(
			`Input directory is missing or unreadable: ${inputDir}\n${describeError(error)}`
		)
	}
	if (!inputStat.isDirectory()) {
		throw new Error(`Input path is not a directory: ${inputDir}`)
	}

	const errors: string[] = []
	const rootEntries = (await readdir(inputDir, { withFileTypes: true })).sort(
		(left, right) => compareStrings(left.name, right.name)
	)
	const expectedFish = new Map(sheets.map((sheet) => [sheet.slug, sheet]))

	for (const entry of rootEntries) {
		if (!expectedFish.has(entry.name)) {
			errors.push(
				`unexpected root ${entryKind(entry)}: ${entry.name}`
			)
		}
	}

	for (const sheet of sheets) {
		const fishEntry = rootEntries.find(
			(entry) => entry.name === sheet.slug
		)
		if (!fishEntry) {
			errors.push(`missing fish directory: ${sheet.slug}`)
			continue
		}
		if (!fishEntry.isDirectory()) {
			errors.push(
				`expected fish directory but found ${entryKind(fishEntry)}: ${sheet.slug}`
			)
			continue
		}

		const fishDir = resolve(inputDir, sheet.slug)
		const entries = (await readdir(fishDir, {
			withFileTypes: true
		})).sort((left, right) => compareStrings(left.name, right.name))
		const expectedFiles = new Set(
			sheet.assets.map((asset) => `${asset.label}.webp`)
		)
		const actualEntries = new Map(
			entries.map((entry) => [entry.name, entry])
		)

		const missingFiles = [...expectedFiles]
			.filter((file) => !actualEntries.has(file))
			.sort(compareStrings)
		if (missingFiles.length > 0) {
			errors.push(
				`${sheet.slug}: missing ${missingFiles.length} scene(s): ${missingFiles.join(", ")}`
			)
		}

		const unexpectedEntries = entries.filter(
			(entry) => !expectedFiles.has(entry.name)
		)
		if (unexpectedEntries.length > 0) {
			errors.push(
				`${sheet.slug}: unexpected entries: ${unexpectedEntries
					.map((entry) => `${entry.name} (${entryKind(entry)})`)
					.join(", ")}`
			)
		}

		const invalidFiles = entries.filter(
			(entry) =>
				expectedFiles.has(entry.name) && !entry.isFile()
		)
		if (invalidFiles.length > 0) {
			errors.push(
				`${sheet.slug}: expected regular files: ${invalidFiles
					.map((entry) => `${entry.name} (${entryKind(entry)})`)
					.join(", ")}`
			)
		}
	}

	if (errors.length > 0) {
		throw new Error(
			`Malformed slap-scene asset directory ${inputDir}:\n- ${errors.join("\n- ")}`
		)
	}
}

const validateImages = async (
	magick: string,
	inputDir: string,
	assets: SceneAsset[]
) => {
	const output = await run(
		[
			magick,
			"identify",
			"-ping",
			"-format",
			"%m|%w|%h\\n",
			...assets.map((asset) => asset.path)
		],
		`ImageMagick could not inspect the scenes in ${inputDir}`
	)
	const records = output.trimEnd().split("\n")

	if (records.length !== assets.length) {
		throw new Error(
			`ImageMagick reported ${records.length} image frame(s) for ${assets.length} scene files; animated or multi-frame inputs are not supported`
		)
	}

	const errors: string[] = []
	let expectedDimensions: { width: number; height: number } | undefined

	for (const [index, record] of records.entries()) {
		const asset = assets[index]
		const match = /^([^|]+)\|(\d+)\|(\d+)$/.exec(record)
		const assetPath = relative(inputDir, asset.path)
		if (!match) {
			errors.push(`${assetPath}: unrecognized identify output ${record}`)
			continue
		}

		const [, format, widthText, heightText] = match
		const width = Number(widthText)
		const height = Number(heightText)
		if (format !== "WEBP") {
			errors.push(`${assetPath}: expected WEBP, found ${format}`)
		}
		if (width * 2 !== height * 3) {
			errors.push(
				`${assetPath}: expected a 3:2 landscape image, found ${width}x${height}`
			)
		}
		if (width < tileWidth || height < tileHeight) {
			errors.push(
				`${assetPath}: ${width}x${height} is smaller than the ${tileWidth}x${tileHeight} review tile`
			)
		}

		if (!expectedDimensions) {
			expectedDimensions = { width, height }
		} else if (
			width !== expectedDimensions.width ||
			height !== expectedDimensions.height
		) {
			errors.push(
				`${assetPath}: expected consistent ${expectedDimensions.width}x${expectedDimensions.height} dimensions, found ${width}x${height}`
			)
		}
	}

	if (errors.length > 0) {
		throw new Error(`Invalid slap-scene images:\n- ${errors.join("\n- ")}`)
	}

	if (!expectedDimensions) {
		throw new Error(`No slap-scene images found in ${inputDir}`)
	}

	return expectedDimensions
}

const selectFont = async (magick: string) => {
	const fontList = await run(
		[magick, "-list", "font"],
		"ImageMagick could not list installed fonts"
	)
	const availableFonts = new Set(
		[...fontList.matchAll(/^\s*Font:\s*(.+?)\s*$/gm)].map(
			(match) => match[1]
		)
	)
	const font = fontCandidates.find((candidate) =>
		availableFonts.has(candidate)
	)
	if (!font) {
		throw new Error(
			`No supported ImageMagick label font found. Install one of: ${fontCandidates.join(", ")}`
		)
	}
	return font
}

const buildSheet = async (
	magick: string,
	font: string,
	sheet: FishSheet,
	outputDir: string
) => {
	const outputPath = resolve(outputDir, `${sheet.slug}.webp`)
	const title = `${sheet.name} | ${sheet.slug} | ${sheet.outcomeCount} outcomes x ${slapSceneVariants.length} variants`

	await run(
		[
			magick,
			"montage",
			"-background",
			"#111111",
			"-fill",
			"#f5f5f5",
			"-stroke",
			"none",
			"-font",
			font,
			"-pointsize",
			"20",
			"-label",
			"%t",
			...sheet.assets.map((asset) => asset.path),
			"-tile",
			`${columns}x`,
			"-geometry",
			`${tileWidth}x${tileHeight}+${tileGap}+${tileGap}`,
			"-title",
			title,
			"-strip",
			"-colorspace",
			"sRGB",
			"-quality",
			"90",
			"-define",
			"webp:method=6",
			outputPath
		],
		`Could not build contact sheet for ${sheet.slug}`
	)

	console.log(`Wrote ${sheet.slug}.webp`)
}

const main = async () => {
	const args = Bun.argv.slice(2)
	if (args.length > 2) {
		throw new Error(
			`Usage: bun scripts/build-slap-contact-sheets.ts [input-dir] [output-dir]`
		)
	}

	const inputDir = resolve(args[0] ?? defaultInputDir)
	const outputDir = resolve(args[1] ?? defaultOutputDir)
	if (
		isSameOrInside(outputDir, inputDir) ||
		isSameOrInside(inputDir, outputDir)
	) {
		throw new Error(
			`Input and output directories must not overlap:\nInput: ${inputDir}\nOutput: ${outputDir}`
		)
	}

	const magick = Bun.which("magick")
	if (!magick) {
		throw new Error(
			"ImageMagick is required, but the `magick` command is not installed or not on PATH"
		)
	}

	const sheets = buildSheetPlans(inputDir)
	await validateStructure(inputDir, sheets)

	const assets = sheets.flatMap((sheet) => sheet.assets)
	const dimensions = await validateImages(
		magick,
		inputDir,
		assets
	)
	const font = await selectFont(magick)
	console.log(
		`Validated ${assets.length} WebP scenes at ${dimensions.width}x${dimensions.height}; using ${font} labels`
	)

	const stagingDir = `${outputDir}.tmp-${process.pid}`
	await rm(stagingDir, { recursive: true, force: true })
	await mkdir(dirname(outputDir), { recursive: true })
	await mkdir(stagingDir, { recursive: true })

	try {
		for (const sheet of sheets) {
			await buildSheet(magick, font, sheet, stagingDir)
		}
		await rm(outputDir, { recursive: true, force: true })
		await rename(stagingDir, outputDir)
	} catch (error) {
		await rm(stagingDir, { recursive: true, force: true })
		throw error
	}

	console.log(
		`Built ${sheets.length} contact sheets in ${outputDir}`
	)
}

try {
	await main()
} catch (error) {
	console.error(
		`build-slap-contact-sheets: ${describeError(error)}`
	)
	process.exitCode = 1
}
