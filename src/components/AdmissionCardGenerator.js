// ============================================
// FILE: components/AdmissionCardGenerator.js
// ============================================
'use client';

import jsPDF from 'jspdf';

const AdmissionCardGenerator = ({ registration, onClose }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // ===== OUTER BORDER =====
    doc.setLineWidth(1);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // ===== HEADER =====
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('SIPSARA INSTITUTE', pageWidth / 2, 28, { align: 'center' });

    let yPos = 42; // reduced space
    doc.setFontSize(20);
    doc.text('ADMISSION CARD', pageWidth / 2, yPos, { align: 'center' });

    doc.line(pageWidth / 2 - 30, yPos + 3, pageWidth / 2 + 30, yPos + 3);
    yPos += 12;

    // ===== STUDENT INFO BOX =====
    const tableStartY = yPos;
    const tableHeight = 38; // reduced height
    doc.setLineWidth(0.5);
    doc.rect(25, tableStartY, pageWidth - 50, tableHeight);

    const leftCol = 30;
    const rightCol = pageWidth / 2 + 5;
    let rowY = tableStartY + 10;
    const rowGap = 10;

    doc.setFontSize(11);

    // Row 1: Exam & Grade
    doc.setFont('helvetica', 'bold');
    doc.text('Exam:', leftCol, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(registration.exam_name || 'N/A', leftCol + 25, rowY);

    doc.setFont('helvetica', 'bold');
    doc.text('Grade:', rightCol, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(registration.grade_name || 'N/A', rightCol + 20, rowY);

    // Row 2: Student Name
    rowY += rowGap;
    doc.setFont('helvetica', 'bold');
    doc.text('Student:', leftCol, rowY);
    doc.setFont('helvetica', 'normal');
    doc.text(registration.student_name || 'N/A', leftCol + 25, rowY);

    // Row 3: Admission Number (no #)
    rowY += rowGap;
    doc.setFont('helvetica', 'bold');
    doc.text('Admission:', leftCol, rowY);
    doc.setFontSize(12);
    doc.text(registration.admission_number || 'N/A', leftCol + 30, rowY);

    yPos = tableStartY + tableHeight + 15;

    // ===== EXAM SCHEDULE =====
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Examination Schedule', pageWidth / 2, yPos, { align: 'center' });
    doc.line(pageWidth / 2 - 35, yPos + 2, pageWidth / 2 + 35, yPos + 2);
    yPos += 10;

    const tableX = 25;
    const tableW = pageWidth - 50;
    const colW = [55, 50, 35, 35];

    doc.setFontSize(10);
    doc.rect(tableX, yPos, tableW, 12);
    doc.text('Subject', tableX + 3, yPos + 8);
    doc.text('Date', tableX + colW[0] + 3, yPos + 8);
    doc.text('Start Time', tableX + colW[0] + colW[1] + 3, yPos + 8);
    doc.text('End Time', tableX + colW[0] + colW[1] + colW[2] + 3, yPos + 8);
    yPos += 12;

    if (registration.subject_schedule?.length) {
      registration.subject_schedule.forEach(s => {
        doc.rect(tableX, yPos, tableW, 10);
        doc.setFontSize(9);
        doc.text(s.subject_name || 'N/A', tableX + 3, yPos + 7);
        doc.text(formatDate(s.exam_date), tableX + colW[0] + 3, yPos + 7);
        doc.text(formatTime(s.start_time), tableX + colW[0] + colW[1] + 3, yPos + 7);
        doc.text(formatTime(s.end_time), tableX + colW[0] + colW[1] + colW[2] + 3, yPos + 7);
        yPos += 10;
      });
    } else {
      doc.rect(tableX, yPos, tableW, 10);
      doc.setFont('helvetica', 'italic');
      doc.text('No exam schedule available', tableX + 3, yPos + 7);
      yPos += 10;
    }

    yPos += 10;

    // ===== INSTRUCTIONS =====
    doc.rect(25, yPos, pageWidth - 50, 45);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Important Instructions', 30, yPos + 8);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const instructions = [
      '1. Bring this printed admission card to the examination hall.',
      '2. Arrive at least 30 minutes before the exam starts.',
      '3. No electronic devices are allowed.',
      '4. Bring your own stationery.',
      '5. Follow examination rules strictly.'
    ];

    let iy = yPos + 15;
    instructions.forEach(i => {
      doc.text(i, 30, iy);
      iy += 6;
    });

    yPos += 60;

    // ===== SIGNATURES =====
    doc.line(30, yPos, 90, yPos);
    doc.line(pageWidth - 90, yPos, pageWidth - 30, yPos);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Student Signature', 60, yPos + 5, { align: 'center' });
    doc.text('Examiner Signature', pageWidth - 60, yPos + 5, { align: 'center' });

    // ===== FOOTER =====
    doc.setFontSize(7);
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} | For Official Use Only`,
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );

    doc.save(`Admission_Card_${registration.admission_number}.pdf`);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <h3 className="text-xl font-bold text-center mb-4">
          Download Admission Card
        </h3>

        <button
          onClick={generatePDF}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
        >
          Download PDF
        </button>

        {onClose && (
          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2 bg-gray-200 rounded-xl"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default AdmissionCardGenerator;
