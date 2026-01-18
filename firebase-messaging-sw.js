<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Faith & Fitness – Vote</title>

<style>
body{margin:0;font-family:Arial,sans-serif;background:#f1f5f9;padding-bottom:80px}
.header{background:#fff;text-align:center;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
.header img{height:110px}
.container{display:flex;justify-content:center;padding:20px}
.card{background:#fff;max-width:380px;width:100%;padding:20px;border-radius:12px;box-shadow:0 6px 14px rgba(0,0,0,.15);text-align:center}

.task{border:1px solid #ddd;padding:10px;border-radius:8px;margin:8px 0;text-align:left}
.msg{background:#fef3c7;padding:10px;border-radius:8px;margin-top:10px;font-size:14px}
button{width:100%;padding:12px;margin-top:10px;border:none;border-radius:6px;font-size:15px;cursor:pointer}
.submit{background:#16a34a;color:#fff}
.disabled{background:#9ca3af;cursor:not-allowed}
.logout{background:#dc2626;color:#fff}
.timer{color:#2563eb;font-size:13px;margin-top:6px}

.tp-row{display:grid;grid-template-columns:70px 1fr 60px;align-items:center;padding:8px;border-radius:6px;margin:6px 0;font-weight:bold}
.tp-1{background:#fde047;color:#78350f}
.tp-2{background:#e5e7eb;color:#374151}
.tp-3{background:#fecaca;color:#7c2d12}

table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #ddd;padding:6px;font-size:14px;text-align:center}
th{background:#2563eb;color:#fff}
.r1{background:#fde047;font-weight:bold}
.r2{background:#e5e7eb;font-weight:bold}
.r3{background:#fecaca;font-weight:bold}

.cal-head{display:flex;justify-content:space-between;align-items:center;margin:10px 0;font-weight:bold}
.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.day{height:38px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:14px;color:#fff}
.done{background:#16a34a}
.pending{background:#facc15;color:#000}
.missed{background:#ef4444}
.future{background:#374151}
.today{outline:3px solid #3b82f6}
.legend{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;margin-top:10px}
.legend .l{width:12px;height:12px;border-radius:3px;display:inline-block}

.bottom-nav{position:fixed;bottom:0;left:0;width:100%;background:#0f172a;display:flex;justify-content:space-around;padding:10px 0;z-index:100}
.bottom-nav button{background:none;border:none;color:#cbd5f5;font-size:13px;cursor:pointer}
.bottom-nav button.active{color:#fff;font-weight:bold}
.bottom-nav span{display:block;font-size:20px}
</style>
</head>

<body>

<div class="header">
  <img src="logo..png" alt="Faith & Fitness">
</div>

<div class="container">
<div class="card">

<!-- HOME -->
<div id="homeSection">
  <h3 style="color:#16a34a">FAITH & FITNESS</h3>
  <div id="todayDate"></div>
  <div id="userName"></div>
  <div id="userPoints"></div>

  <div id="taskBox"></div>
  <div id="message"></div>
  <div class="timer" id="timer"></div>

  <button id="submitBtn" class="submit" onclick="submitVote()">Submit Vote</button>
  <button class="logout" onclick="logout()">Logout</button>

  <hr>
  <h3>🏆 Top Performers</h3>
  <div class="tp-row" style="background:#2563eb;color:#fff">
    <div>Rank</div><div>Name</div><div>Points</div>
  </div>
  <div id="top3"></div>
</div>

<!-- LEADERBOARD -->
<div id="leaderboardSection" style="display:none">
  <h3>🏆 Full Leaderboard</h3>
  <div class="tp-row" style="background:#2563eb;color:#fff">
    <div>Rank</div><div>Name</div><div>Points</div>
  </div>
  <div id="top3Full"></div>
  <h4>All Users</h4>
  <table>
    <thead><tr><th>Rank</th><th>Name</th><th>Points</th></tr></thead>
    <tbody id="allRanks"></tbody>
  </table>
</div>

<!-- CALENDAR -->
<div id="calendarSection" style="display:none">
  <h3>📅 Your Progress</h3>
  <div class="cal-head">
    <button onclick="prevMonth()">◀</button>
    <span id="calTitle"></span>
    <button onclick="nextMonth()">▶</button>
  </div>
  <div class="calendar" id="calendar"></div>
  <div class="legend">
    <span><i class="l done"></i> Completed</span>
    <span><i class="l pending"></i> Pending</span>
    <span><i class="l missed"></i> Missed</span>
    <span><i class="l future"></i> Future</span>
  </div>
</div>

</div>
</div>

<div class="bottom-nav">
  <button class="active" id="homeBtn" onclick="showHome()"><span>🏠</span>Home</button>
  <button id="leaderBtn" onclick="showLeaderboard()"><span>🏆</span>Leaderboard</button>
  <button id="calBtn" onclick="showCalendar()"><span>📅</span>Calendar</button>
</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const app = initializeApp({
  apiKey:"AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
  authDomain:"daily-voting-793ee.firebaseapp.com",
  projectId:"daily-voting-793ee"
});
const db = getFirestore(app);

const phone = localStorage.getItem("userPhone");
if(!phone) location.replace("index.html");

todayDate.innerText = "Today: " + new Date().toDateString();

function getVoteDate(){
  const d=new Date();
  if(d.getHours()<20) d.setDate(d.getDate()-1);
  return d.toISOString().split("T")[0];
}
function nextVoteText(){
  const d=new Date(); d.setDate(d.getDate()+1);
  return d.toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"short"})+" at 8:00 PM";
}
function hideTasks(){ taskBox.innerHTML=""; }

async function checkVoted(){
  const s = await getDocs(query(collection(db,"votes"),where("phone","==",phone),where("date","==",getVoteDate())));
  if(!s.empty){
    hideTasks();
    submitBtn.disabled=true;
    submitBtn.classList.add("disabled");
    message.innerHTML=`<div class="msg">You have already voted today ✅<br><b>Next voting:</b> ${nextVoteText()}</div>`;
    return true;
  }
  return false;
}

async function loadUser(){
  const s=await getDocs(query(collection(db,"users"),where("phone","==",phone)));
  s.forEach(d=>userName.innerText="Hello, "+d.data().name);
}
async function loadPoints(){
  let t=0;
  const s=await getDocs(query(collection(db,"votes"),where("phone","==",phone)));
  s.forEach(d=>t+=Number(d.data().points||0));
  userPoints.innerText="Your Points: "+t;
}
async function loadTasks(){
  if(await checkVoted()) return;
  const now=new Date();
  const s=await getDocs(collection(db,"tasks"));
  taskBox.innerHTML="";
  s.forEach(d=>{
    const t=d.data();
    if(now>=new Date(t.start)&&now<=new Date(t.end)){
      taskBox.innerHTML+=`<div class="task"><label><input type="checkbox" data-points="${t.points}">${t.text} (${t.points} pts)</label></div>`;
    }
  });
}

window.submitVote = async ()=>{
  if(await checkVoted()) return;
  const checked=document.querySelectorAll("#taskBox input:checked");
  if(!checked.length) return alert("Task select cheyyanam");
  let pts=0; checked.forEach(c=>pts+=Number(c.dataset.points));
  await addDoc(collection(db,"votes"),{phone,points:pts,date:getVoteDate(),source:"user"});
  message.innerHTML=`<div class="msg">Vote submitted successfully ✅<br><b>Next voting:</b> ${nextVoteText()}</div>`;
  hideTasks();
  submitBtn.disabled=true;
  submitBtn.classList.add("disabled");
  loadPoints();loadLeaderboardData();loadCalendar();
};

async function loadLeaderboardData(){
  const u=await getDocs(collection(db,"users"));
  const v=await getDocs(collection(db,"votes"));
  const map={}; v.forEach(x=>map[x.data().phone]=(map[x.data().phone]||0)+Number(x.data().points||0));
  let rows=[]; u.forEach(x=>{if(map[x.data().phone]>0)rows.push({name:x.data().name,total:map[x.data().phone]});});
  rows.sort((a,b)=>b.total-a.total);
  top3.innerHTML=""; top3Full.innerHTML=""; allRanks.innerHTML="";
  let rank=1,prev=null,count=0;
  rows.forEach(r=>{
    if(prev!==null&&r.total<prev){rank++;count=0;}
    const icon=rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":"";
    if(rank<=3&&count<2){
      const row=`<div class="tp-row tp-${rank}"><div>${icon} ${rank}</div><div>${r.name}</div><div>${r.total}</div></div>`;
      top3.innerHTML+=row; top3Full.innerHTML+=row; count++;
    }
    allRanks.innerHTML+=`<tr class="r${rank}"><td>${icon} ${rank}</td><td>${r.name}</td><td>${r.total}</td></tr>`;
    prev=r.total;
  });
}

let curMonth=new Date().getMonth(),curYear=new Date().getFullYear();
window.prevMonth=()=>{curMonth--;if(curMonth<0){curMonth=11;curYear--;}loadCalendar();}
window.nextMonth=()=>{curMonth++;if(curMonth>11){curMonth=0;curYear++;}loadCalendar();}
async function loadCalendar(){
  calendar.innerHTML="";
  calTitle.innerText=new Date(curYear,curMonth).toLocaleString("default",{month:"long",year:"numeric"});
  const s=await getDocs(query(collection(db,"votes"),where("phone","==",phone)));
  const voted={}; s.forEach(d=>voted[d.data().date]=1);
  const days=new Date(curYear,curMonth+1,0).getDate();
  const today=new Date().toISOString().split("T")[0];
  for(let i=1;i<=days;i++){
    const ds=new Date(curYear,curMonth,i).toISOString().split("T")[0];
    let cls="future";
    if(ds<today) cls=voted[ds]?"done":"missed";
    if(ds===today) cls=voted[ds]?"done":"pending";
    calendar.innerHTML+=`<div class="day ${cls} ${ds===today?"today":""}">${i}</div>`;
  }
}

window.showHome=()=>{homeSection.style.display="block";leaderboardSection.style.display="none";calendarSection.style.display="none";}
window.showLeaderboard=()=>{homeSection.style.display="none";leaderboardSection.style.display="block";calendarSection.style.display="none";loadLeaderboardData();}
window.showCalendar=()=>{homeSection.style.display="none";leaderboardSection.style.display="none";calendarSection.style.display="block";loadCalendar();}
window.logout=()=>{localStorage.clear();location.replace("index.html");};

loadUser();loadPoints();loadTasks();loadLeaderboardData();loadCalendar();checkVoted();
</script>

</body>
</html>
new voti
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Faith & Fitness – Vote</title>

<style>
body{margin:0;font-family:Arial,sans-serif;background:#f1f5f9;padding-bottom:80px}
.header{background:#fff;text-align:center;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
.header img{height:110px}
.container{display:flex;justify-content:center;padding:20px}
.card{background:#fff;max-width:380px;width:100%;padding:20px;border-radius:12px;box-shadow:0 6px 14px rgba(0,0,0,.15);text-align:center}

.task{border:1px solid #ddd;padding:10px;border-radius:8px;margin:8px 0;text-align:left}
.msg{background:#fef3c7;padding:10px;border-radius:8px;margin-top:10px;font-size:14px}
button{width:100%;padding:12px;margin-top:10px;border:none;border-radius:6px;font-size:15px;cursor:pointer}
.submit{background:#16a34a;color:#fff}
.disabled{background:#9ca3af;cursor:not-allowed}
.logout{background:#dc2626;color:#fff}

.tp-row{display:grid;grid-template-columns:70px 1fr 60px;align-items:center;
padding:8px;border-radius:6px;margin:6px 0;font-weight:bold}
.tp-1{background:#fde047}
.tp-2{background:#e5e7eb}
.tp-3{background:#fecaca}

table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #ddd;padding:6px;font-size:14px;text-align:center}
th{background:#2563eb;color:#fff}
tr.tp-1 td{background:#fde047}
tr.tp-2 td{background:#e5e7eb}
tr.tp-3 td{background:#fecaca}

.cal-head{display:flex;justify-content:space-between;align-items:center;margin:10px 0;font-weight:bold}
.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.week-head div{text-align:center;font-weight:bold;color:#1f2933}

.day{height:38px;display:flex;align-items:center;justify-content:center;
border-radius:50%;font-size:14px;color:#fff}
.done{background:#16a34a}
.pending{background:#facc15;color:#000}
.missed{background:#ef4444}
.future{background:#374151}
.today{outline:3px solid #3b82f6}

.bottom-nav{
position:fixed;bottom:0;left:0;width:100%;
background:#0f172a;display:flex;justify-content:space-around;padding:10px 0
}
.bottom-nav button{
background:none;border:none;color:#cbd5f5;font-size:13px;cursor:pointer
}
.bottom-nav span{display:block;font-size:20px}
</style>
</head>

<body>

<div class="header">
  <img src="logo.png">
</div>

<div class="container">
<div class="card">

<!-- HOME -->
<div id="homeSection">
  <h3 style="color:#16a34a">FAITH & FITNESS</h3>
  <div id="todayDate"></div>
  <div id="userName"></div>
  <div id="userPoints"></div>

  <div id="taskBox"></div>
  <div id="message"></div>

  <button id="submitBtn" class="submit" onclick="submitVote()">Submit Vote</button>
  <button class="logout" onclick="logout()">Logout</button>

  <hr>
  <h3>🏆 Top Performers</h3>
  <div class="tp-row" style="background:#2563eb;color:#fff">
    <div>Rank</div><div>Name</div><div>Points</div>
  </div>
  <div id="top3"></div>
</div>

<!-- LEADERBOARD -->
<div id="leaderboardSection" style="display:none">
  <h3>🏆 Full Leaderboard</h3>
  <table>
    <thead>
      <tr><th>Rank</th><th>Name</th><th>Points</th></tr>
    </thead>
    <tbody id="allRanks"></tbody>
  </table>
</div>

<!-- CALENDAR -->
<div id="calendarSection" style="display:none">
  <h3>📅 Your Progress</h3>
  <div class="cal-head">
    <button onclick="prevMonth()">◀</button>
    <span id="calTitle"></span>
    <button onclick="nextMonth()">▶</button>
  </div>

  <div class="calendar week-head">
    <div>Mon</div><div>Tue</div><div>Wed</div>
    <div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
  </div>

  <div class="calendar" id="calendar"></div>
</div>

</div>
</div>

<!-- NAV -->
<div class="bottom-nav">
  <button onclick="showHome()"><span>🏠</span>Home</button>
  <button onclick="showLeaderboard()"><span>🏆</span>Leaderboard</button>
  <button onclick="showCalendar()"><span>📅</span>Calendar</button>
  <button onclick="openPlank()"><span>🧍‍♂️</span>Plank</button>
</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc } 
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const app = initializeApp({
  apiKey:"AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
  authDomain:"daily-voting-793ee.firebaseapp.com",
  projectId:"daily-voting-793ee"
});
const db = getFirestore(app);

const phone = localStorage.getItem("userPhone");
if(!phone) location.replace("index.html");

todayDate.innerText="Today: "+new Date().toDateString();

function getVoteDate(){
  const d=new Date();
  if(d.getHours()<20) d.setDate(d.getDate()-1);
  return d.toISOString().split("T")[0];
}

async function checkVoted(){
  const s=await getDocs(query(
    collection(db,"votes"),
    where("phone","==",phone),
    where("date","==",getVoteDate())
  ));
  if(!s.empty){
    submitBtn.disabled=true;
    submitBtn.classList.add("disabled");
    message.innerHTML="<div class='msg'>Already voted ✅</div>";
    return true;
  }
  return false;
}

async function loadUser(){
  const s=await getDocs(query(collection(db,"users"),where("phone","==",phone)));
  s.forEach(d=>userName.innerText="Hello, "+d.data().name);
}

async function loadPoints(){
  let t=0;
  const s=await getDocs(query(collection(db,"votes"),where("phone","==",phone)));
  s.forEach(d=>t+=Number(d.data().points||0));
  userPoints.innerText="Your Points: "+t;
}

async function loadTasks(){
  if(await checkVoted()) return;
  const s=await getDocs(collection(db,"tasks"));
  taskBox.innerHTML="";
  s.forEach(d=>{
    const t=d.data();
    taskBox.innerHTML+=`
    <div class="task">
      <label>
        <input type="checkbox" data-points="${t.points}">
        ${t.text} (${t.points} pts)
      </label>
    </div>`;
  });
}

window.submitVote=async()=>{
  if(await checkVoted()) return;
  const checked=document.querySelectorAll("#taskBox input:checked");
  if(!checked.length) return alert("Select task");
  let pts=0; checked.forEach(c=>pts+=Number(c.dataset.points));
  await addDoc(collection(db,"votes"),{phone,points:pts,date:getVoteDate()});
  message.innerHTML="<div class='msg'>Vote submitted ✅</div>";
  loadPoints();loadLeaderboardData();loadCalendar();
};

async function loadLeaderboardData(){
  const u=await getDocs(collection(db,"users"));
  const v=await getDocs(collection(db,"votes"));

  const map={};
  v.forEach(x=>{
    map[x.data().phone]=(map[x.data().phone]||0)+Number(x.data().points||0);
  });

  let rows=[];
  u.forEach(x=>{
    if(map[x.data().phone]){
      rows.push({name:x.data().name,total:map[x.data().phone]});
    }
  });

  rows.sort((a,b)=>b.total-a.total);

  // GROUP BY RANK
  const rankGroups={};
  let rank=1,prev=null;
  rows.forEach(r=>{
    if(prev!==null && r.total<prev) rank++;
    if(rank<=3){
      rankGroups[rank]=rankGroups[rank]||[];
      rankGroups[rank].push(r);
    }
    prev=r.total;
  });

  top3.innerHTML="";
  allRanks.innerHTML="";

  // ROTATION STORE
  const rot=JSON.parse(localStorage.getItem("topRotate")||"{}");

  [1,2,3].forEach(rk=>{
    const list=rankGroups[rk]||[];
    if(!list.length) return;

    const start=rot[rk]||0;
    for(let i=0;i<Math.min(2,list.length);i++){
      const p=list[(start+i)%list.length];
      top3.innerHTML+=`
      <div class="tp-row tp-${rk}">
        <div>${rk}</div><div>${p.name}</div><div>${p.total}</div>
      </div>`;
    }
    rot[rk]=(start+2)%list.length;
  });

  localStorage.setItem("topRotate",JSON.stringify(rot));

  // FULL TABLE
  let r=1,pr=null;
  rows.forEach(x=>{
    if(pr!==null && x.total<pr) r++;
    let cls=r<=3?`tp-${r}`:"";
    allRanks.innerHTML+=`
    <tr class="${cls}">
      <td>${r}</td><td>${x.name}</td><td>${x.total}</td>
    </tr>`;
    pr=x.total;
  });
}

let curMonth=new Date().getMonth(),curYear=new Date().getFullYear();
window.prevMonth=()=>{curMonth--;if(curMonth<0){curMonth=11;curYear--;}loadCalendar();}
window.nextMonth=()=>{curMonth++;if(curMonth>11){curMonth=0;curYear++;}loadCalendar();}

async function loadCalendar(){
  calendar.innerHTML="";
  calTitle.innerText=new Date(curYear,curMonth)
  .toLocaleString("default",{month:"long",year:"numeric"});

  const s=await getDocs(query(collection(db,"votes"),where("phone","==",phone)));
  const voted={}; s.forEach(d=>voted[d.data().date]=1);

  const days=new Date(curYear,curMonth+1,0).getDate();
  const today=new Date().toISOString().split("T")[0];

  const firstDay=new Date(curYear,curMonth,1).getDay();
  const start=(firstDay===0?6:firstDay-1);
  for(let i=0;i<start;i++) calendar.innerHTML+="<div></div>";

  for(let i=1;i<=days;i++){
    const ds=new Date(curYear,curMonth,i).toISOString().split("T")[0];
    let cls="future";
    if(ds<today) cls=voted[ds]?"done":"missed";
    if(ds===today) cls=voted[ds]?"done":"pending";
    calendar.innerHTML+=
    `<div class="day ${cls} ${ds===today?"today":""}">${i}</div>`;
  }
}

window.showHome=()=>{homeSection.style.display="block";
leaderboardSection.style.display="none";calendarSection.style.display="none";}
window.showLeaderboard=()=>{homeSection.style.display="none";
leaderboardSection.style.display="block";calendarSection.style.display="none";
loadLeaderboardData();}
window.showCalendar=()=>{homeSection.style.display="none";
leaderboardSection.style.display="none";calendarSection.style.display="block";
loadCalendar();}
window.openPlank=()=>window.open("https://forms.gle/27H48E8rNhN9nNz29","_blank");
window.logout=()=>{localStorage.clear();location.replace("index.html");};

loadUser();loadPoints();loadTasks();
loadLeaderboardData();loadCalendar();checkVoted();
</script>

</body>
</html>

new code 3
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Faith & Fitness – Vote</title>

<style>
body{margin:0;font-family:Arial,sans-serif;background:#f1f5f9;padding-bottom:80px}
.header{background:#fff;text-align:center;padding:8px;box-shadow:0 2px 6px rgba(0,0,0,.1)}
.header img{height:110px}
.container{display:flex;justify-content:center;padding:20px}
.card{background:#fff;max-width:380px;width:100%;padding:20px;border-radius:12px;box-shadow:0 6px 14px rgba(0,0,0,.15);text-align:center}

.task{border:1px solid #ddd;padding:10px;border-radius:8px;margin:8px 0;text-align:left}
.msg{background:#fef3c7;padding:10px;border-radius:8px;margin-top:10px;font-size:14px}
button{width:100%;padding:12px;margin-top:10px;border:none;border-radius:6px;font-size:15px;cursor:pointer}
.submit{background:#16a34a;color:#fff}
.disabled{background:#9ca3af;cursor:not-allowed}
.logout{background:#dc2626;color:#fff}

.tp-row{display:grid;grid-template-columns:70px 1fr 60px;align-items:center;
padding:8px;border-radius:6px;margin:6px 0;font-weight:bold}
.tp-1{background:#fde047}
.tp-2{background:#e5e7eb}
.tp-3{background:#fecaca}

table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #ddd;padding:6px;font-size:14px;text-align:center}
th{background:#2563eb;color:#fff}
tr.tp-1 td{background:#fde047}
tr.tp-2 td{background:#e5e7eb}
tr.tp-3 td{background:#fecaca}

.cal-head{display:flex;justify-content:space-between;align-items:center;margin:10px 0;font-weight:bold}
.calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px}
.week-head div{text-align:center;font-weight:bold;color:#1f2933}

.day{height:38px;display:flex;align-items:center;justify-content:center;
border-radius:50%;font-size:14px;color:#fff}
.done{background:#16a34a}
.pending{background:#facc15;color:#000}
.missed{background:#ef4444}
.future{background:#374151}
.today{outline:3px solid #3b82f6}

.bottom-nav{
position:fixed;bottom:0;left:0;width:100%;
background:#0f172a;display:flex;justify-content:space-around;padding:10px 0
}
.bottom-nav button{
background:none;border:none;color:#cbd5f5;font-size:13px;cursor:pointer
}
.bottom-nav span{display:block;font-size:20px}

  /* ===== Calendar Legend Style ===== */
.calendar-legend{
  margin-top:14px;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:6px 12px;
  font-size:13px;
}

.calendar-legend div{
  display:flex;
  align-items:center;
  gap:6px;
}

.calendar-legend .dot{
  width:12px;
  height:12px;
  border-radius:50%;
  display:inline-block;
}

.calendar-legend .done{background:#16a34a}
.calendar-legend .missed{background:#ef4444}
.calendar-legend .pending{background:#facc15}
.calendar-legend .future{background:#374151}
</style>
</head>

<body>

<div class="header">
  <img src="logo..png">
</div>

<div class="container">
<div class="card">

<!-- HOME -->
<div id="homeSection">
  <h3 style="color:#16a34a">FAITH & FITNESS</h3>
  <div id="todayDate"></div>
  <div id="userName"></div>
  <div id="userPoints"></div>

  <div id="taskBox"></div>
  <div id="message"></div>
  <div id="nextVoteBox" class="msg" style="display:none"></div>

  <button id="submitBtn" class="submit" onclick="submitVote()">Submit Vote</button>
  <button class="logout" onclick="logout()">Logout</button>

  <hr>
  <h3>🏆 Top Performers</h3>
  <div class="tp-row" style="background:#2563eb;color:#fff">
    <div>Rank</div><div>Name</div><div>Points</div>
  </div>
  <div id="top3"></div>
</div>

<!-- LEADERBOARD -->
<div id="leaderboardSection" style="display:none">
  <h3>🏆 Full Leaderboard</h3>
  <table>
    <thead>
      <tr><th>Rank</th><th>Name</th><th>Points</th></tr>
    </thead>
    <tbody id="allRanks"></tbody>
  </table>
</div>

<!-- CALENDAR -->
<div id="calendarSection" style="display:none">
  <h3>📅 Your Progress</h3>

  <div class="cal-head">
    <button onclick="prevMonth()">◀</button>
    <span id="calTitle"></span>
    <button onclick="nextMonth()">▶</button>
  </div>

  <div class="calendar week-head">
    <div>Mon</div><div>Tue</div><div>Wed</div>
    <div>Thu</div><div>Fri</div><div>Sat</div><div>Sun</div>
  </div>

  <div class="calendar" id="calendar"></div>

 <!-- CALENDAR LEGEND -->
<div class="calendar-legend">
  <div><span class="dot done"></span> Complete</div>
  <div><span class="dot missed"></span> Missed</div>
  <div><span class="dot pending"></span> Pending</div>
  <div><span class="dot future"></span> Future</div>
</div>
</div>
  <!-- PLANK SECTION -->
<div id="plankSection" class="card" style="display:none">
  <h3>🧍‍♂️ Plank</h3>

 <iframe
  src="https://docs.google.com/forms/d/e/1FAIpQLScr2gs6eYNndi0KVPryFeKPW0JgujjDR9EMCBbq96OIvvrqhw/viewform?embedded=true"
  width="100%"
  height="600"
  style="border:none">
</iframe>
</div>

<!-- WORKOUT SECTION -->
<div id="workoutSection" class="card" style="display:none">
  <h3>📚 Workout</h3>

  <iframe width="100%" height="200"
    src="https://www.youtube.com/embed/bKt5FjGBj_U"
    allowfullscreen></iframe>

  <iframe width="100%" height="200"
    src="https://www.youtube.com/embed/dlNvxbSDMpc"
    allowfullscreen></iframe>

  <iframe width="100%" height="200"
    src="https://www.youtube.com/embed/gT_Whh3uYuo"
    allowfullscreen></iframe>
</div>


  </div>
</div>
  
<!-- NAV -->
<div class="bottom-nav">
  <button onclick="showHome()"><span>🏠</span>Home</button>
  <button onclick="showLeaderboard()"><span>🏆</span>Leaderboard</button>
  <button onclick="showCalendar()"><span>📅</span>Calendar</button>
  <button onclick="showPlank()"><span>🧍‍♂️</span>Plank</button>
  <button onclick="showWorkout()">
  <span>📚</span>Workout
</button>

</div>

<script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, addDoc }
from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const app = initializeApp({
  apiKey:"AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
  authDomain:"daily-voting-793ee.firebaseapp.com",
  projectId:"daily-voting-793ee"
});
const db = getFirestore(app);

const phone = localStorage.getItem("userPhone");
if(!phone) location.replace("index.html");

todayDate.innerText="Today: "+new Date().toDateString();

function getVoteDate(){
  const d=new Date();
  if(d.getHours()<20) d.setDate(d.getDate()-1);
  return d.toISOString().split("T")[0];
}

/* ===== TIMER ADD (NEW) ===== */
function nextVoteTime(){
  const now=new Date();
  const t=new Date();
  t.setHours(20,0,0,0);
  if(now>=t) t.setDate(t.getDate()+1);
  return t;
}

function startTimer(){
  nextVoteBox.style.display="block";
  submitBtn.disabled=true;
  submitBtn.classList.add("disabled");
  taskBox.innerHTML="";

  const tick=()=>{
    const diff=nextVoteTime()-new Date();
    if(diff<=0){
      nextVoteBox.innerHTML="Voting is open ✅ Refresh page";
      submitBtn.disabled=false;
      submitBtn.classList.remove("disabled");
      loadTasks();
      return;
    }
    const h=Math.floor(diff/36e5);
    const m=Math.floor(diff%36e5/6e4);
    const s=Math.floor(diff%6e4/1000);
    nextVoteBox.innerHTML=
    `Today voting is complete ✅<br>
     Next voting is <b>tomorrow at 8:00 PM</b><br>
     ⏳ ${h}h ${m}m ${s}s`;
    setTimeout(tick,1000);
  };
  tick();
}

async function checkVoted(){
  const s=await getDocs(query(
    collection(db,"votes"),
    where("phone","==",phone),
    where("date","==",getVoteDate())
  ));
  if(!s.empty){
    startTimer();   // ← changed
    return true;
  }
  return false;
}

async function loadUser(){
  const s=await getDocs(query(collection(db,"users"),where("phone","==",phone)));
  s.forEach(d=>userName.innerText="Hello, "+d.data().name);
}

async function loadPoints(){
  let t=0;
  const s=await getDocs(query(collection(db,"votes"),where("phone","==",phone)));
  s.forEach(d=>t+=Number(d.data().points||0));
  userPoints.innerText="Your Points: "+t;
}

async function loadTasks(){
  if(await checkVoted()) return;
  const s=await getDocs(collection(db,"tasks"));
  taskBox.innerHTML="";
  s.forEach(d=>{
    const t=d.data();
    taskBox.innerHTML+=`
    <div class="task">
      <label>
        <input type="checkbox" data-points="${t.points}">
        ${t.text} (${t.points} pts)
      </label>
    </div>`;
  });
}

window.submitVote=async()=>{
  if(await checkVoted()) return;
  const checked=document.querySelectorAll("#taskBox input:checked");
  if(!checked.length) return alert("Select task");
  let pts=0; checked.forEach(c=>pts+=Number(c.dataset.points));
  await addDoc(collection(db,"votes"),{phone,points:pts,date:getVoteDate()});
  message.innerHTML="<div class='msg'>Vote submitted ✅</div>";
  loadPoints();loadLeaderboardData();loadCalendar();
  startTimer();   // ← added
};

async function loadLeaderboardData(){
  const u=await getDocs(collection(db,"users"));
  const v=await getDocs(collection(db,"votes"));

  const map={};
  v.forEach(x=>{
    map[x.data().phone]=(map[x.data().phone]||0)+Number(x.data().points||0);
  });

  let rows=[];
  u.forEach(x=>{
    if(map[x.data().phone]){
      rows.push({name:x.data().name,total:map[x.data().phone]});
    }
  });

  rows.sort((a,b)=>b.total-a.total);

  const rankGroups={};
  let rank=1,prev=null;
  rows.forEach(r=>{
    if(prev!==null && r.total<prev) rank++;
    if(rank<=3){
      rankGroups[rank]=rankGroups[rank]||[];
      rankGroups[rank].push(r);
    }
    prev=r.total;
  });

  top3.innerHTML="";
  allRanks.innerHTML="";
  const rot=JSON.parse(localStorage.getItem("topRotate")||"{}");

  [1,2,3].forEach(rk=>{
    const list=rankGroups[rk]||[];
    if(!list.length) return;
    const start=rot[rk]||0;
    for(let i=0;i<Math.min(2,list.length);i++){
      const p=list[(start+i)%list.length];
      top3.innerHTML+=`
      <div class="tp-row tp-${rk}">
        <div>${rk}</div><div>${p.name}</div><div>${p.total}</div>
      </div>`;
    }
    rot[rk]=(start+2)%list.length;
  });

  localStorage.setItem("topRotate",JSON.stringify(rot));

  let r=1,pr=null;
  rows.forEach(x=>{
    if(pr!==null && x.total<pr) r++;
    let cls=r<=3?`tp-${r}`:"";
    allRanks.innerHTML+=`
    <tr class="${cls}">
      <td>${r}</td><td>${x.name}</td><td>${x.total}</td>
    </tr>`;
    pr=x.total;
  });
}

let curMonth=new Date().getMonth(),curYear=new Date().getFullYear();
window.prevMonth=()=>{curMonth--;if(curMonth<0){curMonth=11;curYear--;}loadCalendar();}
window.nextMonth=()=>{curMonth++;if(curMonth>11){curMonth=0;curYear++;}loadCalendar();}

  function getEffectiveToday(){
  const now = new Date();
  const d = new Date(now);

  // രാത്രി 8 PM-ന് മുമ്പാണെങ്കിൽ
  if(now.getHours() < 20){
    d.setDate(d.getDate() - 1);
  }

  return d.toISOString().split("T")[0];
}
 async function loadCalendar(){
  calendar.innerHTML = "";

  calTitle.innerText = new Date(curYear,curMonth)
    .toLocaleString("default",{month:"long",year:"numeric"});

  const snap = await getDocs(
    query(collection(db,"votes"), where("phone","==",phone))
  );

  const voted = {};
  snap.forEach(d => voted[d.data().date] = true);

  const days = new Date(curYear,curMonth+1,0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const firstDay = new Date(curYear,curMonth,1).getDay();
  const start = (firstDay === 0 ? 6 : firstDay - 1);

  for(let i=0;i<start;i++) calendar.innerHTML += "<div></div>";

  for(let i=1;i<=days;i++){
    const ds = new Date(curYear,curMonth,i)
      .toISOString().split("T")[0];

    let cls = "future";

    if(voted[ds]){
      cls = "done";       // 🟢 ONLY Firebase decides this
    }
    else if(ds === today){
      cls = "pending";    // 🟡 today only
    }
    else if(ds < today){
      cls = "missed";     // 🔴 past without vote
    }

    calendar.innerHTML += `<div class="day ${cls}">${i}</div>`;
  }
 }




window.showHome = () => {
  homeSection.style.display = "block";
  leaderboardSection.style.display = "none";
  calendarSection.style.display = "none";
  plankSection.style.display = "none";
  workoutSection.style.display = "none";
};

window.showLeaderboard = () => {
  homeSection.style.display = "none";
  leaderboardSection.style.display = "block";
  calendarSection.style.display = "none";
  plankSection.style.display = "none";
  workoutSection.style.display = "none";
  loadLeaderboardData();
};

window.showCalendar = () => {
  homeSection.style.display = "none";
  leaderboardSection.style.display = "none";
  calendarSection.style.display = "block";
  plankSection.style.display = "none";
  workoutSection.style.display = "none";
  loadCalendar();
};

window.showPlank = () => {
  homeSection.style.display = "none";
  leaderboardSection.style.display = "none";
  calendarSection.style.display = "none";
  workoutSection.style.display = "none";
  plankSection.style.display = "block";
};

window.showWorkout = () => {
  homeSection.style.display = "none";
  leaderboardSection.style.display = "none";
  calendarSection.style.display = "none";
  plankSection.style.display = "none";
  workoutSection.style.display = "block";
};

 
window.logout=()=>{localStorage.clear();location.replace("index.html");};

loadUser();loadPoints();loadTasks();
loadLeaderboardData();loadCalendar();checkVoted();
</script>

</body>
</html>



















