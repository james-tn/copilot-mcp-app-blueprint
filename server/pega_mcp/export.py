"""Blueprint export generators: importable Blueprint JSON, PDF and Excel.

* ``build_blueprint_json`` — the "Download Blueprint" artifact: a structured,
  versioned JSON document of the whole blueprint (the analog of Pega's importable
  blueprint export).
* ``build_pdf`` — a human-readable PDF (pure-Python writer, no compiled deps).
* ``build_xlsx`` — a multi-sheet workbook (openpyxl).
"""

from __future__ import annotations

import io
import json
import re
from datetime import datetime, timezone
from typing import Any

from . import store


def safe_filename(s: str) -> str:
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s).strip("_")
    return (s or "blueprint")[:80]


# ── Download Blueprint (importable JSON artifact) ────────────────────────────

def build_blueprint_json(bp: dict[str, Any]) -> bytes:
    counts = store.summary_counts(bp)
    doc = {
        "$schema": "https://pega.example/customer-engagement-blueprint/v1.json",
        "kind": "CustomerEngagementBlueprint",
        "version": "1.0",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "id": bp["id"],
        "title": bp["title"],
        "industry": bp["industry"],
        "context": {
            "organization": bp["orgName"],
            "website": bp["website"],
            "objective": bp["objective"],
            "objectiveDetails": bp["objectiveDetails"],
            "language": bp["language"],
            "location": bp["location"],
        },
        "setup": {
            "products": bp["products"],
            "outcomes": bp["outcomes"],
            "channels": bp["channels"],
            "features": bp["features"],
        },
        "personas": bp["personas"],
        "brand": {
            "voice": bp["voice"],
            "visualIdentity": {
                "logoUrl": bp.get("logoUrl"),
                "headerColor": bp["headerColor"],
                "backgroundColor": bp["backgroundColor"],
                "footerColor": bp["footerColor"],
            },
        },
        "actions": bp["actions"],
        "summary": counts,
    }
    return json.dumps(doc, indent=2).encode("utf-8")


# ── PDF ──────────────────────────────────────────────────────────────────────

# ── PDF (pure-Python, zero compiled dependencies) ───────────────────────────
#
# A minimal multi-page text PDF writer using the built-in Helvetica fonts. This
# avoids fpdf2/pillow (compiled) so the server builds cleanly on any host.

def _lat1(s: str) -> str:
    """PDF WinAnsi/latin-1 text; normalize common unicode punctuation."""
    repl = {"\u2014": "-", "\u2013": "-", "\u2019": "'", "\u2018": "'",
            "\u201c": '"', "\u201d": '"', "\u2022": "*", "\u2026": "...", "\u00b7": "-"}
    for k, v in repl.items():
        s = s.replace(k, v)
    return s.encode("latin-1", "replace").decode("latin-1")


def _pdf_escape(s: str) -> str:
    return s.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


# Approx Helvetica char width as a fraction of font size (conservative average).
_CHAR_W = 0.52


def _wrap(text: str, size: float, max_w: float) -> list[str]:
    max_chars = max(1, int(max_w / (size * _CHAR_W)))
    out: list[str] = []
    for raw in text.split("\n"):
        words = raw.split(" ")
        line = ""
        for w in words:
            cand = w if not line else f"{line} {w}"
            if len(cand) <= max_chars:
                line = cand
            else:
                if line:
                    out.append(line)
                # Hard-break very long words.
                while len(w) > max_chars:
                    out.append(w[:max_chars])
                    w = w[max_chars:]
                line = w
        out.append(line)
    return out


