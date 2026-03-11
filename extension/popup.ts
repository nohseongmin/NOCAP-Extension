document.addEventListener('DOMContentLoaded', () => {
  const actionBtn = document.getElementById('actionBtn');
  
  actionBtn?.addEventListener('click', () => {
    console.log('Button clicked!');
    if (actionBtn) actionBtn.textContent = 'Clicked!';
    setTimeout(() => {
      if (actionBtn) actionBtn.textContent = 'Click Me';
    }, 1000);
  });
});
