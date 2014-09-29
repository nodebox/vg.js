// 2-dimensional transformation matrix

'use strict';

var _ = require('underscore');

var g = {};

// A geometric transformation in Euclidean space (i.e. 2D)
// that preserves collinearity and ratio of distance between points.
// Linear transformations include rotation, translation, scaling, shear.
g.Transform = g.Matrix3 = function (m) {
    if (m !== undefined) {
        this.m = m;
    } else {
        this.m = [1, 0, 0, 0, 1, 0, 0, 0, 1]; // Identity matrix.
    }
};

g.Transform.IDENTITY = new g.Transform();

g.Transform.identity = function () {
    return new g.Transform();
};

// Returns the 3x3 matrix multiplication of A and B.
// Note that scale(), translate(), rotate() work with premultiplication,
// e.g. the matrix A followed by B = BA and not AB.
g.Transform._mmult = function (a, b) {
    if (a.m !== undefined) { a = a.m; }
    if (b.m !== undefined) { b = b.m; }

    return new g.Transform([
        a[0] * b[0] + a[1] * b[3],
        a[0] * b[1] + a[1] * b[4], 0,
        a[3] * b[0] + a[4] * b[3],
        a[3] * b[1] + a[4] * b[4], 0,
        a[6] * b[0] + a[7] * b[3] + b[6],
        a[6] * b[1] + a[7] * b[4] + b[7], 1
    ]);
};

g.Transform.prototype.prepend = function (matrix) {
    return g.Transform._mmult(this.m, matrix.m);
};

g.Transform.prototype.append = function (matrix) {
    return g.Transform._mmult(matrix.m, this.m);
};

g.Transform.prototype.inverse = function () {
    var m = this.m,
        d = m[0] * m[4] - m[1] * m[3];
    return new g.Transform([
        m[4] / d,
        -m[1] / d, 0,
        -m[3] / d,
        m[0] / d, 0,
        (m[3] * m[7] - m[4] * m[6]) / d,
        -(m[0] * m[7] - m[1] * m[6]) / d, 1
    ]);
};

g.Transform.prototype.scale = function (x, y) {
    if (y === undefined) { y = x; }
    return g.Transform._mmult([x, 0, 0, 0, y, 0, 0, 0, 1], this.m);
};

g.Transform.prototype.translate = function (x, y) {
    return g.Transform._mmult([1, 0, 0, 0, 1, 0, x, y, 1], this.m);
};

g.Transform.prototype.rotate = function (angle) {
    var c = Math.cos(g.math.radians(angle)),
        s = Math.sin(g.math.radians(angle));
    return g.Transform._mmult([c, s, 0, -s, c, 0, 0, 0, 1], this.m);
};

g.Transform.prototype.skew = function (x, y) {
    var kx = Math.PI * x / 180.0,
        ky = Math.PI * y / 180.0;
    return g.Transform._mmult([1, Math.tan(ky), 0, -Math.tan(kx), 1, 0, 0, 0, 1], this.m);
};

// Returns the new coordinates of the given point (x,y) after transformation.
g.Transform.prototype.transformPoint = function (point) {
    var x = point.x,
        y = point.y,
        m = this.m;
    return new g.Point(
        x * m[0] + y * m[3] + m[6],
        x * m[1] + y * m[4] + m[7]
    );
};

g.Transform.prototype.transformPath = function (path) {
    var _this = this,
        point,
        ctrl1,
        ctrl2,
        commands = _.map(path.commands, function (cmd) {
            if (cmd.type === g.MOVETO) {
                point = _this.transformPoint({x: cmd.x, y: cmd.y});
                return { type: g.MOVETO, x: point.x, y: point.y };
            } else if (cmd.type === g.LINETO) {
                point = _this.transformPoint({x: cmd.x, y: cmd.y});
                return { type: g.LINETO, x: point.x, y: point.y };
            } else if (cmd.type === g.CURVETO) {
                point = _this.transformPoint({x: cmd.x, y: cmd.y});
                ctrl1 = _this.transformPoint({x: cmd.x1, y: cmd.y1});
                ctrl2 = _this.transformPoint({x: cmd.x2, y: cmd.y2});
                return { type: g.CURVETO, x1: ctrl1.x, y1: ctrl1.y, x2: ctrl2.x, y2: ctrl2.y, x: point.x, y: point.y };
            } else {
                return cmd;
            }
        });
    return g.makePath(commands, path.fill, path.stroke, path.strokeWidth);
};

g.Transform.prototype.transformText = function (text) {
    var t = text.clone();
    t.transform = this.append(t.transform);
    return t;
};

g.Transform.prototype.transformGroup = function (group) {
    var _this = this,
        shapes = _.map(group.shapes, function (shape) {
            return _this.transformShape(shape);
        });
    return g.makeGroup(shapes);
};

g.Transform.prototype.transformShape = function (shape) {
    var fn;
    if (shape.shapes) {
        fn = this.transformGroup;
    } else if (shape.text) {
        fn = this.transformText;
    } else {
        fn = this.transformPath;
    }
    return fn.call(this, shape);
};

module.exports = g;