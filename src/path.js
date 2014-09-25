// Bézier path object

'use strict';

var _ = require('underscore');

var bezier = require('./bezier');
var color = require('./color');
var commands = require('./commands');
var geo = require('./geo');
var math = require('./math');
var Rect = require('./rect').Rect;

var g = {};

g.MOVETO  = 'M';
g.LINETO  = 'L';
g.CURVETO = 'C';
g.CLOSE   = 'Z';

g.CLOSE_COMMAND = Object.freeze({ type: g.CLOSE });

// PATH /////////////////////////////////////////////////////////////////

g.MOVETO  = 'M';
g.LINETO  = 'L';
g.CURVETO = 'C';
g.CLOSE   = 'Z';

g.CLOSE_COMMAND = Object.freeze({ type: g.CLOSE });

g.moveTo = g.moveto = function (x, y) {
    return { type: g.MOVETO, x: x, y: y };
};

g.lineTo = g.lineto = function (x, y) {
    return { type: g.LINETO, x: x, y: y };
};

g.curveTo = g.curveto = function (x1, y1, x2, y2, x, y) {
    return { type: g.CURVETO, x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y };
};

g.closePath = g.closepath = g.close = function () {
    return g.CLOSE_COMMAND;
};

function _cloneCommand(cmd) {
    var newCmd = {type: cmd.type};
    if (newCmd.type !== g.CLOSE) {
        newCmd.x = cmd.x;
        newCmd.y = cmd.y;
    }
    if (newCmd.type === g.CURVETO) {
        newCmd.x1 = cmd.x1;
        newCmd.y1 = cmd.y1;
        newCmd.x2 = cmd.x2;
        newCmd.y2 = cmd.y2;
    }
    return newCmd;
}

g.Path = function (commands, fill, stroke, strokeWidth) {
    this.commands = commands !== undefined ? commands : [];
    this.fill = fill !== undefined ? fill : 'black';
    this.stroke = stroke !== undefined ? stroke : null;
    this.strokeWidth = strokeWidth !== undefined ? strokeWidth : 1;
};

g.Path.prototype.clone = function () {
    var p = new g.Path(),
        n = this.commands.length,
        i;
    p.commands.length = this.commands.length;
    for (i = 0; i < n; i += 1) {
        p.commands[i] = _cloneCommand(this.commands[i]);
    }
    p.fill = color.clone(this.fill);
    p.stroke =  color.clone(this.stroke);
    p.strokeWidth = this.strokeWidth;
    return p;
};

g.Path.prototype.extend = function (commandsOrPath) {
    var commands = commandsOrPath.commands || commandsOrPath;
    Array.prototype.push.apply(this.commands, commands);
};

g.Path.prototype.moveTo = function (x, y) {
    this.commands.push({type: g.MOVETO, x: x, y: y});
};

g.Path.prototype.lineTo = function (x, y) {
    this.commands.push({type: g.LINETO, x: x, y: y});
};

g.Path.prototype.curveTo = function (x1, y1, x2, y2, x, y) {
    this.commands.push({type: g.CURVETO, x1: x1, y1: y1, x2: x2, y2: y2, x: x, y: y});
};

g.Path.prototype.quadTo = function (x1, y1, x, y) {
    var prevX = this.commands[this.commands.length - 1].x,
        prevY = this.commands[this.commands.length - 1].y,
        cp1x = prevX + 2 / 3 * (x1 - prevX),
        cp1y = prevY + 2 / 3 * (y1 - prevY),
        cp2x = cp1x + 1 / 3 * (x - prevX),
        cp2y = cp1y + 1 / 3 * (y - prevY);
    this.curveTo(cp1x, cp1y, cp2x, cp2y, x, y);
};

g.Path.prototype.closePath = g.Path.prototype.close = function () {
    this.commands.push(g.CLOSE_COMMAND);
};

g.Path.prototype.isClosed = function () {
    if (this.commands.length === 0) { return false; }
    return this.commands[this.commands.length - 1].type === g.CLOSE;
};

g.Path.prototype.addRect = function (x, y, width, height) {
    this.extend(commands._rect(x, y, width, height));
};

g.Path.prototype.addRoundedRect = function (cx, cy, width, height, rx, ry) {
    this.extend(commands.roundedRect(cx, cy, width, height, rx, ry));
};

g.Path.prototype.addEllipse = function (x, y, width, height) {
    this.extend(commands._ellipse(x, y, width, height));
};

