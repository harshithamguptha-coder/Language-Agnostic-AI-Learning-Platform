import { Document, Packer, Paragraph } from "docx";
import { saveAs } from "file-saver";
import { buildingFormTemplate } from "../templates/buildingFormTemplate";

export const generateDocxFile = async (data) => {
  const content = buildingFormTemplate(data);

  const doc = new Document({
    sections: [
      {
        children: content.split("\n").map(
          (line) => new Paragraph(line)
        ),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, "Application_Form.docx");
};
