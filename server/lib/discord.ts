import type { ApplicantInfo, ResearchResult } from "./types";

interface SendReportParams {
  botToken: string;
  channelId: string;
  applicant: ApplicantInfo;
  result: ResearchResult;
  pdfBuffer: Buffer;
}

export async function sendReportToDiscord({
  botToken,
  channelId,
  applicant,
  result,
  pdfBuffer,
}: SendReportParams): Promise<void> {
  const { company } = result;

  const embed = {
    title: `Company Research Report — ${company.companyName}`,
    color: 0x2b5fd9,
    fields: [
      { name: "Applicant Name", value: applicant.name || "N/A", inline: true },
      { name: "Applicant Email", value: applicant.email || "N/A", inline: true },
      { name: "Company", value: company.companyName || "N/A", inline: true },
      { name: "Website", value: company.website || "N/A", inline: true },
    ],
    timestamp: new Date().toISOString(),
  };

  const fileName = `${company.companyName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-research-report.pdf`;

  const form = new FormData();
  form.append("payload_json", JSON.stringify({ embeds: [embed] }));
  form.append(
    "files[0]",
    new Blob([pdfBuffer as unknown as ArrayBuffer], { type: "application/pdf" }),
    fileName
  );

  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord delivery failed (${res.status}): ${body}`);
  }
}
