// Shape group object

'use strict';

var _ = require('underscore');

var Path = require('./path').Path;
var Rect = require('./rect').Rect;

var g = {};

g.Group = function (shapes) {
    if (!shapes) {
        this.shapes = [];
    } else if (shapes.shapes || shapes.commands) {
        this.shapes = [shapes];
    } else if (shapes) {
        this.shapes = shapes;
    }
};

g.Group.prototype.add = function (shape) {
    this.shapes.push(shape);
};

g.Group.prototype.clone = function () {
    var newShapes = [],
        n = this.shapes.length,
        i;
    newShapes.length = n;
    for (i = 0; i < n; i += 1) {
        newShapes[i] = this.shapes[i].clone();
    }
    return new g.Group(newShapes);
};

g.Group.prototype.colorize = function (fill, stroke, strokeWidth) {
    var shapes = _.map(this.shapes, function (shape) {
        return shape.colorize(fill, stroke, strokeWidth);
    });
    return new g.Group(shapes);
};

g.Group.prototype.bounds = function () {
    if (this.shapes.length === 0) { return new Rect(0, 0, 0, 0); }
    var i, r, shape,
        shapes = this.shapes;
    for (i = 0; i < shapes.length; i += 1) {
        shape = shapes[i];
        if (r === undefined) {
            r = shape.bounds();
        }
        if ((shape.shapes && shape.shapes.length !== 0) ||
                (shape.commands && shape.commands.length !== 0)) {
            r = r.unite(shape.bounds());
        }
    }
    return (r !== undefined) ? r : new Rect(0, 0, 0, 0);
};

// Returns true when point (x,y) falls within the contours of the group.
g.Group.prototype.contains = function (x, y, precision) {
    if (precision === undefined) { precision = 100; }
    var i, shapes = this.shapes;
    for (i = 0; i < shapes.length; i += 1) {
        if (shapes[i].contains(x, y, precision)) {
            return true;
        }
    }
    return false;
};

g.Group.prototype.resampleByAmount = function (points, perContour) {
    var path, shapes;
    if (!perContour) {
        path = new Path(g.combinePaths(this));
        return path.resampleByAmount(points, perContour);
    }

    shapes = _.map(this.shapes, function (shape) {
        return shape.resampleByAmount(points, perContour);
    });
    return new g.Group(shapes);
};

g.Group.prototype.resampleByLength = function (length) {
    var shapes = _.map(this.shapes, function (shape) {
        return shape.resampleByLength(length);
    });
    return new g.Group(shapes);
};

g.Group.prototype.toSVG = function () {
    var l;
    l = _.map(this.shapes, function (shape) {
        return shape.toSVG();
    });
    return '<g>' + l.join('') + '</g>';
};

// Draw the group to a 2D context.
g.Group.prototype.draw = function (ctx) {
    var i, shapes = this.shapes, nShapes = shapes.length;
    for (i = 0; i < nShapes; i += 1) {
        shapes[i].draw(ctx);
    }
};

g.make = g.group = function (shapes) {
    return new g.Group(shapes);
};