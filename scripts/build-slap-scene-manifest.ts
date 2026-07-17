import { createHash } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { dirname } from "node:path"
import {
	slapConfig,
	slapOutcomesForRarity,
	slapSceneVariants,
	type SlapOutcome
} from "../src/config/slap.js"

type FishVisual = {
	species: string
	appearance: string
	contactSurface: string
	safetyNote?: string
}

type Gender = "woman" | "man" | "nonbinary"

type HumanProfile = {
	gender: Gender
	description: string
}

type CastPair = {
	id: string
	actor: HumanProfile
	target: HumanProfile
}

type World = {
	id: string
	family: string
	era: string
	description: string
	wardrobe: string
}

type Medium = {
	id: string
	useCase: "photorealistic-natural" | "stylized-concept" | "illustration-story"
	description: string
}

type Treatment = {
	id: string
	description: string
}

const outputPath = Bun.argv[2] ?? "tmp/imagegen/slap-scenes.jsonl"
const metadataPath =
	Bun.argv[3] ?? "tmp/imagegen/slap-scenes.metadata.json"
const manifestSeed = "FISH_SLAP_LIBRARY_V2"

const fishVisuals: Record<string, FishVisual> = {
	"procedural-herring": {
		species: "Atlantic herring",
		appearance: "slender silver body with a blue-green back",
		contactSurface: "broad silver flank"
	},
	"compliance-sardine": {
		species: "European sardine",
		appearance: "small silver body with subtle dark spots",
		contactSurface: "flat silver side"
	},
	"moderate-concern-mackerel": {
		species: "Atlantic mackerel",
		appearance: "streamlined silver body with dark wavy back stripes",
		contactSurface: "striped flank"
	},
	"rubber-stamp-trout": {
		species: "rainbow trout",
		appearance: "speckled silver body with a muted pink lateral stripe",
		contactSurface: "speckled broad side"
	},
	"escalation-salmon": {
		species: "Atlantic salmon",
		appearance: "large muscular silver body with dark dorsal spots",
		contactSurface: "heavy silver flank"
	},
	"inflatable-pufferfish": {
		species: "inflated yellow-spotted pufferfish",
		appearance: "round inflated body with soft visible spines",
		contactSurface: "rounded side",
		safetyNote: "the pufferfish spines are soft theatrical props"
	},
	"filing-cabinet-flounder": {
		species: "European flounder",
		appearance: "flat mottled brown body with both eyes on the upper side",
		contactSurface: "wide flat side"
	},
	"due-process-swordfish": {
		species: "swordfish",
		appearance: "powerful silver-blue body with a long recognizable bill",
		contactSurface: "broad body flank",
		safetyNote: "the bill points safely away from every person"
	},
	"corrective-action-eel": {
		species: "European eel",
		appearance: "long flexible dark olive body with a pale underside",
		contactSurface: "flexible middle section"
	},
	"sturgeon-general": {
		species: "Atlantic sturgeon",
		appearance: "large gray body with distinct rows of bony scutes",
		contactSurface: "heavy armored flank"
	},
	"final-notice-tuna": {
		species: "bluefin tuna",
		appearance: "large deep-bodied silver fish with a dark blue back and light frost",
		contactSurface: "broad frosty flank"
	},
	"ancient-coelacanth": {
		species: "blue coelacanth",
		appearance: "prehistoric deep-blue body with pale mottling and lobed fins",
		contactSurface: "massive ancient flank"
	}
}

