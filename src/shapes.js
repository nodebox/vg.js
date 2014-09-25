// Basic shapes

'use strict';

var _ = require('underscore');

var geo = require('./geo');
var Color = require('./color').Color;
var path = require('./path');
var Path = path.Path;
var Point = require('./point').Point;

var g = {};

g._rect = function (x, y, width, height) {
    var commands = [
        path.moveTo(x, y),
        path.lineTo(x + width, y),
        path.lineTo(x + width, y + height),
        path.lineTo(x, y + height),
        g.close()
    ];
    return new Path(commands);
};

g.roundedRect = function (cx, cy, width, height, rx, ry) {
    var ONE_MINUS_QUARTER = 1.0 - 0.552,

        commands = [],

        dx = rx,
        dy = ry,

        left = cx,
        right = cx + width,
        top = cy,
        bottom = cy + height;

    // rx/ry cannot be greater than half of the width of the rectangle
    // (required by SVG spec)
    dx = Math.min(dx, width * 0.5);
    dy = Math.min(dy, height * 0.5);
    commands.push(path.moveTo(left + dx, top));
    if (dx < width * 0.5) {
        commands.push(path.lineTo(right - rx, top));
    }
    commands.push(path.curveTo(right - dx * ONE_MINUS_QUARTER, top, right, top + dy * ONE_MINUS_QUARTER, right, top + dy));
    if (dy < height * 0.5) {
        commands.push(path.lineTo(right, bottom - dy));
    }
    commands.push(path.curveTo(right, bottom - dy * ONE_MINUS_QUARTER, right - dx * ONE_MINUS_QUARTER, bottom, right - dx, bottom));
    if (dx < width * 0.5) {
        commands.push(path.lineTo(left + dx, bottom));
    }
    commands.push(path.curveTo(left + dx * ONE_MINUS_QUARTER, bottom, left, bottom - dy * ONE_MINUS_QUARTER, left, bottom - dy));
    if (dy < height * 0.5) {
        commands.push(path.lineTo(left, top + dy));
    }
    commands.push(path.curveTo(left, top + dy * ONE_MINUS_QUARTER, left + dx * ONE_MINUS_QUARTER, top, left + dx, top));
    commands.push(g.close());
    return new Path(commands);
};

g._ellipse = function (x, y, width, height) {
    var k = 0.55, // kappa = (-1 + sqrt(2)) / 3 * 4
        dx = k * 0.5 * width,
        dy = k * 0.5 * height,
        x0 = x + 0.5 * width,
        y0 = y + 0.5 * height,
        x1 = x + width,
        y1 = y + height,
        commands = [
            path.moveTo(x, y0),
            path.curveTo(x, y0 - dy, x0 - dx, y, x0, y),
            path.curveTo(x0 + dx, y, x1, y0 - dy, x1, y0),
            path.curveTo(x1, y0 + dy, x0 + dx, y1, x0, y1),
            path.curveTo(x0 - dx, y1, x, y0 + dy, x, y0),
            g.close()
        ];
    return new Path(commands);
};

g._line = function (x1, y1, x2, y2) {
    var commands = [
        path.moveTo(x1, y1),
        path.lineTo(x2, y2)
    ];
    return new Path(commands, null, 'black');
};

g.quad = function (x1, y1, x2, y2, x3, y3, x4, y4) {
    var commands = [
        path.moveTo(x1, y1),
        path.lineTo(x2, y2),
        path.lineTo(x3, y3),
        path.lineTo(x4, y4),
        g.close()
    ];
    return new Path(commands);
};

