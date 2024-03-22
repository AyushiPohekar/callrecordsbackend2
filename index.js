const express = require("express");
const bodyParser = require('body-parser');
const fs = require('fs');
const { textToSpeech } = require('@google-cloud/text-to-speech'); 
const twilio = require("twilio");
const cors = require("cors");
const Connection = require("./db");
const Call = require("./CallSchema");
const dotenv = require("dotenv");
const ffmpeg = require('fluent-ffmpeg');

const { default: axios } = require("axios");
dotenv.config();

// console.log('Environment variables loaded:', process.env);

const app = express();

app.use(cors());
app.use(express.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

console.log(accountSid);
console.log(authToken);
const client = twilio(accountSid, authToken);
console.log(client);

function formatDateTime(date) {
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC", // Convert to UTC time
  };

  const originalDate = new Date(date)
    .toLocaleString("en-US", options)
    .replace(/,/g, "");
  let parsedDate = new Date(originalDate);
  let formattedDate = parsedDate.toISOString().split("T")[0];

  return formattedDate;
}

app.get("/listCallsByDateSolaris/:phoneNumber", async (req, res) => {
  try {
    const phoneNumber = req.params.phoneNumber;

    const callsto = await client.calls.list({
      to: phoneNumber,
    });

    const callfrom = await client.calls.list({
      from: phoneNumber,
      direction: "outbound",
    });

    const calls = [...callsto, ...callfrom];

    const callDetails = await Promise.all(
      calls.map(async (call) => {
        const recordings = await getdata(call.uri);
        const callData = call.toJSON();
        callData.recordings = recordings;
        return callData;
      })
    );

    const startDate = req.query.start_date
      ? new Date(req.query.start_date)
      : null;
    const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

    const filteredCalls = callDetails.filter((call) => {
      const callDate = new Date(call.startTime);
      return (
        (!startDate || callDate >= startDate) &&
        (!endDate || callDate <= endDate)
      );
    });

    res.send(filteredCalls);
    console.log(filteredCalls.length);
  } catch (error) {
    console.error("Error fetching call details:", error.message);
    res
      .status(500)
      .json({ error: `Error fetching call details: ${error.message}` });
  }
});





// app.get("/listCallsByDateSolaris/:phoneNumber", async (req, res) => {
//   try {
//     const phoneNumber = req.params.phoneNumber;

//     const callsto = await client.calls.list({
//       to: phoneNumber,
//     });

//     const callfrom = await client.calls.list({
//       from: phoneNumber,
//     });

//     console.log("Calls from:", callfrom); // Log the calls from to check for data

//     const calls = [...callsto, ...callfrom];

//     const callDetails = await Promise.all(
//       calls.map(async (call) => {
//         const recordings = await getdata(call.uri); // Assuming this function returns recording URLs
//         const callData = call.toJSON(); // Convert Twilio call object to plain JavaScript object
      
//         callData.recordingUrl = recordings; // Set recording URL directly
//         return callData;
//       })
//     );

//     const startDate = req.query.start_date ? new Date(req.query.start_date) : null;
//     const endDate = req.query.end_date ? new Date(req.query.end_date) : null;

//     const filteredCalls = callDetails.filter((call) => {
//       const callDate = new Date(call.startTime);
//       return (!startDate || callDate >= startDate) && (!endDate || callDate <= endDate);
//     });

//     // Fetch recording data with authentication
//     const callsWithRecordings = await Promise.all(filteredCalls.map(async (call) => {
//       try {
//         // Add authentication headers
//         const authHeader = {
//           auth: {
//             username: accountSid,
//             password: authToken,
//           },
//         };


        
      
    
//         const response = await axios.get(call.recordingUrl, authHeader);
       
     
//         // // Assuming the response.data contains the audio content (e.g., binary audio data)
//         //  const audioContent = response.data;
       
//         // // console
//         // // // Encode the audio content as Base64
//         //  const encodedAudio = Buffer.from(audioContent, 'binary').toString('base64');

//         // // // Add the encoded audio to the call object
//         // call.encodedRecording = encodedAudio;
//         // const audioBlob = new Blob([res.data], { type: 'audio/wav' });
//         // const audioUrl = URL.createObjectURL(audioBlob);
//         // call.encodedRecording=audioUrl;
//         const base64AudioData = Buffer.from(response.data, 'binary').toString('base64');
        
//         // Construct a data URL for the audio
//         const audioDataUrl = `data:audio/wav;base64,${base64AudioData}`;
        
//         // Set the data URL as the encodedRecording property in the call object
//         call.encodedRecording = audioDataUrl;
//       } catch (error) {
//         console.error("Error fetching recording:", error.message);
//         call.encodedRecording = null;
//       }
//       return call;
//     }));

//     res.json(callsWithRecordings); // Send the response with call data including encoded recordings
//     console.log(callsWithRecordings.length);
//   } catch (error) {
//     console.error("Error fetching call details:", error.message);
//     res.status(500).json({ error: `Error fetching call details: ${error.message}` });
//   }
// });






const getdata = async (uri) => {
  console.log(uri);

  const authHeader = {
    auth: {
      username: accountSid,
      password: authToken,
    },
  };

  try {
    const res = await axios.get(`https://api.twilio.com${uri}`, authHeader);
    const recordingsUri = res.data.subresource_uris.recordings;

    if (recordingsUri) {
      const recordingsRes = await axios.get(
        `https://api.twilio.com${recordingsUri}`,
        authHeader
      );

      data = recordingsRes.data.recordings[0].media_url;
      // console.log(data)
      return data;
    } else {
      console.log("No recordings found.");
    }
  } catch (error) {
    console.error("Error fetching data:", error.message);
  }
};
// const getdata = async (uri) => {
//   try {
//      const authHeader = {
//     auth: {
//       username: accountSid,
//       password: authToken,
//     },
//   };

//     const res = await axios.get(`https://api.twilio.com${uri}`, authHeader);
//     const recordingsUri = res.data.subresource_uris.recordings;

//     if (recordingsUri) {
//       const recordingsRes = await axios.get(`https://api.twilio.com${recordingsUri}`, authHeader);
   
//       return recordingsRes.data;
//     } else {
//       console.log("No recordings found.");
//       return null;
//     }
//   } catch (error) {
//     console.error("Error fetching data:", error.message);
//     throw error;
//   }
// };

const PORT = 8000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