const profiles: Record<string, HumanProfile> = {
	blackWoman30: {
		gender: "woman",
		description: "Black woman in her early 30s with an athletic build"
	},
	eastAsianWoman40: {
		gender: "woman",
		description: "East Asian woman in her late 40s with an average build"
	},
	southAsianWoman60: {
		gender: "woman",
		description: "South Asian woman in her 60s with a plus-size build"
	},
	whiteMan20: {
		gender: "man",
		description: "white man in his late 20s with a slim build"
	},
	latinoMan40: {
		gender: "man",
		description: "Latino man in his 40s with a broad build"
	},
	middleEasternWoman30: {
		gender: "woman",
		description: "Middle Eastern woman in her 30s with an average build"
	},
	indigenousWoman50: {
		gender: "woman",
		description: "Indigenous woman in her 50s with an average build"
	},
	blackMan30: {
		gender: "man",
		description: "Black man in his 30s with an athletic build"
	},
	eastAsianMan60: {
		gender: "man",
		description: "East Asian man in his 60s with a slim build"
	},
	latinaWoman20: {
		gender: "woman",
		description: "Latina woman in her late 20s with a plus-size build"
	},
	southeastAsianWoman40: {
		gender: "woman",
		description: "Southeast Asian woman in her 40s with a slim build"
	},
	whiteWoman30: {
		gender: "woman",
		description: "white woman in her 30s with a broad build"
	},
	mixedNonbinary20: {
		gender: "nonbinary",
		description: "mixed-heritage nonbinary adult in their late 20s with an average build"
	},
	southAsianWoman50: {
		gender: "woman",
		description: "South Asian woman in her 50s with an athletic build"
	},
	pacificMan30: {
		gender: "man",
		description: "Pacific Islander man in his 30s with a broad build"
	},
	blackWoman60: {
		gender: "woman",
		description: "Black woman in her 60s with a plus-size build"
	},
	whiteWoman40: {
		gender: "woman",
		description: "white woman in her 40s with an average build"
	},
	indigenousMan20: {
		gender: "man",
		description: "Indigenous man in his late 20s with a slim build"
	},
	middleEasternMan50: {
		gender: "man",
		description: "Middle Eastern man in his 50s with an average build"
	},
	eastAsianWoman30: {
		gender: "woman",
		description: "East Asian woman in her 30s with an athletic build"
	},
	blackNonbinary40: {
		gender: "nonbinary",
		description: "Black nonbinary adult in their 40s with a broad build"
	},
	latinaWoman60: {
		gender: "woman",
		description: "Latina woman in her 60s with an average build"
	},
	southAsianMan30: {
		gender: "man",
		description: "South Asian man in his 30s with a slim build"
	},
	pacificWoman40: {
		gender: "woman",
		description: "Pacific Islander woman in her 40s with a broad build"
	},
	latinaWoman50: {
		gender: "woman",
		description: "Latina woman in her 50s with an athletic build"
	},
	whiteNonbinary20: {
		gender: "nonbinary",
		description: "white nonbinary adult in their late 20s with an average build"
	},
	eastAsianWoman20: {
		gender: "woman",
		description: "East Asian woman in her late 20s with a slim build"
	},
	blackMan50: {
		gender: "man",
		description: "Black man in his 50s with a plus-size build"
	},
	indigenousNonbinary30: {
		gender: "nonbinary",
		description: "Indigenous nonbinary adult in their 30s with an average build"
	},
	southeastAsianWoman60: {
		gender: "woman",
		description: "Southeast Asian woman in her 60s with a slim build"
	},
	whiteMan60: {
		gender: "man",
		description: "white man in his 60s with a broad build"
	},
	middleEasternWoman40: {
		gender: "woman",
		description: "Middle Eastern woman in her 40s with a plus-size build"
	},
	blackWoman20: {
		gender: "woman",
		description: "Black woman in her late 20s with an average build"
	},
	southAsianNonbinary50: {
		gender: "nonbinary",
		description: "South Asian nonbinary adult in their 50s with a slim build"
	},
	latinoMan30: {
		gender: "man",
		description: "Latino man in his 30s with an athletic build"
	},
	eastAsianMan40: {
		gender: "man",
		description: "East Asian man in his 40s with an average build"
	},
	pacificWoman50: {
		gender: "woman",
		description: "Pacific Islander woman in her 50s with a broad build"
	},
	whiteWoman20: {
		gender: "woman",
		description: "white woman in her late 20s with a slim build"
	},
	southeastAsianMan40: {
		gender: "man",
		description: "Southeast Asian man in his 40s with an average build"
	},
	indigenousWoman30: {
		gender: "woman",
		description: "Indigenous woman in her 30s with an athletic build"
	},
	middleEasternNonbinary60: {
		gender: "nonbinary",
		description: "Middle Eastern nonbinary adult in their 60s with an average build"
	},
	latinaWoman40: {
		gender: "woman",
		description: "Latina woman in her 40s with a plus-size build"
	},
	whiteWomanAthletic30: {
		gender: "woman",
		description: "white woman in her 30s with an athletic build"
	},
	blackWoman50: {
		gender: "woman",
		description: "Black woman in her 50s with an average build"
	},
	southAsianWoman20: {
		gender: "woman",
		description: "South Asian woman in her late 20s with a slim build"
	},
	pacificMan60: {
		gender: "man",
		description: "Pacific Islander man in his 60s with a broad build"
	},
	eastAsianNonbinary50: {
		gender: "nonbinary",
		description: "East Asian nonbinary adult in their 50s with an average build"
	},
	latinoMan20: {
		gender: "man",
		description: "Latino man in his late 20s with an athletic build"
	}
}

const castPairs: readonly CastPair[] = [
	{ id: "cast-01", actor: profiles.blackWoman30, target: profiles.eastAsianWoman40 },
	{ id: "cast-02", actor: profiles.southAsianWoman60, target: profiles.whiteMan20 },
	{ id: "cast-03", actor: profiles.latinoMan40, target: profiles.middleEasternWoman30 },
	{ id: "cast-04", actor: profiles.indigenousWoman50, target: profiles.blackMan30 },
	{ id: "cast-05", actor: profiles.eastAsianMan60, target: profiles.latinaWoman20 },
	{ id: "cast-06", actor: profiles.southeastAsianWoman40, target: profiles.whiteWoman30 },
	{ id: "cast-07", actor: profiles.mixedNonbinary20, target: profiles.southAsianWoman50 },
	{ id: "cast-08", actor: profiles.pacificMan30, target: profiles.blackWoman60 },
	{ id: "cast-09", actor: profiles.whiteWoman40, target: profiles.indigenousMan20 },
	{ id: "cast-10", actor: profiles.middleEasternMan50, target: profiles.eastAsianWoman30 },
	{ id: "cast-11", actor: profiles.blackNonbinary40, target: profiles.latinaWoman60 },
	{ id: "cast-12", actor: profiles.southAsianMan30, target: profiles.pacificWoman40 },
	{ id: "cast-13", actor: profiles.latinaWoman50, target: profiles.whiteNonbinary20 },
	{ id: "cast-14", actor: profiles.eastAsianWoman20, target: profiles.blackMan50 },
	{ id: "cast-15", actor: profiles.indigenousNonbinary30, target: profiles.southeastAsianWoman60 },
	{ id: "cast-16", actor: profiles.whiteMan60, target: profiles.middleEasternWoman40 },
	{ id: "cast-17", actor: profiles.blackWoman20, target: profiles.southAsianNonbinary50 },
	{ id: "cast-18", actor: profiles.latinoMan30, target: profiles.eastAsianMan40 },
	{ id: "cast-19", actor: profiles.pacificWoman50, target: profiles.whiteWoman20 },
	{ id: "cast-20", actor: profiles.southeastAsianMan40, target: profiles.indigenousWoman30 },
	{ id: "cast-21", actor: profiles.middleEasternNonbinary60, target: profiles.latinaWoman40 },
	{ id: "cast-22", actor: profiles.whiteWomanAthletic30, target: profiles.blackWoman50 },
	{ id: "cast-23", actor: profiles.southAsianWoman20, target: profiles.pacificMan60 },
	{ id: "cast-24", actor: profiles.eastAsianNonbinary50, target: profiles.latinoMan20 }
]

