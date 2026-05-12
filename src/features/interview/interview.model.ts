import mongoose, { Schema } from "mongoose";

const technicalQuestionSchema = new Schema(
  {
    question: { type: String, required: true },
    intention: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const behavioralQuestionSchema = new Schema(
  {
    question: { type: String, required: true },
    intention: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false },
);

const skillGapSchema = new Schema(
  {
    skill: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], required: true },
  },
  { _id: false },
);

const preparationPlanDaySchema = new Schema(
  {
    day: { type: Number, required: true },
    focus: { type: String, required: true },
    tasks: [{ type: String, required: true }],
  },
  { _id: false },
);

const interviewReportSchema = new Schema(
  {
    // Inputs
    jobDescription: { type: String, required: true },
    resume: { type: String }, // uri
    selfDescription: { type: String },
    title: { type: String, required: true }, // Job title

    // AI results
    matchScore: { type: Number, min: 0, max: 100 },
    technicalQuestions: [technicalQuestionSchema],
    behavioralQuestions: [behavioralQuestionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanDaySchema],

    // Relationship
    user: { type: Schema.Types.ObjectId, ref: "users", required: true },
    status: {
      type: String,
      enum: ["draft", "processing", "completed", "failed"],
      default: "draft",
    },
    aiMetadata: {
      model: String,
      totalTokens: Number,
      costInCents: Number,
    },
  },
  { timestamps: true },
);

export const InterviewReport = mongoose.model(
  "InterviewReport",
  interviewReportSchema,
);
