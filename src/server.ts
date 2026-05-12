import dotenv from "dotenv";
import { createApp } from "./app";
import { connectDB } from "./shared/config/database";
// import { generateInterviewReport } from "./features/interview/services/ai.service";
// import { demoReportInput } from "./features/interview/services/demo-data";

dotenv.config();

const PORT = process.env.PORT || 8000;

const startServer = async () => {
  await connectDB();
  // console.log("demoJobDescription ==>>", demoReportInput);
  // await generateInterviewReport(
  //   demoReportInput.resume,
  //   demoReportInput.title,
  //   demoReportInput.selfDescription,
  //   demoReportInput.jobDescription,
  // );

  const { server } = createApp();

  server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

startServer();
