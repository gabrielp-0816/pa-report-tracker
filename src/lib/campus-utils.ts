/**
 * Comprehensive normalization rules for colleges, faculties, and campuses.
 * Merges acronyms, full names, and branch variations into unified canonical categories.
 */

export function normalizeCampusName(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) return "Unassigned";

  // Clean raw string
  let cleaned = raw
    .replace(/^Faculty\s*[:-]\s*/i, "")
    .replace(/^Department of\s*/i, "")
    .trim();

  if (!cleaned) return "Unassigned";

  const lower = cleaned.toLowerCase();

  // 1. Check Colleges & Faculties by Keyword / Acronym

  // College of Human Kinetics (CHK)
  if (/\bchk\b/i.test(cleaned) || /human kinetics/i.test(cleaned)) {
    return "College of Human Kinetics (CHK)";
  }

  // College of Arts and Letters (CAL)
  if (/\bcal\b/i.test(cleaned) || /arts and letters/i.test(cleaned)) {
    return "College of Arts and Letters (CAL)";
  }

  // College of Science (CS)
  if (/\bcs\b/i.test(cleaned) || /college of science/i.test(cleaned)) {
    return "College of Science (CS)";
  }

  // College of Accountancy and Finance (CAF)
  if (/\bcaf\b/i.test(cleaned) || /accountancy/i.test(cleaned)) {
    return "College of Accountancy and Finance (CAF)";
  }

  // College of Computer and Information Sciences (CCIS)
  if (/\bccis\b/i.test(cleaned) || /computer and information/i.test(cleaned) || /computer science/i.test(cleaned)) {
    return "College of Computer and Information Sciences (CCIS)";
  }

  // College of Engineering (COE)
  if (
    /\bcoe\b/i.test(cleaned) ||
    /\bece\b/i.test(cleaned) ||
    /\bmsece\b/i.test(cleaned) ||
    /engineering/i.test(cleaned) ||
    /electronics/i.test(cleaned)
  ) {
    return "College of Engineering (COE)";
  }

  // College of Business Administration (CBA)
  if (/\bcba\b/i.test(cleaned) || /business administration/i.test(cleaned)) {
    return "College of Business Administration (CBA)";
  }

  // College of Communication (COC)
  if (/\bcoc\b/i.test(cleaned) || /communication/i.test(cleaned)) {
    return "College of Communication (COC)";
  }

  // College of Architecture, Design and Built Environment (CADBE)
  if (
    /\bcadbe\b/i.test(cleaned) ||
    /\bcafa\b/i.test(cleaned) ||
    /architecture/i.test(cleaned) ||
    /built environment/i.test(cleaned) ||
    /fine arts/i.test(cleaned)
  ) {
    return "College of Architecture, Design and Built Environment (CADBE)";
  }

  // College of Tourism, Hospitality and Transportation Management (CTHM)
  if (/\bcthm\b/i.test(cleaned) || /tourism/i.test(cleaned) || /hospitality/i.test(cleaned)) {
    return "College of Tourism, Hospitality and Transportation Management (CTHM)";
  }

  // College of Political Science and Public Administration (CPSPA)
  if (
    /\bcpspa\b/i.test(cleaned) ||
    /political science/i.test(cleaned) ||
    /public administration/i.test(cleaned)
  ) {
    return "College of Political Science and Public Administration (CPSPA)";
  }

  // College of Social Sciences and Development (CSSD)
  if (/\bcssd\b/i.test(cleaned) || /social sciences/i.test(cleaned)) {
    return "College of Social Sciences and Development (CSSD)";
  }

  // College of Education (COED)
  if (/\bcoed\b/i.test(cleaned) || /\bed\s*main\b/i.test(cleaned) || /college of education/i.test(cleaned)) {
    return "College of Education (COED)";
  }

  // College of Law (CL)
  if (/\bcl\b/i.test(cleaned) || /college of law/i.test(cleaned)) {
    return "College of Law (CL)";
  }

  // Institute of Technology (ITECH)
  if (/\bitech\b/i.test(cleaned) || /institute of technology/i.test(cleaned)) {
    return "Institute of Technology (ITECH)";
  }

  // Open University System (OUS)
  if (/\bous?\b/i.test(cleaned) || /open university/i.test(cleaned)) {
    return "Open University System (OUS)";
  }

  // 2. Check Satellite Campuses
  if (/san juan/i.test(cleaned)) return "PUP San Juan Campus";
  if (/taguig/i.test(cleaned)) return "PUP Taguig Campus";
  if (/paranaque|parañaque/i.test(cleaned)) return "PUP Parañaque Campus";
  if (/quezon city|\bqc\b/i.test(cleaned)) return "PUP Quezon City Campus";
  if (/bataan/i.test(cleaned)) return "PUP Bataan Campus";
  if (/ragay/i.test(cleaned)) return "PUP Ragay Campus";
  if (/lopez/i.test(cleaned)) return "PUP Lopez Campus";
  if (/alfonso/i.test(cleaned)) return "PUP Alfonso Campus";
  if (/sto\.?\s*tomas/i.test(cleaned)) return "PUP Sto. Tomas Campus";
  if (/sta\.?\s*maria/i.test(cleaned)) return "PUP Sta. Maria Campus";
  if (/maragondon/i.test(cleaned)) return "PUP Maragondon Campus";
  if (/cabiao/i.test(cleaned)) return "PUP Cabiao Campus";
  if (/pulilan/i.test(cleaned)) return "PUP Pulilan Campus";
  if (/bansud/i.test(cleaned)) return "PUP Bansud Campus";
  if (/sablayan/i.test(cleaned)) return "PUP Sablayan Campus";
  if (/binan|biñan/i.test(cleaned)) return "PUP Biñan Campus";
  if (/sta\.?\s*rosa|santa rosa/i.test(cleaned)) return "PUP Santa Rosa Campus";
  if (/san pedro/i.test(cleaned)) return "PUP San Pedro Campus";
  if (/calauan/i.test(cleaned)) return "PUP Calauan Campus";

  // Fallback: strip " Main" or "- Main"
  let fallback = cleaned.replace(/\s*-\s*main$/i, "").replace(/\s+main$/i, "").trim();
  
  // Format acronyms if short
  if (fallback.length <= 5) {
    fallback = fallback.toUpperCase();
  }

  return fallback || "Unassigned";
}
