const API_URL = "https://script.google.com/macros/s/AKfycbwW4bE2Dcccirw4SClj80ExGDKodyt6AQobw99VVOhjZj8b5T8zDUZ_9Kd-ryS8WA6_kw/exec";

let chart;
let lastMinute = null; // 🔥 pakai MENIT, bukan detik

// ===============================
// 🚀 INIT CHART
// ===============================
function initChart(){
  const ctx = document.getElementById("detailChart");

  chart = new Chart(ctx,{
    type:'line',
    data:{
      labels:[],
      datasets:[{
        label:"Detail Suhu",
        data:[],
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
            mode:'x'
          }
        }
      },

      scales:{
        x:{
          ticks:{
            color:'#fff',
            callback: function(value){
              const label = this.getLabelForValue(value);
              return label; // sudah HH:mm
            }
          }
        },
        y:{
          ticks:{ color:'#fff' }
        }
      }
    }
  });
}

// ===============================
// 🔧 HELPER: GROUP PER MENIT
// ===============================
function groupByMinute(data){
  const map = {};

  data.forEach(d=>{
    const minute = d.time.substring(0,5); // 🔥 HH:mm

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
// 🔄 FETCH & STREAM
// ===============================
async function loadDetail(){
  const res = await fetch(API_URL);
  const data = await res.json();

  let sorted = data.full.sort((a, b) => {
    return new Date("1970-01-01T" + a.time) - new Date("1970-01-01T" + b.time);
  });

  // 🔥 GROUP PER MENIT
  let grouped = groupByMinute(sorted);

  // 🔥 ambil hanya data baru (berdasarkan menit)
  if(lastMinute){
    grouped = grouped.filter(d => d.time > lastMinute);
  }

  if(grouped.length === 0) return;

  grouped.forEach(d=>{
    chart.data.labels.push(d.time);
    chart.data.datasets[0].data.push(d.temp);
  });

  // 🔥 simpan menit terakhir
  lastMinute = grouped[grouped.length - 1].time;

  // 🔥 LIMIT BIAR RINGAN
  const MAX_POINTS = 60;
  if(chart.data.labels.length > MAX_POINTS){
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }

  chart.update('none');
}

// ===============================
// 🚀 START
// ===============================
initChart();
setInterval(loadDetail, 2000);
loadDetail();