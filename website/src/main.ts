// main.ts
// Small interactive effect for tracking mouse to move radial gradients slightly 
document.addEventListener('mousemove', (e) => {
    const blobs = document.querySelectorAll('.blob') as NodeListOf<HTMLElement>;
    const mouseX = e.clientX / window.innerWidth - 0.5;
    const mouseY = e.clientY / window.innerHeight - 0.5;
    
    blobs.forEach((blob, index) => {
        const factor = index === 0 ? 50 : -60;
        blob.style.transform = `translate(${mouseX * factor}px, ${mouseY * factor}px)`;
    });
});
