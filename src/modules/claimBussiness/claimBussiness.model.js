const { Schema, model } = require("mongoose");

const claimBussinessSchema = new Schema({
  bussinessId: {
    type: Schema.Types.ObjectId,
    ref: "Business",
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  documents: {
    type: [String],
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
});

const ClaimBussiness = model("ClaimBussiness", claimBussinessSchema);
module.exports = ClaimBussiness;
