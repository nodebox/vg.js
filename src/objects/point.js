// 2-dimensional point object.

'use strict';

var Point = function (x, y) {
    this.x = x !== undefined ? x : 0;
    this.y = y !== undefined ? y : 0;
};

Object.defineProperty(Point.prototype, 'xy', {
    get: function () { return [this.x, this.y]; }
});

Point.ZERO = new Point(0, 0);

Point.prototype.clone = function () {
    return new Point(this.x, this.y);
};

Point.prototype.add = function (v) {
    return new Point(this.x + v.x, this.y + v.y);
};

Point.prototype.subtract = Point.prototype.sub = function (v) {
    return new Point(this.x - v.x, this.y - v.y);
};

Point.prototype.divide = function (n) {
    return new Point(this.x / n, this.y / n);
};

Point.prototype.multiply = function (n) {
    return new Point(this.x * n, this.y * n);
};

Point.prototype.magnitude = function () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point.prototype.magnitudeSquared = function () {
    return this.x * this.x + this.y * this.y;
};

Point.prototype.heading = function () {
    return Math.atan2(this.y, this.x);
};

Point.prototype.distanceTo = function (v) {
    var dx = this.x - v.x,
        dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
};

Point.prototype.normalize = function () {
    var m = this.magnitude();
    if (m !== 0) {
        return this.divide(m);
    } else {
        return Point.ZERO;
    }
};

Point.prototype.limit = function (speed) {
    if (this.magnitudeSquared() > speed * speed) {
        return this.normalize().multiply(speed);
    }
    return this;
};

Point.prototype.translate = function (tx, ty) {
    return new Point(this.x + tx, this.y + ty);
};

Point.prototype.scale = function (sx, sy) {
    sy = sy !== undefined ? sy : sx;
    return new Point(this.x * sx, this.y * sy);
};

Point.prototype.toString = function () {
    return '[' + this.x + ', ' + this.y + ']';
};

module.exports = Point;