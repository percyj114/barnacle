import { createHash } from "node:crypto"

const [input, output] = Bun.argv.slice(2)
if (!input || !output) {
	throw new Error("Usage: bun scripts/css-to-ts.ts <input.css> <output.ts>")
}

const css = await Bun.file(input).text()
const id = createHash("sha256").update(css).digest("hex").slice(0, 10)
await Bun.write(
	output,
	`export const styles = ${JSON.stringify(css)}\nexport const stylesId = ${JSON.stringify(id)}\n`
)
