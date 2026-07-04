import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ResearchResult } from "./types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    marginBottom: 20,
    borderBottom: "2px solid #111111",
    paddingBottom: 12,
  },
  brand: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    width: 90,
    color: "#666666",
    fontFamily: "Helvetica-Bold",
  },
  infoValue: {
    flex: 1,
  },
  paragraph: {
    lineHeight: 1.5,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  bullet: {
    width: 12,
  },
  bulletText: {
    flex: 1,
    lineHeight: 1.4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#f2f2f2",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
    fontSize: 10,
  },
  table: {
    borderTop: "1px solid #dddddd",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1px solid #dddddd",
    paddingVertical: 6,
  },
  tableHeaderRow: {
    flexDirection: "row",
    paddingVertical: 6,
    backgroundColor: "#f2f2f2",
    fontFamily: "Helvetica-Bold",
  },
  tableCellName: {
    flex: 1,
  },
  tableCellWebsite: {
    flex: 1,
    color: "#2b5fd9",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#999999",
    textAlign: "center",
    borderTop: "1px solid #eeeeee",
    paddingTop: 8,
  },
});

interface PdfProps {
  result: ResearchResult;
  applicant?: { name: string; email: string };
}

function ReportDocument({ result, applicant }: PdfProps) {
  const { company, competitors } = result;

  return (
    <Document title={`${company.companyName} — Company Research Report`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>AI COMPANY RESEARCH ASSISTANT</Text>
          <Text style={styles.companyName}>{company.companyName}</Text>
          <Text style={{ color: "#2b5fd9", marginTop: 4 }}>{company.website}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Website</Text>
            <Text style={styles.infoValue}>{company.website}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{company.phone ?? "Not available"}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{company.address ?? "Not available"}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.paragraph}>{company.summary}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Products / Services</Text>
          <View style={styles.chipRow}>
            {company.products.length === 0 && <Text>Not available</Text>}
            {company.products.map((p, i) => (
              <Text key={i} style={styles.chip}>
                {p}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI-Generated Pain Points</Text>
          {company.painPoints.length === 0 && <Text>Not available</Text>}
          {company.painPoints.map((point, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={styles.bullet}>{i + 1}.</Text>
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competitors</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={styles.tableCellName}>Company</Text>
              <Text style={styles.tableCellWebsite}>Website</Text>
            </View>
            {competitors.length === 0 && (
              <View style={styles.tableRow}>
                <Text>No competitors identified</Text>
              </View>
            )}
            {competitors.map((c, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCellName}>{c.name}</Text>
                <Text style={styles.tableCellWebsite}>{c.website ?? "Unknown"}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          {applicant?.name ? `Prepared for ${applicant.name} (${applicant.email}) — ` : ""}
          Generated by AI Company Research Assistant on{" "}
          {new Date(result.generatedAt).toLocaleString()} using {result.model}
        </Text>
      </Page>
    </Document>
  );
}

export async function buildReportPdf(
  result: ResearchResult,
  applicant?: { name: string; email: string }
): Promise<Buffer> {
  return renderToBuffer(<ReportDocument result={result} applicant={applicant} />);
}
