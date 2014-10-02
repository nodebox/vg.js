// Basic shapes

'use strict';

var _ = require('lodash');

var geo = require('../util/geo');

var Color = require('../objects/color');
var Path = require('../objects/path');
var Point = require('../objects/point');
var Text = require('../objects/text');

var g = {};

g._rect = function (x, y, width, height) {
    var p = new Path();
    p.addRect(x, y, width, height);
    return p;
};

g.roundedRect = function (cx, cy, width, height, rx, ry) {
    var p = new Path();
    p.addRoundedRect(cx, cy, width, height, rx, ry);
    return p;
};

g._ellipse = function (x, y, width, height) {
    var p = new Path();
    p.addEllipse(x, y, width, height);
    return p;
};

g._line = function (x1, y1, x2, y2) {
    var p = new Path();
    p.addLine(x1, y1, x2, y2);
    return p;
};

g.quad = function (x1, y1, x2, y2, x3, y3, x4, y4) {
    var p = new Path();
    p.addQuad(x1, y1, x2, y2, x3, y3, x4, y4);
    return p;
};

g._arc = function (x, y, width, height, startAngle, degrees, arcType) {
    var p = new Path();
    p.addArc(x, y, width, height, startAngle, degrees, arcType);
    return p;
};

g.rect = function (position, width, height, roundness) {
    if (roundness === undefined || roundness === 0 || (roundness.x === 0 && roundness.y === 0)) {
        return g._rect(position.x - width / 2, position.y - height / 2, width, height);
    } else {
        if (typeof roundness === 'number') {
            return g.roundedRect(position.x - width / 2, position.y - height / 2, width, height, roundness, roundness);
        } else {
            return g.roundedRect(position.x - width / 2, position.y - height / 2, width, height, roundness.x, roundness.y);
        }
    }
};

g.ellipse = function (position, width, height) {
    return g._ellipse(position.x - width / 2, position.y - height / 2, width, height);
};

g.line = function (point1, point2, nPoints) {
    var line = g._line(point1.x, point1.y, point2.x, point2.y);
    line.fill = null;
    line.stroke = 'black';
    if (nPoints > 2) {
        line = line.resampleByAmount(nPoints, false);
    }
    return line;
};

g.lineAngle = function (point, angle, distance) {
    var point2 = geo.coordinates(point.x, point.y, distance, angle);
    return g.line(point, point2);
};

g.arc = function (position, width, height, startAngle, degrees, arcType) {
    return g._arc(position.x, position.y, width, height, startAngle, degrees, arcType);
};

g.quadCurve = function (pt1, pt2, t, distance) {
    t /= 100.0;
    var cx = pt1.x + t * (pt2.x - pt1.x),
        cy = pt1.y + t * (pt2.y - pt1.y),
        a = geo.angle(pt1.x, pt1.y, pt2.x, pt2.y) + 90,
        q = geo.coordinates(cx, cy, distance, a),
        qx = q.x,
        qy = q.y,

        c1x = pt1.x + 2 / 3.0 * (qx - pt1.x),
        c1y = pt1.y + 2 / 3.0 * (qy - pt1.y),
        c2x = pt2.x + 2 / 3.0 * (qx - pt2.x),
        c2y = pt2.y + 2 / 3.0 * (qy - pt2.y);

    var p = new Path();
    p.moveTo(pt1.x, pt1.y);
    p.curveTo(c1x, c1y, c2x, c2y, pt2.x, pt2.y);
    p.fill = null;
    p.stroke = Color.BLACK;
    return p;
};

