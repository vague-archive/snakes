import { Rect } from "@vaguevoid/sdk"
import { mount } from "@vaguevoid/sdk/browser"
import game from "./game.ts"

const canvas = document.getElementById("game") as HTMLCanvasElement

mount(game, canvas, {
  resolution: new Rect({
    width: canvas.width,
    height: canvas.height,
  })
})
