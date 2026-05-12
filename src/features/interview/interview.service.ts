import { Types } from "mongoose";
import { InterviewReport } from "./interview.model";
import { generateInterviewReportService } from "./services/ai.service";
const pdfParse = require('pdf-parse');


// Extract text from pdf buffer
export const extractPdfText = async (buffer: Buffer): Promise<string> => {
  try {
    // const data = await pdfParse(buffer);
    const data = await (new pdfParse.PDFParse(Uint8Array.from(buffer))).getText();
    return data.text;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Create a new interview report
 * - If resume file is uploaded, extract text
 * - Call AI to generate structured report
 * - Save to database
 */
export const createInterviewReport = async (
  userId: Types.ObjectId,
  title: string,
  jobDescription: string,
  selfDescription: string,
  resumeFile?: Express.Multer.File
) => {
  const resumeContent = resumeFile ? await extractPdfText(resumeFile.buffer) : "";
  if (!resumeContent) throw new Error("Failed to extract text from PDF")

  const report = new InterviewReport({
    user: userId,
    title,
    jobDescription,
    selfDescription,
    resume: resumeFile?.originalname || "text input",
    status: "processing",
  })

  await report.save();

  try {
    // 2. Call AI service
    const aiData: any = await generateInterviewReportService(
      resumeContent,
      title,
      selfDescription,
      jobDescription
    );

    // 3. Update report with AI results
    report.matchScore = aiData.matchScore;
    report.technicalQuestions = aiData.technicalQuestions;
    report.behavioralQuestions = aiData.behavioralQuestions;
    report.skillGaps = aiData.skillGaps;
    report.preparationPlan = aiData.preparationPlan;
    report.status = "completed";
    report.aiMetadata = {
      model: "gemini-3-flash-preview",
      // token usage can be added if available
    };
    await report.save();

    return report;
  } catch (aiError) {
    // Mark as failed if AI fails
    report.status = "failed";
    await report.save();
    throw new Error("AI generation failed");
  }
}

export const getInterviewReportById = async (reportId: string, userId: Types.ObjectId) => {
  const report = await InterviewReport.findOne({ _id: reportId, user: userId })
  if (!report) throw new Error("Report not founf.")

  return report;
}

export const getAllInterviewReports = async (userId: Types.ObjectId) => {
  const reports = await InterviewReport.find({ user: userId })
  if (!reports) throw new Error("Reports not found.")
  return reports;
}

export const deleteInterviewReport = async (reportId: string, userId: Types.ObjectId) => {
  const report = await InterviewReport.deleteOne({ _id: reportId, user: userId })
  if (!report) throw new Error("Report not found.")
  return report.deletedCount;
}
