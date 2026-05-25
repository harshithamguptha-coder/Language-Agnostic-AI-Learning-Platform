import { jsPDF } from "jspdf";

export const generateApplicationPDF = (data) => {
  const doc = new jsPDF();

  doc.setFont("helvetica");

  // TITLE
  doc.setFontSize(16);
  doc.text("BUILDING PLAN APPLICATION FORM", 50, 20);

  doc.setFontSize(12);

  let y = 40;

  const field = (label, value) => {
    doc.text(`${label}:`, 20, y);
    doc.text(`${value || "__________"}`, 80, y);
    y += 12;
  };

  // FORM FIELDS
  field("Applicant Name", data.owner_name);
  field("Address", data.address);
  field("Location", data.location);
  field("Plot Number", data.plot_number);
  field("Date of Birth", data.dob);

  field("Aadhaar Number", data.aadhaar_number);
  field("PAN Number", data.pan_number);

  y += 10;

  // DECLARATION
  doc.text("Declaration:", 20, y);
  y += 10;
  doc.text(
    "I hereby declare that the information provided is true and correct.",
    20,
    y,
    { maxWidth: 170 }
  );

  y += 20;

  // SIGNATURE
  doc.text("Signature: ____________________", 20, y);

  doc.save("Application_Form.pdf");
};
