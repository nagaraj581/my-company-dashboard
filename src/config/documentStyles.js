export const DEFAULT_DOCUMENT_STYLE_ID = "classicBlue";

export const DOCUMENT_STYLE_OPTIONS = [
  { id: "classicBlue", name: "Classic Blue" },
  { id: "emeraldClean", name: "Emerald Clean" },
  { id: "charcoalGold", name: "Charcoal Gold" },
  { id: "retroRed", name: "Retro Red" },
];

const DOCUMENT_STYLES = {
  classicBlue: {
    id: "classicBlue",
    name: "Classic Blue",
    primary: [30, 80, 130],
    accent: [47, 134, 185],
    tableStripe: [245, 245, 245],
    text: [34, 34, 34],
    muted: [80, 80, 80],
    html: {
      primary: "#2f86b9",
      line: "#1e5082",
      text: "#222222",
      muted: "#666666",
      border: "#dddddd",
      tableStripe: "#f5f5f5",
    },
  },
  emeraldClean: {
    id: "emeraldClean",
    name: "Emerald Clean",
    primary: [4, 120, 87],
    accent: [16, 185, 129],
    tableStripe: [236, 253, 245],
    text: [31, 41, 55],
    muted: [75, 85, 99],
    html: {
      primary: "#047857",
      line: "#10b981",
      text: "#1f2937",
      muted: "#4b5563",
      border: "#cbd5e1",
      tableStripe: "#ecfdf5",
    },
  },
  charcoalGold: {
    id: "charcoalGold",
    name: "Charcoal Gold",
    primary: [31, 41, 55],
    accent: [180, 128, 30],
    tableStripe: [250, 247, 239],
    text: [17, 24, 39],
    muted: [75, 85, 99],
    html: {
      primary: "#1f2937",
      line: "#b4801e",
      text: "#111827",
      muted: "#4b5563",
      border: "#d6c7a6",
      tableStripe: "#faf7ef",
    },
  },
  retroRed: {
    id: "retroRed",
    name: "Retro Red",
    primary: [185, 28, 28],
    accent: [239, 68, 68],
    tableStripe: [254, 242, 242],
    text: [17, 24, 39],
    muted: [75, 85, 99],
    html: {
      primary: "#b9181c",
      line: "#ef4444",
      text: "#111827",
      muted: "#4b5563",
      border: "#fca5a5",
      tableStripe: "#fef2f2",
    },
  },
  
};

export function getDocumentStyle(styleId) {
  return DOCUMENT_STYLES[styleId] || DOCUMENT_STYLES[DEFAULT_DOCUMENT_STYLE_ID];
}

export function getDocumentStyleId(source) {
  return (
    source?.documentStyle ||
    source?.styleId ||
    source?.companyInfo?.documentStyle ||
    DEFAULT_DOCUMENT_STYLE_ID
  );
}