g.Path.prototype.addLine = function (x1, y1, x2, y2) {
    this.extend(g._line(x1, y1, x2, y2));
};

g.Path.prototype.colorize = function (fill, stroke, strokeWidth) {
    var p = this.clone();
    p.fill = color.clone(fill);
    p.stroke = color.clone(stroke);
    p.strokeWidth = strokeWidth;
    return p;
};

g.Path.prototype.contours = function () {
    var contours = [],
        currentContour = [];
    _.each(this.commands, function (cmd) {
        if (cmd.type === g.MOVETO) {
            if (currentContour.length !== 0) {
                contours.push(currentContour);
            }
            currentContour = [cmd];
        } else {
            currentContour.push(cmd);
        }
    });

    if (currentContour.length !== 0) {
        contours.push(currentContour);
    }

    return contours;
};

g.Path.prototype.bounds = function () {
    if (this._bounds) { return this._bounds; }
    if (this.commands.length === 0) { return new Rect(0, 0, 0, 0); }

    var px, py, prev, right, bottom,
        minX = Number.MAX_VALUE,
        minY = Number.MAX_VALUE,
        maxX = -(Number.MAX_VALUE),
        maxY = -(Number.MAX_VALUE);

    _.each(this.commands, function (cmd) {
        if (cmd.type === g.MOVETO || cmd.type === g.LINETO) {
            px = cmd.x;
            py = cmd.y;
            if (px < minX) { minX = px; }
            if (py < minY) { minY = py; }
            if (px > maxX) { maxX = px; }
            if (py > maxY) { maxY = py; }
            prev = cmd;
        } else if (cmd.type === g.CURVETO) {
            var r = bezier.extrema(prev.x, prev.y, cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
            right = r.x + r.width;
            bottom = r.y + r.height;
            if (r.x < minX) { minX = r.x; }
            if (right > maxX) { maxX = right; }
            if (r.y < minY) { minY = r.y; }
            if (bottom > maxY) { maxY = bottom; }
            prev = cmd;
        }
    });

    return new Rect(minX, minY, maxX - minX, maxY - minY);
};

// Returns the DynamicPathElement at time t (0.0-1.0) on the path.
g.Path.prototype.point = function (t, segments) {
    if (segments === undefined) {
        // Cache the segment lengths for performance.
        segments = bezier.length(this, true, 10);
    }
    return bezier.point(this, t, segments);
};

// Returns an array of DynamicPathElements along the path.
// To omit the last point on closed paths: {end: 1-1.0/amount}
g.Path.prototype.points = function (amount, options) {
    var d, a, i, segments,
        start = (options && options.start !== undefined) ? options.start : 0.0,
        end = (options && options.end !== undefined) ? options.end : 1.0;
    if (this.commands.length === 0) {
        // Otherwise bezier.point() will raise an error for empty paths.
        return [];
    }
    amount = Math.round(amount);
    // The delta value is divided by amount-1, because we also want the last point (t=1.0)
    // If we don't use amount-1, we fall one point short of the end.
    // If amount=4, we want the point at t 0.0, 0.33, 0.66 and 1.0.
    // If amount=2, we want the point at t 0.0 and 1.0.
    d = (amount > 1) ? (end - start) / (amount - 1) : (end - start);
    a = [];
    segments = bezier.length(this, true, 10);

    for (i = 0; i < amount; i += 1) {
        a.push(this.point(start + d * i, segments));
    }
    return a;
};

// Returns an approximation of the total length of the path.
g.Path.prototype.length = function (precision) {
    if (precision === undefined) { precision = 10; }
    return bezier.length(this, false, precision);
};

// Returns true when point (x,y) falls within the contours of the path.
g.Path.prototype.contains = function (x, y, precision) {
    if (precision === undefined) { precision = 100; }
    var i, polygon = this.points(precision),
        points = [];
    for (i = 0; i < polygon.length; i += 1) {
        if (polygon[i].type !== g.CLOSE) {
            points.push({x: polygon[i].x, y: polygon[i].y});
        }
    }
//    if (this._polygon == null ||
//        this._polygon[1] != precision) {
//        this._polygon = [this.points(precision), precision];
//    }
    return geo.pointInPolygon(points, x, y);
};

g.Path.prototype.resampleByAmount = function (points, perContour) {
    var i, j, subPath, pts, cmd,
        subPaths = perContour ? this.contours() : [this.commands],
        commands = [];

    for (j = 0; j < subPaths.length; j += 1) {
        subPath = new g.Path(subPaths[j]);
        pts = subPath.points(points + 1);
        for (i = 0; i < pts.length - 1; i += 1) {
            cmd = { type: (i === 0) ? g.MOVETO : g.LINETO,
                    x: pts[i].x,
                    y: pts[i].y };
            commands.push(cmd);
        }
        commands.push(g.closePath());
    }
    return new g.Path(commands, this.fill, this.stroke, this.strokeWidth);
};

g.Path.prototype.resampleByLength = function (segmentLength) {
    var i, subPath, contourLength, amount,
        subPaths = this.contours(),
        commands = [];
    segmentLength = Math.max(segmentLength, 0.01);
    for (i = 0; i < subPaths.length; i += 1) {
        subPath = new g.Path(subPaths[i]);
        contourLength = subPath.length();
        amount = Math.ceil(contourLength / segmentLength);
        if (!subPath.isClosed()) { amount += 1; }
        commands = commands.concat(subPath.resampleByAmount(amount, false).commands);
    }
    return new g.Path(commands, this.fill, this.stroke, this.strokeWidth);
};

g.Path.prototype.toPathData = function () {
    var i, d, cmd, x, y, x1, y1, x2, y2;
    d = '';
    for (i = 0; i < this.commands.length; i += 1) {
        cmd = this.commands[i];
        if (cmd.x !== undefined) {
            x = math.clamp(cmd.x, -9999, 9999);
            y = math.clamp(cmd.y, -9999, 9999);
        }
        if (cmd.x1 !== undefined) {
            x1 = math.clamp(cmd.x1, -9999, 9999);
            y1 = math.clamp(cmd.y1, -9999, 9999);
        }
        if (cmd.x2 !== undefined) {
            x2 = math.clamp(cmd.x2, -9999, 9999);
            y2 = math.clamp(cmd.y2, -9999, 9999);
        }
        if (cmd.type === g.MOVETO) {
            if (!isNaN(x) && !isNaN(y)) {
                d += 'M' + x + ' ' + y;
            }
        } else if (cmd.type === g.LINETO) {
            if (!isNaN(x) && !isNaN(y)) {
                d += 'L' + x + ' ' + y;
            }
        } else if (cmd.type === g.CURVETO) {
            if (!isNaN(x) && !isNaN(y) && !isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2)) {
                d += 'C' + x1 + ' ' + y1 + ' ' + x2 + ' ' + y2 + ' ' + x + ' ' + y;
            }
        } else if (cmd.type === g.CLOSE) {
            d += 'Z';
        }
    }
    return d;
};

