const https = require('https');
const filestream = require('fs');

// npm install express
const express = require('express');
const app = express();

// npm install xml2js
const parseString = require('xml2js').parseString;

let megaJSON = new Object();

// npm install ejs
app.set('view engine', 'ejs');

// pour notre serveur HTTP utilise pour la racine (/) le répertoire htdocs
// __dirname donne le chemin (path) du répertoire courant
app.use('/', express.static(__dirname + '/htdocs'));

app.listen(8000, function () {
   console.log("Serveur HTTP en cours d'exécution sur le port 8000");
});

app.get('/', function (req, res) {
   console.log(megaJSON);
   res.render('index.ejs', { megaJSON });
});

// lancer les fonctions
refreshWeather();
refreshLiveboard();
refreshRSSLeMonde();
refreshFloatrates();
refreshNatGeo();

// lancer les timer
setInterval(refreshWeather, 60 * 60 * 1000); // toutes les heures
setInterval(refreshLiveboard, 60 * 60 * 1000); // toutes les heures
setInterval(refreshRSSLeMonde, 30 * 60 * 1000); // toutes les heures
setInterval(refreshFloatrates, 60 * 60 * 1000); // toutes les heures
setInterval(refreshNatGeo, 60 * 60 * 1000); // toutes les heures

// fonctions
function refreshWeather() {
   let request = {
      host: 'api.open-meteo.com',
      port: 443,
      path: '/v1/forecast?latitude=50.85&longitude=4.35&hourly=temperature_2m,precipitation_probability,wind_speed_10m&forecast_days=1',
   };

   https.get(request, receiveResponseCallback);

   function receiveResponseCallback(response) {
      let rawData = '';
      //Gère l'événement data qui va gérer les chunks de données
      response.on('data', (chunk) => {
         rawData += chunk;
      });
      response.on('end', function (chunk) {
         //Transforme la chaine de caractères en objet JSON
         let weatherJSON = JSON.parse(rawData);

         let newWeatherJSON = {
            weatherJSONArray: [],
         };

         for (let i = 0; i < weatherJSON.hourly.time.length; i++) {
            let time = weatherJSON.hourly.time[i].slice(11);
            let date = new Date(weatherJSON.hourly.time[i]).toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
            let temperature = weatherJSON.hourly.temperature_2m[i];
            let unit = weatherJSON.hourly_units.temperature_2m;
            let rain = weatherJSON.hourly.precipitation_probability[i];
            let wind = weatherJSON.hourly.wind_speed_10m[i];

            newWeatherJSON.weatherJSONArray.push({
               Date: date,
               Hour: time,
               Temperature: temperature + ' ' + unit,
               Rain: rain + '%',
               Wind: wind + ' km/h',
            });
         }

         // let filteredArrayWeather = newweatherJSON.weatherJSONArray.filter((item) => item.Hour === '09:00' || item.Hour === '12:00' || item.Hour === '15:00');

         // On transforme l'objet JSON en chaine de caractères et on l'enregistre dans un fichier json
         filestream.writeFileSync('./cache/rssWeather.json', JSON.stringify(newWeatherJSON, null, '\t'));

         megaJSON.weather = newWeatherJSON;
      });
   }
}

function refreshLiveboard() {
   let request = {
      host: 'api.irail.be',
      port: 443,
      path: '/v1/liveboard/?id=BE.NMBS.008812005&lang=fr&format=json',
   };

   https.get(request, receiveResponseCallback);

   function receiveResponseCallback(response) {
      // Gère l'événement 'data', je reçois un chunk de données et je défini une fonction qu va gérer les chunks de données
      let rawData = '';
      response.on('data', (chunk) => {
         rawData += chunk;
      });
      response.on('end', function (chunk) {
         //Transforme la chaine de caractères en objet JSON
         let liveboardJSON = JSON.parse(rawData);

         let newLiveboardJSON = {
            liveboardJSONArray: [],
         };

         for (let i = 0; i < 3; i++) {
            let station = liveboardJSON.departures.departure[i].station;
            let time = liveboardJSON.departures.departure[i].time;
            let goodtime = new Date(parseInt(time) * 1000).toLocaleTimeString('fr-fr').slice(0, 5);
            let platform = liveboardJSON.departures.departure[i].platform;
            let delay = liveboardJSON.departures.departure[i].delay / 60;
            let vehicle = liveboardJSON.departures.departure[i].vehicleinfo.shortname;

            newLiveboardJSON.liveboardJSONArray.push({
               Station: station,
               Time: goodtime,
               Platform: platform,
               Delay: delay,
               Vehicle: vehicle,
            });
         }

         // On transforme l'objet JSON en chaine de caractères et on l'enregistre dans un fichier json
         filestream.writeFileSync('./cache/rssLiveboard.json', JSON.stringify(newLiveboardJSON, null, '\t'));

         megaJSON.liveboard = newLiveboardJSON;
      });
   }
}

