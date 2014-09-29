// Draw objects to the canvas

'use strict';

var Color = require('../objects/color');

var g = {};

// Return true if an object can be drawn using the `g.draw` function.
g.isDrawable = function (o) {
    if (Array.isArray(o)) {
        o = o[0];
    }
    if (!o) {
        return false;
    } else if (typeof o.draw === 'function') {
        return true;
    } else if (o.x !== undefined && o.y !== undefined) {
        return true;
    } else if (o.r !== undefined && o.g !== undefined && o.b !== undefined) {
        return true;
    } else {
        return false;
    }
};

g.drawPoints = function (ctx, points) {
    var pt, i;
    ctx.fillStyle = 'blue';
    ctx.beginPath();
    for (i = 0; i < points.length; i += 1) {
        pt = points[i];
        ctx.moveTo(pt.x, pt.y);
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2, false);
    }
    ctx.fill();
};

g.drawColors = function (ctx, colors) {
    var i, c;
    ctx.save();
    for (i = 0; i < colors.length; i += 1) {
        c = colors[i];
        ctx.fillStyle = Color.get(c);
        ctx.fillRect(0, 0, 30, 30);
        ctx.translate(30, 0);
    }
    ctx.restore();
};

g.draw = function (ctx, o) {
    var i, n, first;
    if (o) {
        if (typeof o.draw === 'function') {
            o.draw(ctx);
        } else if (o.x !== undefined && o.y !== undefined) {
            g.drawPoints(ctx, [o]);
        } else if (o.r !== undefined && o.g !== undefined && o.b !== undefined) {
            g.drawColors(ctx, [o]);
        } else if (Array.isArray(o)) {
            n = o.length;
            if (n > 0) {
                first = o[0];
                if (typeof first.draw === 'function') {
                    for (i = 0; i < n; i += 1) {
                        g.draw(ctx, o[i]);
                    }
                } else if (first.x !== undefined && first.y !== undefined) {
                    g.drawPoints(ctx, o);
                } else if (first.r !== undefined && first.g !== undefined && first.b !== undefined) {
                    g.drawColors(ctx, o);
                }
            }
        }
    }
};

module.exports = g;