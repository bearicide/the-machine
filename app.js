const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');
ctx.fillStyle='#111';
ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.fillStyle='#00f5ff';
ctx.beginPath();
ctx.arc(360,240,20,0,Math.PI*2);
ctx.fill();
console.log('Pinball Ritual Machine Loaded');
