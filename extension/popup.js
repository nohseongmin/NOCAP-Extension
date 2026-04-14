"use strict";
const powerToggle = document.getElementById('powerToggle');
const statusText = document.getElementById('statusText');
// Load state
chrome.storage.local.get({ nocapEnabled: true }, (result) => {
    const isEnabled = !!result.nocapEnabled;
    if (powerToggle)
        powerToggle.checked = isEnabled;
    updateStatusText(isEnabled);
});
// Handle toggle change
powerToggle?.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    chrome.storage.local.set({ nocapEnabled: isEnabled });
    updateStatusText(isEnabled);
});
function updateStatusText(isEnabled) {
    if (statusText) {
        statusText.textContent = isEnabled ? '판독기 작동 중' : '판독기 일시 정지됨';
        statusText.style.color = isEnabled ? '#e4e4e7' : '#a1a1aa';
    }
}
