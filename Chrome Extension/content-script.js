class Patient {
  constructor(name, number, visitDate) {
    this.name = name;
    this.number = number;
    this.visitDate = visitDate;
  }
}

const allPatients = [];
const currUrl = window.location.href;
const proxyUrl = currUrl.replace('hotbox.cfm', 'HotBoxProxy.cfc');

async function fetchPatientInfo(episodeKey) {
  const fetchUrl = proxyUrl + "&method=getPatientHover&episodeKey=" + episodeKey;
  const response = await fetch(fetchUrl);
  const jsonData = await response.text();
  const phoneRegex = /"phone":"\((\d{3})\) (\d{3})-(\d{4})"/;
  const match = jsonData.match(phoneRegex);

  if (match) {
    const phoneNumber = `(${match[1]}) ${match[2]}-${match[3]}`;
    return phoneNumber;
  } else {
    return "";
  }
}

function formatPhoneNumber(phoneNumber) {
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  return '+1' + digitsOnly;
}

async function syncPatients() {
  const table = document.getElementById("resultsTable");
  const firstRow = table.rows[1];
  const createPatientPromises = [];
  let lastCurrDate;

  for (let i = 0; i < table.rows.length; i++) {
    const currRow = table.rows[i];
    let currDate = lastCurrDate;

    if (currRow.className !== "odd" && currRow.className !== "even") {
      continue;
    }

    if (currRow.hasAttribute("data-group")) {
      currDate = currRow.getAttribute("data-group");
      lastCurrDate = currDate;
    }

    const episodeKey = currRow.getElementsByTagName("td")[1].childNodes[1].getAttribute("episode");
    const patientName = currRow.getElementsByTagName("td")[1].childNodes[3].textContent;
    const number = await fetchPatientInfo(episodeKey);
    const formattedNumber = formatPhoneNumber(number);
    allPatients.push(new Patient(patientName, formattedNumber, new Date(currDate)));
  }

  const patientArray = JSON.stringify(allPatients);
  console.log(patientArray);

  const backendUrl = 'http://localhost:3000/upsertpatients';

  const response = await fetch(backendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: patientArray,
  });

  if (response.ok) {
    console.log('JSON array sent successfully.');
    const json = await response.json();
    return json;
  } else {
    throw new Error();
  }

}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'syncPatients') {
    try {
      handleSyncPatient(sendResponse);
    } catch (err) {
      sendResponse({
        error: err.message
      });
    }
  }
  return true;

});

async function handleSyncPatient(sendResponse) {
  const response = await syncPatients();
  sendResponse(response);
};