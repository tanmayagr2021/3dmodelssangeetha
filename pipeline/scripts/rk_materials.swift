// Loads a .usdz with RealityKit (what Quick Look uses) and reports, for every material that has
// one, whether RealityKit picked up its fine grain (normal map, roughness map, clear coat).
// Also prints the size RealityKit places in the room. Optional: renders the model with RealityKit's own renderer under one light to a PNG.
// usage: rk_materials <file.usdz> [out.png] [yaw degrees] [zoom 1 = whole model]
import AppKit
import Foundation
import Metal
import RealityKit

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1])
let sem = DispatchSemaphore(value: 0)
Task { @MainActor in
  do {
    let root = try await Entity(contentsOf: url)
    var seen = Set<String>()
    func walk(_ e: Entity) {
      if let model = e.components[ModelComponent.self] {
        for m in model.materials {
          guard let pbr = m as? PhysicallyBasedMaterial else { continue }
          let normal = pbr.normal.texture != nil
          let rough = pbr.roughness.texture != nil
          let coat = pbr.clearcoat.scale
          guard normal || rough || coat > 0 else { continue }
          let line = "\(e.parent?.name ?? "")/\(e.name): normal map \(normal ? "yes" : "no"), roughness map \(rough ? "yes" : "no"), clear coat \(coat) rough \(pbr.clearcoatRoughness.scale)"
          if seen.insert(line).inserted { print(line) }
        }
      }
      e.children.forEach(walk)
    }
    walk(root)
    print("materials with grain:", seen.count)
    // the size RealityKit itself places in the room (Quick Look's engine), closed, in centimetres
    let vb = root.visualBounds(relativeTo: nil)
    print(String(format: "RealityKit size: W %.1f x H %.1f x D %.1f cm, lowest point y = %.1f cm", vb.extents.x * 100, vb.extents.y * 100, vb.extents.z * 100, vb.min.y * 100))

    if args.count > 2 {
      let out = URL(fileURLWithPath: args[2])
      let yaw = Float(args.count > 3 ? Double(args[3])! : -28) * .pi / 180
      let zoom = Float(args.count > 4 ? Double(args[4])! : 1)
      let renderer = try RealityRenderer()
      let anchor = Entity()
      anchor.addChild(root)
      renderer.entities.append(anchor)
      let bounds = root.visualBounds(relativeTo: nil)
      let size = max(bounds.extents.x, bounds.extents.y, bounds.extents.z)
      let cam = PerspectiveCamera()
      cam.camera.fieldOfViewInDegrees = 30 / zoom
      let dist = size * 2.2
      let target = bounds.center
      cam.position = target + SIMD3(sin(yaw) * dist, size * 0.15, cos(yaw) * dist)
      cam.look(at: target, from: cam.position, relativeTo: nil)
      renderer.entities.append(cam)
      renderer.activeCamera = cam
      let key = DirectionalLight()
      key.light.intensity = 3000
      key.look(at: .zero, from: SIMD3(-1.5, 2, 2), relativeTo: nil)
      renderer.entities.append(key)
      let fill = DirectionalLight()
      fill.light.intensity = 1200
      fill.look(at: .zero, from: SIMD3(2, 0.5, 1.5), relativeTo: nil)
      renderer.entities.append(fill)
      let device = MTLCreateSystemDefaultDevice()!
      let desc = MTLTextureDescriptor.texture2DDescriptor(pixelFormat: .bgra8Unorm_srgb, width: 900, height: 900, mipmapped: false)
      desc.usage = [.renderTarget, .shaderRead]
      desc.storageMode = .shared
      let tex = device.makeTexture(descriptor: desc)!
      let done = DispatchSemaphore(value: 0)
      try renderer.updateAndRender(deltaTime: 0.016, cameraOutput: .init(.singleProjection(colorTexture: tex)), onComplete: { _ in done.signal() })
      while done.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date() + 0.05) }
      var bytes = [UInt8](repeating: 0, count: 900 * 900 * 4)
      tex.getBytes(&bytes, bytesPerRow: 900 * 4, from: MTLRegionMake2D(0, 0, 900, 900), mipmapLevel: 0)
      let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: 900, pixelsHigh: 900, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 900 * 4, bitsPerPixel: 32)!
      for i in stride(from: 0, to: bytes.count, by: 4) { bytes.swapAt(i, i + 2) } // BGRA to RGBA
      memcpy(rep.bitmapData!, bytes, bytes.count)
      try rep.representation(using: .png, properties: [:])!.write(to: out)
      print("wrote", out.path)
    }
  } catch { print("FAILED", error) }
  sem.signal()
}
while sem.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date() + 0.05) }