const worlds: readonly World[] = [
	{ id: "library-1920s", family: "cultural", era: "1920s", description: "a grand public library reading hall with brass lamps and tall shelves", wardrobe: "period knitwear and tailored library attire" },
	{ id: "museum-night", family: "cultural", era: "contemporary", description: "a natural-history museum gallery after hours with fossil displays", wardrobe: "colorful contemporary museum-visit clothing" },
	{ id: "aquarium-tunnel", family: "cultural", era: "near-future", description: "a luminous empty aquarium tunnel with rippling blue caustics and curved glass", wardrobe: "sleek near-future leisure clothing" },
	{ id: "hotel-art-deco", family: "cultural", era: "1930s", description: "an Art Deco hotel lobby with geometric marble and brass fixtures", wardrobe: "contrasting period eveningwear" },
	{ id: "sculpture-garden", family: "cultural", era: "contemporary", description: "an open-air sculpture garden beside a reflecting pool", wardrobe: "bold modern casual clothing" },
	{ id: "observatory-rotunda", family: "cultural", era: "1890s", description: "a brass astronomical observatory beneath an open dome", wardrobe: "era-appropriate academic and artisan clothing" },
	{ id: "bakery-kitchen", family: "maker", era: "contemporary", description: "a bright artisan bakery kitchen with flour haze and cooling racks", wardrobe: "distinctive aprons over colorful workwear" },
	{ id: "pottery-studio", family: "maker", era: "1970s", description: "a sunlit pottery studio with clay wheels and glazed vessels", wardrobe: "textured 1970s artisan clothing" },
	{ id: "glass-greenhouse", family: "maker", era: "Edwardian", description: "a vast glass greenhouse filled with tropical leaves and mist", wardrobe: "era-appropriate botanical field clothing" },
	{ id: "print-shop", family: "maker", era: "1940s", description: "a busy letterpress print shop with rollers and hanging paper", wardrobe: "rolled-sleeve period trade clothing" },
	{ id: "radio-studio", family: "maker", era: "1960s", description: "a colorful analog radio studio with padded walls and reel machines", wardrobe: "contrasting 1960s broadcast clothing" },
	{ id: "clockwork-workshop", family: "maker", era: "timeless fantasy", description: "a clockwork workshop packed with brass gears and moving automata", wardrobe: "fantastical utility clothing and leather aprons" },
	{ id: "neon-diner", family: "social", era: "1980s", description: "a neon roadside diner with chrome booths and checkerboard flooring", wardrobe: "bright 1980s casual clothing" },
	{ id: "laundromat", family: "social", era: "contemporary", description: "a colorful late-night laundromat with circular machines and plastic baskets", wardrobe: "contrasting everyday streetwear" },
	{ id: "rooftop-cookout", family: "social", era: "2000s", description: "a city rooftop cookout at sunset with string lights and folding chairs", wardrobe: "relaxed early-2000s outdoor clothing" },
	{ id: "bowling-alley", family: "social", era: "1970s", description: "a saturated retro bowling alley with polished lanes", wardrobe: "playful bowling shirts and flared casual clothing" },
	{ id: "alpine-lodge", family: "social", era: "1960s", description: "a warm alpine lodge common room with stone hearth and snow outside", wardrobe: "textured winter knitwear" },
	{ id: "seaside-cafe", family: "social", era: "timeless", description: "a breezy seaside cafe terrace overlooking a bright harbor", wardrobe: "light nautical leisure clothing" },
	{ id: "ferry-deck", family: "travel", era: "contemporary", description: "an open ferry deck crossing a windy gray bay", wardrobe: "layered waterproof travel clothing" },
	{ id: "sleeper-train", family: "travel", era: "1930s", description: "an elegant sleeper-train dining car rushing through the night", wardrobe: "contrasting 1930s travel attire" },
	{ id: "cable-car-station", family: "travel", era: "contemporary", description: "a mountain cable-car station above a dramatic valley", wardrobe: "bright technical outdoor clothing" },
	{ id: "baggage-hall", family: "travel", era: "1960s", description: "a stylized jet-age airport baggage hall without signs or branding", wardrobe: "color-blocked 1960s travel clothing" },
	{ id: "motel-courtyard", family: "travel", era: "1950s", description: "a desert motel courtyard with a turquoise pool and parked luggage carts", wardrobe: "sun-faded 1950s road-trip clothing" },
	{ id: "retro-spaceport", family: "travel", era: "near-future", description: "a retro-futurist spaceport departure hall with curved windows and small shuttles", wardrobe: "contrasting futurist travel clothing" },
	{ id: "beach-boardwalk", family: "outdoors", era: "contemporary", description: "a sunny beach boardwalk beside carnival rides and rolling surf", wardrobe: "colorful coastal casual clothing" },
	{ id: "snowy-square", family: "outdoors", era: "1890s", description: "a lantern-lit snowy town square with horse-drawn sleigh tracks", wardrobe: "layered period winter clothing" },
	{ id: "desert-rest-stop", family: "outdoors", era: "1980s", description: "a dramatic desert rest stop beneath a vast orange sky", wardrobe: "windblown 1980s road clothing" },
	{ id: "botanical-garden", family: "outdoors", era: "contemporary", description: "a lush botanical garden path beneath oversized leaves", wardrobe: "vivid contemporary daywear" },
	{ id: "mountain-terrace", family: "outdoors", era: "timeless", description: "a stone mountain terrace above clouds and distant peaks", wardrobe: "layered expedition clothing" },
	{ id: "fishing-pier", family: "outdoors", era: "1940s", description: "a moonlit wooden fishing pier with nets and rolling fog", wardrobe: "period coastal workwear" },
	{ id: "theater-backstage", family: "performance", era: "contemporary", description: "a theater backstage area with curtains, ropes, and practical lights", wardrobe: "contrasting rehearsal and stage clothing" },
	{ id: "roller-rink", family: "performance", era: "1980s", description: "a glowing roller rink with mirror balls and painted floor patterns", wardrobe: "high-color 1980s performance clothing" },
	{ id: "game-show-set", family: "performance", era: "1960s", description: "a geometric television game-show set without words or logos", wardrobe: "bold 1960s studio clothing" },
	{ id: "jazz-club", family: "performance", era: "1920s", description: "a smoky jazz-club stage with brass instruments and velvet curtains", wardrobe: "contrasting 1920s evening clothing" },
	{ id: "wrestling-arena", family: "performance", era: "contemporary", description: "a theatrical wrestling arena under bright spotlights with no crowd text", wardrobe: "colorful performance and sports clothing" },
	{ id: "opera-hall", family: "performance", era: "1890s", description: "an ornate opera rehearsal hall with painted scenery and empty balconies", wardrobe: "period rehearsal and formal clothing" },
	{ id: "castle-courtyard", family: "historical-future", era: "medieval", description: "a lively stone castle courtyard during a harvest festival", wardrobe: "colorful medieval festival clothing" },
	{ id: "renaissance-banquet", family: "historical-future", era: "Renaissance", description: "a lavish Renaissance banquet hall with fruit, tapestries, and long tables", wardrobe: "contrasting Renaissance court clothing" },
	{ id: "sailing-ship", family: "historical-future", era: "1700s", description: "the windblown deck of a wooden sailing ship under full canvas", wardrobe: "era-appropriate nautical workwear" },
	{ id: "train-platform", family: "historical-future", era: "1890s", description: "a steam-filled iron train platform beneath a glass roof", wardrobe: "layered late-Victorian travel clothing" },
	{ id: "moonbase-galley", family: "historical-future", era: "near-future", description: "a moonbase galley with a wide window onto the lunar surface", wardrobe: "soft futurist utility clothing" },
	{ id: "underwater-habitat", family: "historical-future", era: "near-future", description: "an underwater research habitat with thick windows and blue ocean beyond", wardrobe: "bright technical research clothing" },
	{ id: "flooded-archive", family: "surreal", era: "timeless surreal", description: "a flooded archive where shelves rise from mirror-still water", wardrobe: "formal clothing adapted into dreamlike waterproof layers" },
	{ id: "giant-dollhouse", family: "surreal", era: "timeless surreal", description: "a room-sized dollhouse interior with oversized furniture and open walls", wardrobe: "graphic toy-like clothing silhouettes" },
	{ id: "cloud-station", family: "surreal", era: "timeless mythic", description: "a railway platform floating above a sea of clouds", wardrobe: "windblown mythic travel clothing" },
	{ id: "upside-down-banquet", family: "surreal", era: "timeless surreal", description: "an upside-down banquet room where chairs hang from the ceiling", wardrobe: "contrasting formal clothing with surreal proportions" },
	{ id: "miniature-city", family: "surreal", era: "near-future", description: "a rooftop above a miniature glowing city built from household objects", wardrobe: "bold near-future street clothing" },
	{ id: "cosmic-court", family: "surreal", era: "timeless cosmic", description: "a vast cosmic amphitheater surrounded by stars and floating stone", wardrobe: "ceremonial mythic clothing" }
]

