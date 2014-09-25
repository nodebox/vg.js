// SVG Parser

// The SVG engine uses code from the following libraries:
// - for parsing the main svg tree: two.js - http://jonobr1.github.io/two.js/
// - for constructing individual paths: canvg - https://code.google.com/p/canvg/
// - for constructing arcs: fabric.js - http://fabricjs.com

'use strict';

var _ = require('underscore');

var color = require('./color');
var geo = require('./geo');
var Group = require('./group');
var path = require('./path');
var Path = path.Path;
var Point = require('./point').Point;
var shapes = require('./shapes');
var Transform = require('./transform').Transform;

var svg = {};


svg.interpret = function (svgNode) {
    var node,
        tag = svgNode.tagName.toLowerCase();
    if (svg.read[tag] === undefined) {
        return null;
    }

    node = svg.read[tag].call(this, svgNode);
    return node;
};

svg.getReflection = function (a, b, relative) {
    var theta,
        d = geo.distance(a.x, a.y, b.x, b.y);

    if (d <= 0.0001) {
        return relative ? Point.ZERO : a;
    }
    theta = geo.angle(a.x, a.y, b.x, b.y);
    return new Point(
        d * Math.cos(theta) + (relative ? 0 : a.x),
        d * Math.sin(theta) + (relative ? 0 : a.y)
    );
};

svg.trim = function (s) {
    return s.replace(/^\s+|\s+$/g, '');
};

svg.compressSpaces = function (s) {
    return s.replace(/[\s\r\t\n]+/gm, ' ');
};

svg.toNumberArray = function (s) {
    var i,
        a = svg.trim(svg.compressSpaces((s || '').replace(/,/g, ' '))).split(' ');
    for (i = 0; i < a.length; i += 1) {
        a[i] = parseFloat(a[i]);
    }
    return a;
};

