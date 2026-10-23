// Loads files with RealityKit (what Quick Look uses) and prints the result or the error.
import Foundation
import RealityKit
let urls = CommandLine.arguments.dropFirst().map { URL(fileURLWithPath: $0) }
let sem = DispatchSemaphore(value: 0)
Task { @MainActor in
  for url in urls {
    do {
      let e = try await Entity(contentsOf: url)
      var n = 0; func walk(_ x: Entity) { n += 1; x.children.forEach(walk) }; walk(e)
      print("OK    \(n) entities  \(url.lastPathComponent)")
    } catch {
      print("FAIL  \(url.lastPathComponent): \(error) | \((error as NSError).domain) \((error as NSError).code) \((error as NSError).userInfo)")
    }
  }
  sem.signal()
}
while sem.wait(timeout: .now() + 0.05) == .timedOut { RunLoop.main.run(until: Date() + 0.05) }
