import re
import pathlib

ROOT = pathlib.Path(__file__).parent / "src"

# hex -> hex (파스텔 퍼플/라벤더/네이비 -> 진한 원목/월넛 톤)
HEX_MAP = {
    "6C5CE7": "8B5A2B",  # primary
    "8F87B8": "8A7460",  # muted text
    "A78BFA": "D2914B",  # secondary
    "241B45": "2B1B0E",  # text dark
    "C7C2E0": "C4AD91",  # placeholder
    "6E67A0": "6E5A45",  # muted-dark
    "FDFCFF": "FBF6EC",  # surface
    "3A3070": "4A2F17",  # dark modal shade
    "E9E5F7": "E8DCC5",  # light neutral
    "5849C4": "6E4A1F",  # hover-darker
    "F7F5FF": "F3E9D8",  # background
    "332A5C": "3D2712",  # dark shade2
    "F7F5FD": "FAF3E7",  # stone-50
    "574C8C": "5C4527",  # very dark muted
    "1E1838": "241609",  # darkest modal header
    "F0ECFF": "F0E4CC",  # light purple bg -> light oak
    "EFEBFA": "F0E4CC",  # stone-100
    "E3DFF5": "E8DCC5",  # stone border
    "D6CFF0": "D9C6A3",  # stone border2
    "F3F0FF": "F0E4CC",  # ongoing room bg
    "FFF0F5": "FBE8D6",  # light pink bg -> light parchment
    "FFB88C": "C68642",  # bookColors: peach -> honey wood
    "FF9EB5": "6B4226",  # bookColors: pink -> dark wood
    "FFD166": "B5793A",  # sparkle/star accent -> brass
    "C2437A": "7C4A21",  # pink accent text
    "8B9EFF": "7C4A21",  # bookColors: blue-purple
    "7ED9C3": "5C4527",  # bookColors: mint
    "6FCF97": "A9702E",  # bookColors: green
    "F783AC": "8B6339",  # bookColors: pink2
    "C792EA": "A9702E",  # bookColors: purple2
    "2D2456": "3D2712",  # bookshelf shelf top
    "150F2B": "1F1408",  # bookshelf shelf bottom
    "4A3200": "2B1B0E",  # sticker-badge dark text
}

RGB_MAP = {
    (108, 92, 231): (139, 90, 43),
    (167, 139, 250): (210, 145, 75),
    (36, 27, 69): (43, 27, 14),
    (143, 135, 184): (138, 116, 96),
    (199, 194, 224): (196, 173, 145),
    (51, 42, 92): (61, 39, 18),
    (255, 158, 181): (107, 66, 38),
    (247, 245, 255): (243, 233, 216),
}

HEX_RE = re.compile(r"#([0-9A-Fa-f]{6})\b")
RGB_RE = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)")


def sub_hex(m):
    code = m.group(1)
    new = HEX_MAP.get(code) or HEX_MAP.get(code.upper()) or HEX_MAP.get(code.lower())
    return f"#{new}" if new else m.group(0)


def sub_rgb(m):
    triplet = (int(m.group(1)), int(m.group(2)), int(m.group(3)))
    new = RGB_MAP.get(triplet)
    if not new:
        return m.group(0)
    prefix = m.group(0).split("(")[0]
    return f"{prefix}({new[0]}, {new[1]}, {new[2]}"


changed_files = []
for path in ROOT.rglob("*"):
    if path.suffix not in (".jsx", ".js", ".css"):
        continue
    text = path.read_text(encoding="utf-8")
    new_text = HEX_RE.sub(sub_hex, text)
    new_text = RGB_RE.sub(sub_rgb, new_text)
    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
        changed_files.append(str(path.relative_to(ROOT)))

print(f"Changed {len(changed_files)} files:")
for f in changed_files:
    print(" -", f)
