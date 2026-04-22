import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtebbp9XVTRpJROF4mo8FDM50l7vSRJQo",
  databaseURL: "https://oil-plta-bta-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* ===== GLOBAL VARIABLE (WAJIB) ===== */
let currentTemp = null;
let setPoint = null;

/* ===== HELPER ===== */
function formatTemp(val){
  const num = Number(val);

  // bulatkan 1 desimal, lalu hilangkan .0 kalau ada
  return parseFloat(num.toFixed(1)) + "°C";
}

/* ===== TEMPERATURE ===== */
onValue(ref(db,"Temperature/current"), s=>{
  const val = s.val();
  if(val === null || val === undefined) return;

  currentTemp = Number(val);

  const el = document.getElementById("temp");
  if(el) el.innerHTML = formatTemp(currentTemp);

  checkTemperature();
});

onValue(ref(db,"Temperature/maximal"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("max").innerHTML = formatTemp(val);
  }
});

onValue(ref(db,"Temperature/minimal"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("min").innerHTML = formatTemp(val);
  }
});

onValue(ref(db,"Temperature/average"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("avg").innerHTML = formatTemp(val);
  }
});

/* ===== PWM ===== */
onValue(ref(db,"Status/pwm_motor"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("pwm").innerHTML = val;
  }
});

onValue(ref(db,"Status/pwm_percent"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("duty").innerHTML = val + "%";
  }
});

/* ===== ALARM ===== */
onValue(ref(db,"Status/alarm"), s=>{
  const el = document.getElementById("alarm");
  if(!el) return;

  if(s.val()){
    el.innerHTML="ON";
    el.className="box red";
  }else{
    el.innerHTML="OFF";
    el.className="box green";
  }
});

/* ===== SETPOINT ===== */
onValue(ref(db,"Set/alarm_on"), s=>{
  const val = s.val();
  if(val === null) return;

  setPoint = Number(val);

  const el = document.getElementById("setDisplay");
  if(el) el.innerHTML = formatTemp(setPoint);

  checkTemperature();
});

/* ===== LOGIKA WARNA ===== */
function checkTemperature(){
  const el = document.getElementById("temp");
  if(!el) return;

  // pastikan dua-duanya sudah ada
  if(currentTemp === null || setPoint === null) return;

  el.classList.remove("normal","warning");

  if(currentTemp > setPoint){
    el.classList.add("warning");
  } else {
    el.classList.add("normal");
  }
}

/* ===== IP ===== */
onValue(ref(db,"Device/ip"), s=>{
  const val = s.val();
  if(val !== null){
    document.getElementById("ip").innerHTML = val;
  }
});

/* ===== JAM ===== */
setInterval(()=>{
  const el = document.getElementById("clock");
  if(!el) return;

  let n=new Date();
  el.innerHTML = n.toLocaleTimeString();
},1000);

/* ===== SET ALARM ===== */
window.setAlarm = function(){

  let input = prompt("Masukkan suhu alarm (°C):");
  if(input === null) return;

  let value = Number(input.replace(",", "."));

  if(isNaN(value)){
    alert("Input tidak valid!");
    return;
  }

  if(value < 0 || value > 150){
    alert("Range harus 0 - 150 °C");
    return;
  }

  set(ref(db,"Set/alarm_on"), value);
};

/* ===== HISTORY + CHART ===== */
const API_URL = "https://script.google.com/macros/s/AKfycbwW4bE2Dcccirw4SClj80ExGDKodyt6AQobw99VVOhjZj8b5T8zDUZ_9Kd-ryS8WA6_kw/exec";

async function loadHistory(){
  try{
    const res = await fetch(API_URL);
    const data = await res.json();

    renderLog(data.log);
    renderChart(data.chart); // ✅ pakai chart

  }catch(e){
    console.log("Error load history", e);
  }
}

/* ===== LOG ===== */
function renderLog(log){
  const el = document.getElementById("logTable");
  if(!el) return;

  if(!log || log.length === 0){
    el.innerHTML = "Belum ada data";
    return;
  }

  let html = `
    <table style="
      width:100%;
      border-collapse:collapse;
      text-align:center;
      font-size:14px;
    ">
      <thead>
        <tr style="background:#f2f2f2;">
          <th style="border:1px solid #999;padding:5px;">Time</th>
          <th style="border:1px solid #999;padding:5px;">Temp</th>
        </tr>
      </thead>
      <tbody>
  `;

  log.forEach((r,i)=>{
    html += `
      <tr style="background:${i%2===0?'#ffffff':'#f9f9f9'}">
        <td style="border:1px solid #999;padding:5px;">${r.time}</td>
        <td style="border:1px solid #999;padding:5px;">${r.temp}°C</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  el.innerHTML = html;
}

/* ===== CHART ===== */
let chart;

function renderChart(data){
  const ctx = document.getElementById("chart");
  if(!ctx) return;

  const labels = data.map(d=>d.hour);
  const values = data.map(d=>d.avg);

  if(chart) chart.destroy();

  chart = new Chart(ctx,{
    type:'line',
    data:{
      labels: labels,
      datasets:[{
        label:"Rata-rata suhu per jam",
        data: values,
        tension:0.3,
        spanGaps:true // biar null tidak putus garis
      }]
    },
    options:{
      responsive:true,
      scales:{
        x:{
          title:{
            display:true,
            text:"Jam"
          }
        },
        y:{
          title:{
            display:true,
            text:"Suhu (°C)"
          }
        }
      }
    }
  });
}

/* ===== AUTO REFRESH ===== */
setInterval(loadHistory,5000);
loadHistory();

document.getElementById("chart").onclick = function(){
  window.open("chart.html","_blank");
};

