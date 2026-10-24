// Renders a .usdz with Apple's own USD importer (SceneKit), to check how Apple devices read it.
// usage: swift render_usdz.swift <file.usdz> <out.png> [showOpen] [yawDegrees]
import AppKit
import SceneKit
import RealityKit

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
let showOpen = args.count > 3 && args[3] == "open"
let yaw = args.count > 4 ? Double(args[4])! : -28

let scene = try SCNScene(url: url, options: [.checkConsistency: true])
var names: [String] = []
scene.rootNode.enumerateHierarchy { node, _ in
  if let n = node.name { names.append(n) }
  // do what a tap does: move every part's open copy (parked at first) to its open pose,
  // and the closed copy to the parked pose
  if let n = node.name, showOpen, n.hasSuffix("_Open"), let parent = node.parent {
    let part = String(n.dropLast(5))
    if let pose = parent.childNode(withName: "\(part)_PoseOpen", recursively: false) { node.transform = pose.transform }
    if let closed = parent.childNode(withName: part, recursively: false),
       let park = parent.childNode(withName: "\(part)_PoseParked", recursively: false) { closed.transform = park.transform }
  }
}
let hidden = names.filter { n in scene.rootNode.childNode(withName: n, recursively: true)?.isHidden == true }
print("nodes:", names.count, "hidden:", hidden.joined(separator: ","))

let (minB, maxB) = scene.rootNode.boundingBox
print("bounds:", minB, maxB)
let center = SCNVector3((minB.x + maxB.x) / 2, (minB.y + maxB.y) / 2, (minB.z + maxB.z) / 2)
let size = max(maxB.x - minB.x, maxB.y - minB.y, maxB.z - minB.z)

let cam = SCNNode()
cam.camera = SCNCamera()
cam.camera!.fieldOfView = 30
let dist = Double(size) * 2.4
let rad = yaw * .pi / 180
cam.position = SCNVector3(Double(center.x) + sin(rad) * dist, Double(center.y) + Double(size) * 0.25, Double(center.z) + cos(rad) * dist)
cam.look(at: center)
scene.rootNode.addChildNode(cam)
let key = SCNNode(); key.light = SCNLight(); key.light!.type = .directional; key.light!.intensity = 900
key.eulerAngles = SCNVector3(-0.8, -0.5, 0); scene.rootNode.addChildNode(key)
let amb = SCNNode(); amb.light = SCNLight(); amb.light!.type = .ambient; amb.light!.intensity = 500
scene.rootNode.addChildNode(amb)
scene.background.contents = NSColor(calibratedRed: 0.93, green: 0.91, blue: 0.87, alpha: 1)

let renderer = SCNRenderer(device: MTLCreateSystemDefaultDevice(), options: nil)
renderer.scene = scene
renderer.pointOfView = cam
let img = renderer.snapshot(atTime: 0, with: CGSize(width: 700, height: 900), antialiasingMode: .multisampling4X)
let rep = NSBitmapImageRep(data: img.tiffRepresentation!)!
try rep.representation(using: .png, properties: [:])!.write(to: out)
print("wrote", out.path)

// RealityKit is what Quick Look uses; make sure it loads the file too
let sem = DispatchSemaphore(value: 0)
Task { @MainActor in
  do {
    let entity = try await Entity(contentsOf: url)
    var count = 0
    var disabled: [String] = []
    func walk(_ e: Entity) { count += 1; if !e.isEnabled { disabled.append(e.name) }; e.children.forEach(walk) }
    walk(entity)
    print("realitykit: loaded", count, "entities; disabled:", disabled.joined(separator: ","))
  } catch { print("realitykit: FAILED", error) }
  sem.signal()
}
while sem.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date() + 0.05) }
