const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies and serve static files
app.use(express.json());
app.use(express.static('public'));

// --- Configuration and Token Management ---

let secrets = {};
try {
    const data = fs.readFileSync('secrets.txt', 'utf8');
    data.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            secrets[key.trim()] = value.trim();
        }
    });
} catch (err) {
    console.error("Error: Could not read secrets.txt.", err);
    process.exit(1);
}

const AUTH_URL = 'https://auth.apps.paloaltonetworks.com/oauth2/access_token';
const API_BASE_URL = 'https://api.sase.paloaltonetworks.com';

let accessToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
        return accessToken;
    }

    console.log('Fetching new access token...');
    const postData = `grant_type=client_credentials&scope=tsg_id:${secrets.TSG_ID}`;
    const authHeader = `Basic ${Buffer.from(`${secrets.CLIENT_ID}:${secrets.CLIENT_SECRET}`).toString('base64')}`;

    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': authHeader,
            },
            body: postData,
        });

        if (!response.ok) {
            throw new Error(`Auth API responded with ${response.status}: ${await response.text()}`);
        }

        const tokenData = await response.json();
        accessToken = tokenData.access_token;
        // Set expiry 60 seconds before it actually expires
        tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000;
        console.log('Successfully obtained new access token.');
        return accessToken;
    } catch (error) {
        console.error('Error fetching access token:', error);
        accessToken = null;
        tokenExpiry = 0;
        throw error; // Propagate error to be handled by the caller
    }
}

// --- API Proxy Endpoints ---

// Endpoint to fetch user requests
app.get('/api/requests', async (req, res) => {
    try {
        const token = await getAccessToken();
        
        // 1. Fetch the initial list of user requests
        const requestsResponse = await fetch(`${API_BASE_URL}/seb-api/v1/user-requests`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!requestsResponse.ok) {
            throw new Error(`API Error fetching requests: ${requestsResponse.status} - ${await requestsResponse.text()}`);
        }
        
        const requestsData = await requestsResponse.json();
        const requests = requestsData.data || [];

        // 2. Create an array of promises to fetch user details for each request
        const userFetchPromises = requests.map(async (request) => {
            // Only fetch if a userId exists
            if (request.userId) {
                try {
                    const userResponse = await fetch(`${API_BASE_URL}/seb-api/v1/users/${request.userId}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (userResponse.ok) {
                        const userData = await userResponse.json();
                        // Replace the userId with the fetched user's name.
                        // The API documentation suggests the name is in a 'name' field.
                        // If the name isn't found, it will fall back to the original userId.
                        request.userId = userData.name || request.userId; 
                    } else {
                        // If we can't get the user's name, log it and continue.
                        console.warn(`Failed to fetch user details for ${request.userId}: ${userResponse.status}`);
                    }
                } catch (userError) {
                    console.error(`Error during user fetch for ${request.userId}:`, userError);
                }
            }
            return request;
        });

        // 3. Wait for all the user detail fetches to complete
        const enhancedRequests = await Promise.all(userFetchPromises);

        // 4. Send the final data (with names instead of IDs) to the browser
        res.json({ data: enhancedRequests });

    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch and process requests from SASE API.', message: error.message });
    }
});

// Endpoint to approve or decline a request
app.post('/api/requests/:id/action', async (req, res) => {
    const { id } = req.params;
    const { action, duration } = req.body; // action: 'approve' or 'decline'

    if (!action || (action === 'approve' && !duration)) {
        return res.status(400).json({ error: 'Missing required parameters.' });
    }

    try {
        const token = await getAccessToken();
        const body = { action };
        if (action === 'approve') {
            body.adminBypassTimeframe = duration.toString();
        }
        console.log(body);

        const apiResponse = await fetch(`${API_BASE_URL}/seb-api/v1/user-requests/${id}/action`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        //console.log(apiResponse);

        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`API Action Error: ${apiResponse.status} - ${errorText}`);
        }
        
        // Return 204 No Content for success, as the API does
        res.status(204).send();

    } catch (error) {
        res.status(500).json({ error: 'Failed to perform action.', message: error.message });
    }
});


// --- Server Start ---

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});