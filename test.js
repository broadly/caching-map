/* eslint-env mocha */
'use strict';
const assert  = require('assert');
const Cache   = require('./index');


// Until we get Array.from(iterator) or [...iterator]
function arrayFrom(iterator) {
  const array = [];
  for (let item of iterator)
    array.push(item);
  return array;
}


describe('Cache with limit of zero', function() {

  let cache;

  before(function() {
    cache = new Cache(0);
  });

  it('should report a limit of zero', function() {
    assert.equal(cache.limit, 0);
  });

  it('should report a cost of zero', function() {
    assert.equal(cache.cost, 0);
  });

  it('should report a size of zero', function() {
    assert.equal(cache.size, 0);
  });


  describe('after setting two keys', function() {

    before(function() {
      cache
        .set('x', 'XXX')
        .set('y', 'YYY');
    });

    it('should have a size of zero', function() {
      assert.equal(cache.size, 0);
    });

    it('should report a cost of zero', function() {
      assert.equal(cache.cost, 0);
    });

    it('should have neither of these keys', function() {
      assert.equal(cache.get('x'), undefined);
      assert.equal(cache.get('y'), undefined);
    });

    it('should have no entries', function() {
      const nextEntry = cache.entries().next();
      assert.equal(nextEntry.value, undefined);
      assert.equal(nextEntry.done, true);
    });

  });

});


describe('Cache with negative limit', function() {

  let cache;

  before(function() {
    cache = new Cache(-10);
  });

  it('should report a limit of zero', function() {
    assert.equal(cache.limit, 0);
  });

  it('should report a cost of zero', function() {
    assert.equal(cache.cost, 0);
  });

  it('should report a size of zero', function() {
    assert.equal(cache.size, 0);
  });

});


