# LRU cache for ES6

An [LRU cache](http://www.cs.uml.edu/~jlu1/doc/codes/lruCache.html) that
implements the same interface as [ES6
Map](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map).

You can set the cache limit when creating a new cache, or by setting the
property `limit`.  If you set the limit to zero (or negative value), the cache
will hold no keys.  If you set the limit to `Infinity` (or anything that's not a
number) the cache will have no limit on how many keys it can hold.

Otherwise, the cache will evict keys when it needs to make room for storing new
keys.  It needs more room when the total cost of all, non-expired keys, plus the
new key is bigger than the limit.

For example, if the limit is set to 10, you can store 3 keys with a cost of 3 (3
x 3 = 9), or 2 keys with a cost of 4 (3 x 4 = 12).  If you don't specify a cost
when storing a key, the default is 1, which effectively makes it limit the
number of keys stored.

When the cache needs to make room for new keys, it evicts expired keys first,
and then evicts the least recently used keys, but only enough to make room for
the new key.

Any time you get or set a key, it becomes the most recently used key.  Checking
if a key exists (`has()`) does not affect the key's ranking.

The `set` method takes the same two arguments (key and value), and a third
argument which may have the following two options:

- `cost` - The cost of this key, a positive number (0 is allowed), if absent the
default is 1
- `ttl` - The time to live in milliseconds, if absent the key never expires

You can iterate over all keys in order of insertion using the `entries()`,
`keys()` and `values()` iterators.  You can also iterate over all keys from most
to least recent using the `recent()` iterator.  The default iterator is the
`recent()` iterator.

You can also initialize an LRU cache from an array, `Map` or any iterator with
key/value pairs.  The recent order would be the reverse of the insertion order.
And of course you can initialize an LRU cache from another cache, which would
preserve all the same settings and order of keys.


## Examples

```js
// This cache will hold at most two keys
const two = new LRU(2);

two.set('a', {});
two.set('b', {});
two.set('c', {});
two.keys();
=> [ 'b', 'c' ]
two.size
=> 2
two.cost
=> 2


// This cache will only hold keys with a total cost of 10, dropping least
// recently used keys when it gets full
const ten = new LRU(10);

// 4+4+3=11 > 10 so will drop 'a'
ten.set('a', '', { cost: 4 });
ten.set('b', '', { cost: 4 });
ten.set('c', '', { cost: 3 });
ten.keys();
=> [ 'b', 'c' ]

// 'c' becomes least recently used
ten.get('b');
// 3+4+4=11 > 10 so will drop 'c'
ten.set('d', '', { cost: 4 });
ten.keys();
=> [ 'b', 'd' ]
ten.size
=> 2
ten.cost
=> 8

// This key is too big to hold
ten.set('too-big', '', { cost: 11 });
ten.keys();
=> [ 'b', 'd' ]
ten.cost
=> 8


// An easy way to disable caching, e.g. in development mode
const empty = new LRU(0);
empty.set('x', 1);
empty.keys();
=> []


// LRU cache of infinite size
// Useful if you want to evict keys only when they expire
const infinite = new LRU(Infinity);

// Will hold 'y' for a second, will not hold 'x'
infinite.set('x', [], { ttl: 0 });
infinite.set('y', [], { ttl: 1000 });
infinite.keys();
=> [ 'y' ]


// New cache from map
const fromMap = new Map(2, [ [ 'a', 1], [ 'b', 2 ] ]);
fromMap.limit;
=> 2
fromMap.keys();
=> [ 'a', 'b' ]

// New cache from another cache
const clone = new LRU(fromMap);
clone.limit;
=> 2
clone.keys();
=> [ 'a', 'b' ]
```


## Design

ES6 introduces the `Map` class for holding key/value pairs.  The LRU cache uses
the same interface, so you can use it the same way you could use a `Map`.

`LRU` uses `Map` for its internal implementation, but does not extend it.  In
the future, `Map` may gain additional methods and properties, and these may be
"implemented" wrong if `LRU` automatically gained them via inheritence.

`LRU` mostly preserves the same API as `Map` with the notable addition of the
`limit` property, the `recent` iterator, and a 3rd argument to the `set` method.
These are the minimum additions required for a working implementation.

The `size` property is read-only so uses a getter.  The `limit` property is
read/write, but we can't accept invalid values (e.g. `null` and "foo" don't make
sense), so we use getter/setter to clean those up.

Changing the limit does not evict any cached entries: there's an expectation
that setting a property is a quick and low cost operation, and cache eviction is
not.

We use symbols for referencing internal properties, such as the head and tail
links.  There is no reason for these to be accessed from outside the class.  We
can also use symbols for internal methods (like prepending/removing links),
although the shorthand syntax is not yet supported by io.js.  It is not a
pressing issue, so we're using the underscore naming convention for now.

Evicting old entries is an O(1) operation which makes it efficient, important
for large caches under heavy use, but also means that expires keys are only
removed as necessary to make room in the cache.  If you need to aggressively
remove all expired keys, iterate over all of them or use a different LRU cache
implementation.

When setting a key, if the TTL is zero, or the cost is higher than the cache
limit, the key is not stored.  This is because the key would have been evicted
anyway, and there's no benefit in evicting the rest of the cache to make room
for it.

This also enables a zero limit cache that hold no keys.  Typically we want to
cache in production but may not want to cache anything in development (so to
dynmically reload when files change), and this can be done as easily as setting
the cache limit based on the environment.

The `has` method just checks if a key exists, it doesn't evict or change order,
and so has no side effect of performance issues.  The `get` method does change
the order, and so has a side effect, but one that's expected when using an LRU
cache.

The `set` method will evict as many keys as necessary, and so has side effects
and may have a performance penalty, depending on number of keys that need to be
evicted.  Though typically over a long period of time, it's an O(1) operation.

Evicting all expired keys happens only when iterating over the cache, which is
an O(N) operation.

In Node, `console.log` uses the `inspect` method to print out complex objects,
so we implement an `inspect` method that delegates to the `Map` to dump all the
key/value pairs.  Since we store links in the map, we also implement an
`inspect` method for each of them, that inspects the value itself.

