export const buildingFormTemplate = (d) => `
DHENKANAL REGIONAL IMPROVEMENT TRUST, DHENKANAL
APPLICATION FOR GRANT OF LICENCE / PERMISSION
FORM-1 (See Rule 6)
BUILDING PLAN APPLICATION FORM

APPLICATION FOR PERMISSION FOR DEVELOPMENT OF BUILDING AND SUB-DIVISION OF LAND
(Under Section – 33 (1) / 31 (3) of the Orissa Town Planning & Improvement Trust Act, 1956)

From:
Name and Address (In Block letters): ${d.name}
Tel No: ${d.phone || "N/A"}

To,
THE CHAIRMAN,
Dhenkanal Regional Improvement Trust, Dhenkanal

Madam/Sir,

I/We hereby apply for permission to undertake development and carry out:

a) Construction of ${d.floors || "___"} storied building
b) Re-construction of an existing building
c) Alteration/addition to the existing building
d) Revalidation/renewal of plan for construction of ${d.floors || "___"} storied building
e) Sub-division of land
f) ${d.other_work || "N/A"}
g) Demolition
h) ${d.other_work2 || "N/A"}

In respect of:
Plot No: ${d.plot_number}
Khata No: ${d.khata || "N/A"}
Village/Mouza: ${d.village || "N/A"}
Municipality/NAC: ${d.city || "N/A"}

Purpose of use: ${d.purpose || "Residential"}

Documents furnished:
1. Building plan – Yes
2. Ownership document – Yes
3. Supervision certificate – Yes
4. Affidavit – Yes
5. Structural stability – Yes
6. Fire NOC – Yes
7. Environmental clearance – Yes

Declaration:
I hereby declare that the information provided is true and correct.

Date: ${new Date().toLocaleDateString()}
Signature: ______________________
`;