import { Classifier, Compartment, Config, Measurer, RelationLabel, Style } from './domain'
import { indexBy } from './util'
import { Vec } from './vector'
import { layout as grapheLayout, graphlib } from 'graphre'
import { layouters, styles } from './visuals'
import { EdgeLabel, GraphLabel, GraphNode } from 'graphre/decl/types'

type Quadrant = 1 | 2 | 3 | 4

export function layout(measurer: Measurer, config: Config, ast: Compartment): Compartment {
  function measureLines(lines: string[], fontWeight: 'normal' | 'bold') {
    if (!lines.length) return { width: 0, height: config.padding }
    measurer.setFont(config.font, config.fontSize, fontWeight, 'normal')
    return {
      width: Math.round(Math.max(...lines.map(measurer.textWidth)) + 2 * config.padding),
      height: Math.round(measurer.textHeight() * lines.length + 2 * config.padding),
    }
  }

  function layoutCompartment(c: Compartment, compartmentIndex: number, style: Style) {
    var textSize = measureLines(c.lines, compartmentIndex ? 'normal' : 'bold')

    if (!c.nodes.length && !c.relations.length) {
      c.width = textSize.width
      c.height = textSize.height
      c.offset = { x: config.padding, y: config.padding }
      return
    }

    var styledConfig = { ...config, direction: style.direction ?? config.direction }
    c.nodes.forEach((e) => layoutClassifier(e, styledConfig))

    var g = new graphlib.Graph<GraphLabel, GraphNode, EdgeLabel & { id: number }>()
    g.setGraph({
      rankdir: style.direction || config.direction,
      //align: //undefined [UL, UR, DL, DR]
      nodesep: config.spacing, //50
      edgesep: config.spacing, //10
      ranksep: config.spacing, //50
      //marginx: //0
      //marginy: //0
      acyclicer: config.acyclicer,
      ranker: config.ranker,
    })
    for (var e of c.nodes) {
      g.setNode(e.name, { width: e.layoutWidth, height: e.layoutHeight })
    }
    for (var r of c.relations) {
      if (r.assoc.indexOf('_') > -1) {
        g.setEdge(r.start, r.end, { id: r.id, minlen: 0 })
      } else if ((config.gravity ?? 1) != 1) {
        g.setEdge(r.start, r.end, { id: r.id, minlen: config.gravity })
      } else {
        g.setEdge(r.start, r.end, { id: r.id })
      }
    }
    grapheLayout(g)

    var left = 0
    var right = 0
    var top = 0
    var bottom = 0

    var rels = indexBy(c.relations, 'id')
    var nodes = indexBy(c.nodes, 'name')
    g.nodes().forEach((name: string) => {
      var node = g.node(name)
      nodes[name].x = node.x!
      nodes[name].y = node.y!
      left = Math.min(left, node.x!)
      right = Math.max(right, node.x! + node.width!)
      top = Math.min(top, node.y!)
      bottom = Math.max(bottom, node.y! + node.height!)
    })
    g.edges().forEach((edgeObj) => {
      var edge = g.edge(edgeObj)
      var start = nodes[edgeObj.v]
      var end = nodes[edgeObj.w]
      var rel = rels[edge.id]
      rel.path = [start, ...edge.points!, end].map(toPoint)

      var startP = rel.path[1]
      var endP = rel.path[rel.path.length - 2]
      layoutLabel(rel.startLabel, startP, adjustQuadrant(quadrant(startP, start, 4), start, end))
      layoutLabel(rel.endLabel, endP, adjustQuadrant(quadrant(endP, end, 2), end, start))
      var sl = rel.startLabel
      var el = rel.endLabel
      var xs = edge.points!.map((e) => e.x)
      var ys = edge.points!.map((e) => e.y)
      left = Math.min(left, sl.x!, el.x!, ...xs)
      right = Math.max(right, sl.x! + sl.width!, el.x! + el.width!, ...xs)
      top = Math.min(top, sl.y!, el.y!, ...ys)
      bottom = Math.max(bottom, sl.y! + sl.height!, el.y! + el.height!, ...ys)
    })
    console.log({ top, right, bottom, left })

    console.log({ graph: g.graph() })
    console.log({ huhu: 'huhu' })
    var width = right - left
    var height = bottom - top
    var graphHeight = height ? height + 2 * config.gutter : 0
    var graphWidth = width ? width + 2 * config.gutter : 0
    console.log({ width, height, graphHeight, graphWidth })

    c.width = Math.max(textSize.width, graphWidth)
    c.height = textSize.height + graphHeight
    c.offset = {
      x: config.padding - left + config.edgeMargin,
      y: config.padding - top + config.edgeMargin,
    }
  }

  function toPoint(o: Vec): Vec {
    return { x: o.x, y: o.y }
  }

  function layoutLabel(label: RelationLabel, point: Vec, quadrant: Quadrant) {
    if (!label.text) {
      label.width = 0
      label.height = 0
      label.x = point.x
      label.y = point.y
    } else {
      var fontSize = config.fontSize
      var lines = label.text.split('`')
      label.width = Math.max(...lines.map((l) => measurer.textWidth(l)))
      label.height = fontSize * lines.length
      label.x =
        point.x + (quadrant == 1 || quadrant == 4 ? config.padding : -label.width - config.padding)
      label.y =
        point.y + (quadrant == 3 || quadrant == 4 ? config.padding : -label.height - config.padding)
    }
  }

  // find basic quadrant using relative position of endpoint and block rectangle
  function quadrant(point: Vec, node: Classifier, fallback: Quadrant): Quadrant {
    if (point.x < node.x && point.y < node.y) return 1
    if (point.x > node.x && point.y < node.y) return 2
    if (point.x > node.x && point.y > node.y) return 3
    if (point.x < node.x && point.y > node.y) return 4
    return fallback
  }

  // Flip basic label quadrant if needed, to avoid crossing a bent relationship line
  function adjustQuadrant(quadrant: Quadrant, point: Vec, opposite: Vec): Quadrant {
    if (opposite.x == point.x || opposite.y == point.y) return quadrant
    var flipHorizontally: Quadrant[] = [4, 3, 2, 1]
    var flipVertically: Quadrant[] = [2, 1, 4, 3]
    var oppositeQuadrant =
      opposite.y < point.y ? (opposite.x < point.x ? 2 : 1) : opposite.x < point.x ? 3 : 4
    // if an opposite relation end is in the same quadrant as a label, we need to flip the label
    if (oppositeQuadrant === quadrant) {
      if (config.direction === 'LR') return flipHorizontally[quadrant - 1]
      if (config.direction === 'TB') return flipVertically[quadrant - 1]
    }
    return quadrant
  }

  function layoutClassifier(clas: Classifier, config: Config): void {
    var style = config.styles[clas.type] || styles.CLASS
    clas.compartments.forEach((co, i) => layoutCompartment(co, i, style))
    layouters[style.visual](config, clas)
    clas.layoutWidth = clas.width + 2 * config.edgeMargin
    clas.layoutHeight = clas.height + 2 * config.edgeMargin
  }

  layoutCompartment(ast, 0, styles.CLASS)
  return ast
}
