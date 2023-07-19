document.addEventListener('DOMContentLoaded', function () {
    const syncButton = document.getElementById('sync');

    syncButton.addEventListener('click', async function () {
        const loadingWheel = document.createElement('div');
        loadingWheel.className = 'loading-wheel';
        document.body.appendChild(loadingWheel);

        // Query the active tab in the current window
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const res = await chrome.tabs.sendMessage(tab.id, {
            action: 'syncPatients'
        });

        console.log(res);

        if (res.error) {
            console.error(res.error);
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = 'Error syncing patients. Please try again.';
        } else {
            console.log(res.data);
            loadingWheel.style.display = 'none';

            const checkmark = document.createElement('span');
            checkmark.textContent = '✓';
            document.body.appendChild(checkmark);
        }
    });
});
