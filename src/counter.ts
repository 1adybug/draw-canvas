import Konva from "konva"
import "./style.css"
import { CircleConfig } from "konva/lib/shapes/Circle"
import { KonvaEventObject } from "konva/lib/Node"

const { Circle, Stage, Layer, Line } = Konva

interface TargetProps {
    id: string
    name: string
    x: number
    y: number
    radius?: number
    backgroundColor?: string
    color?: string
    layer: Konva.Layer
}

class Target {
    circle: Konva.Circle
    text: Konva.Text
    group: Konva.Group
    layer: Konva.Layer
    constructor(props: TargetProps) {
        const { id, name, x, y, radius = 100, color = "red", backgroundColor = "skyblue", layer } = props
        this.circle = new Konva.Circle({ x, y, radius, fill: backgroundColor })
        this.text = new Konva.Text({
            x: x - name.length * 8,
            y,
            text: name,
            fontSize: 16,
            fill: color
        })
        this.group = new Konva.Group()
        this.group.add(this.circle, this.text)
        this.layer = layer
        this.layer.add(this.group)
    }
}

class Relation {
    constructor(start: Target, end: Target) {
        
    }
}
