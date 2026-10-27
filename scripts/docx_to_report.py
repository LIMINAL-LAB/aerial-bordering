#!/usr/bin/env python3
"""Convert a report draft (.docx) into src/data/report.json (the report content model).

Structural port: Heading1/2/3 paragraphs -> sections (level 1/2/3), other paragraphs ->
{type:paragraph, runs:[...]}, inline footnote references -> {footnoteRef:N} plus a
footnotes[] entry sourced from word/footnotes.xml, hyperlinks -> {text,link}, numbered/
bulleted paragraphs (w:numPr, excluding the auto-numbering Word applies to headings) ->
{type:list, items:[{runs:[...]}]}, and inline "Figure N.N: ..." caption markers -> figure
blocks. Content is auto-extracted and needs editorial verification against the docx.

Usage: python3 scripts/docx_to_report.py <path/to/report.docx>
The draft path is required, so a later draft can be ported without editing this file (or run
`just port-report <docx>`).
"""
import json
import posixpath
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

OUT_PATH = "src/data/report.json"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
PKG_RELS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
OBJECT_REPLACEMENT_CHAR = "￼"

HEADING_LEVELS = {"Heading1": 1, "Heading2": 2, "Heading3": 3}
# The 4 Sept draft writes captions as "Figure 1.1: <sentence>", where the 2 Sept one used
# a full-caps "FIGURE 1.1: <shorthand>". Both the marker and the caption parser therefore
# require a figure number: unlike "FIGURE", bare "Figure" would otherwise catch the body's
# own prose ("political figures", "These figures are not hypothetical").
FIGURE_MARK = re.compile(r"Figure\s+[0-9]+(?:\.[0-9]+)*\s*:")
FIGURE_CAPTION = re.compile(r"^\s*Figure\s+([0-9.]+)\s*:\s*(.*)$")


def w(tag):
    return W + tag


def load_part(zf, path):
    return ET.fromstring(zf.read(path))


def load_rels(zf, part_path):
    d, f = posixpath.split(part_path)
    rels_path = posixpath.join(d, "_rels", f + ".rels")
    rels = {}
    if rels_path not in zf.namelist():
        return rels
    for rel in load_part(zf, rels_path).findall(PKG_RELS + "Relationship"):
        rels[rel.get("Id")] = rel.get("Target")
    return rels


def slugify(s, i):
    base = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return base or f"section-{i}"

# Chapter 1's four part headings are unnumbered in the docx body (only its ToC numbers
# them); Chapter 2's equivalent headings are typed with a leading "1. "/"2. ". Renumber
# Chapter 1's titles to match, keyed on the raw docx title so the slug (derived before
# this rename) stays unprefixed.
CH1_PART_NUMBERING = {
    "The Retreat of European Authorities at Sea":
        "1. The Retreat of European Authorities at Sea",
    "The Externalisation of Naval Operations to Libyan and Tunisian actors":
        "2. The Externalisation of Naval Operations to Libyan and Tunisian actors",
    "The Rise of Aerial Surveillance":
        "3. The Rise of Aerial Surveillance",
    "Stopping Civilian Aerial Monitoring":
        "4. Stopping Civilian Aerial Monitoring",
}


def internal_route(text):
    t = text.strip().lower()
    if "methodolog" in t:
        return "/methodology"
    if t in ("our database", "database", "our data"):
        return "/database"
    if t in ("our report", "report"):
        return "/report"
    return None


# The docx marks its internal cross-references either with a trailing "↗" glyph on an
# analysis/methodology/conclusion phrase, or (once, for the new Chapter 1 part 4 anchor)
# with underlining alone. Neither survives as a real w:hyperlink, so key on the docx text
# directly rather than relying on hyperlink resolution. "Our " deliberately stays unlinked
# where it precedes "data analysis"/"analysis" — only the phrase after it is a link.
ARROW_LINK_TARGETS = {
    "data analysis": ("/database", False),
    "analysis": ("/database", False),
    "Data Analysis": ("/database", False),
    "Database": ("/database", False),
    "Methodology": ("/methodology", False),
    "Conclusion": ("#conclusions", False),
}
LINK_MARKER_PASSES = [
    (re.compile(r"(data analysis|analysis|Data Analysis|Database|Methodology|Conclusion)\s*↗"),
     ARROW_LINK_TARGETS.__getitem__),
    # The 2 Sept draft says "Aircraft" here where the heading it points at says "Aerial";
    # accept either wording so the cross-reference survives whichever one the docx settles on.
    (re.compile(r"(Stopping Civilian (?:Aerial|Aircraft) Monitoring)"),
     lambda _phrase: ("#stopping-civilian-aerial-monitoring", False)),
]