svg.read = {

    svg: function () {
        return svg.read.g.apply(this, arguments);
    },

    g: function (node) {

        var shapes = [];

        _.each(node.childNodes, function (n) {

            var tag, tagName, o;
            tag = n.nodeName;
            if (!tag) { return; }
            tagName = tag.replace(/svg\:/ig, '').toLowerCase();
            if (svg.read[tagName] !== undefined) {
                o = svg.read[tagName].call(this, n);
                shapes.push(o);
            }
        });

        return svg.applySvgAttributes(node, new Group(shapes));
    },

    polygon: function (node, open) {
        var points = node.getAttribute('points'),
            commands = [],
            poly;
        points.replace(/([\d\.?]+),([\d\.?]+)/g, function (match, p1, p2) {
            commands.push((commands.length === 0 ? path.moveTo : path.lineTo)(parseFloat(p1), parseFloat(p2)));
        });
        if (!open) {
            commands.push(path.closePath());
        }

        poly = { commands: commands };
        return svg.applySvgAttributes(node, poly);
    },

    polyline: function (node) {
        return svg.read.polygon(node, true);
    },

    rect: function (node) {
        var x, y, width, height;
        x = parseFloat(node.getAttribute('x'));
        y = parseFloat(node.getAttribute('y'));
        width = parseFloat(node.getAttribute('width'));
        height = parseFloat(node.getAttribute('height'));
        return svg.applySvgAttributes(node, shapes._rect(x, y, width, height));
    },

    ellipse: function (node) {
        var cx, cy, rx, ry, x, y, width, height;
        cx = parseFloat(node.getAttribute('cx'));
        cy = parseFloat(node.getAttribute('cy'));
        rx = parseFloat(node.getAttribute('rx'));
        ry = parseFloat(node.getAttribute('ry'));
        x = cx - rx;
        y = cy - ry;
        width = rx * 2;
        height = ry * 2;
        return svg.applySvgAttributes(node, shapes._ellipse(x, y, width, height));
    },

    circle: function (node) {
        var cx, cy, r, x, y, width, height;
        cx = parseFloat(node.getAttribute('cx'));
        cy = parseFloat(node.getAttribute('cy'));
        r = parseFloat(node.getAttribute('r'));
        x = cx - r;
        y = cy - r;
        width = height = r * 2;
        return svg.applySvgAttributes(node, shapes._ellipse(x, y, width, height));
    },

    line: function (node) {
        var x1, y1, x2, y2;
        x1 = parseFloat(node.getAttribute('x1'));
        y1 = parseFloat(node.getAttribute('y1'));
        x2 = parseFloat(node.getAttribute('x2'));
        y2 = parseFloat(node.getAttribute('y2'));
        return svg.applySvgAttributes(node, shapes._line(x1, y1, x2, y2));
    },

    path: function (node) {
        var d, PathParser, commands, pp,
            p, newP, curr, p1, cntrl, cp, cp1x, cp1y, cp2x, cp2y,
            rx, ry, rot, large, sweep, ex, ey, segs, i, bez;
        // TODO: convert to real lexer based on http://www.w3.org/TR/SVG11/paths.html#PathDataBNF
        d = node.getAttribute('d');
        d = d.replace(/,/gm, ' '); // get rid of all commas
        d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm, '$1 $2'); // separate commands from commands
        d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([MmZzLlHhVvCcSsQqTtAa])/gm, '$1 $2'); // separate commands from commands
        d = d.replace(/([MmZzLlHhVvCcSsQqTtAa])([^\s])/gm, '$1 $2'); // separate commands from points
        d = d.replace(/([^\s])([MmZzLlHhVvCcSsQqTtAa])/gm, '$1 $2'); // separate commands from points
        d = d.replace(/([0-9])([+\-])/gm, '$1 $2'); // separate digits when no comma
        d = d.replace(/(\.[0-9]*)(\.)/gm, '$1 $2'); // separate digits when no comma
        d = d.replace(/([Aa](\s+[0-9]+){3})\s+([01])\s*([01])/gm, '$1 $3 $4 '); // shorthand elliptical arc path syntax
        d = svg.compressSpaces(d); // compress multiple spaces
        d = svg.trim(d);

        PathParser = function (d) {
            this.tokens = d.split(' ');

            this.reset = function () {
                this.i = -1;
                this.command = '';
                this.previousCommand = '';
                this.start = new Point(0, 0);
                this.control = new Point(0, 0);
                this.current = new Point(0, 0);
                this.points = [];
                this.angles = [];
            };

            this.isEnd = function () {
                return this.i >= this.tokens.length - 1;
            };

            this.isCommandOrEnd = function () {
                if (this.isEnd()) { return true; }
                return this.tokens[this.i + 1].match(/^[A-Za-z]$/) !== null;
            };

            this.isRelativeCommand = function () {
                switch (this.command) {
                case 'm':
                case 'l':
                case 'h':
                case 'v':
                case 'c':
                case 's':
                case 'q':
                case 't':
                case 'a':
                case 'z':
                    return true;
                }
                return false;
            };

            this.getToken = function () {
                this.i += 1;
                return this.tokens[this.i];
            };

            this.getScalar = function () {
                return parseFloat(this.getToken());
            };

            this.nextCommand = function () {
                this.previousCommand = this.command;
                this.command = this.getToken();
            };

            this.getPoint = function () {
                var pt = new Point(this.getScalar(), this.getScalar());
                return this.makeAbsolute(pt);
            };

            this.getAsControlPoint = function () {
                var pt = this.getPoint();
                this.control = pt;
                return pt;
            };

            this.getAsCurrentPoint = function () {
                var pt = this.getPoint();
                this.current = pt;
                return pt;
            };

            this.getReflectedControlPoint = function () {
                if (this.previousCommand.toLowerCase() !== 'c' &&
                        this.previousCommand.toLowerCase() !== 's' &&
                        this.previousCommand.toLowerCase() !== 'q' &&
                        this.previousCommand.toLowerCase() !== 't') {
                    return this.current;
                }

                // reflect point
                var pt = new Point(2 * this.current.x - this.control.x, 2 * this.current.y - this.control.y);
                return pt;
            };

            this.makeAbsolute = function (p) {
                if (this.isRelativeCommand()) {
                    return new Point(p.x + this.current.x, p.y + this.current.y);
                }
                return p;
            };
        };

        commands = [];

        pp = new PathParser(d);
        pp.reset();

        while (!pp.isEnd()) {
            pp.nextCommand();
            switch (pp.command) {
            case 'M':
            case 'm':
                p = pp.getAsCurrentPoint();
                commands.push(path.moveTo(p.x, p.y));
                pp.start = pp.current;
                while (!pp.isCommandOrEnd()) {
                    p = pp.getAsCurrentPoint();
                    commands.push(path.lineTo(p.x, p.y));
                }
                break;
            case 'L':
            case 'l':
                while (!pp.isCommandOrEnd()) {
                    p = pp.getAsCurrentPoint();
                    commands.push(path.lineTo(p.x, p.y));
                }
                break;
            case 'H':
            case 'h':
                while (!pp.isCommandOrEnd()) {
                    newP = new Point((pp.isRelativeCommand() ? pp.current.x : 0) + pp.getScalar(), pp.current.y);
                    pp.current = newP;
                    commands.push(path.lineTo(pp.current.x, pp.current.y));
                }
                break;
            case 'V':
            case 'v':
                while (!pp.isCommandOrEnd()) {
                    newP = new Point(pp.current.x, (pp.isRelativeCommand() ? pp.current.y : 0) + pp.getScalar());
                    pp.current = newP;
                    commands.push(path.lineTo(pp.current.x, pp.current.y));
                }
                break;
            case 'C':
            case 'c':
                while (!pp.isCommandOrEnd()) {
                    curr = pp.current;
                    p1 = pp.getPoint();
                    cntrl = pp.getAsControlPoint();
                    cp = pp.getAsCurrentPoint();
                    commands.push(path.curveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y));
                }
                break;
            case 'S':
            case 's':
                while (!pp.isCommandOrEnd()) {
                    curr = pp.current;
                    p1 = pp.getReflectedControlPoint();
                    cntrl = pp.getAsControlPoint();
                    cp = pp.getAsCurrentPoint();
                    commands.push(path.curveTo(p1.x, p1.y, cntrl.x, cntrl.y, cp.x, cp.y));
                }
                break;
            case 'Q':
            case 'q':
                while (!pp.isCommandOrEnd()) {
                    curr = pp.current;
                    cntrl = pp.getAsControlPoint();
                    cp = pp.getAsCurrentPoint();
                    cp1x = curr.x + 2 / 3 * (cntrl.x - curr.x); // CP1 = QP0 + 2 / 3 *(QP1-QP0)
                    cp1y = curr.y + 2 / 3 * (cntrl.y - curr.y); // CP1 = QP0 + 2 / 3 *(QP1-QP0)
                    cp2x = cp1x + 1 / 3 * (cp.x - curr.x); // CP2 = CP1 + 1 / 3 *(QP2-QP0)
                    cp2y = cp1y + 1 / 3 * (cp.y - curr.y); // CP2 = CP1 + 1 / 3 *(QP2-QP0)
                    commands.push(path.curveTo(cp1x, cp1y, cp2x, cp2y, cp.x, cp.y));
                }
                break;
            case 'T':
            case 't':
                while (!pp.isCommandOrEnd()) {
                    curr = pp.current;
                    cntrl = pp.getReflectedControlPoint();
                    pp.control = cntrl;
                    cp = pp.getAsCurrentPoint();
                    cp1x = curr.x + 2 / 3 * (cntrl.x - curr.x); // CP1 = QP0 + 2 / 3 *(QP1-QP0)
                    cp1y = curr.y + 2 / 3 * (cntrl.y - curr.y); // CP1 = QP0 + 2 / 3 *(QP1-QP0)
                    cp2x = cp1x + 1 / 3 * (cp.x - curr.x); // CP2 = CP1 + 1 / 3 *(QP2-QP0)
                    cp2y = cp1y + 1 / 3 * (cp.y - curr.y); // CP2 = CP1 + 1 / 3 *(QP2-QP0)
                    commands.push(path.curveTo(cp1x, cp1y, cp2x, cp2y, cp.x, cp.y));
                }
                break;
            case 'A':
            case 'a':
                while (!pp.isCommandOrEnd()) {
                    curr = pp.current;
                    rx = pp.getScalar();
                    ry = pp.getScalar();
                    rot = pp.getScalar();// * (Math.PI / 180.0);
                    large = pp.getScalar();
                    sweep = pp.getScalar();
                    cp = pp.getAsCurrentPoint();
                    ex = cp.x;
                    ey = cp.y;
                    segs = svg.arcToSegments(ex, ey, rx, ry, large, sweep, rot, curr.x, curr.y);
                    for (i = 0; i < segs.length; i += 1) {
                        bez = svg.segmentToBezier.apply(this, segs[i]);
                        commands.push(path.curveTo.apply(this, bez));
                    }
                }
                break;
            case 'Z':
            case 'z':
                commands.push(path.closePath());
                pp.current = pp.start;
                break;
            }
        }
        return svg.applySvgAttributes(node, new Path(commands));
    }
};

