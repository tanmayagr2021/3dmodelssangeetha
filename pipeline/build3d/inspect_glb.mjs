import { NodeIO, getBounds } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const b = getBounds(scene);
  console.log("==", f, "bounds min", b.min.map((v) => v.toFixed(3)), "max", b.max.map((v) => v.toFixed(3)));
  const walk = (n, d) => {
    const m = n.getMesh();
    const fmt = (a) => a.map((v) => +v.toFixed(3));
    console.log("  ".repeat(d) + n.getName(), "t", fmt(n.getTranslation()), "r", fmt(n.getRotation()), m ? `[${m.listPrimitives().map((p) => p.getMaterial()?.getName()).join(",")}]` : "");
    n.listChildren().forEach((c) => walk(c, d + 1));
  };
  if (process.env.TREE) scene.listChildren().forEach((n) => walk(n, 1));
  console.log("  materials:", root.listMaterials().map((m) => `${m.getName()}${m.getBaseColorTexture() ? "(tex)" : ""} a=${m.getAlphaMode()}`).join(" | "));
  console.log("  textures:", root.listTextures().map((t) => `${t.getName() || t.getURI()} ${t.getMimeType()} ${t.getSize()}`).join(" | "));
  console.log("  anims:", root.listAnimations().map((a) => a.getName()).join(","));
  const v = root.listExtensionsUsed().find((e) => e.extensionName === "KHR_materials_variants");
  console.log("  variants:", v ? v.listVariants().map((x) => x.getName()).join(",") : "none");
  let prims = 0, verts = 0;
  root.listMeshes().forEach((m) => m.listPrimitives().forEach((p) => { prims++; verts += p.getAttribute("POSITION").getCount(); }));
  console.log("  nodes", root.listNodes().length, "prims", prims, "verts", verts);
}
