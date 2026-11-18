self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick',e=>{e.notification.close();const chat=e.notification.data&&e.notification.data.chat;
 e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{
  if(l.length){const c=l[0];c.postMessage({chat});return c.focus()}
  return self.clients.openWindow('./')}))});
