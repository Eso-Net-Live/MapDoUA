"use strict";

/*
 * ================================================================
 * МапаПодійUA — Service Worker
 * ================================================================
 *
 * Структура:
 *
 * MapDoUA/
 * ├── app.html
 * ├── map.html
 * ├── manifest.json
 * ├── sw.js
 * │
 * ├── Sound/
 * │   ├── alarm.mp3
 * │   ├── fire.mp3
 * │   ├── police.mp3
 * │   ├── accident.mp3
 * │   ├── simple.mp3
 * │   ├── ambulance.mp3
 * │   ├── funeral.mp3
 * │   └── power.mp3
 * │
 * └── Voice/
 *     ├── alarm-entry.mp3
 *     ├── alarm-exit.mp3
 *     ├── fire-entry.mp3
 *     ├── fire-exit.mp3
 *     ├── police-entry.mp3
 *     ├── police-exit.mp3
 *     ├── accident-entry.mp3
 *     ├── simple-entry.mp3
 *     ├── ambulance-entry.mp3
 *     ├── funeral-entry.mp3
 *     ├── power-entry.mp3
 *     └── power-exit.mp3
 *
 * ================================================================
 */


/* ================================================================
   CACHE VERSION
   ================================================================ */

const CACHE_VERSION =
  "mapa-podiy-ua-v3";

const APP_CACHE =
  CACHE_VERSION + "-app";

const MEDIA_CACHE =
  CACHE_VERSION + "-media";


/* ================================================================
   ОСНОВНІ ФАЙЛИ
   ================================================================ */

const APP_FILES = [

  "./",

  "./app.html",

  "./map.html",

  "./manifest.json"

];


/* ================================================================
   INSTALL
   ================================================================ */

self.addEventListener(
  "install",
  event => {

    event.waitUntil(

      caches.open(
        APP_CACHE
      )
      .then(
        async cache => {

          /*
           * Кешуємо файли ПО ОДНОМУ.
           *
           * Це важливо:
           * якщо один файл відсутній,
           * Service Worker все одно встановиться.
           */

          for (
            const file
            of APP_FILES
          ) {

            try {

              await cache.add(
                file
              );

              console.log(
                "[SW] Cached:",
                file
              );

            } catch (error) {

              console.warn(
                "[SW] Не вдалося закешувати:",
                file,
                error
              );

            }

          }

        }
      )
      .then(
        () => self.skipWaiting()
      )

    );

  }
);


/* ================================================================
   ACTIVATE
   ================================================================ */

self.addEventListener(
  "activate",
  event => {

    event.waitUntil(

      caches.keys()
        .then(
          cacheNames => {

            return Promise.all(

              cacheNames
                .filter(
                  cacheName => {

                    return (
                      cacheName.startsWith(
                        "mapa-podiy-ua-"
                      ) &&
                      cacheName !==
                        APP_CACHE &&
                      cacheName !==
                        MEDIA_CACHE
                    );

                  }
                )
                .map(
                  cacheName => {

                    console.log(
                      "[SW] Видаляємо старий кеш:",
                      cacheName
                    );

                    return caches.delete(
                      cacheName
                    );

                  }
                )

            );

          }
        )
        .then(
          () => {

            console.log(
              "[SW] Activated:",
              CACHE_VERSION
            );

            return self.clients.claim();

          }
        )

    );

  }
);


/* ================================================================
   FETCH
   ================================================================ */

