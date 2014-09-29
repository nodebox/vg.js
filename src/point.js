// 2-dimensional point object.

'use strict';

var g = {};

g.Point = function (x, y) {
    this.x = x !== undefined ? x : 0;
    this.y = y !== undefined ? y : 0;
};

g.Vec2 = g.Point;

Object.defineProperty(g.Point.prototype, 'xy', {
    get: function () { return [this.x, this.y]; }
});

g.Point.ZERO = new g.Point(0, 0);

g.Point.prototype.clone = function () {
    return new g.Point(this.x, this.y);
};

g.Point.prototype.add = function (v) {
    return new g.Point(this.x + v.x, this.y + v.y);
};

g.Point.prototype.subtract = g.Point.prototype.sub = function (v) {
    return new g.Point(this.x - v.x, this.y - v.y);
};

g.Point.prototype.divide = function (n) {
    return new g.Point(this.x / n, this.y / n);
};

g.Point.prototype.multiply = function (n) {
    return new g.Point(this.x * n, this.y * n);
};

g.Point.prototype.magnitude = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

g.Point.prototype.magnitudeSquared = function () {
    return this.x * this.x + this.y * this.y;
};

g.Point.prototype.heading = function () {
    return Math.atan2(this.y, this.x);
};

g.Point.prototype.distanceTo = function (v) {
    var dx = this.x - v.x,
        dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
};

g.Point.prototype.normalize = function () {
    var m = this.magnitude();
    if (m !== 0) {
        return this.divide(m);
    } else {
        return g.Point.ZERO;
    }
};

g.Point.prototype.limit = function (speed) {
    if (this.magnitudeSquared() > speed * speed) {
        return this.normalize().multiply(speed);
    }
    return this;
};

g.Point.prototype.translate = function (tx, ty) {
    return new g.Point(this.x + tx, this.y + ty);
};

g.Point.prototype.scale = function (sx, sy) {
    sy = sy !== undefined ? sy : sx;
    return new g.Point(this.x * sx, this.y * sy);
};

g.Point.prototype.toString = function () {
    return '[' + this.x + ', ' + this.y + ']';
};

module.exports = g;