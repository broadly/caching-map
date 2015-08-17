# ES6 LRU cache

* [LRU cache](http://www.cs.uml.edu/~jlu1/doc/codes/lruCache.html)
* Similar interface to
  [Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
* Keys can expire after set time
* Keys can have different costs
* Materizlize function to resolve missing keys


## Example

```js
// Cache 10 most recently used documents
const documents = new LRU(10);

// If key is missing, load document from file system
documents.materialize = function(filename) {
  return promisify(fs.readFile)(filename);
}


// filename -> promise(Buffer)
//
// Returns promise that resolves to the content of this file
// File becomes the most recently used
function loadDocument(path) {
  return documents.get(path);
}


// -> [ filename ]
//
// Returns up to ten filenames of the most recently loaded documents
function listDocuments() {
  const filenames = [ ...documents.keys() ];
  return filenames;
}
```


## Step by Step

This LRU cache is designed for caching JavaScript values in local memory.  You
can use it in circumstances where you can't use an external cache, like memcached,
specifically if you need to cache complex JavaScript objects, functions,
sockets.

If you are memory constrained, you can set a limit on the cache size, and it
will evict old keys to make room for new keys.  Keys can vary in size, so if you
can calculate the key size, you make better use of available memory.  Keys can
also have an expiration, and the cache will evict expired keys first to make
room for new keys.

ES6 has a data structure for caching JavaScript values in local memory, [the Map
class](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).
This cache uses a similar API, and so code that can operate on a `Map` can
often also use this LRU cache.  However, do note the difference in semantics
between the two.


### Limit and Cost

When creating a new `LRU` object, the first argument to the constructor is the
cache limit.

The second argument can be another cache, a `Map` or any iterator that iterates
over name/value pairs.  You can do `lru = new LRU(limit, map)` just as you can
do `map = new Map(lru)`.

If you set the cache limit to zero (or a negative number), it will hold zero
keys.  This could be useful in development, when you want to disable caching,
but still use the same code:

```
const limit = (NODE.ENV === 'production') ? 1000 : 0;
const lru = new LRU(limit);
```

If you set the cache limit to infinity, it will hold as many keys as you've got.
This is useful if you're using TTL to evict expired keys, or you don't care
about evicting keys, but more interested in tracking their recently used order.

You can use the `limit` property to change the cache limit at any time.  The new
value will take effect on the next attempt to set a key.


### Setting Keys

When you `set(key, value)`, that key becomes the most recently used.  If the
cache runs into that limit, it will first evict expired keys, and then evict
least recently used keys, until it can make room to store the new key.

However, if the new key expires immediately, or if bigger than the cache limit,
it is never stored.

When setting a key, you can associate a cost to that key.  The default is one,
and so the cache limit will limit how many keys are stored.  However, if you are
able to assign a variable cost to keys (e.g. the size of a string), then you
should use that for better memory utilization:

```js
lru.set('x', 'X');
lru.size
=> 1
lru.cost
=> 1
lru.set('y', 'YYYYY', { cost: 5 });
lru.size
=> 2
lru.cost
=> 6
```

When setting a key, you can associate the time to live (in milliseconds),
afterwhich the key expires.  Expired keys are never retrieved.  In addition,
expired keys are removed first to make room for new keys:

```js
lru.set('key', 'good for an hour', { ttl: HOUR });
lru.get('key');
=> 'good for an hour'

setTimeout(function() {
  lru.get('key');
}, HOUR);
=> undefined
```


### Get / Materialize

When you `get(key)`, that key becomes the most recently used key.  It will be
the last key removed to make room for new keys.

Iterating over the cache, and checking if a key exists (`has(key)`), does not
affect the recency of the key.  Only getting and setting a key moves changes it
to most recent.

You can use the materialize function to create keys on the fly.  This function
will be called when retrieving a key that doesn't exist, and is expected to
return a value for the key.

If the function returns a promise, the promise is stored in the cache and will
be available when you retrieve the key again.  However, if the promise rejects,
it is removed from the cache.  This is useful for storing resources that are
heavy to materialize, and not always available (e.g. HTTP responses):

```js
lru.materialize = function(url) {
  return promisify(request)(url);
};

const URL = 'http://example.com/';

lru.get(URL).then(
  function(result) {
    // The response promise is now cached
    console.log(result.statusCode);

    assert( lru.has(URL) );
  },
  function(error) {
    // The response promise no longer in the cache, try again
    assert( !lru.has(URL) );
  });

```


### Iterate

The default iterator, `entries()`, `keys()` and `values()` are all available, as
well as `forEach`.  They all iterate on entries starting with the most recently
used key.

Iteration is O(N), but you can use it for operations like deleting all keys that
match a pattern, listing all keys, and so forth:

```js
function deleteKeysInNamespace(lru, namespace) {
  const prefix = `${namespace}:`;
  for (let key of lru)
    if (key.startsWith(prefix))
      lru.delete(key);
}

function listAllKeys(lru) {
  return [ ...lru.keys() ];
}
```


### Lazy Expiration

Expired keys are only evicted from the cache to either make room for new keys,
or when you attempt to retrieve them, check their existence, or iterate over
them.

When you read the `size` or `cost` properties, these values may account for
expired keys.

If you want to force evict all expired keys, you can iterate over all the keys:

```js
function evictExpiredKeys() {
  // Iterating over expired key removes it from the cache
  for (let entry of lru) ;
}

setTimeout(evictExpiredKeys, 5 * MINUTE);
```

