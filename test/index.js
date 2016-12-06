var expect = require('expect.js'),
    exchangeMirror = require('..');

describe('exchange-mirror', function() {
  it('should say hello', function(done) {
    expect(exchangeMirror()).to.equal('Hello, world');
    done();
  });
});
