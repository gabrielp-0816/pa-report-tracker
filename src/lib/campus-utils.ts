export const CAMPUS_MAPPINGS: Record<string, string> = {
  // College of Human Kinetics
  "chk": "College of Human Kinetics (CHK)",
  "chk main": "College of Human Kinetics (CHK)",
  "college of human kinetics": "College of Human Kinetics (CHK)",
  "college of human kinetics main": "College of Human Kinetics (CHK)",
  "human kinetics": "College of Human Kinetics (CHK)",

  // College of Arts and Letters
  "cal": "College of Arts and Letters (CAL)",
  "cal main": "College of Arts and Letters (CAL)",
  "college of arts and letters": "College of Arts and Letters (CAL)",
  "college of arts and letters main": "College of Arts and Letters (CAL)",

  // College of Science
  "cs": "College of Science (CS)",
  "cs main": "College of Science (CS)",
  "college of science": "College of Science (CS)",
  "college of science main": "College of Science (CS)",

  // College of Accountancy and Finance
  "caf": "College of Accountancy and Finance (CAF)",
  "caf main": "College of Accountancy and Finance (CAF)",
  "college of accountancy and finance": "College of Accountancy and Finance (CAF)",
  "college of accountancy and finance main": "College of Accountancy and Finance (CAF)",

  // College of Computer and Information Sciences
  "ccis": "College of Computer and Information Sciences (CCIS)",
  "ccis main": "College of Computer and Information Sciences (CCIS)",
  "college of computer and information sciences": "College of Computer and Information Sciences (CCIS)",
  "college of computer and information sciences main": "College of Computer and Information Sciences (CCIS)",

  // College of Engineering
  "coe": "College of Engineering (COE)",
  "coe main": "College of Engineering (COE)",
  "college of engineering": "College of Engineering (COE)",
  "college of engineering main": "College of Engineering (COE)",

  // College of Business Administration
  "cba": "College of Business Administration (CBA)",
  "cba main": "College of Business Administration (CBA)",
  "college of business administration": "College of Business Administration (CBA)",
  "college of business administration main": "College of Business Administration (CBA)",

  // College of Communication
  "coc": "College of Communication (COC)",
  "coc main": "College of Communication (COC)",
  "college of communication": "College of Communication (COC)",
  "college of communication main": "College of Communication (COC)",

  // College of Architecture, Design and Built Environment
  "cadbe": "College of Architecture, Design and Built Environment (CADBE)",
  "cadbe main": "College of Architecture, Design and Built Environment (CADBE)",
  "cafa": "College of Architecture, Design and Built Environment (CADBE)",
  "cafa main": "College of Architecture, Design and Built Environment (CADBE)",
  "college of architecture, design and built environment": "College of Architecture, Design and Built Environment (CADBE)",
  "college of architecture and fine arts": "College of Architecture, Design and Built Environment (CADBE)",

  // College of Tourism, Hospitality and Transportation Management
  "cthm": "College of Tourism, Hospitality and Transportation Management (CTHM)",
  "cthm main": "College of Tourism, Hospitality and Transportation Management (CTHM)",
  "college of tourism, hospitality and transportation management": "College of Tourism, Hospitality and Transportation Management (CTHM)",

  // College of Political Science and Public Administration
  "cpspa": "College of Political Science and Public Administration (CPSPA)",
  "cpspa main": "College of Political Science and Public Administration (CPSPA)",
  "college of political science and public administration": "College of Political Science and Public Administration (CPSPA)",

  // College of Education
  "coed": "College of Education (COED)",
  "coed main": "College of Education (COED)",
  "ed main": "College of Education (COED)",
  "college of education": "College of Education (COED)",

  // College of Law
  "cl": "College of Law (CL)",
  "cl main": "College of Law (CL)",
  "college of law": "College of Law (CL)",

  // College of Social Sciences and Development
  "cssd": "College of Social Sciences and Development (CSSD)",
  "cssd main": "College of Social Sciences and Development (CSSD)",
  "college of social sciences and development": "College of Social Sciences and Development (CSSD)",

  // Institute of Technology
  "itech": "Institute of Technology (ITECH)",
  "itech main": "Institute of Technology (ITECH)",
  "institute of technology": "Institute of Technology (ITECH)",

  // Open University System
  "ous": "Open University System (OUS)",
  "ou": "Open University System (OUS)",
  "open university": "Open University System (OUS)",
  "open university system": "Open University System (OUS)",

  // Satellite Campuses
  "pup san juan": "PUP San Juan Campus",
  "pup san juan campus": "PUP San Juan Campus",
  "san juan campus": "PUP San Juan Campus",
  "san juan": "PUP San Juan Campus",

  "pup taguig": "PUP Taguig Campus",
  "pup taguig campus": "PUP Taguig Campus",
  "taguig campus": "PUP Taguig Campus",
  "taguig": "PUP Taguig Campus",

  "pup paranaque": "PUP Parañaque Campus",
  "pup paranaque campus": "PUP Parañaque Campus",
  "pup parañaque": "PUP Parañaque Campus",
  "pup parañaque campus": "PUP Parañaque Campus",

  "pup qc": "PUP Quezon City Campus",
  "pup qc campus": "PUP Quezon City Campus",
  "pup quezon city": "PUP Quezon City Campus",
  "pup quezon city campus": "PUP Quezon City Campus",

  "pup bataan": "PUP Bataan Campus",
  "pup bataan campus": "PUP Bataan Campus",

  "pup ragay": "PUP Ragay Campus",
  "pup ragay campus": "PUP Ragay Campus",

  "pup lopez": "PUP Lopez Campus",
  "pup lopez campus": "PUP Lopez Campus",

  "pup alfonso": "PUP Alfonso Campus",
  "pup alfonso campus": "PUP Alfonso Campus",

  "pup sto. tomas": "PUP Sto. Tomas Campus",
  "pup sto tomas": "PUP Sto. Tomas Campus",
  "pup sto. tomas campus": "PUP Sto. Tomas Campus",

  "pup sta. maria": "PUP Sta. Maria Campus",
  "pup sta maria": "PUP Sta. Maria Campus",
  "pup sta. maria campus": "PUP Sta. Maria Campus",
};

/**
 * Normalizes raw position / campus / unit string into a unified canonical campus name
 * to prevent duplicate entries like "CHK", "CHK Main", "College of Human Kinetics".
 */
export function normalizeCampusName(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Unassigned";

  // Strip prefixes like "Faculty - ", "Faculty:", etc.
  let cleaned = raw
    .replace(/^Faculty\s*[:-]\s*/i, "")
    .replace(/^Department of\s*/i, "")
    .trim();

  if (!cleaned) return "Unassigned";

  const lower = cleaned.toLowerCase();

  // Check exact alias lookup
  if (CAMPUS_MAPPINGS[lower]) {
    return CAMPUS_MAPPINGS[lower];
  }

  // Strip trailing " Main" or " - Main" and check lookup again
  const lowerNoMain = lower.replace(/\s*-\s*main$/i, "").replace(/\s+main$/i, "");
  if (CAMPUS_MAPPINGS[lowerNoMain]) {
    return CAMPUS_MAPPINGS[lowerNoMain];
  }

  // If it starts with "PUP " and doesn't end with "Campus", append "Campus"
  if (/^PUP\s+/i.test(cleaned) && !/Campus$/i.test(cleaned)) {
    return `${cleaned} Campus`;
  }

  return cleaned;
}