self.addEventListener(
  "fetch",
  event => {

    const request =
      event.request;

    /*
     * Обробляємо тільки GET.
     */

    if (
      request.method !==
      "GET"
    ) {

      return;

    }


    const url =
      new URL(
        request.url
      );


    /*
     * Google Apps Script API
     *
     * НЕ кешуємо.
     *
     * Потрібні свіжі дані.
     */

    if (
      url.hostname.includes(
        "script.google.com"
      )
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /*
     * NEPTUN API
     *
     * Також НЕ кешуємо.
     */

    if (
      url.hostname ===
        "neptun.in.ua"
    ) {

      event.respondWith(

        fetch(
          request,
          {
            cache: "no-store"
          }
        )

      );

      return;

    }


    /*
     * Google / external APIs
     *
     * Не втручаємося.
     */

    if (
      url.origin !==
      self.location.origin
    ) {

      return;

    }


    /*
     * Sound/*.mp3
     * Voice/*.mp3
     *
     * Cache First.
     *
     * Після першого завантаження
     * файл можна використовувати
     * навіть при нестабільному інтернеті.
     */

    if (
      url.pathname.includes(
        "/Sound/"
      ) ||
      url.pathname.includes(
        "/Voice/"
      )
    ) {

      event.respondWith(
        mediaCacheFirst(
          request
        )
      );

      return;

    }


    /*
     * Звичайні файли застосунку.
     *
     * Cache First + fallback network.
     */

    event.respondWith(
      appCacheFirst(
        request
      )
    );

  }
);


/* ================================================================
   APP CACHE FIRST
   ================================================================ */

async function appCacheFirst(
  request
) {

  const cache =
    await caches.open(
      APP_CACHE
    );


  const cached =
    await cache.match(
      request
    );


  if (cached) {

    /*
     * Для HTML запускаємо
     * фонове оновлення.
     */

    if (
      request.destination ===
      "document"
    ) {

      updateInBackground(
        request,
        cache
      );

    }

    return cached;

  }


  try {

    const response =
      await fetch(
        request
      );


    if (
      response &&
      response.ok
    ) {

      cache.put(
        request,
        response.clone()
      );

    }

    return response;

  } catch (error) {

    console.warn(
      "[SW] Network error:",
      request.url,
      error
    );


    /*
     * Якщо сторінка не відкрилася,
     * пробуємо app.html.
     */

    if (
      request.destination ===
      "document"
    ) {

      const fallback =
        await cache.match(
          "./app.html"
        );

      if (fallback) {
        return fallback;
      }

    }


    throw error;

  }

}


/* ================================================================
   MEDIA CACHE FIRST
   ================================================================ */

async function mediaCacheFirst(
  request
) {

  const cache =
    await caches.open(
      MEDIA_CACHE
    );


  const cached =
    await cache.match(
      request
    );


  if (cached) {

    return cached;

  }


  try {

    const response =
      await fetch(
        request
      );


    /*
     * Якщо MP3 існує —
     * кешуємо його.
     */

    if (
      response &&
      response.ok
    ) {

      cache.put(
        request,
        response.clone()
      );

      console.log(
        "[SW] Media cached:",
        request.url
      );

    }


    return response;

  } catch (error) {

    console.warn(
      "[SW] Media unavailable:",
      request.url,
      error
    );

    throw error;

  }

}


/* ================================================================
   BACKGROUND UPDATE
   ================================================================ */

async function updateInBackground(
  request,
  cache
) {

  try {

    const response =
      await fetch(
        request,
        {
          cache: "no-store"
        }
      );


    if (
      response &&
      response.ok
    ) {

      await cache.put(
        request,
        response.clone()
      );

      console.log(
        "[SW] Background update:",
        request.url
      );

    }

  } catch (error) {

    console.debug(
      "[SW] Background update failed:",
      error
    );

  }

}


/* ================================================================
   PUSH
   ================================================================ */

self.addEventListener(
  "push",
  event => {

    let data = {};


    try {

      if (
        event.data
      ) {

        data =
          event.data.json();

      }

    } catch (error) {

      try {

        data = {
          body:
            event.data
              ? event.data.text()
              : ""
        };

      } catch (innerError) {

        console.debug(
          innerError
        );

      }

    }


    const title =
      data.title ||
      "МапаПодійUA";


    const body =
      data.body ||
      "Нове повідомлення";


    const options = {

      body,

      icon:
        data.icon ||
        "./icon-192.png",

      badge:
        data.badge ||
        "./icon-192.png",

      tag:
        data.tag ||
        "mapa-podiy-ua",

      renotify:
        true,

      data:
        data.data ||
        {
          url:
            "./app.html"
        }

    };


    if (
      data.vibrate
    ) {

      options.vibrate =
        data.vibrate;

    }


    event.waitUntil(

      self.registration
        .showNotification(
          title,
          options
        )

    );

  }
);


/* ================================================================
   NOTIFICATION CLICK
   ================================================================ */

self.addEventListener(
  "notificationclick",
  event => {

    event.notification.close();


    const notification =
      event.notification;


    let targetUrl =
      "./app.html";


    try {

      if (
        notification.data &&
        notification.data.url
      ) {

        targetUrl =
          notification.data.url;

      }

    } catch (error) {

      console.debug(
        error
      );

    }


    event.waitUntil(

      clients
        .matchAll({
          type: "window",
          includeUncontrolled: true
        })
        .then(
          clientList => {

            /*
             * Якщо app.html вже відкритий —
             * фокусуємо його.
             */

            for (
              const client
              of clientList
            ) {

              try {

                const clientUrl =
                  new URL(
                    client.url
                  );

                if (
                  clientUrl.origin ===
                    self.location.origin
                ) {

                  if (
                    "focus" in client
                  ) {

                    return client.focus();

                  }

                }

              } catch (error) {

                console.debug(
                  error
                );

              }

            }


            /*
             * Якщо застосунок не відкритий —
             * відкриваємо app.html.
             */

            if (
              clients.openWindow
            ) {

              return clients.openWindow(
                targetUrl
              );

            }

          }
        )

    );

  }
);


/* ================================================================
   NOTIFICATION CLOSE
   ================================================================ */

self.addEventListener(
  "notificationclose",
  event => {

    console.log(
      "[SW] Notification closed."
    );

  }
);


/* ================================================================
   MESSAGE
   ================================================================ */

self.addEventListener(
  "message",
  event => {

    if (
      !event.data
    ) {

      return;

    }


    /*
     * Примусове оновлення Service Worker.
     */

    if (
      event.data.type ===
      "SKIP_WAITING"
    ) {

      self.skipWaiting();

    }


    /*
     * Очистити media cache.
     */

    if (
      event.data.type ===
      "CLEAR_MEDIA_CACHE"
    ) {

      event.waitUntil(

        caches.delete(
          MEDIA_CACHE
        )

      );

    }

  }
);
