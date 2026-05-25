const detectIntent = (goal) => {
  const normalizedGoal = goal.toLowerCase();

  if (normalizedGoal.includes("house")) return "building";
  if (normalizedGoal.includes("building")) return "building";
  if (normalizedGoal.includes("electricity")) return "electricity";
  if (normalizedGoal.includes("water")) return "water";

  return "general";
};

const selectForm = (intent) => {
  if (intent === "general") {
    return "building";
  }

  return intent;
};

const extractData = (uploadedFiles) => {
  const mergedData = uploadedFiles.reduce((accumulator, file) => {
    if (file?.extractedData && typeof file.extractedData === "object") {
      return {
        ...accumulator,
        ...file.extractedData,
      };
    }

    return accumulator;
  }, {});

  return {
    name: mergedData.name || "Krupa G",
    address: mergedData.address || mergedData.location || "Bangalore, Karnataka",
    owner_name: mergedData.owner_name || mergedData.name || "Krupa G",
    location: mergedData.location || mergedData.address || "Bangalore",
    plot_number: mergedData.plot_number || "A21",
    dob: mergedData.dob || "2005-01-01",
    aadhaar_number: mergedData.aadhaar_number || mergedData.aadhar_number || "XXXX XXXX 1234",
    pan_number: mergedData.pan_number || "ABCDE1234F",
  };
};

export const runFullAgent = async ({
  goal,
  uploadedFiles,
}) => {
  console.log("Agent started");

  const intent = detectIntent(goal);
  console.log("Intent:", intent);

  const formType = selectForm(intent);
  console.log("Form selected:", formType);

  const extractedData = extractData(uploadedFiles);
  console.log("Data extracted:", extractedData);

  return {
    formType,
    extractedData,
  };
};

export const runApplicationAgent = (goal, data) => {
  return {
    action: "GENERATE_DOCX",
    payload: data,
  };
};