// Output the path as an SVG string.
g.Path.prototype.toSVG = function () {
    var svg = '<path d="';
    svg += this.toPathData();
    svg += '"';
    var fill;
    if (this.fill && this.fill.r !== undefined) {
        fill = g.colorToCSS(this.fill);
    } else {
        fill = this.fill;
    }
    if (fill !== 'black') {
        if (fill === null) {
            svg += ' fill="none"';
        } else {
            svg += ' fill="' + fill + '"';
        }
    }
    var stroke;
    if (this.stroke && this.stroke.r !== undefined) {
        stroke = g.colorToCSS(this.stroke);
    } else {
        stroke = this.stroke;
    }
    if (stroke) {
        svg += ' stroke="' + stroke + '" stroke-width="' + this.strokeWidth + '"';
    }
    svg += '/>';
    return svg;
};

// Draw the path to a 2D context.
g.Path.prototype.draw = function (ctx) {
    var nCommands, i, cmd;
    ctx.beginPath();
    nCommands = this.commands.length;
    for (i = 0; i < nCommands; i += 1) {
        cmd = this.commands[i];
        if (cmd.type === g.MOVETO) {
            ctx.moveTo(cmd.x, cmd.y);
        } else if (cmd.type === g.LINETO) {
            ctx.lineTo(cmd.x, cmd.y);
        } else if (cmd.type === g.CURVETO) {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.type === g.CLOSE) {
            ctx.closePath();
        }
    }
    if (this.fill !== null) {
        ctx.fillStyle = color.get(this.fill);
        ctx.fill();
    }
    if (this.stroke !== null && this.strokeWidth !== null && this.strokeWidth > 0) {
        ctx.strokeStyle = color.get(this.stroke);
        ctx.lineWidth = this.strokeWidth;
        ctx.stroke();
    }
};

g.make = function (commands, fill, stroke, strokeWidth) {
    return new g.Path(commands, fill, stroke, strokeWidth);
};

module.exports = g;