svg.applySvgAttributes = function (node, shape) {
    var fill, stroke, strokeWidth, transforms, types, transform, i;

    if (shape.commands) {
        fill = 'black';
    }

    transforms = [];
    types = {};

    types.translate = function (s) {
        var a = svg.toNumberArray(s),
            tx = a[0],
            ty = a[1] || 0;
        return new Transform().translate(tx, ty);
    };

    types.scale = function (s) {
        var a = svg.toNumberArray(s),
            sx = a[0],
            sy = a[1] || sx;
        return new Transform().scale(sx, sy);
    };

    types.rotate = function (s) {
        var t,
            a = svg.toNumberArray(s),
            r = a[0],
            tx = a[1] || 0,
            ty = a[2] || 0;
        t = new Transform();
        t = t.translate(tx, ty);
        t = t.rotate(r);
        t = t.translate(-tx, -ty);
        return t;
    };

    types.matrix = function (s) {
        var m = svg.toNumberArray(s);
        return [m[0], m[1], 0, m[2], m[3], 0, m[4], m[5], 1];
    };

    _.each(node.attributes, function (v) {
        var property, data, type, s, d;
        property = v.nodeName;

        switch (property) {
        case 'transform':
            data = svg.trim(svg.compressSpaces(v.nodeValue)).replace(/\)(\s?,\s?)/g, ') ').split(/\s(?=[a-z])/);
            for (i = 0; i < data.length; i += 1) {
                type = svg.trim(data[i].split('(')[0]);
                s = data[i].split('(')[1].replace(')', '');
                transform = types[type](s);
                transforms.push(transform);
            }
            break;
        case 'visibility':
//          elem.visible = !!v.nodeValue;
            break;
        case 'stroke-linecap':
//          elem.cap = v.nodeValue;
            break;
        case 'stroke-linejoin':
//          elem.join = v.nodeValue;
            break;
        case 'stroke-miterlimit':
//          elem.miter = v.nodeValue;
            break;
        case 'stroke-width':
//          elem.linewidth = parseFloat(v.nodeValue);
            strokeWidth = parseFloat(v.nodeValue);
            break;
        case 'stroke-opacity':
        case 'fill-opacity':
//          elem.opacity = v.nodeValue;
            break;
        case 'fill':
            fill = v.nodeValue;
            break;
        case 'stroke':
            stroke = v.nodeValue;
            break;
        case 'style':
            d = {};
            _.each(v.nodeValue.split(';'), function (s) {
                var el = s.split(':');
                d[el[0].trim()] = el[1];
            });
            if (d.fill) {
                fill = d.fill;
            }
            if (d.stroke) {
                stroke = d.stroke;
            }
            if (d['stroke-width']) {
                strokeWidth = parseFloat(d['stroke-width']);
            }
            break;
        }
    });

    fill = color.parse(fill);
    stroke = color.parse(stroke);

    transform = new Transform();
    for (i = 0; i < transforms.length; i += 1) {
        transform = transform.append(transforms[i]);
    }

    function applyAttributes(shape) {
        if (shape.commands) {
            var commands = transform.transformShape(shape).commands,
                f = (fill === undefined) ? shape.fill : fill,
                s = (stroke === undefined) ? shape.stroke : stroke,
                sw = (strokeWidth === undefined) ? shape.strokeWidth : strokeWidth;
            if (sw !== undefined) {
                sw *= transform[0];
            }
            return new Path(commands, f, s, sw);
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, applyAttributes));
        }
    }

    return applyAttributes(shape);
};

