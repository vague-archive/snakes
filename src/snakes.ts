import { Color, System, hex, Random, Rect, IPainter, Key, TextOpts } from "@vaguevoid/sdk"
import Stats from "stats.js"

interface Inputs { // TODO: get sdk to export this
  isKeyDown: (key: Key) => boolean
}

const colors: Record<string, Color> = {
  head: hex("#000000"),
  food: hex("#16a34a"),
  background: hex("#F9F281"),
  score: hex("#16a34a"),
  help: hex("#666666"),
  red: hex("#FF0000"),
}

const fonts: Record<string, Partial<TextOpts>> = {
  score: {
    fontFamily: "Arial",
    fontSize: 24,
    fontWeight: "bold",
    color: colors.score,
  },
  help: {
    fontFamily: "Arial",
    fontSize: 16,
    fontStyle: "italic",
    color: colors.help,
  }
}

enum Dir {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const Opposite: Record<Dir, Dir> = {
  [Dir.Up]: Dir.Down,
  [Dir.Down]: Dir.Up,
  [Dir.Left]: Dir.Right,
  [Dir.Right]: Dir.Left,
}

interface Square {
  x: number
  y: number
}

export class Snakes {
  static serializedName = "Snakes"
  private width!: number
  private height!: number
  private chunk!: number
  private nx!: number
  private ny!: number
  private dx!: number
  private dy!: number
  private dstep: number
  private speed: number
  private playing!: boolean
  private dt!: number
  private turns!: Dir[]
  private dir!: Dir
  private snake!: Square[]
  private grow!: number
  private food!: Square
  private random = new Random()
  private stats: Stats

  cloud = true

  constructor(opts?: {
    speed?: number,
  }) {
    this.stats = new Stats()
    this.stats.dom.style.cssText = 'position:fixed;bottom:0;right:0;transform:scale(2) translate(-50%, -50%);cursor:pointer;opacity:0.9;z-index:10000';
    document.body.appendChild(this.stats.dom)

    this.speed = opts?.speed ?? 15
    this.dstep = 1/this.speed
    this.resize({
      width: 800,
      height: 600,
    })
    this.reset()
  }

  resize({ width, height }: {
    width: number
    height: number
  }) {
    this.width = Math.round(width)
    this.height = Math.round(height)
    this.chunk = Math.round(this.width/50)
    this.nx = Math.round(this.width/this.chunk)
    this.ny = Math.round(this.height/this.chunk)
    this.dx = this.width/this.nx
    this.dy = this.height/this.ny
  }

  reset() {
    this.playing = false
    this.dt = 0
    this.turns = []
    this.dir = Dir.Right
    this.snake = [{ x: 10, y: 10 }]
    this.grow = 10
    this.food = this.food ?? this.unoccupied()
    while (--this.grow) {
      this.increase()
    }
  }

  play() {
    this.reset()
    this.playing = true
  }

  lose() {
    this.playing = false
  }

  get head() {
    return this.snake[0]
  }

  pushFront(square: Square) {
    this.snake.unshift(square)
  }

  popBack() {
    this.snake.pop()
  }

  increase(change?: Dir) {
    const { head, nx, ny } = this
    this.dir = change ?? this.dir
    switch (this.dir) {
      case Dir.Left:  return this.pushFront({ x: head.x === 0    ? nx - 1 : head.x - 1, y: head.y                                  })
      case Dir.Right: return this.pushFront({ x: head.x === nx-1 ? 0      : head.x + 1, y: head.y                                  })
      case Dir.Up:    return this.pushFront({ x: head.x,                                y: head.y === 0      ? ny - 1 : head.y - 1 })
      case Dir.Down:  return this.pushFront({ x: head.x,                                y: head.y === ny - 1 ? 0      : head.y + 1 })
    }
  }

  decrease() {
    if (this.grow) {
      this.grow--
    } else {
      this.popBack()
    }
  }

  turn(newDir: Dir) {
    const { turns, dir } = this
    const lastDir = turns.length ? turns[turns.length-1] : dir
    if ((newDir !== lastDir) && (newDir !== Opposite[lastDir])) {
      turns.push(newDir)
    }
  }

  foodOccupies(square: Square) {
    return this.food && this.occupies(this.food, square)
  }

  snakeOccupies(square: Square, ignoreHead?: boolean) {
    for(let i = ignoreHead ? 1 : 0 ; i < this.snake.length ; i++) {
      if (this.occupies(this.snake[i], square))
        return true
    }
    return false
  }

