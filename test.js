/* eslint-env mocha */
'use strict';
const assert  = require('assert');
const LRU     = require('./index');


// Until we get Array.from(iterator) or [...iterator]
function arrayFrom(iterator) {
  const array = [];
  for (let item of iterator)
    array.push(item);
  return array;
}


describe('LRU with limit of zero', function() {

  const lru = new LRU(0);

  it('should report a limit of zero', function() {
    assert.equal(lru.limit, 0);
  });

  it('should report a cost of zero', function() {
    assert.equal(lru.cost, 0);
  });

  it('should report a size of zero', function() {
    assert.equal(lru.size, 0);
  });


  describe('after setting two keys', function() {

    before(function() {
      lru
        .set('x', 'XXX')
        .set('y', 'YYY');
    });

    it('should have a size of zero', function() {
      assert.equal(lru.size, 0);
    });

    it('should report a cost of zero', function() {
      assert.equal(lru.cost, 0);
    });

    it('should have neither of these keys', function() {
      assert.equal(lru.get('x'), undefined);
      assert.equal(lru.get('y'), undefined);
    });

    it('should have no entries', function() {
      assert.deepEqual(lru.entries().next(), { done: true, value: undefined });
    });

  });

});


describe('LRU with negative limit', function() {
  const lru = new LRU(-10);

  it('should report a limit of zero', function() {
    assert.equal(lru.limit, 0);
  });

  it('should report a cost of zero', function() {
    assert.equal(lru.cost, 0);
  });

  it('should report a size of zero', function() {
    assert.equal(lru.size, 0);
  });

});


