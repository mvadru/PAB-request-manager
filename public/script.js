document.addEventListener('DOMContentLoaded', () => {
    const requestsContainer = document.getElementById('requestsContainer');
    const statusMessage = document.getElementById('statusMessage');
    const toggleFilterBtn = document.getElementById('toggleFilterBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    let allRequests = [];
    let showPendingOnly = true;

    const fetchAndRenderRequests = async () => {
        statusMessage.textContent = 'Loading requests...';
        requestsContainer.innerHTML = ''; // Clear previous content
        requestsContainer.appendChild(statusMessage);

        try {
            const response = await fetch('/api/requests');
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to fetch data.');
            }
            const data = await response.json();
            allRequests = data.data || [];
            // Sorting by the correct 'createdAt' field
            allRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            renderRequests();
        } catch (error) {
            console.error('Fetch Error:', error);
            statusMessage.textContent = `Error: ${error.message}`;
        }
    };

    const renderRequests = () => {
        requestsContainer.innerHTML = '';
        const requestsToDisplay = showPendingOnly 
            ? allRequests.filter(r => r.status && r.status.toLowerCase() === 'pending') 
            : allRequests;

        if (requestsToDisplay.length === 0) {
            statusMessage.textContent = 'No requests to display.';
            requestsContainer.appendChild(statusMessage);
            return;
        }

        requestsToDisplay.forEach(req => {
            const card = document.createElement('div');
            card.className = `request-card ${req.status ? req.status.toLowerCase() : 'unknown'}`;
            
            card.innerHTML = `
                <div class="request-info">
                    <h3>${req.url}</h3>
                    <p class="reason"><b>Reason:</b> ${req.reason || 'No reason provided.'}</p>
                    <p><b>ID:</b> ${req.id}</p>
                </div>
                <div class="request-meta">
                    <p><b>User:</b> ${req.userId}</p>
                    <p><b>Status:</b> ${req.status}</p>
                    <p><b>Time:</b> ${new Date(req.createdAt).toLocaleString()}</p>

                </div>
                <div class="request-actions" id="actions-${req.id}"></div>
            `;
            
            if (req.status && req.status.toLowerCase() === 'pending') {
                card.innerHTML = `
                <div class="request-info">
                    <h3>${req.url}</h3>
                    <p class="reason"><b>Reason:</b> ${req.reason || 'No reason provided.'}</p>
                    <p><b>ID:</b> ${req.id}</p>
                </div>
                <div class="request-meta">
                    <p><b>User:</b> ${req.userId}</p>
                    <p><b>Status:</b> ${req.status}</p>
                    <p><b>Time:</b> ${new Date(req.createdAt).toLocaleString()}</p>

                </div>
                <div class="request-actions" id="actions-${req.id}"></div>
            `;
                resetActionButtons(card, req.id);
            }

            if (req.status && req.status.toLowerCase() === 'approved') {
                card.innerHTML = `
                <div class="request-info">
                    <h3>${req.url}</h3>
                    <p class="reason"><b>Reason:</b> ${req.reason || 'No reason provided.'}</p>
                    <p><b>ID:</b> ${req.id}</p>
                </div>
                <div class="request-meta">
                    <p><b>User:</b> ${req.userId}</p>
                    <p><b>Status:</b> ${req.status}</p>
                    <p><b>Time:</b> ${new Date(req.createdAt).toLocaleString()}</p>
                    <p><b>Approved:</b> ${new Date(req.responseTime).toLocaleString() || 'N/A'}</p>
                    <p><b>Until:</b> ${new Date(new Date(req.responseTime).getTime() + req.adminBypassTimeframe).toLocaleString() || 'Once'}</p>

                </div>
                <div class="request-actions" id="actions-${req.id}"></div>
            `;
                if (req.adminBypassTimeframe) {
                    now = Date.now();
                    time = new Date(req.responseTime);

                    if ((now - time.getTime()) < req.adminBypassTimeframe) resetRevokeButton(card, req.id);
                }
            }

            if (req.status && req.status.toLowerCase() === 'declined') {
                card.innerHTML = `
                <div class="request-info">
                    <h3>${req.url}</h3>
                    <p class="reason"><b>Reason:</b> ${req.reason || 'No reason provided.'}</p>
                    <p><b>ID:</b> ${req.id}</p>
                </div>
                <div class="request-meta">
                    <p><b>User:</b> ${req.userId}</p>
                    <p><b>Status:</b> ${req.status}</p>
                    <p><b>Time:</b> ${new Date(req.createdAt).toLocaleString()}</p>
                    <p><b>Declined:</b> ${new Date(req.responseTime).toLocaleString() || 'N/A'}</p>
                    <p><b>Timeframe:</b> ${req.adminBypassTimeframe || 'Once'}</p>

                </div>
                <div class="request-actions" id="actions-${req.id}"></div>
            `;
               
            }

            requestsContainer.appendChild(card);
        });
    };
    
    // This function replaces the old 'handleApprove'
    const showDurationOptions = (card, id) => {
        const actionsContainer = card.querySelector('.request-actions');
        if (!actionsContainer) return;

        actionsContainer.innerHTML = ''; // Clear approve/decline buttons

        // "Once" button
        const onceBtn = document.createElement('button');
        onceBtn.textContent = 'Once';
        onceBtn.className = 'approve-btn';
        onceBtn.onclick = () => handleAction(id, 'approve', 'Once');
        actionsContainer.appendChild(onceBtn);

        // "10 minutes" button
        const tenMinBtn = document.createElement('button');
        tenMinBtn.textContent = '10m';
        tenMinBtn.className = 'approve-btn';
        tenMinBtn.onclick = () => handleAction(id, 'approve', '10m');
        actionsContainer.appendChild(tenMinBtn);


        // "1 hour" button
        const oneHBtn = document.createElement('button');
        oneHBtn.textContent = '1h';
        oneHBtn.className = 'approve-btn';
        oneHBtn.onclick = () => handleAction(id, 'approve', '1h');
        actionsContainer.appendChild(oneHBtn);

        // "4 hour" button
        const fourHBtn = document.createElement('button');
        fourHBtn.textContent = '4h';
        fourHBtn.className = 'approve-btn';
        fourHBtn.onclick = () => handleAction(id, 'approve', '4h');
        actionsContainer.appendChild(fourHBtn);

        // "9 hour" button
        const nineHBtn = document.createElement('button');
        nineHBtn.textContent = '9h';
        nineHBtn.className = 'approve-btn';
        nineHBtn.onclick = () => handleAction(id, 'approve', '9h');
        actionsContainer.appendChild(nineHBtn);

        // "12 hour" button
        const twelveHBtn = document.createElement('button');
        twelveHBtn.textContent = '12h';
        twelveHBtn.className = 'approve-btn';
        twelveHBtn.onclick = () => handleAction(id, 'approve', '12h');
        actionsContainer.appendChild(twelveHBtn);

        // "24 hour" button
        const twentyFourHBtn = document.createElement('button');
        twentyFourHBtn.textContent = '24h';
        twentyFourHBtn.className = 'approve-btn';
        twentyFourHBtn.onclick = () => handleAction(id, 'approve', '24h');
        actionsContainer.appendChild(twentyFourHBtn);

        // "3 day" button
        const threeDBtn = document.createElement('button');
        threeDBtn.textContent = '3d';
        threeDBtn.className = 'approve-btn';
        threeDBtn.onclick = () => handleAction(id, 'approve', '3d');
        actionsContainer.appendChild(threeDBtn);

        // "7 day" button
        const sevenDBtn = document.createElement('button');
        sevenDBtn.textContent = '7d';
        sevenDBtn.className = 'approve-btn';
        sevenDBtn.onclick = () => handleAction(id, 'approve', '7d');
        actionsContainer.appendChild(sevenDBtn);

        // "14 day" button
        const fourteenDBtn = document.createElement('button');
        fourteenDBtn.textContent = '14d';
        fourteenDBtn.className = 'approve-btn';
        fourteenDBtn.onclick = () => handleAction(id, 'approve', '14d');
        actionsContainer.appendChild(fourteenDBtn);

        // "30 day" button
        const thirtyDBtn = document.createElement('button');
        thirtyDBtn.textContent = '30d';
        thirtyDBtn.className = 'approve-btn';
        thirtyDBtn.onclick = () => handleAction(id, 'approve', '30d');
        actionsContainer.appendChild(thirtyDBtn);

        // "60 day" button
        const sixtyDBtn = document.createElement('button');
        sixtyDBtn.textContent = '60d';
        sixtyDBtn.className = 'approve-btn';
        sixtyDBtn.onclick = () => handleAction(id, 'approve', '60d');
        actionsContainer.appendChild(sixtyDBtn);

        // "90 day" button
        const ninetyDBtn = document.createElement('button');
        ninetyDBtn.textContent = '90d';
        ninetyDBtn.className = 'approve-btn';
        ninetyDBtn.onclick = () => handleAction(id, 'approve', '90d');
        actionsContainer.appendChild(ninetyDBtn);

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.className = 'decline-btn';
        cancelBtn.onclick = () => resetActionButtons(card, id);
        actionsContainer.appendChild(cancelBtn);
    };

    const resetActionButtons = (card, id) => {
        const actionsContainer = card.querySelector('.request-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = '';

        const approveBtn = document.createElement('button');
        approveBtn.className = 'approve-btn';
        approveBtn.textContent = 'Approve';
        approveBtn.onclick = () => showDurationOptions(card, id);

        const declineBtn = document.createElement('button');
        declineBtn.className = 'decline-btn';
        declineBtn.textContent = 'Decline';
        declineBtn.onclick = () => handleAction(id, 'decline');

        actionsContainer.appendChild(approveBtn);
        actionsContainer.appendChild(declineBtn);
    };

    const resetRevokeButton = (card, id) => {
        const actionsContainer = card.querySelector('.request-actions');
        if (!actionsContainer) return;
        
        actionsContainer.innerHTML = '';

        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'revoke-btn';
        revokeBtn.textContent = 'Revoke';
        revokeBtn.onclick = () => revokeRequest(card, id);

        actionsContainer.appendChild(revokeBtn);
        
    };

    const handleAction = async (id, action, duration = null) => {
        const body = { action };
        if (duration !== null) {
            body.duration = duration;
        }

        const cardElement = document.querySelector(`#actions-${id}`).closest('.request-card');
        if (!cardElement) return;

        cardElement.style.opacity = '0.5';

        try {
            const response = await fetch(`/api/requests/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.message || 'Action failed.');
            }
            
            alert(`Request successfully ${action}d!`);
            fetchAndRenderRequests();
        } catch (error) {
            console.error('Action Error:', error);
            alert(`Error: ${error.message}`);
            cardElement.style.opacity = '1';
        }
    };

    const revokeRequest = async (card, id) => {
        
        const cardElement = document.querySelector(`#actions-${id}`).closest('.request-card');
        if (!cardElement) return;

        cardElement.style.opacity = '0.5';

        try {
            const response = await fetch(`/api/requests/${id}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                 const err = await response.json();
                 throw new Error(err.message || 'Action failed.');
            }
            
            alert(`Request successfully revoked!`);
            fetchAndRenderRequests();
        } catch (error) {
            console.error('Revoke Error:', error);
            alert(`Error: ${error.message}`);
            cardElement.style.opacity = '1';
        }
    };

    toggleFilterBtn.addEventListener('click', () => {
        showPendingOnly = !showPendingOnly;
        toggleFilterBtn.textContent = showPendingOnly ? 'Show All Requests' : 'Show Pending Only';
        renderRequests();
    });

    refreshBtn.addEventListener('click', fetchAndRenderRequests);

    // Initial load
    fetchAndRenderRequests();
    // auto refresh every 30 seconds
    // setInterval(fetchAndRenderRequests, 30000);
});