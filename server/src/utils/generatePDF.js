/**
 * generatePDF.js
 * Generates a professional boarding pass PDF using PDFKit.
 * Streams directly to the Express response object.
 */

const PDFDocument = require('pdfkit');

/**
 * Generate and stream a boarding pass PDF.
 * @param {object} res          - Express response object
 * @param {object} boardingPass - BoardingPass document (plain object)
 */
const generateBoardingPassPDF = (res, boardingPass) => {
  const doc = new PDFDocument({
    size:   'A5',
    layout: 'landscape',
    margin: 0,
    info: {
      Title:   `Boarding Pass — ${boardingPass.pnr}`,
      Author:  'AeroManage',
      Subject: `Flight ${boardingPass.flightNumber}`,
    },
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="boarding-pass-${boardingPass.pnr}-${boardingPass.seatNumber}.pdf"`
  );
  doc.pipe(res);

  const W = doc.page.width;   // ~595
  const H = doc.page.height;  // ~420
  const PAD = 28;

  // ── Background ────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, H).fill('#0f172a');

  // ── Left accent strip ─────────────────────────────────────────────────────
  doc.rect(0, 0, 6, H).fill('#2563eb');

  // ── Header bar ────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, 56).fill('#1e293b');

  // Logo text
  doc.fillColor('#3b82f6').fontSize(9).font('Helvetica-Bold')
    .text('AEROMANAGE', PAD, 14, { characterSpacing: 3 });

  // "BOARDING PASS" title
  doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold')
    .text('BOARDING PASS', PAD, 28);

  // Flight number + PNR top-right
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
    .text(`${boardingPass.flightNumber}  ·  PNR: ${boardingPass.pnr}`, W - 200, 20, { width: 172, align: 'right' });

  // ── Passenger name ────────────────────────────────────────────────────────
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
    .text('PASSENGER NAME', PAD, 72, { characterSpacing: 1 });
  doc.fillColor('#f1f5f9').fontSize(16).font('Helvetica-Bold')
    .text(boardingPass.passengerName.toUpperCase(), PAD, 84);

  // ── Route ─────────────────────────────────────────────────────────────────
  const routeY = 120;

  // Departure
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
    .text('FROM', PAD, routeY, { characterSpacing: 1 });
  doc.fillColor('#f1f5f9').fontSize(36).font('Helvetica-Bold')
    .text(boardingPass.departureAirportCode || '???', PAD, routeY + 12);
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
    .text(boardingPass.departureAirportName || '', PAD, routeY + 52, { width: 100 });

  // Arrow
  doc.fillColor('#3b82f6').fontSize(22).font('Helvetica-Bold')
    .text('→', PAD + 110, routeY + 20);

  // Arrival
  doc.fillColor('#64748b').fontSize(7).font('Helvetica')
    .text('TO', PAD + 155, routeY, { characterSpacing: 1 });
  doc.fillColor('#f1f5f9').fontSize(36).font('Helvetica-Bold')
    .text(boardingPass.arrivalAirportCode || '???', PAD + 155, routeY + 12);
  doc.fillColor('#94a3b8').fontSize(8).font('Helvetica')
    .text(boardingPass.arrivalAirportName || '', PAD + 155, routeY + 52, { width: 100 });

  // ── Details grid ──────────────────────────────────────────────────────────
  const gridY = 200;
  const cols  = [PAD, PAD + 90, PAD + 180, PAD + 270];

  const fmtTime = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const details = [
    { label: 'DATE',      value: fmtDate(boardingPass.departureTime) },
    { label: 'DEPARTURE', value: fmtTime(boardingPass.departureTime) },
    { label: 'BOARDING',  value: fmtTime(boardingPass.boardingTime) },
    { label: 'GATE',      value: boardingPass.gate || 'TBD' },
    { label: 'SEAT',      value: boardingPass.seatNumber },
    { label: 'CLASS',     value: (boardingPass.seatClass || '').toUpperCase() },
    { label: 'SEQ',       value: boardingPass.sequenceNumber ? String(boardingPass.sequenceNumber).padStart(3, '0') : '—' },
  ];

  details.forEach((d, i) => {
    const col = cols[i % 4] ?? PAD;
    const row = gridY + Math.floor(i / 4) * 44;
    doc.fillColor('#64748b').fontSize(7).font('Helvetica')
      .text(d.label, col, row, { characterSpacing: 1 });
    doc.fillColor('#f1f5f9').fontSize(13).font('Helvetica-Bold')
      .text(d.value, col, row + 11);
  });

  // ── Vertical divider ──────────────────────────────────────────────────────
  const divX = W - 160;
  doc.moveTo(divX, 60).lineTo(divX, H - 30)
    .strokeColor('#334155').lineWidth(1).dash(4, { space: 4 }).stroke();
  doc.undash();

  // ── QR code ───────────────────────────────────────────────────────────────
  if (boardingPass.qrCode) {
    try {
      const qrBuffer = Buffer.from(boardingPass.qrCode.split(',')[1], 'base64');
      doc.image(qrBuffer, divX + 16, 70, { width: 120, height: 120 });
      doc.fillColor('#64748b').fontSize(7).font('Helvetica')
        .text('SCAN AT GATE', divX + 16, 196, { width: 120, align: 'center', characterSpacing: 1 });
    } catch { /* QR render failed — skip */ }
  }

  // ── Boarded stamp ─────────────────────────────────────────────────────────
  if (boardingPass.isBoarded) {
    doc.save();
    doc.rotate(-25, { origin: [W / 2, H / 2] });
    doc.fillColor('#22c55e').opacity(0.15).fontSize(60).font('Helvetica-Bold')
      .text('BOARDED', 80, H / 2 - 40, { width: 400, align: 'center' });
    doc.restore();
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.rect(0, H - 28, W, 28).fill('#1e293b');
  doc.fillColor('#475569').fontSize(7).font('Helvetica')
    .text(
      'Please arrive at the gate at least 30 minutes before departure. This boarding pass is non-transferable and valid for one journey only.',
      PAD, H - 20, { width: W - PAD * 2, align: 'center' }
    );

  doc.end();
};

module.exports = { generateBoardingPassPDF };