def build_pdf(bp: dict[str, Any]) -> bytes:
    # Page geometry (A4, points).
    PW, PH, MARGIN = 595.0, 842.0, 50.0
    usable_w = PW - 2 * MARGIN
    accent = "0.949 0.314 0.133"  # #f25022
    black = "0 0 0"
    grey = "0.43 0.43 0.43"

    # Build a flat list of styled lines, then paginate.
    # Each item: (text, font 'H'|'B', size, color, gap_before)
    items: list[tuple[str, str, float, str, float]] = []

    def add(text: str, font: str = "H", size: float = 11, color: str = black, gap: float = 0.0) -> None:
        for ln in _wrap(_lat1(text), size, usable_w):
            items.append((ln, font, size, color, gap))
            gap = 0.0  # gap only before the first wrapped line

    def h1(t: str) -> None:
        add(t, "B", 15, accent, gap=10)

    c = store.summary_counts(bp)
    add("Customer Engagement Blueprint", "B", 22, accent)
    add(bp["title"], "H", 13)
    add(f"{bp['industry']} - {bp['id']}", "H", 9, grey)

    h1("Overview")
    add(f"Organization: {bp['orgName']}   |   Website: {bp['website']}")
    add(f"Objective: {bp['objective']}")
    add(f"Language: {bp['language']}   |   Location: {bp['location']}")
    add(f"Outcomes: {', '.join(bp['outcomes']) or '-'}   |   Channels: {', '.join(bp['channels']) or '-'}")
    add(f"Actions: {c['actions']}   |   Messages: {c['treatments']}   |   Channels used: {c['channels']}")

    h1("Objective details")
    add(bp["objectiveDetails"])

    h1("Personas")
    for p in bp["personas"]:
        add(p["name"], "B", 12, black, gap=4)
        meta = " - ".join(x for x in [p.get("gender"), p.get("ageBand")] if x)
        if meta:
            add(meta, "H", 9, grey)
        add(p["description"], "H", 10)

    h1("Brand voice")
    for v in bp["voice"]:
        if v["enabled"]:
            add(f"* {v['name']}", "B", 11, black, gap=3)
            add(f"   {v['description']}", "H", 10, grey)

    h1("Experiences (Actions & Treatments)")
    for a in bp["actions"]:
        add(a["name"], "B", 12, black, gap=6)
        add(f"{a['product']} - {a['objective']}", "H", 9, grey)
        add(a["description"], "H", 10)
        for t in a["treatments"]:
            add(f"   {t['name']}  [{t['channel']}]", "B", 10, black, gap=3)
            add(f"   Headline: {t['headline']}", "H", 10)
            add(f"   Message: {t['body']}", "H", 10)
            add(f"   CTA: {t['cta']}   |   Principle: {t.get('marketingPrinciple', '-')}", "H", 10)

    # Paginate into content streams.
    pages: list[str] = []
    cur: list[str] = []
    y = PH - MARGIN
    for text, font, size, color, gap in items:
        leading = size * 1.35
        y -= gap
        if y - leading < MARGIN:
            pages.append("\n".join(cur))
            cur = []
            y = PH - MARGIN
        y -= leading
        fref = "F2" if font == "B" else "F1"
        cur.append(
            f"{color} rg BT /{fref} {size:.1f} Tf 1 0 0 1 {MARGIN:.1f} {y:.1f} Tm "
            f"({_pdf_escape(text)}) Tj ET"
        )
    if cur:
        pages.append("\n".join(cur))
    if not pages:
        pages = [""]

    # Assemble the PDF objects.
    objs: list[bytes] = []

    def obj(b: str | bytes) -> int:
        objs.append(b.encode("latin-1") if isinstance(b, str) else b)
        return len(objs)  # 1-based object number

    font1 = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>")
    font2 = obj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>")
    pages_obj_num = len(objs) + 1  # reserve next id for the Pages node
    objs.append(b"")  # placeholder for Pages

    kids: list[int] = []
    for content in pages:
        stream = content.encode("latin-1")
        content_num = obj(
            b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"
        )
        page_num = obj(
            f"<< /Type /Page /Parent {pages_obj_num} 0 R /MediaBox [0 0 {PW:.0f} {PH:.0f}] "
            f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> "
            f"/Contents {content_num} 0 R >>"
        )
        kids.append(page_num)

    kids_refs = " ".join(f"{k} 0 R" for k in kids)
    objs[pages_obj_num - 1] = (
        f"<< /Type /Pages /Count {len(kids)} /Kids [{kids_refs}] >>".encode("latin-1")
    )
    catalog_num = obj(f"<< /Type /Catalog /Pages {pages_obj_num} 0 R >>")

    # Serialize with xref table.
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0] * (len(objs) + 1)
    for i, body in enumerate(objs, start=1):
        offsets[i] = len(out)
        out += f"{i} 0 obj\n".encode("latin-1") + body + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objs) + 1}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"
    for i in range(1, len(objs) + 1):
        out += f"{offsets[i]:010d} 00000 n \n".encode("latin-1")
    out += (
        f"trailer\n<< /Size {len(objs) + 1} /Root {catalog_num} 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF"
    ).encode("latin-1")
    return bytes(out)


# ── Excel ────────────────────────────────────────────────────────────────────

def build_xlsx(bp: dict[str, Any]) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    bold = Font(bold=True)
    c = store.summary_counts(bp)

    ov = wb.active
    ov.title = "Overview"
    ov.append(["Field", "Value"])
    ov["A1"].font = bold
    ov["B1"].font = bold
    for k, v in [
        ("Title", bp["title"]), ("Blueprint ID", bp["id"]), ("Industry", bp["industry"]),
        ("Organization", bp["orgName"]), ("Website", bp["website"]), ("Objective", bp["objective"]),
        ("Objective details", bp["objectiveDetails"]), ("Language", bp["language"]),
        ("Location", bp["location"]), ("Products", ", ".join(bp["products"])),
        ("Outcomes", ", ".join(bp["outcomes"])), ("Channels", ", ".join(bp["channels"])),
        ("Features", ", ".join(bp["features"])), ("# Actions", c["actions"]),
        ("# Messages", c["treatments"]), ("# Channels used", c["channels"]),
    ]:
        ov.append([k, v])
    ov.column_dimensions["A"].width = 22
    ov.column_dimensions["B"].width = 90

    ps = wb.create_sheet("Personas")
    ps.append(["Name", "Gender", "Age band", "Description"])
    for cell in ps[1]:
        cell.font = bold
    for p in bp["personas"]:
        ps.append([p["name"], p.get("gender", ""), p.get("ageBand", ""), p["description"]])
    for col, w in zip("ABCD", (24, 14, 18, 100)):
        ps.column_dimensions[col].width = w

    bv = wb.create_sheet("Brand Voice")
    bv.append(["Characteristic", "Enabled", "Description"])
    for cell in bv[1]:
        cell.font = bold
    for v in bp["voice"]:
        bv.append([v["name"], "Yes" if v["enabled"] else "No", v["description"]])
    for col, w in zip("ABC", (28, 12, 90)):
        bv.column_dimensions[col].width = w

    ex = wb.create_sheet("Experiences")
    ex.append(["Action", "Product", "Objective", "Treatment", "Channel", "Headline", "Message", "CTA", "Marketing principle"])
    for cell in ex[1]:
        cell.font = bold
    for a in bp["actions"]:
        for t in a["treatments"]:
            ex.append([a["name"], a["product"], a["objective"], t["name"], t["channel"],
                       t["headline"], t["body"], t["cta"], t.get("marketingPrinciple", "")])
    for col, w in zip("ABCDEFGHI", (30, 18, 14, 26, 12, 30, 55, 20, 20)):
        ex.column_dimensions[col].width = w

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