describe('Cache with three keys', function() {

  let cache;

  before(function() {
    cache = new Cache();
    cache
      .set('x', 'XXX')
      .set('y', 'YYY')
      .set('z', 'ZZZ');
  });

  it('should have a size of three', function() {
    assert.equal(cache.size, 3);
  });

  it('should have a cost of three', function() {
    assert.equal(cache.cost, 3);
  });


  describe('get', function() {

    it('should return value of key', function() {
      assert.equal(cache.get('x'), 'XXX');
      assert.equal(cache.get('y'), 'YYY');
      assert.equal(cache.get('z'), 'ZZZ');
    });

    it('should return undefined if key does not exist', function() {
      assert.equal(cache.get('X'), undefined);
      assert.equal(cache.get('a'), undefined);
      assert.equal(cache.get(null), undefined);
    });

  });

  describe('has', function() {

    it('should return true if key exists', function() {
      assert.equal(cache.has('x'), true);
      assert.equal(cache.has('y'), true);
      assert.equal(cache.has('z'), true);
    });

    it('should return false if key does not exist', function() {
      assert.equal(cache.has('X'), false);
      assert.equal(cache.has('a'), false);
      assert.equal(cache.has(null), false);
    });

  });

  describe('iterators', function() {

    before(function() {
      // This sets the LRU order to y -> z -> x
      cache.get('z');
      cache.get('y');
    });

    it('should iterate from most to least recent', function() {
      const entries = arrayFrom( cache[Symbol.iterator]() );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'z', 'ZZZ' ], [ 'x', 'XXX' ] ]);
    });

    it('should return all entries from most to least recent', function() {
      const entries = arrayFrom( cache.entries() );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'z', 'ZZZ' ], [ 'x', 'XXX' ] ]);
    });

    it('should return all keys from most to least recent', function() {
      const keys = arrayFrom( cache.keys() );
      assert.deepEqual(keys, [ 'y', 'z', 'x' ]);
    });

    it('should return all values from most to least recent', function() {
      const values = arrayFrom( cache.values() );
      assert.deepEqual(values, [ 'YYY', 'ZZZ', 'XXX' ]);
    });

  });

  describe('forEach', function() {

    before(function() {
      // This sets the LRU order to y -> z -> x
      cache.get('z');
      cache.get('y');
    });

    it('should call with value as first argument (most to least recent)', function() {
      const values = [];
      cache.forEach(function(value) {
        values.push(value);
      });
      assert.deepEqual(values, [ 'YYY', 'ZZZ', 'XXX' ]);
    });

    it('should call with key as second argument (most to least recent)', function() {
      const keys = [];
      cache.forEach(function(value, key) {
        keys.push(key);
      });
      assert.deepEqual(keys, [ 'y', 'z', 'x' ]);
    });

    it('should call with cache as third argument', function() {
      cache.forEach(function(value, key, collection) {
        assert.equal(collection, cache);
      });
    });

    it('should call with this = thisArg', function() {
      const thisArg = {};
      cache.forEach(function() {
        assert.equal(this, thisArg);
      }, thisArg);
    });

    it('should call with this = undefined if no thisArg', function() {
      cache.forEach(function() {
        assert.equal(this, undefined);
      });
    });

  });


  describe('set existing key', function() {

    before(function() {
      cache
       .set('x', '<x>')
       .set('z', '<z>');
    });

    it('should not change size', function() {
      assert.equal(cache.size, 3);
    });

    it('should not change cost', function() {
      assert.equal(cache.cost, 3);
    });

    it('should make last change the most recent entry', function() {
      const entries = arrayFrom( cache );
      assert.deepEqual(entries, [ [ 'z', '<z>' ], [ 'x', '<x>' ], [ 'y', 'YYY' ] ]);
    });

    it('should return new key value when asked for', function() {
      assert.equal(cache.get('x'), '<x>');
    });


    describe('delete non-existing key', function() {

      let returnValue;

      before(function() {
        cache.get('x');
        cache.get('z');
        returnValue = cache.delete('a');
      });

      it('should return true', function() {
        assert.equal(returnValue, false);
      });

      it('should not change size', function() {
        assert.equal(cache.size, 3);
      });

      it('should not change cost', function() {
        assert.equal(cache.cost, 3);
      });

      it('should keep all the same keys', function() {
        const entries = arrayFrom( cache.keys() );
        assert.deepEqual(entries, [ 'z', 'x', 'y' ]);
      });

    });


    describe('delete existing key', function() {

      let returnValue;

      before(function() {
        cache.get('x');
        cache.get('y'); // move to head to list to test conditional when removing
        returnValue = cache.delete('y');
      });

      it('should return true', function() {
        assert.equal(returnValue, true);
      });

      it('should change size', function() {
        assert.equal(cache.size, 2);
      });

      it('should change cost', function() {
        assert.equal(cache.cost, 2);
      });

      it('should not return key when iterating', function() {
        const entries = arrayFrom( cache );
        assert.deepEqual(entries, [ [ 'x', '<x>' ], [ 'z', '<z>' ] ]);
      });

      it('should return undefined for key', function() {
        assert.equal(cache.get('y'), undefined);
      });

      it('should return existing key value when asked for', function() {
        assert.equal(cache.get('x'), '<x>');
      });

    });


    describe('clear cache', function() {
      before(function() {
        cache.clear();
      });

      it('should reset size', function() {
        assert.equal(cache.size, 0);
      });

      it('should reset cost', function() {
        assert.equal(cache.cost, 0);
      });

      it('should have no keys', function() {
        assert.equal(cache.has('x'), false);
        assert.equal(cache.has('y'), false);
        assert.equal(cache.has('z'), false);
      });

      it('should have no values', function() {
        assert.equal(cache.get('x'), undefined);
        assert.equal(cache.get('y'), undefined);
        assert.equal(cache.get('z'), undefined);
      });

      it('should have no keys to iterate over', function() {
        const keys = arrayFrom( cache.keys() );
        assert.deepEqual(keys, []);
      });

      it('should have no entries to iterate over', function() {
        const entries = arrayFrom( cache );
        assert.deepEqual(entries, []);
      });

    });
  });

});


