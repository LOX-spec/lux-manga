import { lookup } from 'node:dns';
import { request } from 'node:https';
import { BlockList } from 'node:net';
import { Readable } from 'node:stream';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3]
]) {
  blocked.addSubnet(network, prefix, 'ipv4');
}

export function lookupPublic(hostname, options, callback) {
  lookup(hostname, { family: 4, all: true }, (error, addresses) => {
    if (error) return callback(error);
    const publicAddresses = addresses.filter(({ address }) => !blocked.check(address, 'ipv4'));
    if (!publicAddresses.length) return callback(new Error('المصدر يحتاج عنوان شبكة عامًا.'));
    if (options.all) return callback(null, publicAddresses);
    const { address, family } = publicAddresses[0];
    callback(null, address, family);
  });
}

const decoders = new Map([
  ['br', createBrotliDecompress], ['gzip', createGunzip], ['deflate', createInflate]
]);

export function fetchPublic(url, { accept, signal }) {
  return new Promise((resolve, reject) => {
    // The socket uses this lookup result, so it cannot resolve a second address later.
    const outgoing = request(url, {
      agent: false,
      family: 4,
      lookup: lookupPublic,
      headers: { Accept: accept, 'Accept-Encoding': 'identity' },
      signal
    }, incoming => {
      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          for (const item of Array.isArray(value) ? value : [value]) {
            if (item !== undefined) headers.append(key, item);
          }
        }
        const status = incoming.statusCode;
        if ([204, 205, 304].includes(status)) {
          incoming.resume();
          resolve(new Response(null, { status, headers }));
          return;
        }
        const encoding = headers.get('content-encoding')?.toLowerCase();
        const decoder = decoders.get(encoding)?.();
        if (encoding && encoding !== 'identity' && !decoder) {
          throw new Error('ترميز استجابة المصدر غير مدعوم.');
        }
        if (decoder) {
          headers.delete('content-encoding');
          headers.delete('content-length');
          incoming.on('error', error => decoder.destroy(error));
          decoder.on('close', () => incoming.destroy());
          incoming.pipe(decoder);
        }
        const stream = Readable.toWeb(decoder ?? incoming);
        resolve(new Response(stream, { status, headers }));
      } catch (error) {
        incoming.destroy();
        reject(error);
      }
    });
    outgoing.on('error', error => reject(signal.aborted ? signal.reason : error));
    outgoing.end();
  });
}
