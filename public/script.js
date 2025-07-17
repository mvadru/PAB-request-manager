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
                resetActionButtons(card, req.id);
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
        tenMinBtn.textContent = '10 minutes';
        tenMinBtn.className = 'approve-btn';
        tenMinBtn.onclick = () => handleAction(id, 'approve', '10m');
        actionsContainer.appendChild(tenMinBtn);

        

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

    toggleFilterBtn.addEventListener('click', () => {
        showPendingOnly = !showPendingOnly;
        toggleFilterBtn.textContent = showPendingOnly ? 'Show All Requests' : 'Show Pending Only';
        renderRequests();
    });

    refreshBtn.addEventListener('click', fetchAndRenderRequests);

    // Initial load
    fetchAndRenderRequests();
    // auto refresh every 30 seconds
    setInterval(fetchAndRenderRequests, 30000);
});