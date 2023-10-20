import Konva from "konva"
import "./style.css"
import { Circle, CircleConfig } from "konva/lib/shapes/Circle"
import { Text, TextConfig } from "konva/lib/shapes/Text"
import { KonvaEventObject } from "konva/lib/Node"
import { Stage, StageConfig } from "konva/lib/Stage"
import { Layer } from "konva/lib/Layer"
import { Line } from "konva/lib/shapes/Line"
import { Group } from "konva/lib/Group"
import { Rect } from "konva/lib/shapes/Rect"
import { centerTarget, innerTargets, outerTargets, relations } from "./data"

export interface TargetInfo {
    id: string
    name: string
}

type TargetPosition = "center" | "inner" | "outer"

interface TargetConfig extends TargetInfo {
    x: number
    y: number
    radius: number
    fontSize: number
    backgroundColor: string
    color: string
    network: Network
    position: TargetPosition
}

type TargetMoveListener = (x: number, y: number) => void

class Target {
    circle: Circle
    text: Text
    group: Group
    network: Network

    /** 目标位置 */
    position: TargetPosition

    /** 目标身份证 */
    id = ""

    /** 目标中心x坐标 */
    #x = 0
    get x() {
        return this.#x
    }
    set x(x) {
        if (Object.is(this.x, x)) return
        this.#x = x
        this.update()
        for (const callback of this.moveListeners) {
            callback(this.#x, this.#y)
        }
    }

    /** 目标中心y坐标 */
    #y = 0
    get y() {
        return this.#y
    }
    set y(y) {
        if (Object.is(this.y, y)) return
        this.#y = y
        this.update()
        for (const callback of this.moveListeners) {
            callback(this.#x, this.#y)
        }
    }

    /** 中心目标 */
    #radius = 0
    get radius() {
        return this.#radius
    }
    set radius(radius) {
        if (Object.is(this.radius, radius)) return
        this.#radius = radius
        this.update()
    }

    /** 姓名字体大小 */
    #fontSize = 0
    get fontSize() {
        return this.#fontSize
    }
    set fontSize(fontSize) {
        if (Object.is(this.fontSize, fontSize)) return
        this.#fontSize = fontSize
        this.update()
    }

    /** 目标背景颜色 */
    #backgroundColor = ""
    get backgroundColor() {
        return this.#backgroundColor
    }
    set backgroundColor(backgroundColor) {
        if (Object.is(this.backgroundColor, backgroundColor)) return
        this.#backgroundColor = backgroundColor
    }

    /** 目标姓名颜色 */
    #color = ""
    get color() {
        return this.#color
    }
    set color(color) {
        if (Object.is(this.color, color)) return
        this.#color = color
    }

    /** 目标姓名 */
    #name = ""
    get name() {
        return this.#name
    }
    set name(name) {
        if (Object.is(this.name, name)) return
        this.#name = name
    }

    /** 更新 */
    update() {
        this.group.x(this.x - this.radius)
        this.group.y(this.y - this.radius)
        this.group.width(this.radius * 2)
        this.group.height(this.radius * 2)
        this.group.draggable(true)
        this.circle.x(this.radius)
        this.circle.y(this.radius)
        this.circle.radius(this.radius)
        this.circle.fill(this.backgroundColor)
        this.text.x(0)
        this.text.y(this.radius - this.fontSize / 2)
        this.text.width(this.radius * 2)
        this.text.height(this.fontSize)
        this.text.fontSize(this.fontSize)
        this.text.align("center")
        this.text.fill(this.color)
        this.text.text(this.name)
    }

    /** 移动事件监听列表 */
    moveListeners: Set<TargetMoveListener> = new Set()

    /** 添加移动事件监听 */
    addMoveListener = (listener: TargetMoveListener) => {
        this.moveListeners.add(listener)
        return () => this.moveListeners.delete(listener)
    }

    /** 去除移动事件监听 */
    removeMoveListener = (listener: TargetMoveListener) => {
        this.moveListeners.delete(listener)
    }

    constructor(config: TargetConfig) {
        const { x, y, radius, fontSize, backgroundColor, color, name, id, network, position } = config
        this.position = position
        this.network = network
        network.targets.add(this)
        this.#x = x
        this.#y = y
        this.#radius = radius
        this.#fontSize = fontSize
        this.#backgroundColor = backgroundColor
        this.#color = color
        this.#name = name
        this.id = id
        this.circle = new Circle()
        this.text = new Text()
        this.group = new Group()
        this.group.add(this.circle)
        this.group.add(this.text)
        this.group.on("dragmove", () => {
            const { x, y } = this.group.attrs
            if (this.x === x + this.radius && this.y === y + this.radius) return
            this.#x = x + this.radius
            this.#y = y + this.radius
            for (const callback of this.moveListeners) {
                callback(this.#x, this.#y)
            }
        })
        network.targetLayer.add(this.group)
        this.update()
    }
}

export interface RelationInfo {
    id: string
    startId: string
    endId: string
    content: string
}

type RelationType = "centerToInner" | "innerToInner" | "innerToOuter" | "outerToOuter"

interface RelationConfig extends RelationInfo {
    network: Network
    lineWidth: number
    lineColor: string
    fontSize: number
    color: string
    type: RelationType
}

function getAngle(startX: number, startY: number, endX: number, endY: number) {
    const disX = Math.abs(endX - startX)
    const disY = Math.abs(endY - startY)
    const dis = (disX ** 2 + disY ** 2) ** (1 / 2)
    const absAngle = Math.asin(disY / dis)
    if (endX > startX) {
        if (endY > startY) return absAngle
        return Math.PI * 2 - absAngle
    }
    if (endY > startY) return Math.PI - absAngle
    return Math.PI + absAngle
}

class Relation {
    rect: Rect
    text: Text
    group: Group
    network: Network

    /** 关系id */
    id = ""

    /** 起始目标id */
    #startId = ""
    get startId() {
        return this.#startId
    }
    set startId(startId) {
        if (Object.is(this.startId, startId)) return
        this.#startId = startId
        const startTarget = this.network.findTarget(startId)
        if (!startTarget) throw new Error("未找到起始目标")
        this.startTarget = startTarget
    }

    /** 结束目标id */
    #endId = ""
    get endId() {
        return this.#endId
    }
    set endId(endId) {
        if (Object.is(this.endId, endId)) return
        this.#endId = endId
        const endTarget = this.network.findTarget(endId)
        if (!endTarget) throw new Error("未找到结束目标")
        this.endTarget = endTarget
    }

    /** 文字内容 */
    #content = ""
    get content() {
        return this.#content
    }
    set content(content) {
        if (Object.is(this.content, content)) return
        this.#content = content
        this.update()
    }

    /** 起始目标 */
    #startTarget: Target
    get startTarget() {
        return this.#startTarget
    }
    set startTarget(startTarget) {
        if (Object.is(this.startTarget, startTarget)) return
        this.startTarget.removeMoveListener(this.moveListener)
        this.#startTarget = startTarget
        startTarget.addMoveListener(this.moveListener)
        this.update()
    }

    /** 结束目标 */
    #endTarget: Target
    get endTarget() {
        return this.#endTarget
    }
    set endTarget(endTarget) {
        if (Object.is(this.endTarget, endTarget)) return
        this.endTarget.removeMoveListener(this.moveListener)
        this.#endTarget = endTarget
        endTarget.addMoveListener(this.moveListener)
        this.update()
    }

    /** 线条宽度 */
    #lineWidth = 0
    get lineWidth() {
        return this.#lineWidth
    }
    set lineWidth(lineWidth) {
        if (Object.is(this.lineWidth, lineWidth)) return
        this.#lineWidth = lineWidth
        this.update()
    }

    /** 线条颜色 */
    #lineColor = ""
    get lineColor() {
        return this.#lineColor
    }
    set lineColor(lineColor) {
        if (Object.is(this.lineColor, lineColor)) return
        this.#lineColor = lineColor
        this.update()
    }

    /** 字体大小 */
    #fontSize = 0
    get fontSize() {
        return this.#fontSize
    }
    set fontSize(fontSize) {
        if (Object.is(this.fontSize, fontSize)) return
        this.#fontSize = fontSize
        this.update()
    }

    /** 字体颜色 */
    #color = ""
    get color() {
        return this.#color
    }
    set color(color) {
        if (Object.is(this.color, color)) return
        this.#color = color
        this.update()
    }

    /** 更新 */
    update() {
        const disX = Math.abs(this.startTarget.x - this.endTarget.x)
        const disY = Math.abs(this.startTarget.y - this.endTarget.y)
        const [s, e] = this.startTarget.x < this.endTarget.x || (this.startTarget.x === this.endTarget.y && this.startTarget.y > this.endTarget.y) ? [this.startTarget, this.endTarget] : [this.endTarget, this.startTarget]
        const dis = (disX ** 2 + disY ** 2) ** (1 / 2)
        const angle = getAngle(s.x, s.y, e.x, e.y)
        this.group.x(Math.min(this.startTarget.x, this.endTarget.x))
        this.group.y(Math.min(this.startTarget.y, this.endTarget.y))
        this.group.width(disX)
        this.group.height(disY)
        this.rect.x(disX / 2)
        this.rect.y(disY / 2)
        this.rect.width(dis)
        this.rect.height(this.lineWidth)
        this.rect.fill(this.lineColor)
        this.rect.offsetX(dis / 2)
        this.rect.offsetY(this.lineWidth / 2)
        this.rect.rotation((angle / Math.PI) * 180)
        this.text.x(disX / 2)
        this.text.y(disY / 2)
        this.text.width(dis)
        this.text.height(this.fontSize / 2)
        this.text.offsetX(dis / 2)
        this.text.offsetY(this.fontSize / 2)
        this.text.rotation((angle / Math.PI) * 180)
        this.text.text(this.content)
        this.text.fill(this.color)
        this.text.align("center")
    }

    /** 显示 */
    get show() {
        return this.group.visible()
    }
    set show(show) {
        if (Object.is(this.show, show)) return
        this.group.visible(show)
    }

    /** 事件监听 */
    moveListener = () => {
        this.update()
    }

    constructor(config: RelationConfig) {
        const { id, startId, endId, content, network, lineWidth, lineColor, fontSize, color } = config
        this.id = id
        this.#startId = startId
        this.#endId = endId
        this.#content = content
        this.network = network
        this.#lineWidth = lineWidth
        this.#lineColor = lineColor
        this.#fontSize = fontSize
        this.#color = color
        network.relations.add(this)
        const startTarget = network.findTarget(startId)
        if (!startTarget) throw new Error("未找到起始目标")
        const endTarget = network.findTarget(endId)
        if (!endTarget) throw new Error("未找到结束目标")
        startTarget.addMoveListener(this.moveListener)
        endTarget.addMoveListener(this.moveListener)
        this.#startTarget = startTarget
        this.#endTarget = endTarget
        this.rect = new Rect()
        this.text = new Text({ align: "center" })
        this.group = new Group()
        this.group.add(this.rect)
        this.group.add(this.text)
        network.lineLayer.add(this.group)
        this.update()
    }
}

interface Style {
    fontSize: number
    color: string
    backgroundColor: string
}

interface RelationStyle extends Style {
    width: number
}

interface TargetStyle extends Style {
    radius: number
}

interface NetworkConfig {
    container: HTMLDivElement
    width: number
    height: number
    centerTarget: TargetInfo
    innerTargets: TargetInfo[]
    outerTargets: TargetInfo[]
    relations: RelationInfo[]
    /** 内圈半径 */
    innerRadius: number
    /** 外圈半径 */
    outerRadius: number
    centerToInnerStyle: RelationStyle
    innerToInnerStyle: RelationStyle
    innerToOuterStyle: RelationStyle
    outerToOuterStyle: RelationStyle
    centerStyle: TargetStyle
    innerStyle: TargetStyle
    outerStyle: TargetStyle
    innerMinGap?: number
    outerMinGap?: number
}

class Network {
    stage: Stage
    lineLayer: Layer
    targetLayer: Layer
    targets: Set<Target> = new Set()
    relations: Set<Relation> = new Set()
    findTarget(id: string) {
        return Array.from(this.targets).find(it => it.id === id) || null
    }
    destory() {
        this.stage.destroy()
    }
    constructor(config: NetworkConfig) {
        const { container, width, height, centerTarget, innerTargets, outerTargets, centerToInnerStyle, innerToInnerStyle, innerToOuterStyle, outerToOuterStyle, centerStyle, innerStyle, outerStyle, relations, innerMinGap = 0, outerMinGap = 0 } = config
        this.stage = new Stage({ container, width, height })
        this.stage.draw()
        this.lineLayer = new Layer()
        this.targetLayer = new Layer()
        this.stage.add(this.lineLayer)
        this.stage.add(this.targetLayer)
        new Target({ ...centerTarget, x: width / 2, y: height / 2, radius: centerStyle.radius, fontSize: centerStyle.fontSize, backgroundColor: centerStyle.backgroundColor, color: centerStyle.color, position: "center", network: this })
        const innerUnitAngle = (Math.PI * 2) / innerTargets.length
        const innerMinRadius = (innerStyle.radius * 2 + innerMinGap) / 2 / Math.sin(innerUnitAngle / 2)
        const innerRadius = Math.max(innerMinRadius, config.innerRadius)
        innerTargets.forEach((it, idx) => {
            new Target({ ...it, x: width / 2 + innerRadius * Math.cos(innerUnitAngle * idx), y: height / 2 - innerRadius * Math.sin(innerUnitAngle * idx), radius: innerStyle.radius, fontSize: innerStyle.fontSize, backgroundColor: innerStyle.backgroundColor, color: innerStyle.color, position: "inner", network: this })
        })
        const outerUnitAngle = (Math.PI * 2) / outerTargets.length
        const outerMinRadius = (outerStyle.radius * 2 + outerMinGap) / 2 / Math.sin(outerUnitAngle / 2)
        const outerRadius = Math.max(outerMinRadius, config.outerRadius)
        outerTargets.forEach((it, idx) => {
            new Target({ ...it, x: width / 2 + outerRadius * Math.cos(outerUnitAngle * idx + Math.PI / 2), y: height / 2 - outerRadius * Math.sin(outerUnitAngle * idx + Math.PI / 2), radius: outerStyle.radius, fontSize: outerStyle.fontSize, backgroundColor: outerStyle.backgroundColor, color: outerStyle.color, position: "outer", network: this })
        })
        relations.forEach((it, idx) => {
            const { startId, endId } = it
            const s = startId === centerTarget.id ? "center" : innerTargets.some(i => i.id === startId) ? "inner" : "outer"
            const e = endId === centerTarget.id ? "center" : innerTargets.some(i => i.id === endId) ? "inner" : "outer"
            const style = (s === "center" && e === "inner") || (s === "inner" && e === "center") ? centerToInnerStyle : s === "inner" && e === "inner" ? innerToInnerStyle : (s === "outer" && e === "inner") || (s === "inner" && e === "outer") ? innerToOuterStyle : outerToOuterStyle
            const type: RelationType = (s === "center" && e === "inner") || (s === "inner" && e === "center") ? "centerToInner" : s === "inner" && e === "inner" ? "innerToInner" : (s === "outer" && e === "inner") || (s === "inner" && e === "outer") ? "innerToOuter" : "outerToOuter"
            new Relation({ ...it, lineWidth: style.width, lineColor: style.backgroundColor, fontSize: style.fontSize, color: style.color, network: this, type })
        })
    }
}

const network = new Network({
    container: document.getElementById("app") as HTMLDivElement,
    width: 3600,
    height: 3600,
    innerMinGap: 120,
    outerMinGap: 80,
    centerTarget,
    innerTargets,
    outerTargets,
    relations,
    centerStyle: {
        radius: 64,
        backgroundColor: "orange",
        color: "purple",
        fontSize: 16
    },
    innerStyle: {
        radius: 64,
        backgroundColor: "orange",
        color: "purple",
        fontSize: 16
    },
    outerStyle: {
        radius: 64,
        backgroundColor: "orange",
        color: "purple",
        fontSize: 16
    },
    innerRadius: 512,
    outerRadius: 1024,
    centerToInnerStyle: {
        width: 8,
        backgroundColor: "orange",
        color: "purple",
        fontSize: 16
    },
    innerToInnerStyle: {
        width: 8,
        backgroundColor: "orange",
        color: "purple",
        fontSize: 16
    },
    innerToOuterStyle: {
        width: 8,
        backgroundColor: "skyblue",
        color: "purple",
        fontSize: 16
    },
    outerToOuterStyle: {
        width: 8,
        backgroundColor: "red",
        color: "purple",
        fontSize: 16
    }
})

// const stage = new Stage({ container: "#app", width: 400, height: 400 })

// const layer = new Layer()

// const rect0 = new Rect({
//     x: 0,
//     y: 0,
//     width: 400,
//     height: 400,
//     fill: "skyblue"
// })

// const line = new Line({
//     points: [200, 200, 300, 200],
//     strokeWidth: 100,
//     stroke: "red"
// })

// layer.add(rect0)

// layer.add(line)

// stage.add(layer)

// stage.draw()