g.polygon = function (position, radius, sides, align) {
    sides = Math.max(sides, 3);
    var c0, c1, i, c,
        x = position.x,
        y = position.y,
        r = radius,
        a = 360.0 / sides,
        da = 0;
    if (align === true) {
        c0 = geo.coordinates(x, y, r, 0);
        c1 = geo.coordinates(x, y, r, a);
        da = -geo.angle(c1.x, c1.y, c0.x, c0.y);
    }
    var p = new Path();
    for (i = 0; i < sides; i += 1) {
        c = geo.coordinates(x, y, r, (a * i) + da);
        if (i === 0) {
            p.moveTo(c.x, c.y);
        } else {
            p.lineTo(c.x, c.y);
        }
    }
    p.close();
    return p;
};

g.star = function (position, points, outer, inner) {
    var i, angle, radius, x, y;
    var p = new Path();
    p.moveTo(position.x, position.y + outer / 2);
    // Calculate the points of the star.
    for (i = 1; i < points * 2; i += 1) {
        angle = i * Math.PI / points;
        radius = (i % 2 === 1) ? inner / 2 : outer / 2;
        x = position.x + radius * Math.sin(angle);
        y = position.y + radius * Math.cos(angle);
        p.lineTo(x, y);
    }
    p.close();
    return p;
};

g.freehand = function (pathString) {
    var i, j, values,
        nonEmpty = function (s) { return s !== ''; },
        contours = _.filter(pathString.split('M'), nonEmpty);

    contours = _.map(contours, function (c) { return c.replace(/,/g, ' '); });
    var p = new Path();
    for (j = 0; j < contours.length; j += 1) {
        values = _.filter(contours[j].split(' '), nonEmpty);
        for (i = 0; i < values.length; i += 2) {
            if (values[i + 1] !== undefined) {
                var x = parseFloat(values[i]);
                var y = parseFloat(values[i + 1]);
                if (i === 0) {
                    p.moveTo(x, y);
                } else {
                    p.lineTo(x, y);
                }
            }
        }
    }
    p.fill = null;
    p.stroke = Color.BLACK;
    return p;
};

// Create a grid of points.
g.grid = function (columns, rows, width, height, position) {
    var columnSize, left, rowSize, top, rowIndex, colIndex, x, y, i,
        points = [];
    points.length = columns * rows;
    position = position !== undefined ? position : Point.ZERO;
    if (columns > 1) {
        columnSize = width / (columns - 1);
        left = position.x - width / 2;
    } else {
        columnSize = left = position.x;
    }
    if (rows > 1) {
        rowSize = height / (rows - 1);
        top = position.y - height / 2;
    } else {
        rowSize = top = position.y;
    }

    i = 0;
    for (rowIndex = 0; rowIndex < rows; rowIndex += 1) {
        for (colIndex = 0; colIndex < columns; colIndex += 1) {
            x = left + colIndex * columnSize;
            y = top + rowIndex * rowSize;
            points[i] = new Point(x, y);
            i += 1;
        }
    }
    return points;
};

// Generates a Text object.
// The function can take many possible argument forms, either by listing them in order
// (text, x, y, fontFamily, fontSize, align, fill), or by using an options object.
// The position can be specified as x, y; using a point {x: 10, y: 20} or using an array [10, 20].
// Here are a couple of ways to generate 'Hello' at position 0, 0 in 12pt Helvetica, centered.
//
//     g.text('Hello', {x: 0, y: 0}, 'Helvetica', 12, 'center');
//     g.text('Hello', [0, 0], {fontFamily: 'Helvetica', fontSize: 12, align: 'center'});
//     g.text('Hello', 0, 0, {fontFamily: 'Helvetica', fontSize: 12});  // align: center is the default.
//     g.text('Hello', {fontFamily: 'Helvetica', fontSize: 12}); // the position defaults to 0,0.
g.text = function () {
    var t = Object.create(Text.prototype);
    t.constructor = Text.prototype;
    Text.apply(t, arguments);
    return t;
};

g.demoRect = function () {
    return new g.rect({x: 0, y: 0}, 100, 100, {x: 0, y: 0});
};

g.demoEllipse = function () {
    return new g.ellipse({x: 0, y: 0}, 100, 100);
};

module.exports = g;