svg.arcToSegments = function (x, y, rx, ry, large, sweep, rotateX, ox, oy) {
/*    argsString = _join.call(arguments);
    if (arcToSegmentsCache[argsString]) {
      return arcToSegmentsCache[argsString];
    } */
    var th, sinTh, cosTh, px, py, pl,
        a00, a01, a10, a11, x0, y0, x1, y1,
        d, sFactorSq, sFactor, xc, yc,
        th0, th1, thArc,
        segments, result, th2, th3, i;

    th = rotateX * (Math.PI / 180);
    sinTh = Math.sin(th);
    cosTh = Math.cos(th);
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    px = cosTh * (ox - x) * 0.5 + sinTh * (oy - y) * 0.5;
    py = cosTh * (oy - y) * 0.5 - sinTh * (ox - x) * 0.5;
    pl = (px * px) / (rx * rx) + (py * py) / (ry * ry);
    if (pl > 1) {
        pl = Math.sqrt(pl);
        rx *= pl;
        ry *= pl;
    }

    a00 = cosTh / rx;
    a01 = sinTh / rx;
    a10 = (-sinTh) / ry;
    a11 = cosTh / ry;
    x0 = a00 * ox + a01 * oy;
    y0 = a10 * ox + a11 * oy;
    x1 = a00 * x + a01 * y;
    y1 = a10 * x + a11 * y;

    d = (x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0);
    sFactorSq = 1 / d - 0.25;
    if (sFactorSq < 0) { sFactorSq = 0; }
    sFactor = Math.sqrt(sFactorSq);
    if (sweep === large) { sFactor = -sFactor; }
    xc = 0.5 * (x0 + x1) - sFactor * (y1 - y0);
    yc = 0.5 * (y0 + y1) + sFactor * (x1 - x0);

    th0 = Math.atan2(y0 - yc, x0 - xc);
    th1 = Math.atan2(y1 - yc, x1 - xc);

    thArc = th1 - th0;
    if (thArc < 0 && sweep === 1) {
        thArc += 2 * Math.PI;
    } else if (thArc > 0 && sweep === 0) {
        thArc -= 2 * Math.PI;
    }

    segments = Math.ceil(Math.abs(thArc / (Math.PI * 0.5 + 0.001)));
    result = [];
    for (i = 0; i < segments; i += 1) {
        th2 = th0 + i * thArc / segments;
        th3 = th0 + (i + 1) * thArc / segments;
        result[i] = [xc, yc, th2, th3, rx, ry, sinTh, cosTh];
    }

//    arcToSegmentsCache[argsString] = result;
    return result;
};

