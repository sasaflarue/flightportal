/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import axios from "axios";

// // Used to get more flight details with a fr24 flight ID from the initial search
const flightDetails="https://data-live.flightradar24.com/clickhandler/?flight=";

// Replace with your actual flight search URL
const bounds = "47.646340,47.523585,-122.409668,-122.307701";
const flightSearchBase="https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds=";

const flightSearchTail="&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=0&air=1&vehicles=0&estimated=0&maxage=14400&gliders=0&stats=0&ems=1&limit=1";
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:106.0) Gecko/20100101 Firefox/106.0",
  "cache-control": "no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
  "accept": "application/json",
};

export const getFlightData = onRequest({cors: true}, async (req, res) => {
  if (req.headers.authorization != "password") {
    res.status(403).json({error: "Not authroized", details: null});
    return;
  }

  try {
    // Perform the HTTP GET request to the flight search API
    const response = await axios.get(flightSearchBase + bounds + flightSearchTail, {headers: headers});
    const data = response.data;

    // Check if the response has the expected structure
    if (Object.keys(data).length === 3) {
      for (const flightId in data) {
        if (flightId !== "version" && flightId !== "full_count" && data[flightId].length > 13) {
          // Return the flight ID if it meets the criteria
          console.log(`Get flight details for id: ${flightId}`);
          const flightDetailsResponse = await axios.get(flightDetails + flightId, {headers: headers});
          console.log(`flightDetailsResponse ${flightDetailsResponse.data}`);
          const jsonData = flightDetailsResponse.data; // Access the JSON data here
          const getFlightDataResponse = {
            flight: {
              number: jsonData.identification.number.default,
              callsign: jsonData.identification.callsign,
            },
            aircraft: {
              code: jsonData.aircraft.model?.code,
              model: jsonData.aircraft.model?.text,
            },
            airline: {
              name: jsonData.airline?.name,
            },
            origin: {
              name: jsonData.airport.origin?.name.replace(" Airport", ""),
              code: jsonData.airport.origin?.code?.iata,
            },
            destination: {
              name: jsonData.airport.destination?.name.replace(" Airport", ""),
              code: jsonData.airport.destination?.code?.iata,
            },
          };
          res.status(200).json({getFlightDataResponse});
          return;
        }
      }
    }

    // If no flights found, return an appropriate message
    res.status(404).json({message: "No flights found."});
  } catch (error) {
    console.error("Error fetching flight data:", error);

    // Return a descriptive error message
    res.status(500).json({error: "Failed to fetch flight data", details: error});
  }
});
