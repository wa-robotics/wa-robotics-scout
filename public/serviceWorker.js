//This file uses code from https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/lifecycle,
//https://developers.google.com/web/fundamentals/getting-started/primers/service-workers, and
//https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/registration,
//all of which are licensed under the Apache License 2.0.  Parts of the code have been modified from their original versions.

self.addEventListener('install', function(event) {
    // Perform install steps
});

var CACHE_NAME = 'wa-robotics-scout-cache-v2';
var urlsToCache = [
];

self.addEventListener('install', function(event) {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    return fetch(event.request);
                }
            )
    );
});

self.addEventListener('activate', function(event) {

    var cacheWhitelist = ['wa-robotics-scout-cache-v1'];

    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});