const media: readonly Medium[] = [
	{ id: "cinematic-digital", useCase: "photorealistic-natural", description: "polished digital-cinema action comedy with realistic skin, scales, fabric, and water spray" },
	{ id: "period-film", useCase: "photorealistic-natural", description: "authentic period 35mm film still with visible grain, practical lighting, and natural motion blur" },
	{ id: "editorial-flash", useCase: "photorealistic-natural", description: "high-energy editorial flash photography with crisp color and spontaneous expressions" },
	{ id: "sports-photo", useCase: "photorealistic-natural", description: "professional sports photojournalism freezing the exact action at high shutter speed" },
	{ id: "film-noir", useCase: "stylized-concept", description: "high-contrast monochrome film-noir still with expressive shadows and silver highlights" },
	{ id: "cel-animation", useCase: "illustration-story", description: "hand-painted cel-animation frame with clean shapes, expressive acting, and textured backgrounds" },
	{ id: "graphic-novel", useCase: "illustration-story", description: "clean inked graphic-novel panel with controlled flat color and readable silhouettes, no lettering" },
	{ id: "pulp-halftone", useCase: "illustration-story", description: "vintage pulp halftone illustration with dramatic foreshortening and saturated spot color, no title text" },
	{ id: "gouache", useCase: "illustration-story", description: "rich hand-painted gouache illustration with visible brush texture and bold shape design" },
	{ id: "watercolor", useCase: "illustration-story", description: "luminous watercolor-and-ink illustration with loose edges and precise action staging" },
	{ id: "oil-tableau", useCase: "stylized-concept", description: "theatrical oil-painted tableau with classical light and absurdly serious composition" },
	{ id: "stop-motion", useCase: "stylized-concept", description: "handcrafted stop-motion miniature with tactile fabric, painted props, and practical droplets" },
	{ id: "stylized-3d", useCase: "stylized-concept", description: "high-end stylized 3D animation frame with appealing shapes and physically based materials" },
	{ id: "clay-animation", useCase: "stylized-concept", description: "expressive clay-animation frame with visible fingerprints and playful squash-and-stretch" },
	{ id: "screen-print", useCase: "illustration-story", description: "limited-palette screen-printed poster art with bold registration and no typography" },
	{ id: "retro-airbrush", useCase: "stylized-concept", description: "retro-futurist airbrush illustration with luminous gradients and chrome-like highlights" },
	{ id: "surreal-collage", useCase: "stylized-concept", description: "surreal mixed-media collage combining photographic texture, cut paper, and painted motion" },
	{ id: "linocut", useCase: "illustration-story", description: "bold linocut-style print with carved texture, dramatic negative space, and restrained color" }
]