describe('LRU with three keys', function() {

  const lru = new LRU();

  before(function() {
    lru
      .set('x', 'XXX')
      .set('y', 'YYY')
      .set('z', 'ZZZ');
  });

  it('should have a size of three', function() {
    assert.equal(lru.size, 3);
  });

  it('should have a cost of three', function() {
    assert.equal(lru.cost, 3);
  });


  describe('get', function() {

    it('should return value of key', function() {
      assert.equal(lru.get('x'), 'XXX');
      assert.equal(lru.get('y'), 'YYY');
      assert.equal(lru.get('z'), 'ZZZ');
    });

    it('should return undefined if key does not exist', function() {
      assert.equal(lru.get('X'), undefined);
      assert.equal(lru.get('a'), undefined);
      assert.equal(lru.get(null), undefined);
    });

  });

  describe('has', function() {

    it('should return true if key exists', function() {
      assert.equal(lru.has('x'), true);
      assert.equal(lru.has('y'), true);
      assert.equal(lru.has('z'), true);
    });

    it('should return false if key does not exist', function() {
      assert.equal(lru.has('X'), false);
      assert.equal(lru.has('a'), false);
      assert.equal(lru.has(null), false);
    });

  });

  describe('iterators', function() {

    before(function() {
      // This sets the LRU order to y -> z -> x
      lru.get('z');
      lru.get('y');
    });

    it('should iterate from most to least recent', function() {
      const entries = arrayFrom( lru[Symbol.iterator]() );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'z', 'ZZZ' ], [ 'x', 'XXX' ] ]);
    });

    it('should return all entries from most to least recent', function() {
      const entries = arrayFrom( lru.entries() );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'z', 'ZZZ' ], [ 'x', 'XXX' ] ]);
    });

    it('should return all keys from most to least recent', function() {
      const keys = arrayFrom( lru.keys() );
      assert.deepEqual(keys, [ 'y', 'z', 'x' ]);
    });

    it('should return all values from most to least recent', function() {
      const values = arrayFrom( lru.values() );
      assert.deepEqual(values, [ 'YYY', 'ZZZ', 'XXX' ]);
    });

  });

  describe('forEach', function() {

    before(function() {
      // This sets the LRU order to y -> z -> x
      lru.get('z');
      lru.get('y');
    });

    it('should call with value as first argument (most to least recent)', function() {
      const values = [];
      lru.forEach(function(value) {
        values.push(value);
      });
      assert.deepEqual(values, [ 'YYY', 'ZZZ', 'XXX' ]);
    });

    it('should call with key as second argument (most to least recent)', function() {
      const keys = [];
      lru.forEach(function(value, key) {
        keys.push(key);
      });
      assert.deepEqual(keys, [ 'y', 'z', 'x' ]);
    });

    it('should call with LRU as third argument', function() {
      lru.forEach(function(value, key, collection) {
        assert.equal(collection, lru);
      });
    });

    it('should call with this = thisArg', function() {
      const thisArg = {};
      lru.forEach(function() {
        assert.equal(this, thisArg);
      }, thisArg);
    });

    it('should call with this = undefined if no thisArg', function() {
      lru.forEach(function() {
        assert.equal(this, undefined);
      });
    });

  });


  describe('set existing key', function() {

    before(function() {
      lru
       .set('x', '<x>')
       .set('z', '<z>');
    });

    it('should not change size', function() {
      assert.equal(lru.size, 3);
    });

    it('should not change cost', function() {
      assert.equal(lru.cost, 3);
    });

    it('should make last change the most recent entry', function() {
      const entries = arrayFrom( lru );
      assert.deepEqual(entries, [ [ 'z', '<z>' ], [ 'x', '<x>' ], [ 'y', 'YYY' ] ]);
    });

    it('should return new key value when asked for', function() {
      assert.equal(lru.get('x'), '<x>');
    });


    describe('delete non-existing key', function() {

      let returnValue;

      before(function() {
        lru.get('x');
        lru.get('z');
        returnValue = lru.delete('a');
      });

      it('should return true', function() {
        assert.equal(returnValue, false);
      });

      it('should not change size', function() {
        assert.equal(lru.size, 3);
      });

      it('should not change cost', function() {
        assert.equal(lru.cost, 3);
      });

      it('should keep all the same keys', function() {
        const entries = arrayFrom( lru.keys() );
        assert.deepEqual(entries, [ 'z', 'x', 'y' ]);
      });

    });


    describe('delete existing key', function() {

      let returnValue;

      before(function() {
        lru.get('x');
        lru.get('y'); // move to head to list to test conditional when removing
        returnValue = lru.delete('y');
      });

      it('should return true', function() {
        assert.equal(returnValue, true);
      });

      it('should change size', function() {
        assert.equal(lru.size, 2);
      });

      it('should change cost', function() {
        assert.equal(lru.cost, 2);
      });

      it('should not return key when iterating', function() {
        const entries = arrayFrom( lru );
        assert.deepEqual(entries, [ [ 'x', '<x>' ], [ 'z', '<z>' ] ]);
      });

      it('should return undefined for key', function() {
        assert.equal(lru.get('y'), undefined);
      });

      it('should return existing key value when asked for', function() {
        assert.equal(lru.get('x'), '<x>');
      });

    });


    describe('clear map', function() {
      before(function() {
        lru.clear();
      });

      it('should reset size', function() {
        assert.equal(lru.size, 0);
      });

      it('should reset cost', function() {
        assert.equal(lru.cost, 0);
      });

      it('should have no keys', function() {
        assert.equal(lru.has('x'), false);
        assert.equal(lru.has('y'), false);
        assert.equal(lru.has('z'), false);
      });

      it('should have no values', function() {
        assert.equal(lru.get('x'), undefined);
        assert.equal(lru.get('y'), undefined);
        assert.equal(lru.get('z'), undefined);
      });

      it('should have no keys to iterate over', function() {
        const keys = arrayFrom( lru.keys() );
        assert.deepEqual(keys, []);
      });

      it('should have no entries to iterate over', function() {
        const entries = arrayFrom( lru );
        assert.deepEqual(entries, []);
      });

    });
  });

});


