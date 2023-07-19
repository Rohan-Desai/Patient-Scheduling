#VERSION 1.0 of Patient Scheduling Service

  -Patient Scheduling Service used to aggregate, schedule, and message patients for Home Healthcare
  
#HOW TO USE
  
  1.Start PostgreSQL server with command npm run init
  
  2.Locate Chrome Extension and hit sync button while on the hotbox page of Kinnser.net patient portal (All patient Data will be sent to the PostgreSQL DB)
  
  3. Open Patient Scheduling webpage located in client folder and select date and time for each patient you wish to schedule
     
  4. Once all patients have been scheduled, press confirm schedule button to message patients  (Use Twillio API and Webhooks in order to mesage patients and keep track of responses/patient status)

#Notes
1. Locate Package.json and place your Twilio information (Number, Account SID, and Auth Token) in the init.
2. PGadmin4 used in order to keep track and query the DB for testing
3. Limited testing so bugs are likely to appear in this initial version.
