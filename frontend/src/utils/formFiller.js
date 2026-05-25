import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export const runApplicationAgent = (goal, extractedData) => {
  goal = goal.toLowerCase();

  let formType = "water";

  if (goal.includes("electricity")) formType = "electricity";
  else if (goal.includes("house") || goal.includes("building")) formType = "building";

  return {
    action: "fill_form",
    formType,
    extractedData,
  };
};

export const fillPdf = async (fileUrl, data) => {
  const res = await fetch(fileUrl);

  if (!res.ok) {
    throw new Error(`Unable to load PDF: ${fileUrl}`);
  }
  const bytes = await res.arrayBuffer();

  const pdfDoc = await PDFDocument.load(bytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const page = pages[0];

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fields = form.getFields();
  fields.forEach((field) => {
    console.log("PDF FIELD:", field.getName());
  });

  const draw = (text, x, y) => {
    page.drawText(text || "", {
      x,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  };

  draw(data.owner_name, 160, 690);
  draw(data.address, 160, 660);

  draw(data.location, 220, 600);
  draw("Tenali", 220, 580);
  draw("District", 220, 560);

  draw(data.plot_number, 400, 500);
  draw(data.location, 400, 480);

  draw("Residential Construction", 300, 420);

  draw(data.owner_name, 220, 230);

  const today = new Date().toLocaleDateString();
  draw(today, 400, 720);

  const filledBytes = await pdfDoc.save();

  return URL.createObjectURL(
    new Blob([filledBytes], { type: "application/pdf" })
  );
};