describe('Cache with limit of five', function() {

  let cache;

  before(function() {
    cache = new Cache(5);
  });

  it('should report a limit of five', function() {
    assert.equal(cache.limit, 5);
  });


  describe('after adding six keys', function() {

    before(function() {
      cache
        .set('a', 1)
        .set('b', 2)
        .set('c', 3)
        .set('d', 4)
        .set('x', '!')
        .set('e', 5)
        .set('f', 6);
      cache.delete('x'); // exercise some linked list logic
      cache.set('g', 7);
    });

    it('should have size of 5', function() {
      assert.equal(cache.size, 5);
    });

    it('should have cost of 5', function() {
      assert.equal(cache.cost, 5);
    });

    it('should not have first key', function() {
      assert.equal(cache.has('a'), false);
    });

    it('should not have second key', function() {
      // Dropped to make room for g
      assert.equal(cache.has('b'), false);
    });

    it('should have third key', function() {
      assert.equal(cache.has('c'), true);
    });

    it('should have seventh key', function() {
      assert.equal(cache.has('g'), true);
    });

    it('should have five entries to iterate over', function() {
      const entries = arrayFrom( cache );
      assert.deepEqual(entries, [ [ 'g', 7 ], [ 'f', 6 ], [ 'e', 5 ], [ 'd', 4 ], [ 'c', 3 ] ]);
    });


    describe('set key with cost 3', function() {

      before(function() {
        cache.set('h', 8, { cost: 3 });
      });

      it('should have size of 3', function() {
        assert.equal(cache.size, 3);
      });

      it('should still have cost of 5', function() {
        assert.equal(cache.cost, 5);
      });

      it('should drop two oldest keys', function() {
        assert.equal(cache.has('c'), false);
        assert.equal(cache.has('d'), false);
      });

      it('should have five entries to iterate over', function() {
        const entries = arrayFrom( cache );
        assert.deepEqual(entries, [ [ 'h', 8 ], [ 'g', 7 ], [ 'f', 6 ] ]);
      });


      describe('set key with cost 8', function() {

        before(function() {
          cache.set('i', 9, { cost: 8 });
        });

        it('should have size of 3', function() {
          assert.equal(cache.size, 3);
        });

        it('should still have cost of 5', function() {
          assert.equal(cache.cost, 5);
        });

        it('should not add new key', function() {
          assert.equal(cache.has('i'), false);
        });

        it('should keep all the same entries', function() {
          const entries = arrayFrom( cache );
          assert.deepEqual(entries, [ [ 'h', 8 ], [ 'g', 7 ], [ 'f', 6 ] ]);
        });
      });


      describe('set another key with cost 3', function() {

        before(function() {
          cache.set('j', 10, { cost: 3 });
        });

        it('should have size of 1', function() {
          assert.equal(cache.size, 1);
        });

        it('should drop cost to 3', function() {
          assert.equal(cache.cost, 3);
        });

        it('should add new key', function() {
          assert.equal(cache.has('j'), true);
        });

        it('should drop all other keys', function() {
          const keys = arrayFrom( cache.keys() );
          assert.deepEqual(keys, [ 'j' ]);
        });

      });

    });

  });

});


describe('Cache with no limit', function() {

  let cache;

  before(function() {
    cache = new Cache();
  });

  it('should report a limit of Infinity', function() {
    assert.equal(cache.limit, Infinity);
  });


  describe('after setting two large keys', function() {

    before(function() {
      cache
        .set('x', 'XXX', { cost: Number.MAX_SAFE_INTEGER })
        .set('y', 'YYY', { cost: Number.MAX_SAFE_INTEGER });
    });

    it('should have size of 2', function() {
      assert.equal(cache.size, 2);
    });

    it('should have cost double large', function() {
      assert.equal(cache.cost, Number.MAX_SAFE_INTEGER * 2);
    });

    it('should still have both keys', function() {
      assert.equal(cache.get('x'), 'XXX');
      assert.equal(cache.get('y'), 'YYY');
    });

    it('should have both entries', function() {
      const entries = arrayFrom( cache );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'x', 'XXX' ] ]);
    });

  });

});


