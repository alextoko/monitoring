const API_URL = "https://script.google.com/macros/s/AKfycbz4entNHRnsf8rgvCbZUx00GVo2W-5X7HmNqUvF8AMXOmT1z25z1Omj_R9UMgmB2OO3vQ/exec";

let chart;
let lastMinute = null;
let rawLog = [];
let mode = "hour";

// ===============================
// 🚀 INIT CHART
// ===============================
function initChart(){
  const ctx = document.getElementById("detailChart");

  // 🔥 CEK CANVAS
  if(!ctx){
    console.error("Canvas #detailChart tidak ditemukan!");
    return;
  }

  chart = new Chart(ctx,{
    type:'line',
    data:{
      labels: generate24Hours(),
      datasets:[{
        label:"Detail Suhu",
        data: Array(24).fill(null),
        borderWidth:2,
        tension:0.3,
        pointRadius:2,
        spanGaps:true
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:false,

      interaction:{
        mode:'index',
        intersect:false
      },

      plugins:{
        legend:{
          labels:{color:'#fff'}
        },

        zoom:{
          pan:{ enabled:true, mode:'x' },
          zoom:{
            wheel:{enabled:true},
            pinch:{enabled:true},
            mode:'x',

            onZoomComplete(){
              if(mode !== "minute"){
                switchToMinuteMode();
              }
            }
          }
        }
      },

      scales:{
        x:{
          ticks:{
            color:'#fff',
            callback: function(value){
              const label = this.getLabelForValue(value);
              return mode === "hour" ? label + ":00" : label;
            }
          }
        },
        y:{
          min:0,
          max:100,
          ticks:{ color:'#fff' }
        }
      }
    }
  });

  // 🔥 FIX ERROR addEventListener
  if(ctx){
    ctx.addEventListener('dblclick', resetZoom);
  }
}

// ===============================
// 🔧 GROUP PER MENIT
// ===============================
function groupByMinute(data){
  const map = {};

  data.forEach(d=>{
    if(!d.time) return;

    const parts = d.time.split(":");
    const h = parts[0].padStart(2,"0");
    const m = (parts[1] || "00").padStart(2,"0");
    const minute = `${h}:${m}`;

    if(!map[minute]){
      map[minute] = { sum:0, count:0 };
    }

    map[minute].sum += Number(d.temp);
    map[minute].count++;
  });

  return Object.keys(map).sort().map(minute=>({
    time: minute,
    temp: map[minute].sum / map[minute].count
  }));
}

// ===============================
// 🔧 GROUP PER JAM
// ===============================
function groupByHour(log){
  let sum = Array(24).fill(0);
  let count = Array(24).fill(0);

  log.forEach(d=>{
    if(!d.time || !d.temp) return;

    const hour = Number(d.time.split(":")[0]);

    if(!isNaN(hour) && hour >= 0 && hour < 24){
      sum[hour] += Number(d.temp);
      count[hour]++;
    }
  });

  return sum.map((s,i)=>
    count[i] ? (s/count[i]) : null
  );
}

// ===============================
// 🔄 FETCH & STREAM
// ===============================
async function loadDetail(){
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    console.log("DATA:", data);
console.log("FULL:", data.full);

    if(!data.full || !data.full.length){
      console.log("Data kosong");
      return;
    }

    rawLog = data.full.sort((a, b) => {
      return new Date("1970-01-01T" + a.time) - new Date("1970-01-01T" + b.time);
    });

    if(mode === "hour"){
      updateHourMode();
    } else {
      updateMinuteMode();
    }

  } catch(e){
    console.error("Fetch error:", e);
  }
}

// ===============================
// 🟢 MODE JAM
// ===============================
function updateHourMode(){
  const values = groupByHour(rawLog);

  chart.data.labels = generate24Hours();
  chart.data.datasets[0].data = values;

  chart.options.scales.y.min = 0;
  chart.options.scales.y.max = 100;

  chart.update('none');
}

// ===============================
// 🔵 MODE MENIT
// ===============================
function switchToMinuteMode(){
  mode = "minute";
  lastMinute = null;
  updateMinuteMode();
}

function updateMinuteMode(){
  const grouped = groupByMinute(rawLog);

  chart.data.labels = grouped.map(d => d.time);
  chart.data.datasets[0].data = grouped.map(d => d.temp);

  if(grouped.length){
    lastMinute = grouped[grouped.length - 1].time;
  }

  chart.options.scales.y.min = undefined;
  chart.options.scales.y.max = undefined;

  chart.update('none');
}

// ===============================
// 🔄 RESET
// ===============================
function resetZoom(){
  chart.resetZoom();
  mode = "hour";
  updateHourMode();
}

// ===============================
// 🔧 HELPER
// ===============================
function generate24Hours(){
  return Array.from({length:24},(_,i)=>
    i.toString().padStart(2,"0")
  );
}

// ===============================
// 🚀 START (DOM READY)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initChart();
  setInterval(loadDetail, 2000);
  loadDetail();
});