"use strict";
document.addEventListener('DOMContentLoaded', () => {
    const actionBtn = document.getElementById('actionBtn');
    actionBtn.addEventListener('click', () => {
        console.log('Button clicked!');
        actionBtn.textContent = 'Clicked!';
        setTimeout(() => {
            actionBtn.textContent = 'Click Me';
        }, 1000);
    });
});