def _split_on_marker(run, regex, resolve):
    if "link" in run or "text" not in run:
        return [run]
    text = run["text"]
    matches = list(regex.finditer(text))
    if not matches:
        return [run]
    out = []
    pos = 0
    for m in matches:
        if m.start() > pos:
            out.append({**run, "text": text[pos:m.start()]})
        phrase = m.group(1)
        href, external = resolve(phrase)
        link_run = {"text": phrase, "link": {"href": href, "external": external}}
        if run.get("bold"):
            link_run["bold"] = True
        if run.get("italic"):
            link_run["italic"] = True
        out.append(link_run)
        pos = m.end()
    if pos < len(text):
        out.append({**run, "text": text[pos:]})
    return out


def apply_link_markers(runs):
    for regex, resolve in LINK_MARKER_PASSES:
        runs = [seg for r in runs for seg in _split_on_marker(r, regex, resolve)]
    return runs


class FootnoteNumbering:
    """Assigns each footnote id a display number in order of first appearance."""

    def __init__(self):
        self.seen = {}

    def number_for(self, note_id):
        if note_id not in self.seen:
            self.seen[note_id] = len(self.seen) + 1
        return self.seen[note_id]


def run_emphasis(r_el):
    rPr = r_el.find(w("rPr"))
    if rPr is None:
        return False, False

    def flag(tag):
        el = rPr.find(w(tag))
        if el is None:
            return False
        val = el.get(w("val"))
        return val is None or val.lower() not in ("false", "0", "off")

    return flag("b"), flag("i")


def run_text(r_el):
    buf = ""
    for child in r_el:
        if child.tag == w("t"):
            buf += (child.text or "").replace(OBJECT_REPLACEMENT_CHAR, "")
        elif child.tag in (w("tab"), w("br"), w("cr")):
            buf += " "
    return buf


def process_run(r_el):
    """Classify a w:r as a footnote reference, a markup marker to skip, or plain text."""
    if r_el.find(w("footnoteReference")) is not None:
        return "footnoteref", r_el.find(w("footnoteReference")).get(w("id"))
    for marker in ("commentReference", "footnoteRef", "endnoteReference"):
        if r_el.find(w(marker)) is not None:
            return "skip", None
    return "text", run_text(r_el)


def resolve_hyperlink(hl_el, rels):
    rid = hl_el.get(R + "id")
    if rid and rid in rels:
        return rels[rid], True
    anchor = hl_el.get(w("anchor"))
    if anchor:
        return f"#{anchor}", False
    return None, True


def build_runs(parent, rels, footnotes):
    """Flatten a w:p (or w:hyperlink/w:ins) element's inline content into report runs."""
    runs = []
    buf = ""
    bold = italic = False

    def flush():
        nonlocal buf
        if buf:
            run = {"text": buf}
            if bold:
                run["bold"] = True
            if italic:
                run["italic"] = True
            runs.append(run)
        buf = ""

    for child in parent:
        tag = child.tag
        if tag == w("r"):
            kind, val = process_run(child)
            if kind == "text":
                if val:
                    b, i = run_emphasis(child)
                    if (b, i) != (bold, italic):
                        flush()
                        bold, italic = b, i
                    buf += val
            elif kind == "footnoteref":
                flush()
                runs.append({"footnoteRef": footnotes.number_for(val)})
        elif tag == w("hyperlink"):
            flush()
            href, external = resolve_hyperlink(child, rels)
            inner = build_runs(child, rels, footnotes)
            link_text = "".join(part.get("text", "") for part in inner)
            if link_text:
                route = internal_route(link_text)
                if route:
                    runs.append({"text": link_text, "link": {"href": route, "external": False}})
                elif href:
                    runs.append({"text": link_text, "link": {"href": href, "external": external}})
                else:
                    runs.append({"text": link_text, "link": {"href": "#", "external": True}})
        elif tag == w("ins"):
            flush()
            runs.extend(build_runs(child, rels, footnotes))
        # w:del (deleted tracked-change text), w:bookmarkStart/End, w:commentRangeStart/End,
        # w:proofErr, w:pPr and anything else contribute no content.
    flush()
    return [r for r in runs if not (set(r.keys()) == {"text"} and r["text"] == "")]