function refreshRSSLeMonde() {
   let request = {
      host: 'www.lemonde.fr',
      port: 443,
      path: '/espace/rss_full.xml',
   };

   https.get(request, receiveResponseCallback);

   function receiveResponseCallback(response) {
      let rawData = '';

      //Gère l'événement data qui va gérer les chunks de données
      response.on('data', (chunk) => {
         rawData += chunk;
      });
      response.on('end', function (chunk) {
         let rssLeMondeJSON = {
            items: [],
         };

         parseString(rawData, function (err, result) {
            for (let i = 0; i < 2; i++) {
               let title = result.rss.channel[0].item[i].title[0];
               let date = result.rss.channel[0].item[i].pubDate[0];
               let gooddate = new Date(date).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
               let description = result.rss.channel[0].item[i].description[0];
               let link = result.rss.channel[0].item[i].link[0];
               let imageUrl = result.rss.channel[0].item[i]['media:content'][0].$.url;

               rssLeMondeJSON.items.push({
                  Title: title,
                  Date: gooddate,
                  Description: description,
                  Link: link,
                  ImageUrl: imageUrl,
               });
            }
         });

         // On transforme l'objet JSON en chaine de caractères et on l'enregistre dans un fichier json
         filestream.writeFileSync('./cache/rssLeMonde.json', JSON.stringify(rssLeMondeJSON, null, '\t'));

         megaJSON.lemonde = rssLeMondeJSON;
      });
   }
}

function refreshFloatrates() {
   let request = {
      host: 'floatrates.com',
      port: 443,
      path: '/daily/eur.json',
   };

   https.get(request, receiveResponseCallback);

   function receiveResponseCallback(response) {
      let rawData = '';
      response.on('data', (chunk) => {
         rawData += chunk;
      });
      response.on('end', function (chunk) {
         let floatRates = JSON.parse(rawData);

         let newFloatRates = {
            floatRatesArray: [],
         };

         for (key in floatRates) {
            let currency = floatRates[key].code;
            let name = floatRates[key].name;
            let rate = Math.round(floatRates[key].rate * 100) / 100;

            newFloatRates.floatRatesArray.push({
               Currency: currency,
               Name: name,
               Rate: rate,
            });
         }

         let filteredArrayFloatrates = newFloatRates.floatRatesArray.filter((item) => item.Name === 'U.S. Dollar' || item.Name === 'U.K. Pound Sterling' || item.Name === 'Chinese Yuan');

         filestream.writeFileSync('./cache/rssFloatrates.json', JSON.stringify(filteredArrayFloatrates, null, '\t'));

         megaJSON.floatrates = filteredArrayFloatrates;
      });
   }
}

function refreshNatGeo() {
   let request = {
      host: 'www.nationalgeographic.fr',
      port: 443,
      path: '/api/rss/latest_contents.xml',
   };

   https.get(request, receiveResponseCallback);

   function receiveResponseCallback(response) {
      let rawData = '';

      //Gère l'événement data qui va gérer les chunks de données
      response.on('data', (chunk) => {
         rawData += chunk;
      });
      response.on('end', function (chunk) {
         let rssNatGeoSpaceJSON = {
            items: [],
         };

         let rssNatGeoTravelJSON = {
            items: [],
         };

         let rssNatGeoAnimalsJSON = {
            items: [],
         };

         parseString(rawData, function (err, result) {
            for (let i = 0; i < result.rss.channel[0].item.length; i++) {
               let title = result.rss.channel[0].item[i].title[0];
               let link = result.rss.channel[0].item[i].link[0];
               let category = result.rss.channel[0].item[i].category[0];
               let imageUrl = result.rss.channel[0].item[i]['enclosure'][0].$.url;

               // si la catégorie est "Espace", on ajoute dans le tableau
               if (category === 'Histoire') {
                  rssNatGeoSpaceJSON.items.push({
                     Title: title,
                     Link: link,
                     Category: category,
                     ImageUrl: imageUrl,
                  });
               }

               // si la catégorie est "Voyage", on ajoute dans le tableau
               if (category === 'Voyage') {
                  rssNatGeoTravelJSON.items.push({
                     Title: title,
                     Link: link,
                     Category: category,
                     ImageUrl: imageUrl,
                  });
               }

               // si la catégorie est "Animaux", on ajoute dans le tableau
               if (category === 'Animaux') {
                  rssNatGeoAnimalsJSON.items.push({
                     Title: title,
                     Link: link,
                     Category: category,
                     ImageUrl: imageUrl,
                  });
               }
            }
         });

         // On transforme l'objet JSON en chaine de caractères
         filestream.writeFileSync('./cache/rssNatGeoSpace.json', JSON.stringify(rssNatGeoSpaceJSON, null, '\t'));
         filestream.writeFileSync('./cache/rssNatGeoTravel.json', JSON.stringify(rssNatGeoTravelJSON, null, '\t'));
         filestream.writeFileSync('./cache/rssNatGeoAnimals.json', JSON.stringify(rssNatGeoAnimalsJSON, null, '\t'));

         megaJSON.natgeospace = rssNatGeoSpaceJSON;
         megaJSON.natgeotravel = rssNatGeoTravelJSON;
         megaJSON.natgeoanimal = rssNatGeoAnimalsJSON;
      });
   }
}
