import { Request, Response } from "express";
import { createInterviewReport, deleteInterviewReport, getAllInterviewReports, getInterviewReportById } from "./interview.service";
import { generatePdfService } from "./services/ai.service";


/**
 * @description Generate interview report
 * @route POST /api/interview/generate-report
 * @access Private
 * @param req
 * @param res
 */
export const generateInterviewReport = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) throw new Error("User not found");

        const { title, jobDescription, selfDescription } = req.body;
        const resume = req.file;

        if (!title || !jobDescription || !selfDescription) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: title, jobDescription, selfDescription",
            });
        }

        if (!resume) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required",
            });
        }

        const report = await createInterviewReport(userId, title, jobDescription, selfDescription, resume);

        return res.status(201).json({
            success: true,
            message: "Interview report generated successfully",
            data: report,
        });
    } catch (error: any) {
        console.error("Generate interview report error:", error);
        if (error.status === 429) {
            return res.status(429).json({ 
                success: false,
                message: "The AI is currently taking too many requests! Please wait a minute and try again." 
            });
        }
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error",
        });
    }
}

/**
 * @description Get interview report by ID
 * @route GET /api/interview/:interviewId
 * @access Private
 * @param req
 * @param res
 */
export const getReport = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const interviewId = req.params.interviewId as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }


        const report = await getInterviewReportById(interviewId, userId);
        return res.status(200).json({
            success: true,
            data: report,
        });
    } catch (error: any) {
        console.error("Get interview report error:", error);
        if (error.message === "Report not found or access denied") {
            return res.status(404).json({ success: false, message: error.message });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

/**
 * @description Generate PDF from interview report 
 * @route POST /api/interview/:interviewId/generate-pdf
 * @access Private
 * @param req 
 * @param res 
 */
export const generatePdf = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const interviewReportId = req.params.interviewId as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!interviewReportId) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found.",
            });
        }

        const { resume, jobDescription, selfDescription, title } = await getInterviewReportById(interviewReportId, userId);

        if (!resume || !jobDescription || !selfDescription) {
            return res.status(400).json({
                success: false,
                message: "Resume, job description, or self description not found",
            });
        }

        const pdfBuffer = await generatePdfService(title, jobDescription, selfDescription, resume);
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${title}.pdf"`,
        });

        return res.status(200).send(pdfBuffer);
    } catch (error: any) {
        console.error("Generate pdf error:", error);
        if (error.status === 429) {
            return res.status(429).json({ 
                success: false,
                message: "The AI is currently taking too many requests! Please wait a minute and try again." 
            });
        }
        if (error.message === "Report not found or access denied") {
            return res.status(404).json({ success: false, message: error.message });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const getAllInterviewReportsController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }
        const reports = await getAllInterviewReports(userId);
        return res.status(200).json({
            success: true,
            data: reports,
        });
    } catch (error: any) {
        console.error("Get all interview reports error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

export const deleteInterviewReportController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?._id;
        const interviewReportId = req.params.interviewId as string;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        if (!interviewReportId) {
            return res.status(404).json({
                success: false,
                message: "Interview report not found.",
            });
        }

        const deletedReport = await deleteInterviewReport(interviewReportId, userId);
        return res.status(200).json({
            success: true,
            message: "Interview report deleted successfully",
            data: deletedReport,
        });
    } catch (error: any) {
        console.error("Generate pdf error:", error);
        if (error.message === "Report not found or access denied") {
            return res.status(404).json({ success: false, message: error.message });
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