const cameras: readonly Treatment[] = [
	{ id: "strict-profile", description: "strict side-profile medium-wide view with the full fish and contact point unobstructed" },
	{ id: "front-three-quarter", description: "front three-quarter action view with both expressions and the complete action silhouette readable" },
	{ id: "reverse-three-quarter", description: "reverse three-quarter view from behind the target while keeping cheek contact visible" },
	{ id: "low-wide", description: "low-angle wide shot with strong foreground motion and complete bodies inside frame" },
	{ id: "high-tableau", description: "high-angle tableau showing the action path and spatial relationships clearly" },
	{ id: "actor-shoulder", description: "over the actor's shoulder with the fish, gripping hand, and target cheek all visible" },
	{ id: "target-shoulder", description: "over the target's shoulder with the actor's follow-through and full fish readable" },
	{ id: "symmetrical", description: "symmetrical frontal composition centered on the exact action" },
	{ id: "telephoto-side", description: "compressed telephoto side view like a decisive sports photograph" },
	{ id: "handheld", description: "close handheld documentary framing with readable action and energetic imperfection" },
	{ id: "dutch-wide", description: "controlled Dutch-angle wide shot that keeps anatomy and action immediately understandable" },
	{ id: "proscenium", description: "full proscenium-style view with theatrical blocking and no cropped participants" }
]

const tones: readonly Treatment[] = [
	{ id: "deadpan", description: "bureaucratic deadpan played with complete seriousness" },
	{ id: "bright-farce", description: "bright physical farce with surprised but non-distressed reactions" },
	{ id: "adventure", description: "swashbuckling adventure energy without danger or injury" },
	{ id: "melodrama", description: "lavish melodrama with exaggerated dignity and theatrical recoil" },
	{ id: "sports-replay", description: "high-stakes sports-replay intensity applied to harmless nonsense" },
	{ id: "cozy", description: "warm cozy comedy with gentle absurdity" },
	{ id: "surreal", description: "friendly surrealism with matter-of-fact character reactions" },
	{ id: "mythic", description: "mythic absurdity presented as an event of historical importance" },
	{ id: "documentary", description: "documentary sincerity as though recording an unusual civic ritual" },
	{ id: "camp", description: "lavish camp spectacle with bold poses and colorful production design" },
	{ id: "noir", description: "dry noir tension with harmless physical comedy" },
	{ id: "celebratory", description: "celebratory festival energy with no hostile crowd or distress" }
]

const lighting: readonly Treatment[] = [
	{ id: "golden-side", description: "warm side light with cool environmental fill" },
	{ id: "soft-overcast", description: "soft overcast illumination with saturated wardrobe color" },
	{ id: "hard-flash", description: "direct flash balanced by deep ambient color" },
	{ id: "stage-rim", description: "bright theatrical rim light and controlled front fill" },
	{ id: "moonlit", description: "silver moonlight with warm practical highlights" },
	{ id: "neon", description: "contrasting neon light with clean skin and fish color separation" },
	{ id: "sunlit", description: "clear midday sunlight with crisp natural shadows" },
	{ id: "candlelit", description: "warm candle and firelight with luminous edge detail" },
	{ id: "underwater-blue", description: "deep aquatic blue light with bright caustic highlights" },
	{ id: "pastel-studio", description: "soft pastel studio light with graphic shadow shapes" },
	{ id: "storm-light", description: "dramatic storm light with a bright harmless impact rim" },
	{ id: "colored-practical", description: "mixed colorful practical lights with readable faces and action" }
]

const palettes: readonly Treatment[] = [
	{ id: "coral-teal", description: "coral, teal, silver, and cream" },
	{ id: "cobalt-gold", description: "cobalt blue, gold, white, and charcoal" },
	{ id: "berry-mint", description: "berry red, mint green, navy, and warm gray" },
	{ id: "sunset", description: "sunset orange, violet, pale blue, and black" },
	{ id: "primary", description: "clean primary colors balanced with natural neutrals" },
	{ id: "forest-rose", description: "forest green, dusty rose, silver, and ivory" },
	{ id: "cyan-magenta", description: "electric cyan, magenta, deep purple, and white" },
	{ id: "ochre-indigo", description: "ochre, indigo, rust, and parchment" },
	{ id: "ice-red", description: "icy blue, signal red, graphite, and white" },
	{ id: "tropical", description: "tropical green, turquoise, hibiscus red, and sand" },
	{ id: "monochrome-accent", description: "near-monochrome values with one vivid color accent" },
	{ id: "jewel", description: "emerald, sapphire, ruby, and warm metallic highlights" }
]

