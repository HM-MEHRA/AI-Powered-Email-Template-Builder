import { buildTemplatePreviewHtml } from "./previewHtmlBuilder";

describe("preview html builder", () => {
  test("renders a clean preview without attachment placeholder text in the email body", () => {
    const html = buildTemplatePreviewHtml(
      {
        subject: "Birthday Invite",
        greeting: "Hi there,",
        body: "Join us this weekend.\n\n[Image: party.png]",
        closing: "Warmly,",
        signature: "[Your Name]",
      },
      {},
      { name: "Sunrise" }
    );

    expect(html).toContain("Email Preview");
    expect(html).toContain("Birthday Invite");
    expect(html).not.toContain("[Image: party.png]");
  });

  test("renders PDF previews with a direct frame and fallback link", () => {
    const html = buildTemplatePreviewHtml(
      {
        subject: "Proposal",
        greeting: "Hello,",
        body: "Please review the attached proposal.",
        closing: "Best,",
        signature: "[Your Name]",
      },
      {
        showPreview: true,
        kind: "PDF",
        name: "proposal.pdf",
        sizeLabel: "250 KB",
        pdfSrc: "blob:http://localhost:3000/proposal",
      },
      { name: "Sunrise" }
    );

    expect(html).toContain("Attached PDF - first page");
    expect(html).toContain("<iframe");
    expect(html).toContain("Open PDF in a new tab");
    expect(html).not.toContain("<object");
  });

  test("renders PDF first-page images when available", () => {
    const html = buildTemplatePreviewHtml(
      {
        subject: "Proposal",
        greeting: "Hello,",
        body: "Please review the attached proposal.",
        closing: "Best,",
        signature: "[Your Name]",
      },
      {
        showPreview: true,
        kind: "PDF",
        name: "proposal.pdf",
        pdfSrc: "blob:http://localhost:3000/proposal",
        pdfImageSrc: "data:image/png;base64,abc123",
      },
      { name: "Sunrise" }
    );

    expect(html).toContain("attachment-pdf-page");
    expect(html).toContain("data:image/png;base64,abc123");
    expect(html).not.toContain("<iframe");
  });
});