def split_database_link(runs):
    """Pull a leading 'See all cases of <label> in the database →' marker out of the
    first run, returning (remaining_runs, database-link block or None)."""
    if not runs:
        return runs, None
    first = runs[0]
    if "link" in first or "text" not in first:
        return runs, None
    m = DATABASE_LINK_RE.match(first["text"])
    if not m:
        return runs, None
    label = m.group(1)
    key = DATABASE_LINKS.get(label)
    if key is None:
        print(f"WARNING: database link label {label!r} has no DATABASE_LINKS entry")
        return runs, None
    remainder = first["text"][m.end():]
    out = list(runs)
    if remainder:
        out[0] = {**first, "text": remainder}
    else:
        out = out[1:]
    block = {"type": "database-link", "label": label, "href": f"/database?pattern={key}"}
    return out, block


def split_figure(runs):
    """Pull a trailing inline 'FIGURE ...' caption marker out of a run sequence."""
    for idx, r in enumerate(runs):
        if "link" in r or "text" not in r:
            continue
        m = FIGURE_MARK.search(r["text"])
        if not m:
            continue
        before = r["text"][: m.start()].rstrip()
        caption = r["text"][m.start():] + "".join(x.get("text", "") for x in runs[idx + 1:])
        caption = re.sub(r"\s+", " ", caption).strip()
        body_runs = list(runs[:idx])
        if before:
            kept = dict(r)
            kept["text"] = before
            body_runs.append(kept)
        return body_runs, caption
    return runs, None


# Single-image figures, wired to their derived asset (scripts/optimize_report_images.py).
FIGURE_SRC = {
    "1.1": "/report-images/Figure_1.1_Map_2.webp",
    "1.2": "/report-images/Figure_1.2_Map_3.webp",
    "1.3": "/report-images/Figure_1.3_Map_3.webp",
    "1.4": "/report-images/Figure_1.4.webp",
    "2.1": "/report-images/Figure_2.1.webp",
    "2.2": "/report-images/Figure_2.2.webp",
    "2.3": "/report-images/Figure_2.3.webp",
    "2.4": "/report-images/Figure_2.4.webp",
    "2.6": "/report-images/Figure_2.6.webp",
}

# The naval-operation maps are successive states of one cumulative timeline, so each figure
# scroll-crossfades through its ordered maps and ends on the map its caption names.
FIGURE_FADE_FROM = {
    "1.1": "/report-images/Figure_1.1_Map_1.webp",
    "1.2": ["/report-images/Figure_1.2_Map_1.webp", "/report-images/Figure_1.2_Map_2.webp"],
    "1.3": [
        "/report-images/Figure_1.3_Map_1.webp",
        "/report-images/Figure_1.3_Map_2.webp",
    ],
}

# Inline "See all cases of <label> in the database →" lead-ins get lifted out of their
# paragraph into a standalone database-link block; label -> DatabasePage pattern key.
DATABASE_LINKS = {
    "(selective) Communication": "selective-comms",
    "Interceptions in the Maltese SRR Zone": "mt-sar",
    "Direct Violence": "violence",
}
DATABASE_LINK_RE = re.compile(r"^\s*See all cases of (.+?) in the database\s*→\s*")

# Multi-image figures: 1.5 is the civilian-aircraft photo gallery; 2.5 is the
# per-aircraft-waypoint gallery. Its eight frames are delivered as Figure2.4_Waypoints.
FIGURE_IMAGES = {
    "1.5": [f"/report-images/Figure_1.5-{n}.webp" for n in range(1, 5)],
    "2.5": [f"/report-images/Figure_2.5-{n}.webp" for n in range(1, 9)],
}


def make_figure_block(caption_text, fallback_number):
    m = FIGURE_CAPTION.match(caption_text)
    number = m.group(1) if m and m.group(1) else None
    caption = (m.group(2).strip() if m else caption_text) or caption_text
    block = {
        "type": "figure",
        "id": f"fig-{number or fallback_number}".replace(".", "-"),
        "number": number,
        "src": FIGURE_SRC.get(number),
        "caption": caption,
    }
    fade_from = FIGURE_FADE_FROM.get(number)
    if fade_from:
        block["fadeFrom"] = fade_from
    images = FIGURE_IMAGES.get(number)
    if images:
        block["images"] = [{"src": src} for src in images]
    return block


