const CONFIG = { revealAt: '2026-10-28T00:01:00+05:30' };
const $ = (id) => document.getElementById(id);
const target = new Date(CONFIG.revealAt).getTime();
let serverOffset = 0;

function pad(value) { return String(value).padStart(2, '0'); }
function setView(name) {
  ['waiting-view','envelope-view','letter-view'].forEach(id => { const el=$(id); const active=id===name; el.classList.toggle('is-hidden',!active); el.setAttribute('aria-hidden',String(!active)); });
}
function showCountdown() {
  const remaining = Math.max(0, target - (Date.now() + serverOffset));
  const total = Math.floor(remaining / 1000);
  $('days').textContent = pad(Math.floor(total / 86400));
  $('hours').textContent = pad(Math.floor(total % 86400 / 3600));
  $('minutes').textContent = pad(Math.floor(total % 3600 / 60));
  $('seconds').textContent = pad(total % 60);
  if (remaining <= 0) { showEnvelope(); return; }
  $('countdown-status').textContent = 'Counting down to October 28, 2026 at 12:01 AM IST.';
}
function showEnvelope() { setView('envelope-view'); $('open-letter').focus(); }
async function checkStatus() {
  try { const started=Date.now(); const response=await fetch('/api/unlock', {headers:{'X-Status':'1'}}); const data=await response.json(); serverOffset=(started+Date.now())/2-(data.serverTime||Date.now()); if (data.revealed && data.authorized) showEnvelope(); } catch (_) { /* countdown remains usable; server enforces access */ }
}
$('unlock-form').addEventListener('submit', async (event) => {
  event.preventDefault(); const password=$('password').value; const message=$('form-message');
  if (!password) { message.textContent='Please enter the secret word.'; return; }
  message.textContent='Checking…';
  try { const response=await fetch('/api/unlock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}); const data=await response.json(); if (!response.ok) { message.textContent=data.error||'That did not work.'; return; } message.textContent='Unlocked.'; showEnvelope(); } catch (_) { message.textContent='The surprise is resting. Please try again in a moment.'; }
});
$('open-letter').addEventListener('click', async () => {
  const envelope=document.querySelector('.envelope'); envelope.classList.add('is-open'); $('open-letter').disabled=true;
  setTimeout(async () => { try { const response=await fetch('/api/unlock',{headers:{'X-Letter':'1'}}); const data=await response.json(); if (!response.ok) throw new Error(data.error); $('letter-heading').textContent=data.heading||'A birthday letter for you'; $('letter-recipient').textContent=data.recipient||''; $('letter-body').textContent=data.body||''; $('letter-signoff').textContent=data.signoff||''; setView('letter-view'); } catch (error) { $('form-message').textContent=error.message||'The letter could not be opened yet.'; envelope.classList.remove('is-open'); $('open-letter').disabled=false; } }, 950);
});
setInterval(showCountdown,1000); showCountdown(); checkStatus();
