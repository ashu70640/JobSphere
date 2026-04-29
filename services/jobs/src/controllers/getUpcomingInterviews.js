import Job from "../models/Job.js";

export const getUpcomingInterviews = async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // important fix

  const jobs = await Job.find({
    createdBy: req.user.userId,
    interviewDate: { $gte: today },
  })
    .sort({ interviewDate: 1 })
    .limit(5);

  res.status(200).json({ jobs });
};
