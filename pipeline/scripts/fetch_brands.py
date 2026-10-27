"""Download Open Food Facts front photos (full size) for the barcodes given, into pipeline/sources/photos/brands/raw/.
usage: python fetch_brands.py <barcode> ...   Writes <barcode>.jpg and <barcode>.json (the product record)."""
import json, os, sys, time, urllib.request
OUT = os.path.join(os.path.dirname(__file__), "..", "sources", "photos", "brands", "raw")
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "SangeethaARCatalogue/1.0 (product-texture research)"}
def get(url, tries=4):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except Exception as e:
            err = e; time.sleep(1.5 * (i + 1))
    raise err
for c in sys.argv[1:]:
    jp = os.path.join(OUT, c + ".json")
    try:
        if not os.path.exists(jp):
            d = json.loads(get(f"https://world.openfoodfacts.org/api/v2/product/{c}.json?fields=code,product_name,brands,quantity,image_front_url,images,labels_tags,countries_tags,last_modified_t,photographers_tags,editors_tags"))
            open(jp, "w").write(json.dumps(d.get("product", {}), indent=1))
        p = json.load(open(jp))
        u = p.get("image_front_url")
        if not u: print(c, "NO FRONT"); continue
        u = u.replace(".400.jpg", ".full.jpg")
        fp = os.path.join(OUT, c + ".jpg")
        if not os.path.exists(fp): open(fp, "wb").write(get(u))
        print(c, p.get("brands"), "|", p.get("product_name"), "|", os.path.getsize(fp) // 1024, "KB")
    except Exception as e:
        print(c, "ERR", e)
    time.sleep(0.4)
