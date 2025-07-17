# SASE Web Request Manager

A simple Node.js web application for viewing and managing user web access requests from the Palo Alto Networks SASE platform. It provides a clean interface to approve or decline pending requests.
## Features

- __View Requests:__ Displays a list of all user web access requests, including the user, website, reason, and time.
- __Filter by Status:__ Toggle between viewing only "pending" requests and all requests.
- __Approve/Decline Actions:__ Quickly approve or decline pending requests directly from the interface.
- __Flexible Approval Durations:__ Approve for a single access ("Once").Approve for a preset duration ("10 minutes").
- __Auto-Refresh:__ The request list automatically refreshes every 30 seconds to show new requests.
- __Secure Backend:__ Uses a Node.js server to securely handle API authentication and protect credentials.

## Setup and Installation
Follow these steps to get the application running on your local machine.

__Prerequisites__
- Node.js (LTS version recommended)
- npm (comes bundled with Node.js)
  
1. Clone the Repository `git clone https://github.com/mvadru/PAB-request-manager.git`
2. change directory: `cd PAB-request-manager`
3. Install Dependencies: 'npm install'
4. Configure Credentials edit the file secrets.txt in the root of the project directory to include your API credentials.
6. Start the application server. `npm start`


You should see a confirmation message in your terminal: Server running at `http://localhost:3000`
To access the application, open your web browser and navigate to: `http://localhost:3000`
The web interface will load, fetch the requests, and be ready for use.

