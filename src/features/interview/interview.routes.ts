import { Router } from "express";
import { deleteInterviewReportController, generateInterviewReport, generatePdf, getAllInterviewReportsController, getReport } from "./interview.controller";
import upload from "./middleware/upload.middleware";
import { authenticate } from "../auth/auth.middleware";

const router: Router = Router();

router.use(authenticate);

/** 
 * @route GET /api/interview
 * @description List all interview reports by userId
 * @access Private
 */
router.get("/report", getAllInterviewReportsController);

/**
 * @route POST /api/interview/report
 * @description Generate interview report
 * @access Private
 */
router.post("/report", upload.single("resume"), generateInterviewReport);

/**
 * @route GET /api/interview/:interviewId
 * @description Get interview report by ID
 * @access Private
 */
router.get("/:interviewId", getReport);

/**
 * @route POST /api/interview/resume/generate-pdf/:interviewId
 * @description Generate PDF from interview report
 * @access Private
 */
router.post("/resume/generate-pdf/:interviewId", generatePdf);

/**
 * @route DELETE /api/interview/:interviewId
 * @description Delete interview report
 * @access Private
 */
router.delete("/:interviewId", deleteInterviewReportController);

export default router;