import { CommandWithSubcommands } from "@buape/carbon"
import GotoCommand from "./gotoCommand.js"

const guideLink = "https://discord.com/channels/1456350064065904867/@home"
const stuckLink = "https://docs.clawd.bot/help/faq#im-stuck-whats-the-fastest-way-to-get-unstuck"

class GotoGuideCommand extends GotoCommand {
	name = "guide"
	description = "Share the server guide"
	protected message = `## Check the Server Guide here\n${guideLink}`
}

class GotoServerFaqCommand extends GotoCommand {
	name = "server-faq"
	description = "Point to the server FAQ"
	protected message = `Your question is answered in the server FAQ in our [Server Guide](${guideLink})`
}

class GotoHelpCommand extends GotoCommand {
	name = "help"
	description = "Share help instructions"
	protected message = `Use <#1459642797895319552> for help. The fastest way to get your problem solved is to follow the instructions here: ${stuckLink}`
}

class GotoModelCommand extends GotoCommand {
	name = "model"
	description = "Point to the model discussion channel"
	protected message = "Any discussion about various AI models should be taken to <#1456704705219661980>."
}

class GotoStuckCommand extends GotoCommand {
	name = "stuck"
	description = "Share the fastest way to get unstuck"
	protected message = `The fastest way to get your problem solved is to follow the instructions here: ${stuckLink}`
}

export default class GotoRootCommand extends CommandWithSubcommands {
	name = "goto"
	description = "Jump to common resources"
	subcommands = [
		new GotoModelCommand(),
		new GotoHelpCommand(),
		new GotoServerFaqCommand(),
		new GotoGuideCommand(),
		new GotoStuckCommand()
	]
}