const staging: Record<SlapOutcome, readonly string[]> = {
	normal: [
		"The actor completes one clean sideways swing by the fish tail.",
		"The actor turns through a compact one-handed follow-through.",
		"The actor plants their feet and delivers one measured broadside swing.",
		"The actor pivots from a still pose into one crisp theatrical slap.",
		"The actor makes a precise waist-high arc that rises to cheek level.",
		"The actor completes a ceremonial-looking single slap with perfect timing."
	],
	critical: [
		"The actor lands an exaggerated action-movie impact that throws harmless spray outward.",
		"The impact creates a theatrical ring of droplets and fluttering loose objects.",
		"The target recoils dramatically while the fish remains intact and clearly controlled.",
		"The actor's full-body follow-through creates an absurd but harmless shockwave.",
		"The exact impact is frozen like a championship knockout photograph without injury.",
		"The critical strike is staged as a mythically overimportant civic event."
	],
	dodge: [
		"The intended target ducks; the fish curves back and strikes the surprised actor instead.",
		"The target sidesteps; the fish completes a visible return-to-sender arc into the actor.",
		"The target leans away; the missed fish loops around and contacts the actor's cheek.",
		"The target drops safely below the swing; momentum pivots the fish back into the actor.",
		"The target spins aside; the fish traces a readable boomerang path to the actor.",
		"The target calmly takes one step back; the fish reverses course into the actor."
	],
	refusal: [
		"The fish wriggles free before contact and lands safely in a water-filled tub.",
		"The fish twists out of the actor's grip and slides onto a padded empty surface.",
		"The fish springs upward from the swing while the intended target remains untouched.",
		"The fish bends away from the target and escapes behind the actor without contact.",
		"The fish refuses the arc, slips free, and lands safely between the adults.",
		"The actor follows through empty-handed after the fish exits safely in the opposite direction."
	],
	double: [
		"The actor uses exactly two matching fish, one in each hand, to contact both target cheeks simultaneously.",
		"The actor crosses two matching fish into a symmetrical two-cheek impact.",
		"The actor delivers a synchronized left-and-right broadside slap with exactly two fish.",
		"The two matching fish arrive from opposite sides at the same instant.",
		"The actor completes a theatrical double-fish flourish ending on both cheeks.",
		"The target is centered between exactly two matching fish with both contact points visible."
	],
	legendary: [
		"An enormous ancient coelacanth lands one history-making broadside slap as a circular wall of water rises.",
		"The coelacanth crosses the scene like a maritime omen and makes unmistakable cheek contact.",
		"The legendary impact appears to stop time, tide, and every background object for one instant."
	],
	self: [
		"The slippery fish pivots from the actor's grip and harmlessly returns into that same actor's cheek.",
		"The actor fumbles the fish during a demonstration and its broad side bumps the actor's cheek.",
		"The fish swings around on momentum and contacts the same surprised performer who holds it.",
		"The actor rehearses the motion alone; the fish folds back into a clear accidental self-slap.",
		"The fish slips upward from the actor's hands and lands broadside across the actor's cheek.",
		"The actor's exaggerated follow-through redirects the fish into one unmistakable self-contact."
	],
	hermit: [
		"A compact original hermit robot catches the incoming fish in one mechanical claw before contact.",
		"A compact original hermit robot blocks the fish with a hard shell panel and confiscates it.",
		"A compact original hermit robot parries the fish with a plain metal tray before contact.",
		"A compact original hermit robot uses a telescoping padded clamp to stop the complete fish.",
		"A compact original hermit robot raises a padded shield and redirects the fish safely downward.",
		"A compact original hermit robot catches the fish in a small water bucket and returns it."
	],
	rock_lobster: [
		"A giant red rock lobster catches the incoming fish in one claw before contact.",
		"A giant red rock lobster crosses both claws to stop the complete fish mid-swing.",
		"A giant red rock lobster balances the intercepted fish overhead with one authoritative claw.",
		"A giant red rock lobster redirects the fish safely into a water tub.",
		"A giant red rock lobster pins the intact fish gently against an empty surface and stares down the actor.",
		"A giant red rock lobster holds the stopped fish aloft while pointing the other claw at the actor."
	],
	bot: [
		"The actor lands one broadside fish slap on an undamaged friendly service robot's cheek panel.",
		"The fish contacts a friendly rounded robot's face display while status lights flicker harmlessly.",
		"The actor completes a clear fish-to-metal-cheek impact on an original domestic robot.",
		"The intact fish lands flat against an original retro robot's face grille without damage.",
		"The actor slaps a small unbranded humanoid robot with the fish broadside, not head-first.",
		"The fish makes clean cheek-panel contact with a friendly maintenance robot that remains upright."
	]
}

const gcd = (left: number, right: number): number =>
	right === 0 ? Math.abs(left) : gcd(right, left % right)

const stableIndex = (key: string, salt: string, length: number) => {
	const digest = createHash("sha256")
		.update(`${manifestSeed}:${salt}:${key}`)
		.digest()
	return digest.readUInt32BE(0) % length
}

const stepFor = (length: number) =>
	[5, 7, 11, 13, 17, 19].find((candidate) => gcd(candidate, length) === 1) ?? 1

const pickVariant = <T>(
	values: readonly T[],
	groupKey: string,
	salt: string,
	variantIndex: number
) => {
	const start = stableIndex(groupKey, salt, values.length)
	return values[(start + variantIndex * stepFor(values.length)) % values.length]!
}

const fishDescription = (visual: FishVisual) =>
	`one whole anatomically recognizable ${visual.species}, ${visual.appearance}`

const castFor = (outcome: SlapOutcome, cast: CastPair, world: World) => {
	const actor = `${cast.actor.description}, wearing ${world.wardrobe}`
	const target =
		`${cast.target.description}, wearing a visually distinct era-appropriate outfit suited to the same setting`
	switch (outcome) {
		case "self":
			return `ACTOR: ${actor}. There is no second human.`
		case "hermit":
			return `ACTOR: ${actor}. TARGET: one original compact hard-shell hermit robot.`
		case "rock_lobster":
			return `ACTOR: ${actor}. TARGET: one enormous anatomically plausible red rock lobster.`
		case "bot":
			return `ACTOR: ${actor}. TARGET: one original friendly face-bearing service robot.`
		default:
			return `ACTOR: ${actor}. TARGET: ${target}.`
	}
}

const actionFor = (
	outcome: SlapOutcome,
	visual: FishVisual,
	stagingLine: string,
	cheek: "left" | "right"
) => {
	const fish = visual.species
	const contact = visual.contactSurface
	const visibleContact = (owner: string, surface = "cheek") =>
		`The complete intact ${fish} is visible nose-to-tail. Its ${contact} crosses sideways and visibly flattens against the center of ${owner}'s ${cheek} ${surface}, clearly away from the eye, nose, and mouth, at the exact instant of contact. The gripping hand, fish body, contact point, and recoil form one traceable action silhouette.`
	const airborneContact =
		`The complete intact ${fish} is airborne and untouched by any hand. Its broad middle ${contact} lies flat across the center of the actor's ${cheek} cheek while the fish head points away from the actor's face and past the actor's shoulder. The actor's eyes, nose, and mouth remain fully visible and unobstructed.`

	switch (outcome) {
		case "normal":
		case "critical":
		case "legendary":
			return `${stagingLine} ${visibleContact("the target")}`
		case "dodge":
			return `${stagingLine} The intended target is clearly untouched and spatially separated. A visible curved motion trail connects the missed swing to the returning fish. ${airborneContact}`
		case "refusal":
			return `${stagingLine} Show a clean visible gap between fish and target. The intended target is clearly untouched.`
		case "double":
			return `${stagingLine} Exactly two complete intact matching ${visual.species} are visible nose-to-tail, each held by a separate traceable arm from the same actor. Both broadside cheek contacts are unobstructed.`
		case "self":
			return `${stagingLine} One of the actor's hands remains visibly connected to the fish tail; the fish is not floating freely. ${visibleContact("the actor")}`
		case "hermit":
			return `${stagingLine} The complete fish, interception method, actor, and untouched robot face are visible with a clean gap at the stopped contact point.`
		case "rock_lobster":
			return `${stagingLine} The complete fish, lobster claws, and failed swing remain visible; the lobster is untouched and dominant.`
		case "bot":
			return `${stagingLine} ${visibleContact("the robot", "cheek panel")}`
	}
}

