const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema({
  businessDetails: {
    type: String,
    required: true
  },
uploaderInfo:{
    uploaderId: {
      type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true
},
    uploaderName: {
      type: String,
        required: true
    },
    uploaderEmail: {
      type: String,
        required: true
    },
},
  businessInfo: {
    businessName: {
      type: String,
      required: true
    },
    businessPhoto: {
      type: String,
      required: true
    },
    businessAddress: {
      type: String,
      required: true
    },
    businessPhone: {
      type: String,
      
    },
    businessEmail: {
      type: String,
    },
    businessWebsite: {
      type: String,
      
    },
    businessDescription: {
      type: String,
      required: true
    }
  },

  instrumentInfo: [{
    instrumentFamily: {
      type: String,
      enum: ['Strings', 'Woodwinds', 'Brass', 'Percussions'],
      required: true
    },
    instrumentsName: [{
      type: String,
      required: true
    }],
    servicesPrice: [{
      instrument: String,
      type: {
        type: String,
      },
      priceType: {
        type: String,
        enum: ['Exact', 'Range', 'Hourly']
      },
      rangePrice: {
        min: Number,
        max: Number
      },
      exactPrice: {
        type: Number
      },
      hourlyPrice: {
        type: Number
      }
    }],
    buySellTrade: {
      sellInstruments: { type: Boolean, default: false },
      buyInstruments: { type: Boolean, default: false },
      tradeInstruments: { type: Boolean, default: false }
    }
  }],

  lessonServicePrice: {
    isMusicLesson: { type: Boolean, default: false },
    lessons: [{
      instrument: String,
      type: {
        type: String,
      },
      priceType: {
        type: String,
        enum: ['Exact', 'Range', 'Hourly']
      },
      rangePrice: {
        min: Number,
        max: Number
      },
      exactPrice: {
        type: Number
      },
      hourlyPrice: {
        type: Number
      }
    }]
  },

  businessHours: [{
    day: {
      type: String,
      enum: [
        'Monday', 'Tuesday', 'Wednesday', 'Thursday',
        'Friday', 'Saturday', 'Sunday'
      ],
     
    },
    isOpen: { type: Boolean, default: false },
    openTime: { type: String },
    closeTime: { type: String }
  }]
},

 {
  timestamps: true
}

);

const BusinessModel = mongoose.model("Business", businessSchema);
module.exports = BusinessModel;
