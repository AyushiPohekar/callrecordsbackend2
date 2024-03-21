const mongoose=require("mongoose")


const callSchema = new mongoose.Schema({
    sid: String,
    status: String,
    direction: String,
    to: String,
    from: String,
    startTime: Date,
    endTime: Date,
    Date:Date,
    duration: String,
    recordings:String,
  });

  const callrecords = mongoose.model("callrecords", callSchema);

module.exports=callrecords;