const compositionFor = (outcome: SlapOutcome) => {
	switch (outcome) {
		case "dodge":
			return "Show the untouched dodging target and the struck actor in one readable frame."
		case "refusal":
			return "Show the escaping fish, empty-handed follow-through, and untouched target in one readable frame."
		case "double":
			return "Both fish-to-cheek contact points must remain visible at thumbnail size."
		case "self":
			return "Show one performer only, with the held fish and accidental return path clearly connected."
		case "hermit":
			return "Center the robot's interception and keep the fish visibly separated from the robot's face."
		case "rock_lobster":
			return "Make the lobster dominant while keeping the caught fish and failed swing fully visible."
		case "bot":
			return "Keep the fish-to-robot face contact central and the robot visibly undamaged."
		default:
			return "The broadside fish-to-cheek contact is the unmistakable focal point."
	}
}

const constraintsFor = (outcome: SlapOutcome, visual: FishVisual) => {
	const fishCount = outcome === "double"
		? "exactly two matching fish"
		: "exactly one fish"
	const participantCount =
		outcome === "self" ||
		outcome === "hermit" ||
		outcome === "rock_lobster" ||
		outcome === "bot"
			? "exactly one human"
			: "exactly two humans"
	const safety = visual.safetyNote ? `; ${visual.safetyNote}` : ""
	return [
		"harmless theatrical slapstick",
		"fictional adults only",
		participantCount,
		"no real identities",
		"no minors",
		"no blood",
		"no wounds",
		"no gore",
		"no injury",
		"no distress",
		"no readable text",
		"no signs",
		"no logos",
		"no watermark",
		fishCount,
		"recognizable fish anatomy",
		"normal human anatomy",
		"no duplicate or fused limbs",
		"every hand and arm belongs visibly to an on-screen participant",
		"heritage never determines clothing; wardrobe follows only the specified world and era",
		"no unexplained background crowd",
		"do not crop the fish"
	].join("; ") + safety
}

const avoidFor = (outcome: SlapOutcome) => [
	outcome === "refusal" || outcome === "hermit" || outcome === "rock_lobster"
		? "accidental fish contact"
		: "fish merely floating beside the face",
	"head-first fish contact",
	"fish touching the mouth or nose",
	"hidden contact point",
	"generic corporate office",
	"boardroom",
	"rows of office desks",
	"matching gray business shirts",
	"same-gender male office-worker default",
	"third person",
	"off-frame hand",
	"off-frame arm",
	"ethnic costume not requested by the world specification",
	"extra fish"
].join("; ")

const sceneCorrections: Readonly<Record<string, string>> = {
	"moderate-concern-mackerel:normal:1":
		"The actor grips only the fish tail and swings the fish sideways across the target. The middle of the broad flank lies flat against the outer cheek near the ear. The fish head extends harmlessly past the far side of the target's head instead of pointing into the face. Show a clear air gap around the eye, nose, and closed lips.",
	"sturgeon-general:self:2":
		"The single performer visibly grips the fish tail with one hand throughout the return arc. The fish is never floating freely, and its broad flank contacts the outer cheek away from the eye, nose, and mouth."
}

const strictDoubleScenes = new Set([
	"procedural-herring:double:3",
	"compliance-sardine:double:3",
	"moderate-concern-mackerel:double:1",
	"rubber-stamp-trout:double:1",
	"rubber-stamp-trout:double:3",
	"inflatable-pufferfish:double:1",
	"inflatable-pufferfish:double:2",
	"due-process-swordfish:double:1",
	"due-process-swordfish:double:2",
	"due-process-swordfish:double:3",
	"sturgeon-general:double:1",
	"sturgeon-general:double:2",
	"ancient-coelacanth:double:2",
	"ancient-coelacanth:double:3"
])

const secondPassDoubleScenes = new Set([
	"compliance-sardine:double:3",
	"moderate-concern-mackerel:double:1",
	"due-process-swordfish:double:2",
	"due-process-swordfish:double:3",
	"ancient-coelacanth:double:2"
])

const strictHermitScenes = new Set([
	"procedural-herring:hermit:1",
	"compliance-sardine:hermit:1",
	"compliance-sardine:hermit:3",
	"moderate-concern-mackerel:hermit:1",
	"rubber-stamp-trout:hermit:1",
	"rubber-stamp-trout:hermit:2",
	"escalation-salmon:hermit:2",
	"inflatable-pufferfish:hermit:2",
	"inflatable-pufferfish:hermit:3",
	"corrective-action-eel:hermit:1",
	"final-notice-tuna:hermit:2",
	"final-notice-tuna:hermit:3"
])

const strictRockLobsterScenes = new Set([
	"procedural-herring:rock_lobster:1",
	"escalation-salmon:rock_lobster:1",
	"filing-cabinet-flounder:rock_lobster:2",
	"filing-cabinet-flounder:rock_lobster:3"
])

const strictDodgeCorrections: Readonly<Record<string, string>> = {
	"due-process-swordfish:dodge:3":
		"The East Asian nonbinary actor in their 50s is the person struck by the returning swordfish. The Latino man in his late 20s is the intended target and must be visibly ducking, spatially separate, and completely untouched.",
	"corrective-action-eel:dodge:1":
		"The Indigenous woman in her 50s is the actor and must be struck by the returning eel. The Black man in his 30s is the intended target and must be visibly ducking, spatially separate, and completely untouched."
}

