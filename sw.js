const CACHE_NAME =
  "mapa-podiy-ua-v1";


const APP_FILES = [

  "./",

  "./app.html",

  "./map.html",

  "./manifest.json",

  "./offline.html",

  "./icons/icon-192.png",

  "./icons/icon-512.png",

  "./Sound/alarm.mp3",

  "./Sound/fire.mp3",

  "./Sound/police.mp3",

  "./Sound/accident.mp3",

  "./Sound/simple.mp3",

  "./Sound/ambulance.mp3",

  "./Sound/funeral.mp3",

  "./Sound/power.mp3"

];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches
        .open(CACHE_NAME)
        .then(
          cache =>
            cache.addAll(
              APP_FILES
            )
        )
        .catch(
          error => {

            console.warn(
              "Cache install error:",
              error
            );

          }
        )

    );

    self.skipWaiting();

  }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches
        .keys()
        .then(
          keys =>
            Promise.all(

              keys
                .filter(
                  key =>
                    key !== CACHE_NAME
                )
                .map(
                  key =>
                    caches.delete(key)
                )

            )
        )

    );

    self.clients.claim();

  }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
  "fetch",
  event => {

    /*
      Google Apps Script API не кешуємо.
    */

    if(
      event.request.url.includes(
        "script.google.com"
      )
    ){

      return;

    }

    event.respondWith(

      fetch(event.request)
        .then(response => {

          /*
            Успішний ресурс кладемо в cache.
          */

          if(
            response &&
            response.status === 200 &&
            event.request.method === "GET"
          ){

            const copy =
              response.clone();

            caches
              .open(CACHE_NAME)
              .then(
                cache =>
                  cache.put(
                    event.request,
                    copy
                  )
              )
              .catch(()=>{});

          }

          return response;

        })
        .catch(
          async () => {

            const cached =
              await caches.match(
                event.request
              );

            if(cached){

              return cached;

            }

            if(
              event.request.mode ===
              "navigate"
            ){

              const offline =
                await caches.match(
                  "./offline.html"
                );

              if(offline){

                return offline;

              }

            }

            return new Response(
              "Offline",
              {
                status:503,
                headers:{
                  "Content-Type":
                    "text/plain; charset=utf-8"
                }
              }
            );

          }
        )

    );

  }
);


/* =========================================================
   ANDROID NOTIFICATION CLICK
========================================================= */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();

    event.waitUntil(

      clients
        .matchAll({
          type:"window",
          includeUncontrolled:true
        })
        .then(
          clientList => {

            /*
              Якщо app.html вже відкрита —
              повертаємо користувача в неї.
            */

            for(
              const client
              of clientList
            ){

              if(
                "focus" in client
              ){

                return client.focus();

              }

            }

            /*
              Якщо PWA не відкрита —
              відкриваємо app.html.
            */

            if(
              clients.openWindow
            ){

              return clients.openWindow(
                "./app.html"
              );

            }

          }
        )

    );

  }
);
