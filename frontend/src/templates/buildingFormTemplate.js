export const buildingFormTemplate = (data) => `
BUILDING PLAN APPLICATION FORM

Applicant Name: ${data.name}
Address: ${data.address}
Location: ${data.location}
Plot Number: ${data.plot_number}
Date of Birth: ${data.dob}

Aadhaar Number: ${data.aadhaar_number}
PAN Number: ${data.pan_number}

Declaration:
I hereby declare that the information provided is true and correct.

Signature: ______________________
`;
