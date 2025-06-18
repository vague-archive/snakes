import { Game } from "@vaguevoid/sdk"
import { Snakes } from "./snakes.ts"

const options = { speed: 15 }
const snakes  = new Snakes(options)
const game    = new Game(snakes, [Snakes.system])

game.registerSerializableClass(Snakes)

export default game
