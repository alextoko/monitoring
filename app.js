import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAtebbp9XVTRpJROF4mo8FDM50l7vSRJQo",
  databaseURL: "https://oil-plta-bta-default-rtdb.firebaseio.com/"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let lastSeen = Date.now();

/* ===== TEMPERATURE ===== */
onValue(ref(db,"Temperature/current"), s=>{
  let val = s.val() || 0;
  document.getElementById("temp").innerHTML = val.toFixed(1)+"°C";
  lastSeen = Date.now();
});

onValue(ref(db,"Temperature/average"), s=>{
  document.getElementById("avg").innerHTML = s.val();
});

onValue(ref(db,"Temperature/maximal"), s=>{
  document.getElementById("max").innerHTML = s.val();
});

onValue(ref(db,"Temperature/minimal"), s=>{
  document.getElementById("min").innerHTML = s.val();
});

/* ===== PWM ===== */
onValue(ref(db,"Status/pwm_motor"), s=>{
  document.getElementById("pwm").innerHTML = s.val();
});

onValue(ref(db,"Status/pwm_percent"), s=>{
  document.getElementById("duty").innerHTML = s.val()+"%";
});

/* ===== ALARM ===== */
onValue(ref(db,"Status/alarm"), s=>{
  let el = document.getElementById("alarm");
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
  document.getElementById("set").innerHTML = s.val();
});

/* ===== IP ===== */
onValue(ref(db,"Device/ip"), s=>{
  document.getElementById("ip").innerHTML = s.val();
});

/* ===== JAM ===== */
setInterval(()=>{
  let n=new Date();
  document.getElementById("clock").innerHTML=n.toLocaleTimeString();
},1000);

/* ===== OFFLINE DETECTION ===== */
setInterval(()=>{
  if(Date.now()-lastSeen > 3000){
    document.getElementById("temp").innerHTML="0.0°C";
  }
},1000);