  occupies(a: Square, b: Square) {
    return (a.x === b.x) && (a.y === b.y)
  }

  unoccupied(): Square {
    const pos: Square = { x: 0, y: 0 }
    do {
      pos.x = this.random.int(0, this.nx - 1)
      pos.y = this.random.int(0, this.ny - 1)
    } while(this.snakeOccupies(pos))
    return pos
  }

  update(inputs: Inputs, dt: number) {
    this.stats.begin()
    if (this.playing) {
      this.handleInputs(inputs)
      this.moveSnake(dt)
    } else if (inputs.isKeyDown(Key.Space) || inputs.isKeyDown(Key.Enter)) {
      this.play()
    }
    this.stats.end()
  }

  handleInputs(inputs: Inputs) {
    switch(this.dir) {
      case Dir.Up:
      case Dir.Down:
        if (inputs.isKeyDown(Key.ArrowLeft))
          this.turn(Dir.Left)
        else if (inputs.isKeyDown(Key.ArrowRight))
          this.turn(Dir.Right)
        break
      case Dir.Left:
      case Dir.Right:
        if (inputs.isKeyDown(Key.ArrowUp))
          this.turn(Dir.Up)
        else if (inputs.isKeyDown(Key.ArrowDown))
          this.turn(Dir.Down)
        break
    }

    if (inputs.isKeyDown(Key.Escape))
      this.lose()
  }

  moveSnake(_dt: number) {
    // TEMPORARY: remove relience on (non-reproducible) time.dt
    //            while testing VCR, to make vcr playback work
    //
    // this.dt = this.dt + dt
    this.dt = this.dt + 1/60
    if (this.dt > this.dstep) {
      this.dt -= this.dstep
      this.increase(this.turns.shift())
      this.decrease()
      if (this.snakeOccupies(this.head, true)) {
        this.lose()
      } else if (this.foodOccupies(this.head)) {
        this.grow += 10
        this.food = this.unoccupied()
      }
    }
  }

  render(painter: IPainter) {
    painter.rect(new Rect({
      x: this.width/2,
      y: this.height/2,
      width: this.width,
      height: this.height,
      color: colors.background,
    }))
    this.renderSquare(painter, this.food, colors.food)
    this.renderSquare(painter, this.head, colors.head)
    for (let n = 1 ; n < this.snake.length ; n++) {
      const square = this.snake[n]
      const alpha = 1.0 - (n/this.snake.length/2)
      const color = hex('#4f46e5', alpha)
      this.renderSquare(painter, square, color)
    }
    this.renderScore(painter)
    this.renderHelp(painter)
  }

  renderScore(painter: IPainter) {
    const score = `${this.snake.length}`
    const { width, height } = painter.measureText(score, fonts.score)
    painter.text(score, { ...fonts.score, x: this.chunk + width/2, y: this.chunk + height/2 })
  }

  renderHelp(painter: IPainter) {
    if (!this.playing) {
      const help = "Press SPACE to play and ARROW keys to move"
      const { width, height } = painter.measureText(help, fonts.help)
      painter.text(help, { ...fonts.help, x: this.chunk + width/2, y: this.height - this.chunk - height/2 })
    }
  }

  renderSquare(painter: IPainter, { x, y }: Square, color: Color) {
    painter.rect(new Rect({
      x: (x * this.dx) + (this.dx/2),
      y: (y * this.dy) + (this.dy/2),
      width: this.dx,
      height: this.dy,
      color,
    }))
  }

  static system: System<Snakes> = {
    start(state, { screen }) { state.resize(screen) },
    update(state, { inputs, time }) { state.update(inputs, time.dt/1000) },
    paint(painter, { state }) { state.render(painter) },
  }

  toJSON() {
    return {
      __serializedName: Snakes.serializedName,
      ...this,
    }
  }

  static fromJSON(value: any) {
    const snakes = new Snakes()
    snakes.width = value.width
    snakes.height = value.height
    snakes.chunk = value.chunk
    snakes.nx = value.nx
    snakes.ny = value.ny
    snakes.dx = value.dx
    snakes.dy = value.dy
    snakes.dstep = value.dstep
    snakes.speed = value.speed
    snakes.playing = value.playing
    snakes.dt = value.dt
    snakes.turns = value.turns
    snakes.dir = value.dir
    snakes.snake = value.snake
    snakes.grow = value.grow
    snakes.food = value.food
    snakes.random = value.random
    snakes.cloud = value.cloud
    return snakes
  }
}
