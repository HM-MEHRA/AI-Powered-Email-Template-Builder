import {
  buildAutoPromptFromSubject,
  cleanTemplateForDisplay,
  cleanTemplateSubject,
  filterAndSortTemplates,
  mapApiTemplateToEditorTemplate,
  buildComparisonSummary,
} from "./builderUtils";

describe("email builder utilities", () => {
  test("filters templates by category and tags", () => {
    const templates = [
      {
        subject: "Client follow-up",
        body: "Checking in after the demo",
        category: "Sales",
        tags: ["priority", "lead"],
      },
      {
        subject: "Support update",
        body: "Order status",
        category: "Support",
        tags: ["customer"],
      },
    ];

    expect(filterAndSortTemplates(templates, "priority")).toHaveLength(1);
    expect(filterAndSortTemplates(templates, "sales")[0].subject).toBe("Client follow-up");
  });

  test("maps saved template organization fields from the API", () => {
    const mapped = mapApiTemplateToEditorTemplate({
      id: 12,
      title: "Welcome",
      content: JSON.stringify({
        subject: "Welcome aboard",
        greeting: "Hi there,",
        body: "Glad to have you here.\n\n[Image: upload.png]",
        closing: "Best,",
        signature: "[Your Name]",
      }),
      footer: "Best,",
      category: "Onboarding",
      tags: ["new user"],
      is_archived: true,
      deleted_at: "2026-04-29T10:00:00Z",
      access_level: "owner",
      is_favorite: true,
      owner: { username: "owner" },
      shared_with: [],
    });

    expect(mapped.category).toBe("Onboarding");
    expect(mapped.tags).toEqual(["new user"]);
    expect(mapped.isArchived).toBe(true);
    expect(mapped.deletedAt).toBe("2026-04-29T10:00:00Z");
    expect(mapped.body).not.toContain("[Image:");
  });

  test("maps library template access fields from the API", () => {
    const mapped = mapApiTemplateToEditorTemplate({
      id: 22,
      title: "Birthday",
      content: JSON.stringify({
        subject: "Birthday Invitation",
        greeting: "Hey,",
        body: "Join us for the party.",
        closing: "See you,",
        signature: "[Your Name]",
      }),
      category: "Events",
      tags: ["birthday"],
      is_database_template: true,
      access_tier: "premium",
    });

    expect(mapped.label).toBe("Library");
    expect(mapped.isDatabaseTemplate).toBe(true);
    expect(mapped.accessTier).toBe("premium");
  });

  test("comparison summary uses at most four selected drafts", () => {
    const templates = Array.from({ length: 5 }, (_, index) => ({
      id: index + 1,
      subject: `Draft ${index + 1}`,
      body: "Please review the update and let me know what next step works for you this week.",
      greeting: "Hello,",
      closing: "Best regards,",
      signature: "[Your Name]",
    }));

    const summary = buildComparisonSummary(templates);

    expect(summary.scoredTemplates).toHaveLength(4);
    expect(summary.categories).toHaveLength(3);
  });

  test("creates an automatic prompt from a subject", () => {
    const prompt = buildAutoPromptFromSubject("Birthday invitation");

    expect(prompt).toContain("Birthday invitation");
    expect(prompt).toContain("natural email");
    expect(buildAutoPromptFromSubject("   ")).toBe("");
  });

  test("repairs placeholder-only generated subjects", () => {
    expect(cleanTemplateSubject("Subject", "applying for an internship at google")).toBe(
      "Applying For An Internship At Google"
    );
    expect(cleanTemplateSubject("Subject: Project update", "fallback")).toBe("Project update");
    expect(cleanTemplateForDisplay({ subject: "Subject", body: "Body" }, "Birthday invitation").subject).toBe(
      "Birthday Invitation"
    );
  });
});
