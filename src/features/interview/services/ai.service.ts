import { GoogleGenAI, Schema } from "@google/genai";
import { env } from "../../../shared/config/env";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import puppeteer from "puppeteer";

let aiClient: GoogleGenAI | null = null;

const getAIClient = (): GoogleGenAI => {
  if (!aiClient) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not defined in environment variables");
    }
    aiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return aiClient;
};

const TechnicalQuestionSchema = z.object({
  question: z
    .string()
    .describe("The technical question to be asked in the interview"),
  intention: z
    .string()
    .describe("The interviewer's intention behind asking this question"),
  answer: z
    .string()
    .describe("How to answer this question, covering key points and approach"),
});

const BehavioralQuestionSchema = z.object({
  question: z.string().describe("The behavioral question to be asked"),
  intention: z.string().describe("What the interviewer wants to assess"),
  answer: z.string().describe("Suggested answer structure and key points"),
});

const SkillGapSchema = z.object({
  skill: z.string().describe("Skill that is missing or needs improvement"),
  severity: z
    .enum(["low", "medium", "high"])
    .describe("How critical this gap is for the job"),
});

const PreparationPlanDaySchema = z.object({
  day: z.number().describe("Day number (1, 2, 3...)"),
  focus: z.string().describe("Main topic or skill to focus on that day"),
  tasks: z
    .array(z.string())
    .describe("Specific tasks or exercises for that day"),
});

const InterviewReportSchema = z.object({
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall match percentage between candidate and job description"),
  technicalQuestions: z.array(TechnicalQuestionSchema),
  behavioralQuestions: z.array(BehavioralQuestionSchema),
  skillGaps: z.array(SkillGapSchema),
  preparationPlan: z.array(PreparationPlanDaySchema),
  title: z.string(),
});

const sanitizeAiOutput = (raw: any, inputTitle: string) => {
  // Ensure matchScore
  const matchScore = typeof raw.matchScore === 'number' ? raw.matchScore : 50;

  // Convert string arrays to object arrays if needed
  const technicalQuestions = (raw.technicalQuestions || []).map((q: any) => {
    if (typeof q === 'string') {
      return { question: q, intention: "", answer: "" };
    }
    return { question: q.question || "", intention: q.intention || "", answer: q.answer || "" };
  });

  const behavioralQuestions = (raw.behavioralQuestions || []).map((q: any) => {
    if (typeof q === 'string') {
      return { question: q, intention: "", answer: "" };
    }
    return { question: q.question || "", intention: q.intention || "", answer: q.answer || "" };
  });

  const skillGaps = (raw.skillGaps || []).map((g: any) => {
    if (typeof g === 'string') {
      return { skill: g, severity: "medium" };
    }
    return { skill: g.skill || "", severity: g.severity || "medium" };
  });

  const preparationPlan = (raw.preparationPlan || []).map((p: any, idx: number) => {
    if (typeof p === 'string') {
      const dayMatch = p.match(/Day\s+(\d+)/i);
      const day = dayMatch ? parseInt(dayMatch[1]) : idx + 1;
      const focus = p.replace(/^Day\s+\d+:\s*/, "").split(" - ")[0];
      return { day, focus, tasks: [p] };
    }
    return {
      day: p.day || idx + 1,
      focus: p.focus || "",
      tasks: Array.isArray(p.tasks) ? p.tasks : [String(p.tasks)],
    };
  });

  return {
    matchScore,
    technicalQuestions,
    behavioralQuestions,
    skillGaps,
    preparationPlan,
    title: inputTitle,
  };
};

/**
 * Generates structured interview report using Google's GenAI.
 * @param resume - Resume text or URL
 * @param title - Job title
 * @param selfDescription - Candidate's self-description
 * @param jobDescription - Full job description
 * @returns Structured data matching InterviewReportSchema
 */
export const generateInterviewReportService = async (
  resumeText: string,
  title: string,
  selfDescription: string,
  jobDescription: string,
) => {
  const ai = getAIClient();

  const prompt = `
Generate an interview report in **valid JSON only** with exactly this structure:

{
"matchScore": number (0-100),
"technicalQuestions": [{"question": string, "intention": string, "answer": string}],
"behavioralQuestions": [{"question": string, "intention": string, "answer": string}],
"skillGaps": [{"skill": string, "severity": "low" | "medium" | "high"}],
"preparationPlan": [{"day": number, "focus": string, "tasks": [string]}],
"title": string
}

Candidate Resume: ${resumeText}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Return ONLY the JSON object, no extra text.
`;

  try {
    const response: any = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      // model: "gemini-2.0-flash-001",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (!response.text) throw new Error("No text data returned from AI");

    const raw = JSON.parse(response.text);
    const sanitized = sanitizeAiOutput(raw, title);
    const validated = InterviewReportSchema.parse(sanitized);
    return validated;
  } catch (error) {
    console.error("Error generating interview report:", error);
    throw new Error("Failed to generate interview report");
  }
};


export const generatePdfromHtmml = async (htmlContent: string) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(htmlContent, { waitUntil: "networkidle0" });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw new Error("Failed to generate PDF");
  }

}

export const generatePdfService = async (
  title: string,
  selfDescription: string,
  jobDescription: string,
  resumeText: string,
) => {
  const ai = getAIClient();

  const resumePdfSchema = z.object({
    html: z.string().describe("The html content of the resume which can be converted into pdf using puppeteer."),
  });

  const propmt = `Generate an **valid HTML only** resume for a candidate with the following details:

  Candidate Resume: ${resumeText}
  Self Description: ${selfDescription}
  Job Description: ${jobDescription}
  Title: ${title}
  
  The response should be a json object with a singlee field 'html' which contains the html content of the resume.
  The resume should be tailored for the given job description and should highlight the key skills and experiences that match the job description.
  The content of resume should be not sound like it's generated by AI and should be as possible as natural.
  You can highlight the content using some colors or different font syles but the overall design should be professional and modern.
  The resume should not be more than 1 page long.
  The Content should be ATS friendly and easily parsable by ATS system.
  `

  const response: any = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: propmt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumePdfSchema as any) as any,
    },
  });

  const jsonContent = JSON.parse(response.text);
  const pdfBuffer = await generatePdfromHtmml(jsonContent.html);
  return pdfBuffer;
};

