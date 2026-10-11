import mongoose from "mongoose";

const AttemptSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  score: { type: Number, required: true },
  total: { type: Number, required: true },
  percentage: { type: Number, required: true },
  answers: [{ questionId: Number, selectedIndex: Number, correct: Boolean }]
}, { timestamps: true });

export default mongoose.model("Attempt", AttemptSchema);