describe('LRU with limit of five', function() {

  const lru = new LRU(5);

  it('should report a limit of five', function() {
    assert.equal(lru.limit, 5);
  });


  describe('after adding six keys', function() {

    before(function() {
      lru
        .set('a', 1)
        .set('b', 2)
        .set('c', 3)
        .set('d', 4)
        .set('x', '!')
        .set('e', 5)
        .set('f', 6);
      lru.delete('x'); // exercise some linked list logic
      lru.set('g', 7);
    });

    it('should have size of 5', function() {
      assert.equal(lru.size, 5);
    });

    it('should have cost of 5', function() {
      assert.equal(lru.cost, 5);
    });

    it('should not have first key', function() {
      assert.equal(lru.has('a'), false);
    });

    it('should not have second key', function() {
      // Dropped to make room for g
      assert.equal(lru.has('b'), false);
    });

    it('should have third key', function() {
      assert.equal(lru.has('c'), true);
    });

    it('should have seventh key', function() {
      assert.equal(lru.has('g'), true);
    });

    it('should have five entries to iterate over', function() {
      const entries = arrayFrom( lru );
      assert.deepEqual(entries, [ [ 'g', 7 ], [ 'f', 6 ], [ 'e', 5 ], [ 'd', 4 ], [ 'c', 3 ] ]);
    });


    describe('set key with cost 3', function() {

      before(function() {
        lru.set('h', 8, { cost: 3 });
      });

      it('should have size of 3', function() {
        assert.equal(lru.size, 3);
      });

      it('should still have cost of 5', function() {
        assert.equal(lru.cost, 5);
      });

      it('should drop two oldest keys', function() {
        assert.equal(lru.has('c'), false);
        assert.equal(lru.has('d'), false);
      });

      it('should have five entries to iterate over', function() {
        const entries = arrayFrom( lru );
        assert.deepEqual(entries, [ [ 'h', 8 ], [ 'g', 7 ], [ 'f', 6 ] ]);
      });


      describe('set key with cost 8', function() {

        before(function() {
          lru.set('i', 9, { cost: 8 });
        });

        it('should have size of 3', function() {
          assert.equal(lru.size, 3);
        });

        it('should still have cost of 5', function() {
          assert.equal(lru.cost, 5);
        });

        it('should not add new key', function() {
          assert.equal(lru.has('i'), false);
        });

        it('should keep all the same entries', function() {
          const entries = arrayFrom( lru );
          assert.deepEqual(entries, [ [ 'h', 8 ], [ 'g', 7 ], [ 'f', 6 ] ]);
        });
      });


      describe('set another key with cost 3', function() {

        before(function() {
          lru.set('j', 10, { cost: 3 });
        });

        it('should have size 1', function() {
          assert.equal(lru.size, 1);
        });

        it('should drop cost to 3', function() {
          assert.equal(lru.cost, 3);
        });

        it('should add new key', function() {
          assert.equal(lru.has('j'), true);
        });

        it('should drop all other keys', function() {
          const keys = arrayFrom( lru.keys() );
          assert.deepEqual(keys, [ 'j' ]);
        });

      });

    });

  });

});


describe('LRU with no limit', function() {

  const lru = new LRU();

  it('should report a limit of Infinity', function() {
    assert.equal(lru.limit, Infinity);
  });


  describe('after setting two large keys', function() {

    before(function() {
      lru
        .set('x', 'XXX', { cost: Number.MAX_SAFE_INTEGER })
        .set('y', 'YYY', { cost: Number.MAX_SAFE_INTEGER });
    });

    it('should have size of two', function() {
      assert.equal(lru.size, 2);
    });

    it('should have cost double large', function() {
      assert.equal(lru.cost, Number.MAX_SAFE_INTEGER * 2);
    });

    it('should still have both keys', function() {
      assert.equal(lru.get('x'), 'XXX');
      assert.equal(lru.get('y'), 'YYY');
    });

    it('should have both entries', function() {
      const entries = arrayFrom( lru );
      assert.deepEqual(entries, [ [ 'y', 'YYY' ], [ 'x', 'XXX' ] ]);
    });

  });

});


describe('Iterate and delete', function() {

  const lru   = new LRU();
  const keys  = [];

  before(function() {
    lru.set('x').set('y').set('z');

    for (let key of lru.keys()) {
      keys.push(key);
      lru.delete(key);
    }
  });

  it('should iterate over all keys from most to least recent', function() {
    assert.deepEqual(keys, [ 'z', 'y', 'x' ]);
  });

  it('should delete all keys', function() {
    const nextKey = lru.keys().next();
    assert( !nextKey.value && nextKey.done );
  });

  it('should have size 0', function() {
    assert.equal(lru.size, 0);
  });

  it('should have cost 0', function() {
    assert.equal(lru.cost, 0);
  });

});