svg.segmentToBezier = function (cx, cy, th0, th1, rx, ry, sinTh, cosTh) {
//    argsString = _join.call(arguments);
//    if (segmentToBezierCache[argsString]) {
//      return segmentToBezierCache[argsString];
//    }

    var a00 = cosTh * rx,
        a01 = -sinTh * ry,
        a10 = sinTh * rx,
        a11 = cosTh * ry,

        thHalf = 0.5 * (th1 - th0),
        t = (8 / 3) * Math.sin(thHalf * 0.5) * Math.sin(thHalf * 0.5) / Math.sin(thHalf),
        x1 = cx + Math.cos(th0) - t * Math.sin(th0),
        y1 = cy + Math.sin(th0) + t * Math.cos(th0),
        x3 = cx + Math.cos(th1),
        y3 = cy + Math.sin(th1),
        x2 = x3 + t * Math.sin(th1),
        y2 = y3 - t * Math.cos(th1);

//    segmentToBezierCache[argsString] = [
    return [
        a00 * x1 + a01 * y1, a10 * x1 + a11 * y1,
        a00 * x2 + a01 * y2,      a10 * x2 + a11 * y2,
        a00 * x3 + a01 * y3,      a10 * x3 + a11 * y3
    ];

//    return segmentToBezierCache[argsString];
};

module.exports = svg;