describe('Iterate and delete', function() {

  let cache;
  let keys;

  before(function() {
    cache   = new Cache();
    cache.set('x').set('y').set('z');

    keys  = [];
    for (let key of cache.keys()) {
      keys.push(key);
      cache.delete(key);
    }
  });

  it('should iterate over all keys from most to least recent', function() {
    assert.deepEqual(keys, [ 'z', 'y', 'x' ]);
  });

  it('should delete all keys', function() {
    const nextKey = cache.keys().next();
    assert( !nextKey.value && nextKey.done );
  });

  it('should have size of 0', function() {
    assert.equal(cache.size, 0);
  });

  it('should have cost of 0', function() {
    assert.equal(cache.cost, 0);
  });

});


describe('Cache with expiring entries', function() {

  let cache;

  before(function() {
    cache = new Cache(4);
    // `a` expires immediately, never gets stored
    cache
      .set('a', 1, { ttl: 0 })
      .set('b', 2, { ttl: 50 })
      .set('c', 3, { ttl: 10 })
      .set('d', 4);
  });

  before(function(done) {
    // This will expire `c`
    setTimeout(done, 10);
  });

  it('should not store immediately expired keys', function() {
    assert.equal(cache.size, 3);
  });


  describe('expired key', function() {

    it('should not have key', function() {
      assert.equal(cache.has('a'), false);
    });

    it('should not have value', function() {
      assert.equal(cache.get('a'), undefined);
    });

  });

  describe('not yet expired key', function() {

    it('should have key', function() {
      assert.equal(cache.has('b'), true);
    });

    it('should have value', function() {
      assert.equal(cache.get('b'), 2);
    });

  });


  describe('iterators', function() {

    before(function() {
      assert.equal(cache.size, 3);
    });

    it('should skip expired keys', function() {
      const keys = arrayFrom( cache.keys() );
      assert.deepEqual(keys, [ 'b', 'd' ]);
    });

    it('should skip expired values', function() {
      const values = arrayFrom( cache.values() );
      assert.deepEqual(values, [ 2, 4 ]);
    });

    it('should skip expired entries', function() {
      const entries = arrayFrom( cache.entries() );
      assert.deepEqual(entries, [ [ 'b', 2 ], [ 'd', 4 ] ]);
    });

    it('should not forEach over expired entries', function() {
      const keys = [];
      cache.forEach(function(value, key) {
        keys.push(key);
      });
      assert.deepEqual(keys, [ 'b', 'd' ]);
    });

    it('should also discard expired keys', function() {
      assert.equal(cache.size, 2);
    });

  });


  describe('set three keys', function() {

    before(function() {
      cache.get('d'); // enforce recent order
      cache
        .set('e', 5)
        .set('f', 6)
        .set('g', 7, { ttl: 0 });
    });

    it('should have a size 4', function() {
      assert.equal(cache.size, 4);
    });

    it('should have a cost 4', function() {
      assert.equal(cache.cost, 4);
    });

    it('should keep unexpired keys', function() {
      assert.equal(cache.has('b'), true);
      assert.equal(cache.has('d'), true);
    });

    it('should add new unexpired keys', function() {
      assert.equal(cache.has('e'), true);
      assert.equal(cache.has('f'), true);
    });

    it('should not add immediately expired keys', function() {
      assert.equal(cache.has('g'), false);
    });

    it('should iterate over recent entries', function() {
      const entries = arrayFrom( cache );
      assert.deepEqual(entries, [ [ 'f', 6 ], [ 'e', 5 ], [ 'd', 4 ], [ 'b', 2 ] ]);
    });

  });

});