g._arc = function (x, y, width, height, startAngle, degrees, arcType) {
    var w, h, angStRad, ext, arcSegs, increment, cv, lineSegs,
        index, commands, angle, relX, relY, coords;
    w = width / 2;
    h = height / 2;
    angStRad = g.math.radians(startAngle);
    ext = degrees;

    if (ext >= 360.0 || ext <= -360) {
        arcSegs = 4;
        increment = Math.PI / 2;
        cv = 0.5522847498307933;
        if (ext < 0) {
            increment = -increment;
            cv = -cv;
        }
    } else {
        arcSegs = Math.ceil(Math.abs(ext) / 90.0);
        increment = g.math.radians(ext / arcSegs);
        cv = 4.0 / 3.0 * Math.sin(increment / 2.0) / (1.0 + Math.cos(increment / 2.0));
        if (cv === 0) {
            arcSegs = 0;
        }
    }

    if (arcType === 'open') {
        lineSegs = 0;
    } else if (arcType === 'chord') {
        lineSegs = 1;
    } else if (arcType === 'pie') {
        lineSegs = 2;
    }

    if (w < 0 || h < 0) {
        arcSegs = lineSegs = -1;
    }

    index = 0;
    commands = [];
    while (index <= arcSegs + lineSegs) {
        angle = angStRad;
        if (index === 0) {
            commands.push(
                path.moveTo(x + Math.cos(angle) * w,
                         y + Math.sin(angle) * h)
            );
        } else if (index > arcSegs) {
            if (index === arcSegs + lineSegs) {
                commands.push(g.close());
            } else {
                commands.push(path.lineTo(x, y));
            }
        } else {
            angle += increment * (index - 1);
            relX = Math.cos(angle);
            relY = Math.sin(angle);
            coords = [];
            coords.push(x + (relX - cv * relY) * w);
            coords.push(y + (relY + cv * relX) * h);
            angle += increment;
            relX = Math.cos(angle);
            relY = Math.sin(angle);
            coords.push(x + (relX + cv * relY) * w);
            coords.push(y + (relY - cv * relX) * h);
            coords.push(x + relX * w);
            coords.push(y + relY * h);
            commands.push(path.curveTo.apply(null, coords));
        }
        index += 1;
    }

    return new Path(commands);
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
        c2y = pt2.y + 2 / 3.0 * (qy - pt2.y),
        commands = [
            path.moveTo(pt1.x, pt1.y),
            path.curveTo(c1x, c1y, c2x, c2y, pt2.x, pt2.y)
        ];
    return new Path(commands, null, g.Color.BLACK, 1.0);
};

g.polygon = function (position, radius, sides, align) {
    sides = Math.max(sides, 3);
    var c0, c1, i, c,
        x = position.x,
        y = position.y,
        r = radius,
        a = 360.0 / sides,
        da = 0,
        commands = [];
    if (align === true) {
        c0 = geo.coordinates(x, y, r, 0);
        c1 = geo.coordinates(x, y, r, a);
        da = -geo.angle(c1.x, c1.y, c0.x, c0.y);
    }
    for (i = 0; i < sides; i += 1) {
        c = geo.coordinates(x, y, r, (a * i) + da);
        commands.push(((i === 0) ? path.moveTo : path.lineTo)(c.x, c.y));
    }
    commands.push(g.close());
    return new Path(commands);
};

g.star = function (position, points, outer, inner) {
    var i, angle, radius, x, y,
        commands = [path.moveTo(position.x, position.y + outer / 2)];
    // Calculate the points of the star.
    for (i = 1; i < points * 2; i += 1) {
        angle = i * Math.PI / points;
        radius = (i % 2 === 1) ? inner / 2 : outer / 2;
        x = position.x + radius * Math.sin(angle);
        y = position.y + radius * Math.cos(angle);
        commands.push(path.lineTo(x, y));
    }
    commands.push(g.close());
    return new Path(commands);
};

g.freehand = function (pathString) {
    var i, j, values, type,
        commands = [],
        nonEmpty = function (s) { return s !== ''; },
        contours = _.filter(pathString.split('M'), nonEmpty);

    contours = _.map(contours, function (c) { return c.replace(/,/g, ' '); });

    for (j = 0; j < contours.length; j += 1) {
        values = _.filter(contours[j].split(' '), nonEmpty);
        for (i = 0; i < values.length; i += 2) {
            if (values[i + 1] !== undefined) {
                type = (i === 0) ? path.moveTo : path.lineTo;
                commands.push(type(parseFloat(values[i]), parseFloat(values[i + 1])));
            }
        }
    }

    return new Path(commands, null, Color.BLACK, 1);
};

// Create a grid of points.
g.grid = function (columns, rows, width, height, position) {
    var columnSize, left, rowSize, top, rowIndex, colIndex, x, y, i,
        points = [];
    points.length = columns * rows;
    position = position !== undefined ? position : g.Point.ZERO;
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

g.demoRect = function () {
    return new g.rect({x: 0, y: 0}, 100, 100, {x: 0, y: 0});
};

g.demoEllipse = function () {
    return new g.ellipse({x: 0, y: 0}, 100, 100);
};

module.exports = g;