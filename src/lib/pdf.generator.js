import PDFDocument from "pdfkit";

// ── Helpers ────────────────────────────────────────────────────────────────

const BRAND_CYAN   = "#36D1DC";
const BRAND_BLUE   = "#5B86E5";
const GRAY_LIGHT   = "#eeeeee";
const GRAY_TEXT    = "#666666";

function drawSectionHeader(doc, title) {
  doc.moveDown(1.5);
  doc.fontSize(13).fillColor(BRAND_BLUE).font("Helvetica-Bold").text(title, { underline: true });
  doc.moveDown(0.8);
}

function drawDivider(doc) {
  const y = doc.y;
  doc.moveTo(50, y).lineTo(550, y).strokeColor(GRAY_LIGHT).lineWidth(1).stroke();
  doc.moveDown(1);
}

function drawKeyValue(doc, key, value) {
  doc.fontSize(11).fillColor("black")
    .font("Helvetica-Bold").text(`${key}: `, { continued: true })
    .font("Helvetica").text(`${value ?? "—"}`);
  doc.moveDown(0.4);
}

// ── Generador principal ────────────────────────────────────────────────────

export const buildEvaluationPDF = (
  patientName,
  evaluatorName,
  evaluationType,
  results,
  historialCognitivo = [],
  historialFisico    = [],
  medicamentosActivos = []
) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end",  () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // ── PÁGINA 1: Encabezado + Datos generales + Resultados clínicos ────────

    // Encabezado de marca
    doc
      .fontSize(22).fillColor(BRAND_CYAN).font("Helvetica-Bold")
      .text("OldFit — Gestión Geriátrica", { align: "center" });
    doc
      .fontSize(15).fillColor(BRAND_BLUE).font("Helvetica")
      .text("Reporte Clínico Digital", { align: "center" });
    doc.moveDown(0.5);
    drawDivider(doc);

    // Datos generales
    doc.fontSize(13).fillColor("black").font("Helvetica-Bold").text("RESUMEN GENERAL");
    doc.moveDown(0.5);
    drawKeyValue(doc, "Paciente",          patientName);
    drawKeyValue(doc, "Evaluador",         evaluatorName);
    drawKeyValue(doc, "Tipo de evaluación", evaluationType.toUpperCase());
    drawKeyValue(doc, "Fecha de reporte",  new Date().toLocaleDateString("es-MX", {
      day: "2-digit", month: "long", year: "numeric"
    }));
    drawDivider(doc);

    // Resultados clínicos (JSON dinámico enviado desde el body)
    drawSectionHeader(doc, "Resultados de la Evaluación Clínica");
    doc.fontSize(11).fillColor("black");

    if (results && Object.keys(results).length > 0) {
      for (const [key, value] of Object.entries(results)) {
        const label = key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
        drawKeyValue(doc, label, value);
      }
    } else {
      doc.font("Helvetica").fillColor(GRAY_TEXT).text("Sin resultados registrados para esta evaluación.");
    }

    // ── PÁGINA 2: Medicamentos activos ─────────────────────────────────────
    doc.addPage();

    doc.fontSize(22).fillColor(BRAND_CYAN).font("Helvetica-Bold")
      .text("OldFit — Reporte Clínico", { align: "center" });
    doc.moveDown(0.5);
    drawDivider(doc);

    drawSectionHeader(doc, "Medicamentos Activos");

    if (medicamentosActivos.length === 0) {
      doc.fontSize(11).fillColor(GRAY_TEXT).font("Helvetica")
        .text("El paciente no tiene medicamentos activos registrados.");
    } else {
      medicamentosActivos.forEach((m, i) => {
        doc.fontSize(12).fillColor("black").font("Helvetica-Bold")
          .text(`${i + 1}. ${m.nombre_medicamento}`);
        doc.fontSize(11).font("Helvetica").fillColor("black");
        drawKeyValue(doc, "  Dosis",       m.dosis);
        drawKeyValue(doc, "  Frecuencia",  `Cada ${m.frecuencia_horas} horas`);
        if (m.duracion_dias) drawKeyValue(doc, "  Duración", `${m.duracion_dias} días`);
        drawKeyValue(doc, "  Inicio",      m.fecha_inicio ?? "—");
        drawKeyValue(doc, "  Fin",         m.fecha_fin    ?? "Uso crónico / indefinido");
        if (m.indicaciones) drawKeyValue(doc, "  Indicaciones", m.indicaciones);
        doc.moveDown(0.5);
      });
    }

    // ── PÁGINA 3: Evaluaciones físicas (web/geriatra) ──────────────────────
    doc.addPage();

    doc.fontSize(22).fillColor(BRAND_CYAN).font("Helvetica-Bold")
      .text("OldFit — Reporte Clínico", { align: "center" });
    doc.moveDown(0.5);
    drawDivider(doc);

    drawSectionHeader(doc, "Evaluaciones Físicas (Registradas por el Geriatra)");

    if (historialFisico.length === 0) {
      doc.fontSize(11).fillColor(GRAY_TEXT).font("Helvetica")
        .text("No hay evaluaciones físicas registradas para este paciente.");
    } else {
      historialFisico.forEach((e, i) => {
        doc.fontSize(12).fillColor("black").font("Helvetica-Bold")
          .text(`${i + 1}. ${e.nombre_ejercicio ?? e.titulo}`);
        doc.fontSize(11).font("Helvetica");
        drawKeyValue(doc, "  Métrica",       e.metrica);
        if (e.observaciones) drawKeyValue(doc, "  Observaciones", e.observaciones);
        drawKeyValue(doc, "  Fecha", e.fecha
          ? new Date(e.fecha).toLocaleDateString("es-MX", {
              day: "2-digit", month: "long", year: "numeric"
            })
          : "—"
        );
        doc.moveDown(0.5);
      });
    }

    // ── PÁGINA 4: Historial cognitivo (app móvil) ──────────────────────────
    doc.addPage();

    doc.fontSize(22).fillColor(BRAND_CYAN).font("Helvetica-Bold")
      .text("OldFit — Reporte Clínico", { align: "center" });
    doc.moveDown(0.5);
    drawDivider(doc);

    drawSectionHeader(doc, "Evaluaciones Cognitivas (App Móvil)");

    if (historialCognitivo.length === 0) {
      doc.fontSize(11).fillColor(GRAY_TEXT).font("Helvetica")
        .text("No hay sesiones de juego registradas para este paciente.");
    } else {
      historialCognitivo.forEach((s, i) => {
        doc.fontSize(12).fillColor("black").font("Helvetica-Bold")
          .text(`${i + 1}. ${s.nombre ?? s.titulo} (${s.area_cognitiva ?? "—"})`);
        doc.fontSize(11).font("Helvetica");
        drawKeyValue(doc, "  Puntaje",  s.puntaje  ?? "—");
        drawKeyValue(doc, "  Aciertos", s.aciertos ?? "—");
        drawKeyValue(doc, "  Errores",  s.errores  ?? "—");
        drawKeyValue(doc, "  Tiempo",   s.tiempo != null ? `${s.tiempo} segundos` : "—");
        if (s.detalles && Object.keys(s.detalles).length > 0) {
          drawKeyValue(doc, "  Detalles extra", JSON.stringify(s.detalles));
        }
        drawKeyValue(doc, "  Fecha", s.fecha
          ? new Date(s.fecha).toLocaleDateString("es-MX", {
              day: "2-digit", month: "long", year: "numeric"
            })
          : "—"
        );
        doc.moveDown(0.5);
      });
    }

    // ── Pie de página en la última página ──────────────────────────────────
    doc.moveDown(3);
    doc.fontSize(9).fillColor(GRAY_TEXT).font("Helvetica")
      .text(
        "Documento generado automáticamente por OldFit — Sistema de Gestión Geriátrica. © 2026",
        { align: "center" }
      );

    doc.end();
  });
};