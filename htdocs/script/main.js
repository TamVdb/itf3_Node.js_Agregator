// document.addEventListener('DOMContentLoaded', function () {
const hour = document.getElementById('hour');
const min = document.getElementById('min');
const sec = document.getElementById('sec');

function clock() {
   const time = new Date();

   // Getting hour, mins, secs from time
   let hh = time.getHours();
   let mm = time.getMinutes();
   let ss = time.getSeconds();

   let hrotate = 30 * hh + mm / 2; //1h = 360°/12 = 30°
   let mrotate = 6 * mm; //1' = 6°
   let srotate = 6 * ss;

   // rotate the elements
   hour.style.transform = `rotate(${hrotate}deg)`;
   min.style.transform = `rotate(${mrotate}deg)`;
   sec.style.transform = `rotate(${srotate}deg)`;
}

setInterval(clock, 1000);

// });