def paragraph_style(p):
    pPr = p.find(w("pPr"))
    style = num_id = None
    if pPr is not None:
        pStyle = pPr.find(w("pStyle"))
        if pStyle is not None:
            style = pStyle.get(w("val"))
        numPr = pPr.find(w("numPr"))
        if numPr is not None:
            numId_el = numPr.find(w("numId"))
            num_id = numId_el.get(w("val")) if numId_el is not None else None
    return style, num_id


# The docx types the sixth "Stopping Civilian Aerial Monitoring" bullet as a manual
# "- " dash run continuing the fifth bullet's paragraph, rather than as its own numPr
# list paragraph — a formatting slip in the source. Split it back into a sibling item.
NESTED_SUB_BULLET = re.compile(r"\s*-\s*(?=In August 2025\b)")


def split_nested_sub_bullets(items):
    out = []
    for item in items:
        runs = item["runs"]
        split_at = None
        for idx, r in enumerate(runs):
            if "link" in r or "text" not in r:
                continue
            m = NESTED_SUB_BULLET.search(r["text"])
            if m:
                split_at = (idx, m)
                break
        if split_at is None:
            out.append(item)
            continue
        idx, m = split_at
        r = runs[idx]
        before_runs = list(runs[:idx])
        if r["text"][: m.start()]:
            before_runs.append({**r, "text": r["text"][: m.start()]})
        after_runs = []
        if r["text"][m.end():]:
            after_runs.append({**r, "text": r["text"][m.end():]})
        after_runs.extend(runs[idx + 1:])
        out.append({"runs": before_runs})
        out.append({"runs": after_runs})
    return out


def parse_sections(body, rels, footnotes):
    sections = []
    fig_counter = 0
    pending_list = None  # {"numId": ..., "items": [...]}

    def close_pending_list():
        nonlocal pending_list
        if pending_list and pending_list["items"]:
            items = split_nested_sub_bullets(pending_list["items"])
            sections[-1]["blocks"].append({"type": "list", "items": items})
        pending_list = None

    for p in body.findall(w("p")):
        style, num_id = paragraph_style(p)
        if style in ("TOC1", "TOC2", "TOC3"):
            continue

        if style in HEADING_LEVELS:
            close_pending_list()
            runs = build_runs(p, rels, footnotes)
            title = re.sub(r"\s+", " ", "".join(r.get("text", "") for r in runs)).strip()
            if not title:
                continue
            sections.append({
                "id": slugify(title, len(sections)),
                "level": HEADING_LEVELS[style],
                "title": CH1_PART_NUMBERING.get(title, title),
                "blocks": [],
            })
            continue

        runs = apply_link_markers(build_runs(p, rels, footnotes))
        runs, database_link_block = split_database_link(runs)
        plain = "".join(r.get("text", "") for r in runs)
        has_footnote = any("footnoteRef" in r for r in runs)
        if not sections and (plain.strip() or has_footnote or database_link_block):
            sections.append({"id": "introduction", "level": 1, "title": "Introduction", "blocks": []})
        if database_link_block:
            # Emit ahead of the paragraph it was lifted out of, and ahead of a list still
            # buffered, so the link keeps its place in reading order.
            close_pending_list()
            sections[-1]["blocks"].append(database_link_block)
        if not plain.strip() and not has_footnote:
            # Word inserts an empty numPr-less paragraph between list items for spacing;
            # don't let it close a list in progress. A paragraph that held nothing but the
            # database link is spent by now — its block is already emitted above.
            continue

        body_runs, figure_caption = split_figure(runs)

        if num_id is not None:
            if pending_list is None or pending_list["numId"] != num_id:
                close_pending_list()
                pending_list = {"numId": num_id, "items": []}
            pending_list["items"].append({"runs": body_runs})
            if figure_caption:
                close_pending_list()
                fig_counter += 1
                sections[-1]["blocks"].append(make_figure_block(figure_caption, fig_counter))
            continue

        close_pending_list()
        if figure_caption is not None:
            if body_runs:
                sections[-1]["blocks"].append({"type": "paragraph", "runs": body_runs})
            fig_counter += 1
            sections[-1]["blocks"].append(make_figure_block(figure_caption, fig_counter))
        elif plain.strip() == "Diagram":
            # Placeholder for the section-1 diagram: an uncaptioned, unnumbered figure.
            sections[-1]["blocks"].append({
                "type": "figure",
                "id": "fig-diagram",
                "number": None,
                "src": "/report-images/Figure_1.0_diagram.webp",
                "caption": "",
            })
        else:
            sections[-1]["blocks"].append({"type": "paragraph", "runs": runs})

    close_pending_list()

    seen_ids = {}
    for s in sections:
        if s["id"] in seen_ids:
            seen_ids[s["id"]] += 1
            s["id"] = f"{s['id']}-{seen_ids[s['id']]}"
        else:
            seen_ids[s["id"]] = 0

    return sections, fig_counter


