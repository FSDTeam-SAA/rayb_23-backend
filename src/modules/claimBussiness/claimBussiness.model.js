const { Schema, model } = require("mongoose");

const claimBussinessSchema = new Schema(
  {
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
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // isMailVerified: {
    //   type: Boolean,
    //   default: false,
    // },
  },
  {
    timestamps: true,
  }
);

const ClaimBussiness = model("ClaimBussiness", claimBussinessSchema);
module.exports = ClaimBussiness;