const correctionForScene = (sceneKey: string) => {
	const contactCorrection = sceneCorrections[sceneKey]
	if (contactCorrection) {
		return { kind: "contact", text: contactCorrection }
	}
	if (secondPassDoubleScenes.has(sceneKey)) {
		return {
			kind: "double_second_pass",
			text:
				"Use a front-facing waist-up two-person composition. The target faces the camera with both empty hands lowered. The actor stands fully visible behind and slightly to one side of the target. Both actor shoulders, elbows, forearms, and hands are visible and traceable: one hand grips each fish tail, and each fish extends from that hand to one of the target's cheeks. No arm enters from a frame edge. Exactly two humans and exactly two fish; no self-slap, mutual slap, third person, third fish, floating fish, or hidden hand."
		}
	}
	if (strictDoubleScenes.has(sceneKey)) {
		return {
			kind: "double",
			text:
				"Show exactly two humans and exactly two fish. The actor alone grips one fish tail in each hand and delivers both fish to the same target, one broad flank on each cheek. The target holds nothing. No mutual slap, self-slap, off-frame hand, third person, floating fish, merged fish, or extra fish."
		}
	}
	if (strictHermitScenes.has(sceneKey)) {
		return {
			kind: "hermit",
			text:
				"Hermit the robot must visibly complete the interception with its own mechanical claw, shield, tray, or tool between the fish and its face. The human does not hold the intercepting object. Keep exactly one human, one robot, and one fish; no floating fish, unrelated prop, or passive robot."
		}
	}
	const dodgeCorrection = strictDodgeCorrections[sceneKey]
	if (dodgeCorrection) {
		return { kind: "dodge", text: dodgeCorrection }
	}
	if (strictRockLobsterScenes.has(sceneKey)) {
		return {
			kind: "rock_lobster",
			text:
				"The lobster must visibly stop the failed swing by closing one claw around the middle of the single fish. The human remains attached to the fish tail and holds no net, bat, or unrelated tool. The fish is not on the floor, in a tub, floating freely, or separated from the lobster claw."
		}
	}
	return null
}

const jobs = slapConfig.fish.flatMap((fish) => {
	const visual = fishVisuals[fish.slug]
	if (!visual) {
		throw new Error(`Missing visual specification for ${fish.slug}`)
	}

	return slapOutcomesForRarity(fish.rarity).flatMap((outcome) => {
		const groupKey = `${fish.slug}:${outcome}`
		return slapSceneVariants.map((variant, variantIndex) => {
			const sceneKey = `${groupKey}:${variant}`
			const world = pickVariant(worlds, groupKey, "world", variantIndex)
			const medium = pickVariant(media, groupKey, "medium", variantIndex)
			const cast = pickVariant(castPairs, groupKey, "cast", variantIndex)
			const camera = pickVariant(cameras, groupKey, "camera", variantIndex)
			const tone = pickVariant(tones, groupKey, "tone", variantIndex)
			const light = pickVariant(lighting, groupKey, "lighting", variantIndex)
			const palette = pickVariant(palettes, groupKey, "palette", variantIndex)
			const stagingLine = pickVariant(
				staging[outcome],
				groupKey,
				"staging",
				variantIndex
			)
			const cheek = stableIndex(sceneKey, "cheek", 2) === 0 ? "left" : "right"
			const action = actionFor(outcome, visual, stagingLine, cheek)
			const sceneCorrection = correctionForScene(sceneKey)

			const promptLines = [
				"ACTION TRUTH - HIGHEST PRIORITY:",
				`${action} Show the exact readable instant, not a wind-up, pose, or aftermath.`,
				"",
				`FISH: ${fishDescription(visual)}.`,
				`CAST: ${castFor(outcome, cast, world)}`,
				`WORLD: ${world.era} production design in ${world.description}.`,
				`MEDIUM: ${medium.description}.`,
				`CAMERA: ${camera.description}. ${compositionFor(outcome)} Keep the action readable at a 256x171 thumbnail.`,
				`LIGHTING: ${light.description}.`,
				`COLOR: ${palette.description}.`,
				`TONE: ${tone.description}.`,
				`CONSTRAINTS: ${constraintsFor(outcome, visual)}.`,
				`REJECT: ${avoidFor(outcome)}.`
			]
			if (sceneCorrection) {
				promptLines.splice(
					2,
					0,
					`SCENE-SPECIFIC CORRECTION: ${sceneCorrection.text}`
				)
			}
			const prompt = promptLines.join("\n")

			return {
				out: `${fish.slug}--${outcome}-${variant.toString().padStart(2, "0")}.webp`,
				prompt,
				size: "1152x768",
				quality: "medium",
				output_format: "webp",
				output_compression: 74,
				metadata: {
					sceneKey,
					fishSlug: fish.slug,
					outcome,
					variant,
					worldId: world.id,
					settingFamily: world.family,
					era: world.era,
					mediumId: medium.id,
					castId: cast.id,
					actorGender: cast.actor.gender,
					targetGender:
						outcome === "self" ||
						outcome === "hermit" ||
						outcome === "rock_lobster" ||
						outcome === "bot"
							? null
							: cast.target.gender,
					cameraId: camera.id,
					toneId: tone.id,
						lightingId: light.id,
						paletteId: palette.id,
						stagingId: stableIndex(stagingLine, "staging-id", 1_000_000),
						reviewCorrection: sceneCorrection?.kind ?? null
					}
			}
		})
	})
})

await mkdir(dirname(outputPath), { recursive: true })
await mkdir(dirname(metadataPath), { recursive: true })
await Bun.write(
	outputPath,
	`${jobs.map((job) => JSON.stringify(job)).join("\n")}\n`
)
await Bun.write(
	metadataPath,
	`${JSON.stringify(
		{
			version: 2,
			seed: manifestSeed,
			sourceSize: "1152x768",
			finalSize: "768x512",
				jobs: jobs.map((job) => ({
					out: job.out,
					promptSha256: createHash("sha256")
						.update(job.prompt)
						.digest("hex"),
					...job.metadata
				}))
		},
		null,
		2
	)}\n`
)

console.log(`Wrote ${jobs.length} slap scene jobs to ${outputPath}`)
console.log(`Wrote scene metadata to ${metadataPath}`)
