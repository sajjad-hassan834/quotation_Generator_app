import base64
import io
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fpdf import FPDF
from pydantic import BaseModel

app = FastAPI(title="Quotation PDF Generator")

LOGO_PATH = Path(__file__).parent.parent / "src" / "imports" / "WhatsApp_Image_2026-06-21_at_12.38.52_PM.jpeg"

TEAL = (147, 180, 189)
DARK = (17, 17, 17)
GRAY = (85, 85, 85)
WHITE = (255, 255, 255)


class Item(BaseModel):
    id: str
    details: str
    qty: float
    unitPrice: float


class QuotationData(BaseModel):
    quoteNumber: str
    date: str
    validUntil: str
    billToName: str
    billToCompany: str
    billToAddress: str
    billToEmail: str
    billToPhone: str
    shipToName: str
    shipToCompany: str
    shipToAddress: str
    shipToEmail: str
    shipToPhone: str
    paymentTerms: str
    taxRate: float
    items: list[Item]


class QuotationPDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 4, "Thank you for your business!", align="C")
        self.ln(4)
        self.cell(0, 4, "For any queries, please contact us.", align="C")


def build_pdf(data: QuotationData) -> bytes:
    pdf = QuotationPDF("P", "mm", "A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pw = pdf.w
    lm = 20
    content_w = pw - lm - 20

    # ─── HEADER BANNER ───
    pdf.set_fill_color(*TEAL)
    pdf.rect(0, 0, pw, 32, "F")

    logo_d = 18
    logo_x = lm
    logo_y = 7
    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=logo_x, y=logo_y, w=logo_d, h=logo_d, type="JPEG")

    # White circle behind logo
    pdf.set_fill_color(*WHITE)
    pdf.circle(logo_x + logo_d / 2, logo_y + logo_d / 2, logo_d / 2 + 0.5)
    if LOGO_PATH.exists():
        pdf.image(str(LOGO_PATH), x=logo_x, y=logo_y, w=logo_d, h=logo_d, type="JPEG")

    tx = logo_x + logo_d + 10
    pdf.set_xy(tx, logo_y + 1)
    pdf.set_font("Helvetica", "B", 16)
    pdf.set_text_color(*WHITE)
    pdf.cell(0, 8, "BURHAN ALUMINIUM TRADERS")

    pdf.set_xy(tx, logo_y + 10)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 6, "Quality Aluminium Solutions")

    # ─── RIGHT SIDEBAR ───
    sb_w = 14
    sb_x = pw - sb_w
    pdf.set_fill_color(*TEAL)
    pdf.rect(sb_x, 32, sb_w, 265, "F")
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*WHITE)
    with pdf.rotation(90, sb_x + sb_w / 2, 160):
        pdf.set_xy(sb_x - 65, 155)
        pdf.cell(0, 0, "BURHAN ALUMINIUM TRADERS")

    # ─── QUOTE INFO ───
    y = 38
    labels = ["Quote #:", "Date:", "Valid Until:"]
    values = [data.quoteNumber, data.date, data.validUntil]
    col_w = content_w / 3
    for i in range(3):
        pdf.set_xy(lm + i * col_w, y)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*GRAY)
        pdf.cell(col_w - 4, 5, labels[i])
    for i in range(3):
        pdf.set_xy(lm + i * col_w, y + 5)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*DARK)
        pdf.cell(col_w - 4, 5, values[i] or "-")

    # ─── BILL TO / SHIP TO ───
    y += 16
    half = (content_w - 10) / 2

    def draw_address_block(title, name, company, address, email, phone, x):
        pdf.set_fill_color(*TEAL)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*WHITE)
        pdf.set_xy(x, y)
        pdf.cell(half, 6, f"  {title}", fill=True)

        lines = [
            ("b", name or "-"),
            ("", company or "-"),
            ("", address or "-"),
            ("", email or "-"),
            ("", phone or "-"),
        ]
        yy = y + 7
        for style, val in lines:
            pdf.set_xy(x, yy)
            if style == "b":
                pdf.set_font("Helvetica", "B", 9)
                pdf.set_text_color(*DARK)
            else:
                pdf.set_font("Helvetica", "", 9)
                pdf.set_text_color(*GRAY)
            pdf.cell(half, 5, f"  {val}")
            yy += 5

    draw_address_block("BILL FROM", data.billToName, data.billToCompany,
                       data.billToAddress, data.billToEmail, data.billToPhone, lm)
    draw_address_block("BILL TO", data.shipToName, data.shipToCompany,
                       data.shipToAddress, data.shipToEmail, data.shipToPhone,
                       lm + half + 10)

    max_h = 6 + 7 + 5 * 5
    y += max_h + 4

    # ─── ITEMS TABLE ───
    col_details = content_w * 0.42
    col_qty = content_w * 0.12
    col_price = content_w * 0.23
    col_total = content_w * 0.23

    # Watermark (light teal, no alpha support in fpdf2)
    pdf.set_font("Helvetica", "B", 36)
    pdf.set_text_color(235, 240, 242)
    with pdf.rotation(-45, lm + content_w / 2, y + 40):
        pdf.set_xy(lm - 10, y + 30)
        pdf.cell(content_w + 20, 20, "BURHAN ALUMINIUM TRADERS", align="C")

    # Table header
    pdf.set_fill_color(*TEAL)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*WHITE)
    pdf.set_draw_color(*TEAL)
    pdf.set_xy(lm, y)
    pdf.cell(col_details, 7, "  ITEM DETAILS", border=1, fill=True)
    pdf.cell(col_qty, 7, "QTY", border=1, align="C", fill=True)
    pdf.cell(col_price, 7, "UNIT PRICE (PKR)", border=1, align="R", fill=True)
    pdf.cell(col_total, 7, "TOTAL (PKR)", border=1, align="R", fill=True)
    y += 7

    pdf.set_draw_color(209, 213, 219)
    items_with_totals = []
    for item in data.items:
        total = item.qty * item.unitPrice
        items_with_totals.append((item, total))
        details = item.details or "-"

        # Calculate row height
        pdf.set_font("Helvetica", "", 9)
        # approximate lines needed
        char_w = pdf.get_string_width("A")
        max_chars = int(col_details / char_w) if char_w > 0 else 30
        lines = max(1, -(-len(details) // max_chars))  # ceiling division
        row_h = max(7, lines * 5 + 2)

        pdf.set_fill_color(255, 255, 255)
        pdf.set_text_color(*DARK)
        pdf.set_font("Helvetica", "", 9)

        x0 = lm
        pdf.rect(x0, y, col_details, row_h)
        pdf.set_xy(x0 + 1, y + 1)
        pdf.multi_cell(col_details - 2, 5, details)

        pdf.set_xy(x0 + col_details, y)
        pdf.cell(col_qty, row_h, str(int(item.qty)), border=1, align="C")
        pdf.cell(col_price, row_h, f"PKR {item.unitPrice:,.0f}", border=1, align="R")
        pdf.cell(col_total, row_h, f"PKR {total:,.0f}", border=1, align="R")

        y += row_h

    # Bottom border
    pdf.set_draw_color(209, 213, 219)
    pdf.line(lm, y, lm + content_w, y)

    # ─── TOTALS ───
    sub_total = sum(t for _, t in items_with_totals)
    tax_amount = sub_total * data.taxRate / 100
    grand_total = sub_total + tax_amount

    tw = 140
    tx = lm + content_w - tw
    y += 8

    total_rows = [
        ("Sub Total:", f"PKR {sub_total:,.0f}", DARK),
        (f"Tax ({data.taxRate}%):", f"PKR {tax_amount:,.2f}", DARK),
    ]
    for label, val, color in total_rows:
        pdf.set_xy(tx, y)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*GRAY)
        pdf.cell(tw - 60, 6, label, align="R")
        pdf.set_text_color(*color)
        pdf.cell(60, 6, val, align="R")
        pdf.set_draw_color(209, 213, 219)
        pdf.line(tx, y + 6, tx + tw, y + 6)
        y += 8

    # Grand Total bar
    pdf.set_fill_color(*TEAL)
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_xy(tx, y)
    pdf.cell(tw - 60, 9, "  GRAND TOTAL:", fill=True)
    pdf.set_xy(tx + tw - 60, y)
    pdf.cell(60, 9, f"PKR {grand_total:,.2f}", fill=True, align="R")
    y += 14

    # ─── PAYMENT TERMS ───
    pdf.set_fill_color(*TEAL)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*WHITE)
    pdf.set_xy(lm, y)
    pdf.cell(50, 6, "  PAYMENT TERMS", fill=True)
    y += 8
    pdf.set_xy(lm, y)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*GRAY)
    pdf.multi_cell(content_w, 5, data.paymentTerms or "No payment terms specified.")

    return bytes(pdf.output())


@app.post("/api/generate-pdf")
async def generate_pdf(data: QuotationData):
    try:
        pdf_bytes = build_pdf(data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="Quotation_{data.quoteNumber}.pdf"'
                ),
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Serve frontend static files in production ───
DIST_DIR = Path(__file__).parent.parent / "dist"
if DIST_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(DIST_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = DIST_DIR / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        index = DIST_DIR / "index.html"
        if index.exists():
            return FileResponse(str(index), media_type="text/html")
        return Response(status_code=404)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
