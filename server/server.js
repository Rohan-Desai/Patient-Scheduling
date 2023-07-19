const twilio = require("twilio");
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioClient = twilio(accountSid, authToken);


const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require('cors');
const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(require('express-request-response-logger')());

const pg = require("pg");
const {
  Client
} = pg;

const pgClient = new Client({
  user: "rohandesai",
  host: "localhost",
  database: "Patient Scheduling",
  port: 5432,
  application_name: "Patient Scheduling Server"
});


// We should not start listening for requests until we have connected to postgres
pgClient.connect().then(() => {
  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
});


class ConfirmationStatus {
  static UNDEFINED = 'Undefined';
  static PENDING = "Pending";
  static CONFIRMED = 'Confirmed';
  static DECLINED = 'Declined';
}


class Patient {
  constructor(name, number) {
    this.name = name;
    this.number = number;
    this.visitDate = null;
    this.nu = ConfirmationStatus.UNDEFINED;
  }
}

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/getPatients", async (req, res) => {
  const query = {
    text: `SELECT * FROM patients`,
  };

  const result = await pgClient.query(query);

  const patients = [];

  for (const row of result.rows) {
    patients.push(row.patient);
  }

  res.send(JSON.stringify(patients));

});

app.post("/upsertPatients", async (req, res) => {
  for (patientData of req.body) {
    const newPatient = new Patient(patientData.name, patientData.number);
    console.log(JSON.stringify(newPatient));
    const query = {
      text: `INSERT INTO patients (phone_number, patient) VALUES($1, $2) ON CONFLICT (phone_number) DO UPDATE SET patient = EXCLUDED.patient WHERE $2->>\'name\' != patients.patient->>\'name\'`,
      values: [newPatient.number, JSON.stringify(newPatient)],
    };

    const result = await pgClient.query(query);
  }

  res.send("{}");
});

app.post("/sendMessage", async (req, res) => {
  console.log(req.body);
  console.log(`Sending message \"${req.body.message}\" to ${req.body.patient.name}`);
  const patient = req.body.patient;
  patient["confirmationStatus"] = ConfirmationStatus.PENDING;
  const query = {
    text: `UPDATE patients SET patient = patient::jsonb || $2 WHERE phone_number = $1`,
    values: [req.body.patient.number, JSON.stringify(patient)],
  };
  const result = await pgClient.query(query);
  twilioClient.messages
    .create({
      body: req.body.message,
      from: twilioPhoneNumber,
      to: req.body.patient.number
    })
    .then(message => console.log(message.sid))
    .then(res.send("{}"));

});

app.post("/getConfirmationStatus", async (req, res) => {
  const patientPhoneNumber = req.body.phoneNumber;
  const statusQuery = {
    text: `SELECT patient FROM patients WHERE phone_number = $1`,
    values: [patientPhoneNumber],
  };

  const result = await pgClient.query(statusQuery);

  const exists = result.rows.length == 1;
  console.log(result.rows[0]);
  const status = result.rows[0].patient["confirmationStatus"];

  console.log(`Did we find the patient?: ${exists}`);
  console.log(`The status of patient with number ${patientPhoneNumber} is ${status}`);
  
  return exists ? res.send(JSON.stringify({
    status: status
  })) : res.status(404).send(JSON.stringify({
    error: "Patient with phone number could not be found. Please send a message first."
  }));

});

// TODO: Add twilio.webhook() middleware
app.post("/receive/message", async (req, res) => {
  // Twilio Messaging URL - receives incoming messages from Twilio

  console.log(`Received response from ${req.body.From} of \"${req.body.Body}\"`);
  const message = req.body.Body;
  const sender = req.body.From;

  const confirmResponses = new Set(["YES", "Y"]);
  const declineResponses = new Set(["NO", "N"]);
  const response = new MessagingResponse();
  const yesQuery = {
    text: `UPDATE patients SET patient = patient::jsonb || jsonb_build_object('confirmationStatus', $2::text) WHERE phone_number = $1`,
    values: [sender, ConfirmationStatus.CONFIRMED, ],
  };

  const noQuery = {
    text: `UPDATE patients SET patient = patient::jsonb || jsonb_build_object('confirmationStatus', $2::text) WHERE phone_number = $1`,
    values: [sender, ConfirmationStatus.DECLINED],
  };

  if (confirmResponses.has(message.toUpperCase())) {
    response.message("Thank you for confirming! We will see you at your scheduled time.");
    const result = await pgClient.query(yesQuery)
  } else if (declineResponses.has(message.toUpperCase())) {
    response.message("Thank you for responding. Your therapist will call you to schedule a better time.");
    const result = await pgClient.query(noQuery)
  } else {
    response.message("We could not understand your response. Please try again.")
  }


  res.set("Content-Type", "text/xml");
  res.send(response.toString());
});