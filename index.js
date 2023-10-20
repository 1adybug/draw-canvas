import fs from "fs"
import { nanoid } from "nanoid"

const centerTargets = {
    id: nanoid(),
    name: "某某"
}

const innerTargets = Array(20)
    .fill(0)
    .map(() => ({ id: nanoid(), name: "某某" }))

const outerTargets = Array(60)
    .fill(0)
    .map(() => ({ id: nanoid(), name: "某某" }))

const relations = []

innerTargets.forEach((it, idx) => {
    relations.push({
        id: nanoid(),
        startId: centerTargets.id,
        endId: it.id,
        content: "朋友"
    })
    innerTargets.slice(idx + 1).forEach(i => {
        if (Math.random() > 0.3) return
        relations.push({
            id: nanoid(),
            startId: it.id,
            endId: i.id,
            content: "朋友"
        })
    })
})

outerTargets.forEach((it, idx) => {
    let hasRelation = false
    innerTargets.forEach((i, x) => {
        const r = Math.random()
        if (hasRelation && r < 0.1 || !hasRelation && r < 0.2 || !hasRelation && x === innerTargets.length - 1) {
            hasRelation = true
            relations.push({
                id: nanoid(),
                startId: it.id,
                endId: i.id,
                content: "朋友"
            })
        }
    })
    outerTargets.slice(idx + 1).forEach(i => {
        if (Math.random() > 0.1) return
        relations.push({
            id: nanoid(),
            startId: it.id,
            endId: i.id,
            content: "朋友"
        })
    })
})

fs.writeFileSync("./data.json", JSON.stringify({
    centerTargets,
    innerTargets,
    outerTargets,
    relations
}))