def build_footnote_runs(footnote_el, rels, footnotes):
    all_runs = []
    for i, p in enumerate(footnote_el.findall(w("p"))):
        para_runs = build_runs(p, rels, footnotes)
        if i > 0 and para_runs:
            if all_runs and "text" in all_runs[-1] and not all_runs[-1]["text"].endswith(" "):
                all_runs[-1]["text"] += " "
            elif not all_runs or "text" not in all_runs[-1]:
                all_runs.append({"text": " "})
        all_runs.extend(para_runs)
    return all_runs


def parse_footnotes(zf, footnotes):
    root = load_part(zf, "word/footnotes.xml")
    rels = load_rels(zf, "word/footnotes.xml")
    by_id = {}
    for fn in root.findall(w("footnote")):
        if fn.get(w("type")):
            continue
        by_id[fn.get(w("id"))] = build_footnote_runs(fn, rels, footnotes)

    out = []
    for note_id, num in footnotes.seen.items():
        runs = by_id.get(note_id) or [{"text": f"[Footnote {num}]"}]
        out.append({"n": num, "runs": runs})
    out.sort(key=lambda f: f["n"])
    return out


# Section ids the rest of the app deep-links into. Each is derived by slugify() from a
# heading's own text, so retitling that heading silently changes the id and breaks the
# link at the other end with no error. The database's "Read more about this violation"
# link (REPORT_SECTION_BY_PATTERN in src/components/ViolationRow.jsx) points every case
# at one of the three pattern subsections, falling back to the chapter id; the report's
# own cross-references resolve the remaining two.
LINKED_SECTION_IDS = {
    "selective-communication": "database pattern selective-comms",
    "extending-the-libyan-coast-guard-s-reach": "database pattern mt-sar",
    "witnessing-direct-violence": "database pattern violence",
    "chapter-2-aerial-operations-2017-2025": "database fallback for an untagged case",
    "stopping-civilian-aerial-monitoring": "in-report cross-reference",
    "conclusions": "in-report cross-reference",
}


def check_linked_sections(sections):
    """Warn when a heading has been retitled out from under an incoming deep link."""
    present = {s["id"] for s in sections}
    missing = [(i, why) for i, why in LINKED_SECTION_IDS.items() if i not in present]
    for i, why in missing:
        print(f"WARNING: section id {i!r} is gone — {why} now lands nowhere.")
    if missing:
        print("  A heading was retitled; update the id at the linking end, or the heading.")
    return missing


def main(docx_path):
    with zipfile.ZipFile(docx_path) as zf:
        doc_root = load_part(zf, "word/document.xml")
        doc_rels = load_rels(zf, "word/document.xml")
        body = doc_root.find(w("body"))

        footnotes = FootnoteNumbering()
        sections, fig_counter = parse_sections(body, doc_rels, footnotes)
        footnotes_out = parse_footnotes(zf, footnotes)

    out = {
        "_comment": f"Auto-ported from {posixpath.basename(docx_path)} via scripts/docx_to_report.py. "
                    "Structural port (sections/blocks/runs/footnotes); external link URLs "
                    "and figure images are placeholders where unknown. NEEDS EDITORIAL "
                    "VERIFICATION against the docx.",
        "sections": sections,
        "footnotes": footnotes_out,
    }

    with open(OUT_PATH, "w") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print("sections:", len(sections))
    print("  level1:", sum(1 for s in sections if s["level"] == 1))
    print("  figures:", fig_counter)
    print("footnotes:", len(footnotes_out))
    print("h1 titles:", [s["title"] for s in sections if s["level"] == 1])
    check_linked_sections(sections)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("usage: docx_to_report.py <report.docx>", file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1])