describe('LRU with expiring entries', function() {

  const lru = new LRU(4);

  before(function() {
    // `a` expires immediately, never gets stored
    lru
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
    assert.equal(lru.size, 3);
  });


  describe('expired key', function() {

    it('should not have key', function() {
      assert.equal(lru.has('a'), false);
    });

    it('should not have value', function() {
      assert.equal(lru.get('a'), undefined);
    });

  });

  describe('not yet expired key', function() {

    it('should have key', function() {
      assert.equal(lru.has('b'), true);
    });

    it('should have value', function() {
      assert.equal(lru.get('b'), 2);
    });

  });


  describe('iterators', function() {

    before(function() {
      assert.equal(lru.size, 3);
    });

    it('should skip expired keys', function() {
      const keys = arrayFrom( lru.keys() );
      assert.deepEqual(keys, [ 'b', 'd' ]);
    });

    it('should skip expired values', function() {
      const values = arrayFrom( lru.values() );
      assert.deepEqual(values, [ 2, 4 ]);
    });

    it('should skip expired entries', function() {
      const entries = arrayFrom( lru.entries() );
      assert.deepEqual(entries, [ [ 'b', 2 ], [ 'd', 4 ] ]);
    });

    it('should not forEach over expired entries', function() {
      const keys = [];
      lru.forEach(function(value, key) {
        keys.push(key);
      });
      assert.deepEqual(keys, [ 'b', 'd' ]);
    });

    it('should also discard expired keys', function() {
      assert.equal(lru.size, 2);
    });

  });


  describe('set three keys', function() {

    before(function() {
      lru.get('d'); // enforce recent order
      lru
        .set('e', 5)
        .set('f', 6)
        .set('g', 7, { ttl: 0 });
    });

    it('should have a size 4', function() {
      assert.equal(lru.size, 4);
    });

    it('should have a cost 4', function() {
      assert.equal(lru.cost, 4);
    });

    it('should keep unexpired keys', function() {
      assert.equal(lru.has('b'), true);
      assert.equal(lru.has('d'), true);
    });

    it('should add new unexpired keys', function() {
      assert.equal(lru.has('e'), true);
      assert.equal(lru.has('f'), true);
    });

    it('should not add immediately expired keys', function() {
      assert.equal(lru.has('g'), false);
    });

    it('should iterate over recent entries', function() {
      const entries = arrayFrom( lru );
      assert.deepEqual(entries, [ [ 'f', 6 ], [ 'e', 5 ], [ 'd', 4 ], [ 'b', 2 ] ]);
    });

  });

});


describe('Clone map', function() {

  const map     = new Map([ [ 'a', 1 ], [ 'b', 2 ] ]);
  const fromMap = new LRU(2, map);

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

    const fromCache = new LRU(fromMap);

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

  });

});


describe('Read-through get', function() {

  const lru = new LRU();

  describe('able to resolve', function() {

    let promise;

    before(function() {
      promise = lru.get('x', function() {
        return 'XXX';
      });
    });

    it('should resolve to read-through value', function(done) {
      promise
        .then(function(value) {
          assert.equal(value, 'XXX');
          done();
        })
        .catch(done);
    });

    describe('key', function() {

      it('should exist', function() {
        assert.equal( lru.has('x'), true);
      });

      it('should resolve to same value', function(done) {
        lru.get('x')
        .then(function(value) {
          assert.equal(value, 'XXX');
          done();
        })
        .catch(done);
      });

    });

  });

  describe('unable to resolve', function() {

    let promise;

    before(function() {
      promise = lru.get('y', function() {
        throw new Error('fail');
      });
    });

    it('should reject read-through', function(done) {
      promise
        .then(function() {
          done(new Error('Not expected to arrive here'));
        })
        .catch(function() {
          done();
        });
    });

    describe('key', function() {

      it('should not exist', function() {
        assert.equal( lru.has('y'), false);
        assert.equal( lru.get('y'), undefined);
      });

    });

  });

});
