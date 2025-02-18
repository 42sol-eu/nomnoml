import { Graphics } from './Graphics'
import { Vec } from './vector'

interface ICanvasGraphics extends Graphics {
  mousePos(): Vec
}

type Callbacks = {
  mousedown(p: Vec): void
  mouseup(p: Vec): void
  mousemove(p: Vec): void
}
export function GraphicsCanvas(canvas: HTMLCanvasElement, callbacks?: Callbacks): ICanvasGraphics {
  var ctx = canvas.getContext('2d')!
  var mousePos = { x: 0, y: 0 }
  var twopi = 2 * 3.1416

  function mouseEventToPos(event: MouseEvent) {
    var e = canvas
    return {
      x: event.clientX - e.getBoundingClientRect().left - e.clientLeft + e.scrollLeft,
      y: event.clientY - e.getBoundingClientRect().top - e.clientTop + e.scrollTop,
    }
  }

  if (callbacks) {
    canvas.addEventListener('mousedown', function (event) {
      if (callbacks.mousedown) callbacks.mousedown(mouseEventToPos(event))
    })

    canvas.addEventListener('mouseup', function (event) {
      if (callbacks.mouseup) callbacks.mouseup(mouseEventToPos(event))
    })

    canvas.addEventListener('mousemove', function (event) {
      mousePos = mouseEventToPos(event)
      if (callbacks.mousemove) callbacks.mousemove(mouseEventToPos(event))
    })
  }

  var chainable = {
    stroke: function () {
      ctx.stroke()
      return chainable
    },
    fill: function () {
      ctx.fill()
      return chainable
    },
    fillAndStroke: function () {
      ctx.fill()
      ctx.stroke()
      return chainable
    },
  }

  function tracePath(path: Vec[], offset?: Vec, s?: number) {
    s = s === undefined ? 1 : s
    offset = offset || { x: 0, y: 0 }
    ctx.beginPath()
    ctx.moveTo(offset.x + s * path[0].x, offset.y + s * path[0].y)
    for (var i = 1, len = path.length; i < len; i++)
      ctx.lineTo(offset.x + s * path[i].x, offset.y + s * path[i].y)
    return chainable
  }

  return {
    mousePos: function () {
      return mousePos
    },
    width: function () {
      return canvas.width
    },
    height: function () {
      return canvas.height
    },
    clear: function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    },
    circle: function (p: Vec, r: number) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, twopi)
      return chainable
    },
    ellipse: function (center, rx, ry, start, stop) {
      if (start === undefined) start = 0
      if (stop === undefined) stop = twopi
      ctx.beginPath()
      ctx.save()
      ctx.translate(center.x, center.y)
      ctx.scale(1, ry / rx)
      ctx.arc(0, 0, rx / 2, start, stop)
      ctx.restore()
      return chainable
    },
    arc: function (x, y, r, start, stop) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.arc(x, y, r, start, stop)
      return chainable
    },
    roundRect: function (x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
      return chainable
    },
    rect: function (x, y, w, h) {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y)
      ctx.lineTo(x + w, y + h)
      ctx.lineTo(x, y + h)
      ctx.closePath()
      return chainable
    },
    path: tracePath,
    circuit: function (path, offset, s) {
      tracePath(path, offset, s)
      ctx.closePath()
      return chainable
    },
    setFont: function (
      family: string,
      size: number,
      weight: 'bold' | 'normal',
      style: 'italic' | 'normal'
    ): void {
      ctx.font = `${weight} ${style} ${size}pt ${family}, Helvetica, sans-serif`
    },
    fillStyle: function (s) {
      ctx.fillStyle = s
    },
    strokeStyle: function (s) {
      ctx.strokeStyle = s
    },
    textAlign: function (a) {
      ctx.textAlign = a as CanvasTextAlign
    },

    lineCap: function (cap) {
      ctx.lineCap = cap
    },
    lineJoin: function (join) {
      ctx.lineJoin = join
    },
    lineWidth: function (w) {
      ctx.lineWidth = w
    },

    arcTo: function () {
      return ctx.arcTo.apply(ctx, arguments)
    },
    beginPath: function () {
      return ctx.beginPath.apply(ctx, arguments)
    },
    fillText: function () {
      return ctx.fillText.apply(ctx, arguments)
    },
    lineTo: function () {
      return ctx.lineTo.apply(ctx, arguments)
    },
    measureText: function () {
      return ctx.measureText.apply(ctx, arguments)
    },
    moveTo: function () {
      return ctx.moveTo.apply(ctx, arguments)
    },
    restore: function () {
      return ctx.restore.apply(ctx, arguments)
    },
    setData: function (name: string, value: string) {},
    save: function () {
      return ctx.save.apply(ctx, arguments)
    },
    scale: function () {
      return ctx.scale.apply(ctx, arguments)
    },
    setLineDash: function () {
      return ctx.setLineDash.apply(ctx, arguments)
    },
    stroke: function () {
      return ctx.stroke.apply(ctx, arguments)
    },
    translate: function () {
      return ctx.translate.apply(ctx, arguments)
    },
  }
}