describe('Clone Map', function() {

  let fromMap;

  before(function() {
    const map   = new Map([ [ 'a', 1 ], [ 'b', 2 ] ]);
    fromMap     = new Cache(2, map);
    fromMap.materialize = function() {};
  });

  it('should have the same keys as the source, but most to least recent', function() {
    const keys = arrayFrom( fromMap.keys() );
    assert.deepEqual(keys, [ 'b', 'a' ]);
  });

  it('should have the same values as the source, but most to least recent', function() {
    const values = arrayFrom( fromMap.values() );
    assert.deepEqual(values, [ 2, 1 ]);
  });

  it('should have same size as the source', function() {
    assert.equal(fromMap.size, 2);
  });

  it('should have same cost as the source', function() {
    assert.equal(fromMap.cost, 2);
  });


  describe('Clone cache', function() {

    let fromCache;

    before(function() {
      fromCache = new Cache(fromMap);
    });

    it('should have the same limit as the source', function() {
      assert.equal(fromCache.limit, 2);
    });

    it('should have same keys as the source, most to least recent', function() {
      const keys = arrayFrom( fromCache.keys() );
      assert.deepEqual(keys, [ 'b', 'a' ]);
    });

    it('should have same values as the source, most to least recent', function() {
      const values = arrayFrom( fromCache.values() );
      assert.deepEqual(values, [ 2, 1 ]);
    });

    it('should have same size as the source', function() {
      assert.equal(fromCache.size, 2);
    });

    it('should have same cost as the source', function() {
      assert.equal(fromCache.cost, 2);
    });

    it('should have same materialize function', function() {
      assert.equal(fromCache.materialize, fromMap.materialize);
    });
  });

});


describe('With materialize function', function() {

  let cache;
  let resolved;

  before(function() {
    cache = new Cache();
    cache.materialize = function(key) {
      const upper = key.toUpperCase();
      return `${upper}${upper}${upper}`;
    };
  });

  before(function() {
    resolved = cache.get('x');
    return resolved;
  });

  it('should resolve to materialized value', function() {
    return resolved
      .then(function(value) {
        assert.equal(value, 'XXX');
      });
  });

  it('should have size of 1', function() {
    assert.equal( cache.size, 1 );
  });

  it('should have cost of 1', function() {
    assert.equal( cache.size, 1 );
  });

  it('should have new key', function() {
    assert(cache.has('x'));
  });


  describe('get again', function() {
    it('should return same value', function() {
      const again = cache.get('x');
      assert.equal(again, resolved);
    });
  });


  describe('unable to resolve', function() {

    let rejected;

    before(function() {
      cache.clear();
      cache.materialize = function() {
        throw new Error('fail');
      };
      rejected = cache.get('y');
    });

    it('should reject the get', function() {
      return rejected.then(function() {
        throw new Error('Not expected to arrive here');
      }, function() {
        // Not an error
      });
    });

    it('should still have size of 0', function() {
      assert.equal( cache.size, 0 );
    });

    it('should still have cost of 0', function() {
      assert.equal( cache.size, 0 );
    });

    it('should not have new key', function() {
      assert.equal( cache.has('y'), false);
    });

  });


  describe('materialize and set', function() {

    let promise;

    before(function() {
      cache.clear();
      cache.materialize = function(key) {
        const lazy = Promise.resolve('ZZZ');
        lazy.then(function() {
          cache.set(key, lazy, { cost: 5 });
        });
        return lazy;
      };
      promise = cache.get('z');
    });

    it('should retrieve returned value', function() {
      return promise
        .then(function(value) {
          assert.equal(value, 'ZZZ');
        });
    });

    it('should have size of 1', function() {
      assert.equal( cache.size, 1 );
    });

    it('should have cost of 5', function() {
      assert.equal( cache.cost, 5 );
    });

    it('should have key', function() {
      assert( cache.get('z') );
    });

    it('should keep returning value', function() {
      return cache.get('z')
        .then(function(value) {
          assert.equal(value, 'ZZZ');
        });
    });

  });

});
