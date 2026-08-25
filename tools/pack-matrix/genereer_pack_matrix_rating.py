#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genereer_Pack_Matrix_Rating
===========================
Zelfde matrix als Genereer_Pack_Matrix, maar de rijen en kolommen staan
gesorteerd op overall in plaats van op naam, en achter elke naam staat die
overall tussen haakjes: "Petar (89)".

Daarvoor is de *volledige* pack-historie nodig, niet de compacte regels:

    GET api/packs                 -> Input.txt   (dit script)
    GET api/packs?compact=true                   (het andere script)

De compacte regels dragen de overall van de kaarten wel ("Ton (74)"), maar niet
die van de gever, geen speler-id om op te sleutelen en geen icoon-vlag. De
volledige respons bevat per kaart het hele subject. Sla die respons op als
Input.txt naast dit script.

Let op: de overall in de respons is de overall van *nu*, niet die op het moment
van pakken - de API leest elk subject van de levende kaartenpool. Dat is ook de
enige overall waarop een as te sorteren valt: iemand komt in tientallen packs
voor, en een as heeft een getal per persoon nodig.

Dit script wordt normaal gestart via Genereer_Pack_Matrix_Rating.bat, die in
dezelfde map moet staan als Input.txt.
"""

import json
import os
import sys
from datetime import datetime

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
except ImportError:
    print("FOUT: de module 'openpyxl' is niet gevonden.")
    print("Installeer deze met:  pip install openpyxl")
    sys.exit(1)


def script_dir():
    return os.path.dirname(os.path.abspath(__file__))


def field(obj, name, default=None):
    """Haalt een veld hoofdletterongevoelig op, zodat zowel camelCase
    ("claimedAt") als PascalCase ("ClaimedAt") werkt - welke van de twee de API
    teruggeeft hangt af van de serialisatie-instellingen, niet van dit script."""
    if not isinstance(obj, dict):
        return default
    if name in obj:
        return obj[name]
    lowered = name.lower()
    for key, value in obj.items():
        if key.lower() == lowered:
            return value
    return default


def load_packs(path):
    """Geeft de lijst met packs terug. Accepteert zowel het hele
    PackHistory-object als een kale lijst met packs."""
    with open(path, "r", encoding="utf-8-sig") as f:
        data = json.load(f)

    if isinstance(data, dict):
        packs = field(data, "packs")
        if packs is None:
            raise ValueError(
                "Input.txt bevat een JSON-object zonder 'packs'. Verwacht wordt de "
                "respons van GET api/packs (zonder compact=true)."
            )
    elif isinstance(data, list):
        packs = data
        if packs and isinstance(packs[0], str):
            raise ValueError(
                "Input.txt bevat de compacte regels (GET api/packs?compact=true). "
                "Dit script heeft de volledige respons nodig: GET api/packs. "
                "Gebruik anders Genereer_Pack_Matrix.bat."
            )
    else:
        raise ValueError("Input.txt moet de respons van GET api/packs bevatten.")

    if not isinstance(packs, list):
        raise ValueError("'packs' is geen lijst.")
    return packs


def first_name(name):
    """De eerste naam, net zoals de kaart en de compacte regel hem drukken."""
    parts = name.split() if name else []
    return parts[0] if parts else name


def parse_packs(packs):
    """Geeft (counts, people, stats, errors) terug.

    counts: dict[(gever_id, ontvanger_id)] -> aantal keer
    people: dict[id] -> {"name", "overall", "rating", "icon", "games"}
            overall is None voor iemand die zelf geen kaart heeft (te weinig
            wedstrijden) maar wel packs opent.
    stats:  losse tellers voor de terugkoppeling op het scherm
    errors: packs die niet te lezen waren
    """
    counts = {}
    people = {}
    errors = []
    total_cards = 0
    good_packs = 0

    def ensure(person_id, name):
        entry = people.get(person_id)
        if entry is None:
            entry = {
                "name": name,
                "overall": None,
                "rating": None,
                "icon": False,
                "games": None,
            }
            people[person_id] = entry
        elif name and not entry["name"]:
            entry["name"] = name
        return entry

    for pack in packs:
        giver_id = field(pack, "collectorId")
        giver_name = field(pack, "collectorName")
        cards = field(pack, "cards")

        if not giver_id or not isinstance(cards, list):
            errors.append(pack)
            continue

        ensure(giver_id, giver_name or giver_id)

        broken = False
        for card in cards:
            subject = field(card, "subject")
            receiver_id = field(subject, "id")
            if not receiver_id:
                # Eenmaal per pack tellen, ook als er meer kaarten in stuk zijn -
                # anders zegt de teller straks dat er meer packs kapot waren dan er
                # packs zijn.
                broken = True
                continue

            entry = ensure(receiver_id, field(subject, "name") or receiver_id)
            # Het subject komt van de levende pool, dus elk voorkomen draagt
            # dezelfde overall; de laatste overschrijft de vorige zonder verschil.
            entry["overall"] = field(subject, "overall")
            entry["rating"] = field(subject, "visibleRating")
            entry["icon"] = bool(field(subject, "isIcon", False))
            entry["games"] = field(subject, "numberOfGames")

            key = (giver_id, receiver_id)
            counts[key] = counts.get(key, 0) + 1
            total_cards += 1

        if broken:
            errors.append(pack)
        else:
            good_packs += 1

    stats = {"packs": good_packs, "cards": total_cards}
    return counts, people, stats, errors


def sort_people(people):
    """De as: hoogste overall eerst, dan hoogste rating, dan naam. Wie geen
    kaart heeft (overall None) staat achteraan, alfabetisch - anders zou een
    ontbrekend getal als een 0 sorteren en tussen de laagste kaarten belanden."""
    def key(item):
        person_id, entry = item
        overall = entry["overall"]
        rating = entry["rating"]
        return (
            0 if overall is not None else 1,
            -(overall or 0),
            -(rating or 0),
            (entry["name"] or "").lower(),
            person_id,
        )

    return [person_id for person_id, _ in sorted(people.items(), key=key)]


def label(entry):
    """"Petar (89)", of alleen de naam als die persoon geen kaart heeft."""
    name = first_name(entry["name"])
    overall = entry["overall"]
    return f"{name} ({overall})" if overall is not None else name


def build_workbook(counts, people, order):
    n = len(order)

    wb = Workbook()
    ws = wb.active
    ws.title = "Pack matrix (rating)"

    bold = Font(bold=True)
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    total_fill = PatternFill(start_color="D9E1F2", end_color="D9E1F2", fill_type="solid")
    diag_fill = PatternFill(start_color="FFF2CC", end_color="FFF2CC", fill_type="solid")
    icon_fill = PatternFill(start_color="C55A11", end_color="C55A11", fill_type="solid")
    thin = Side(style="thin", color="B7B7B7")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal="center", vertical="center")
    slanted = Alignment(horizontal="center", vertical="bottom", textRotation=60)

    def head(row, col, value, alignment=center):
        c = ws.cell(row=row, column=col, value=value)
        c.font = header_font
        c.fill = header_fill
        c.alignment = alignment
        c.border = border
        return c

    # Rij 1: kolomkoppen (ontvangers), op overall van hoog naar laag. Schuin,
    # want "Petar (89)" past niet in een kolom van tien tekens breed.
    head(1, 1, "Gever \\ Ontvanger")
    for j, person_id in enumerate(order, start=2):
        entry = people[person_id]
        c = head(1, j, label(entry), alignment=slanted)
        if entry["icon"]:
            c.fill = icon_fill
    total_col = n + 2
    head(1, total_col, "Totaal gegeven", alignment=slanted)

    # Datarijen (gevers), in dezelfde volgorde als de kolommen.
    col_totals = [0] * n
    for i, giver_id in enumerate(order):
        row = i + 2
        entry = people[giver_id]
        c = head(row, 1, label(entry))
        if entry["icon"]:
            c.fill = icon_fill

        row_total = 0
        for j, receiver_id in enumerate(order):
            value = counts.get((giver_id, receiver_id), 0)
            cell = ws.cell(row=row, column=j + 2, value=value if value else None)
            cell.alignment = center
            cell.border = border
            if giver_id == receiver_id:
                cell.fill = diag_fill
            row_total += value
            col_totals[j] += value

        tc = ws.cell(row=row, column=total_col, value=row_total)
        tc.font = bold
        tc.fill = total_fill
        tc.alignment = center
        tc.border = border

    # Totaalrij.
    total_row = n + 2
    head(total_row, 1, "Totaal ontvangen")
    for j in range(n):
        c = ws.cell(row=total_row, column=j + 2, value=col_totals[j])
        c.font = bold
        c.fill = total_fill
        c.alignment = center
        c.border = border

    c = ws.cell(row=total_row, column=total_col, value=sum(col_totals))
    c.font = bold
    c.fill = total_fill
    c.alignment = center
    c.border = border

    ws.column_dimensions["A"].width = 18
    for j in range(2, total_col + 1):
        ws.column_dimensions[get_column_letter(j)].width = 11
    ws.freeze_panes = "B2"
    ws.row_dimensions[1].height = 95

    return wb


def build_summary_sheet(wb, counts, people):
    """Platte lijst, gesorteerd op aantal - met de overalls erbij, zodat te zien
    is of de dure kaarten ook echt bij weinig mensen vandaan komen."""
    ws = wb.create_sheet("Overzicht (lijst)")
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")

    headers = [
        "Gever",
        "Overall gever",
        "Ontvanger",
        "Overall ontvanger",
        "Rating ontvanger",
        "Icoon",
        "Aantal keer gepakt",
    ]
    for j, h in enumerate(headers, start=1):
        c = ws.cell(row=1, column=j, value=h)
        c.font = header_font
        c.fill = header_fill

    rows = sorted(
        counts.items(),
        key=lambda kv: (
            -kv[1],
            -(people[kv[0][1]]["overall"] or 0),
            (people[kv[0][0]]["name"] or "").lower(),
            (people[kv[0][1]]["name"] or "").lower(),
        ),
    )
    for i, ((giver_id, receiver_id), aantal) in enumerate(rows, start=2):
        giver = people[giver_id]
        receiver = people[receiver_id]
        ws.cell(row=i, column=1, value=first_name(giver["name"]))
        ws.cell(row=i, column=2, value=giver["overall"])
        ws.cell(row=i, column=3, value=first_name(receiver["name"]))
        ws.cell(row=i, column=4, value=receiver["overall"])
        ws.cell(row=i, column=5, value=receiver["rating"])
        ws.cell(row=i, column=6, value="ja" if receiver["icon"] else "nee")
        ws.cell(row=i, column=7, value=aantal)

    for column, width in zip("ABCDEFG", (16, 14, 16, 18, 17, 8, 20)):
        ws.column_dimensions[column].width = width
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:G{len(rows) + 1}" if rows else "A1:G1"


def build_people_sheet(wb, counts, people, order):
    """Een regel per persoon, in dezelfde volgorde als de matrix: wat iemand
    trok, hoe vaak hij zelf getrokken werd, en door hoeveel verschillende mensen."""
    ws = wb.create_sheet("Spelers (op overall)")
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")

    headers = [
        "Naam",
        "Overall",
        "Rating",
        "Wedstrijden",
        "Icoon",
        "Kaarten getrokken",
        "Keer getrokken",
        "Door hoeveel mensen",
    ]
    for j, h in enumerate(headers, start=1):
        c = ws.cell(row=1, column=j, value=h)
        c.font = header_font
        c.fill = header_fill

    given = {}
    received = {}
    owners = {}
    for (giver_id, receiver_id), aantal in counts.items():
        given[giver_id] = given.get(giver_id, 0) + aantal
        received[receiver_id] = received.get(receiver_id, 0) + aantal
        owners[receiver_id] = owners.get(receiver_id, 0) + 1

    for i, person_id in enumerate(order, start=2):
        entry = people[person_id]
        ws.cell(row=i, column=1, value=first_name(entry["name"]))
        ws.cell(row=i, column=2, value=entry["overall"])
        ws.cell(row=i, column=3, value=entry["rating"])
        ws.cell(row=i, column=4, value=entry["games"])
        ws.cell(row=i, column=5, value="ja" if entry["icon"] else "nee")
        ws.cell(row=i, column=6, value=given.get(person_id, 0))
        ws.cell(row=i, column=7, value=received.get(person_id, 0))
        ws.cell(row=i, column=8, value=owners.get(person_id, 0))

    for column, width in zip("ABCDEFGH", (16, 10, 10, 13, 8, 19, 16, 20)):
        ws.column_dimensions[column].width = width
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:H{len(order) + 1}" if order else "A1:H1"


def main():
    folder = script_dir()
    input_path = os.path.join(folder, "Input.txt")

    if not os.path.isfile(input_path):
        print(f"FOUT: kan Input.txt niet vinden in: {folder}")
        print("Zet Genereer_Pack_Matrix_Rating.bat en genereer_pack_matrix_rating.py in")
        print("dezelfde map als Input.txt.")
        sys.exit(1)

    print(f"Input.txt gevonden: {input_path}")
    try:
        packs = load_packs(input_path)
    except ValueError as e:
        print(f"FOUT: {e}")
        sys.exit(1)
    print(f"{len(packs)} packs gelezen.")

    counts, people, stats, errors = parse_packs(packs)
    if errors:
        print(f"WAARSCHUWING: {len(errors)} pack(s) werden niet herkend en zijn overgeslagen.")

    if not people:
        print("Geen geldige packs gevonden, er is niets om te verwerken.")
        sys.exit(1)

    order = sort_people(people)
    wb = build_workbook(counts, people, order)
    build_summary_sheet(wb, counts, people)
    build_people_sheet(wb, counts, people, order)

    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    out_name = f"Pack_Matrix_Rating_{timestamp}.xlsx"
    out_path = os.path.join(folder, out_name)
    wb.save(out_path)

    zonder_kaart = sum(1 for p in people.values() if p["overall"] is None)
    print(
        f"{len(people)} personen gevonden, {stats['cards']} kaarten "
        f"uit {stats['packs']} packs verwerkt."
    )
    if zonder_kaart:
        print(f"({zonder_kaart} daarvan hebben zelf geen kaart en staan onderaan de matrix.)")
    print(f"Klaar! Bestand opgeslagen als: {out_name}")
    print(f"Volledig pad: {out_path}")


if __name__ == "__main__":
    main()
