var assert = require('assert');
var request = require('supertest');

describe('Array', function() {
    describe('#indexOf()', function() {
        it('should return -1 when the value is not present', function() {
            assert.equal(-1, [1,2,3].indexOf(4));
        });
    });
});

let url = request('http://localhost:3000/api');
describe ('API',function() {
    describe("Unscored matches", function(done) {
        it('should return something no matter what', function() {
            url.get('/RE-VRC-12-1234/unscored/3')
                .expect(200)
                .end(function(err, response){
                    assert.ok(!err);
                    assert.ok(typeof response.body.result === 'number');
                    return done();
                });
        });
    });
});