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
      tension:0.4,
      cubicInterpolationMode:'monotone',

      pointRadius:3,
      pointHoverRadius:6,

      borderColor:'#4fc3f7',
      backgroundColor:'rgba(79,195,247,0.1)',
      fill:true
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

      tooltip:{
        backgroundColor:'#222',
        titleColor:'#fff',
        bodyColor:'#fff',
        borderColor:'#4fc3f7',
        borderWidth:1,
        callbacks:{
          label: ctx => ` ${ctx.parsed.y.toFixed(1)} °C`
        }
      },

      zoom:{
        limits:{
          x:{ min:'original', max:'original' }
        },

        pan:{
          enabled:true,
          mode:'x',
          modifierKey:'ctrl' // tahan CTRL untuk geser
        },

        zoom:{
          wheel:{
            enabled:true,
            speed:0.08
          },
          pinch:{ enabled:true },
          drag:{
            enabled:true,
            backgroundColor:'rgba(79,195,247,0.2)'
          },
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
      color:'#ccc',
      autoSkip:false,
      maxRotation:0,
      minRotation:0,
      font:{ size:10 },
      callback:function(value){
      const label = this.getLabelForValue(value);

      // 🔥 MODE JAM
      if(mode === "hour"){
        return label + ":00";
      }

      // 🔥 MODE ZOOM (AMBIL HH:mm SAJA)
      return label.substring(0,5);
    }
    },
    grid:{ 
      color:'#333',
      lineWidth:1,
      drawBorder:true
    }
  }, // 🔥 WAJIB ADA KOMA DI SINI

  y:{
    ticks:{ 
      color:'#ccc',
      stepSize:5,
      callback: v => {
      return Number.isInteger(v) 
        ? v + "°C" 
        : v.toFixed() + "°C";
}
    },
    grid:{ 
      color:'#333',
      lineWidth:1,
      drawBorder:true
    }
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
    if(!d.time || d.temp === "" || isNaN(d.temp)) return;

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
    if(!d.time || d.temp === "" || isNaN(d.temp)) return;

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

    // 🔥 ANTI FLICKER
    if(JSON.stringify(data.full) === JSON.stringify(rawLog)){
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

  const filtered = filterTodayData(rawLog);
  const values = groupByHour(filtered);

  // =========================
  // 🔥 HANDLE DATA KOSONG
  // =========================
  const valid = values.filter(v => v !== null);

  if(valid.length === 0){
    chart.data.labels = generate24Hours();
    chart.data.datasets[0].data = Array(24).fill(null);
    chart.update('none');
    return;
  }

  // =========================
  // 🔥 AUTO SCALE Y
  // =========================
  const maxVal = Math.max(...valid, 10);

  chart.options.scales.y.min = 0;
  chart.options.scales.y.max = maxVal + 5;

  // =========================
  // 🔥 RESET ZOOM (BIAR FULL 24 JAM)
  // =========================
  chart.options.scales.x.min = undefined;
  chart.options.scales.x.max = undefined;

  // =========================
  // 🔥 UPDATE DATA
  // =========================
  chart.data.labels = generate24Hours(); // 00 - 23
  chart.data.datasets[0].data = values;

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

  const filtered = filterTodayData(rawLog);
  const grouped = getRawData(filtered);
  const WINDOW = 15;

  // 🔥 HANDLE DATA KOSONG
  if(!grouped.length){
    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.update('none');
    return;
  }

  // =========================
  // 🔥 WARNA DINAMIS
  // =========================
  const lastTemp = grouped[grouped.length-1].temp;

  if(lastTemp === 0){
    chart.data.datasets[0].borderColor = '#e74c3c';
  }
  else if(lastTemp > 65){
    chart.data.datasets[0].borderColor = '#f1c40f';
  }
  else{
    chart.data.datasets[0].borderColor = '#4fc3f7';
  }

  // =========================
  // 🔥 AUTO SCALE Y
  // =========================
  const temps = grouped.map(d => d.temp);
  const maxVal = Math.max(...temps, 10);

  chart.options.scales.y.min = 0;
  chart.options.scales.y.max = maxVal + 5; // kasih padding

  // =========================
  // 🔥 AUTO ZOOM (WINDOW)
  // =========================
  if(grouped.length > WINDOW){
    const slice = grouped.slice(-WINDOW);

    if(slice.length){
      chart.options.scales.x.min = slice[0].time;
      chart.options.scales.x.max = slice[slice.length-1].time;
    }
  } else {
    // reset zoom
    chart.options.scales.x.min = undefined;
    chart.options.scales.x.max = undefined;
  }

  // =========================
  // 🔥 UPDATE DATA
  // =========================
  chart.data.labels = grouped.map(d => d.time);
  chart.data.datasets[0].data = grouped.map(d => d.temp);

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

function filterTodayData(log){
  const now = new Date();
  const currentTime = now.toTimeString().slice(0,8); // HH:mm:ss

  return log.filter(d => {
    return d.time && d.time <= currentTime;
  });
}

function getRawData(log){
  return log
    .filter(d => d.time && d.temp !== "" && !isNaN(d.temp))
    .map(d => ({
      time: d.time,
      temp: Number(d.temp)
    }));
}

// ===============================
// 🚀 START (DOM READY)
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  initChart();
  setInterval(loadDetail, 60000);
  loadDetail();
});
