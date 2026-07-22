(function (global) {
  'use strict';
  async function create(options) {
    if (!options || !options.endpoint) throw new Error('VICODE endpoint is required');
    const endpoint = new URL(options.endpoint, location.href);
    if (endpoint.protocol !== 'https:' && endpoint.hostname !== 'localhost') throw new Error('HTTPS is required');
    let token = '', expires = 0;
    async function refresh() {
      const response = await fetch(new URL('/v1/token', endpoint), {method:'POST', credentials:'omit'});
      if (!response.ok) throw new Error('VICODE token request failed');
      const data = await response.json(); token=data.token; expires=Date.now()+data.expiresIn*1000;
    }
    return {async request(path, init={}) {
      if (!token || Date.now()>expires-30000) await refresh();
      const url=new URL(path,endpoint); if(url.origin!==endpoint.origin) throw new Error('Cross-origin target rejected');
      const headers=new Headers(init.headers); headers.set('authorization',`Bearer ${token}`);
      return fetch(url,{...init,headers,credentials:'omit'});
    }};
  }
  global.VICODE=Object.freeze({create});
})(globalThis);
