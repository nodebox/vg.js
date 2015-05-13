// Object creation / manipulation commands

'use strict';

var _ = require('lodash');
var ClipperLib = require('js-clipper');
var bezier = require('../util/bezier');
var geo = require('../util/geo');
var math = require('../util/math');
var random = require('../util/random');

var Color = require('../objects/color');
var Group = require('../objects/group');
var Path = require('../objects/path');
var Point = require('../objects/point');
var Rect = require('../objects/rect');
var Transform = require('../objects/transform');

var vg = {};

vg.HORIZONTAL = 'horizontal';
vg.VERTICAL = 'vertical';

vg.EAST = 'e';
vg.WEST = 'w';
vg.NORTH = 'n';
vg.SOUTH = 's';

vg.bounds = function (o) {
    var r, i, n;
    if (!o) {
        return new Rect();
    } else if (typeof o.bounds === 'function') {
        return o.bounds();
    } else if (o.x !== undefined && o.y !== undefined) {
        if (o.width !== undefined && o.height !== undefined) {
            return new Rect(o.x, o.y, o.width, o.height);
        } else {
            return new Rect(o.x, o.y, 0, 0);
        }
    } else if (o.r !== undefined && o.g !== undefined && o.b !== undefined) {
        return new vg.Rect(0, 0, 30, 30);
    } else if (Array.isArray(o)) {
        r = null;
        n = o.length;
        // A color array is special since the colors have no inherent position.
        if (n > 0 && o[0].r !== undefined && o[0].g !== undefined && o[0].b !== undefined) {
            return new Rect(0, 0, o.length * 30, 30);
        }
        for (i = 0; i < n; i += 1) {
            if (!r) {
                r = vg.bounds(o[i]);
            } else {
                r = r.unite(vg.bounds(o[i]));
            }
        }
        return r || new Rect();
    } else {
        return new Rect();
    }
};

vg.makeCenteredRect = function (cx, cy, width, height) {
    var x = cx - width / 2,
        y = cy - height / 2;
    return new Rect(x, y, width, height);
};

vg.makePoint = function (x, y) {
    return new Point(x, y);
};

vg.makeRect = function (x, y, width, height) {
    return new Rect(x, y, width, height);
};

// Combine all given shape arguments into a new group.
// This function works like makeGroup, except that this can take any number
// of arguments.
vg.merge = function () {
    return new Group(_.reject(_.flatten(arguments, true), _.isEmpty));
};

vg.combinePaths = function (shape) {
    return Path.combine(shape);
};

vg.shapePoints = vg.toPoints = function (shape) {
    if (!shape) {
        return [];
    }
    if (shape.commands) {
        return _.map(_.filter(shape.commands, function (cmd) { if (cmd.x !== undefined) { return true; } return false; }), function (cmd) { return {x: cmd.x, y: cmd.y}; });
    }
    var i, points = [];
    for (i = 0; i < shape.shapes.length; i += 1) {
        points = points.concat(vg.shapePoints(shape.shapes[i]));
    }
    return points;
};

// FILTERS //////////////////////////////////////////////////////////////

vg.colorize = function (shape, fill, stroke, strokeWidth) {
    if (!shape) {
        return;
    }
    return shape.colorize(fill, stroke, strokeWidth);
};

vg.translate = function (shape, position) {
    return shape.translate(position);
};

vg.scale = function (shape, scale, origin) {
    return shape.scale(scale, origin);
};

vg.rotate = function (shape, angle, origin) {
    return shape.rotate(angle, origin);
};

vg.skew = function (shape, skew, origin) {
    return shape.skew(skew, origin);
};

vg.copy = function (shape, copies, order, translate, rotate, scale) {
    var i, t, j, op,
        shapes = [],
        tx = 0,
        ty = 0,
        r = 0,
        sx = 1.0,
        sy = 1.0;
    for (i = 0; i < copies; i += 1) {
        t = new Transform();
        for (j = 0; j < order.length; j += 1) {
            op = order[j];
            if (op === 't') {
                t = t.translate(tx, ty);
            } else if (op === 'r') {
                t = t.rotate(r);
            } else if (op === 's') {
                t = t.scale(sx, sy);
            }
        }
        shapes.push(t.transformShape(shape));

        tx += translate.x;
        ty += translate.y;
        r += rotate;
        sx += scale.x;
        sy += scale.y;
    }
    return shapes;
};

vg.fit = function (shape, position, width, height, stretch) {
    if (!shape) {
        return;
    }
    stretch = stretch !== undefined ? stretch : false;
    var t, sx, sy,
        bounds = shape.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height;

    // Make sure bw and bh aren't infinitely small numbers.
    // This will lead to incorrect transformations with for examples lines.
    bw = (bw > 0.000000000001) ? bw : 0;
    bh = (bh > 0.000000000001) ? bh : 0;

    t = new Transform();
    t = t.translate(position.x, position.y);

    if (!stretch) {
        // don't scale widths or heights that are equal to zero.
        sx = (bw > 0) ? (width / bw) : Number.MAX_VALUE;
        sy = (bh > 0) ? (height / bh) : Number.MAX_VALUE;
        sx = sy = Math.min(sx, sy);
    } else {
        sx = (bw > 0) ? (width / bw) : 1;
        sy = (bh > 0) ? (height / bh) : 1;
    }

    t = t.scale(sx, sy);
    t = t.translate(-bw / 2 - bx, -bh / 2 - by);

    return t.transformShape(shape);
};

// Fit the given shape to the bounding shape.
// If stretch = true, proportions will be distorted.
vg.fitTo = function (shape, bounding, stretch) {
    if (!shape) {
        return;
    }
    if (!bounding) {
        return;
    }

    var bounds = bounding.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height;

    return vg.fit(shape, {x: bx + bw / 2, y: by + bh / 2}, bw, bh, stretch);
};

vg.mirror = function (shape, angle, origin, keepOriginal) {
    if (!shape) {
        return;
    }
    origin = origin || new Point();
    if (angle !== 0) {
        angle = angle || 90;
    }

    var f = function (x, y) {
        var d = geo.distance(x, y, origin.x, origin.y),
            a = geo.angle(x, y, origin.x, origin.y),
            pt = geo.coordinates(origin.x, origin.y, d * Math.cos(math.radians(a - angle)), 180 + angle);
        d = geo.distance(x, y, pt.x, pt.y);
        a = geo.angle(x, y, pt.x, pt.y);
        pt = geo.coordinates(x, y, d * 2, a);
        return new Point(pt.x, pt.y);
    };

    var mirrorPath = function (path) {
        var pt, ctrl1, ctrl2;
        var p = new Path([], path.fill, path.stroke, path.strokeWidth);
        for (var i = 0; i < path.commands.length; i += 1) {
            var cmd = path.commands[i];
            if (cmd.type === bezier.MOVETO) {
                pt = f(cmd.x, cmd.y);
                p.moveTo(pt.x, pt.y);
            } else if (cmd.type === bezier.LINETO) {
                pt = f(cmd.x, cmd.y);
                p.lineTo(pt.x, pt.y);
            } else if (cmd.type === bezier.CURVETO) {
                pt = f(cmd.x, cmd.y);
                ctrl1 = f(cmd.x1, cmd.y1);
                ctrl2 = f(cmd.x2, cmd.y2);
                p.curveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, pt.x, pt.y);
            } else if (cmd.type === bezier.CLOSE) {
                p.close();
            } else {
                throw new Error('Unknown command ' + cmd);
            }
        }
        return p;
    };

    var mirrorGroup = function (group) {
        var shapes = _.map(group.shapes, function (shape) {
            return mirror(shape);
        });
        return new Group(shapes);
    };

    var mirror = function (shape) {
        var fn = (shape.shapes) ? mirrorGroup : mirrorPath;
        return fn(shape);
    };

    var newShape = mirror(shape);

    if (keepOriginal) {
        return new Group([shape, newShape]);
    } else {
        return newShape;
    }
};

vg.pathLength = function (shape, options) {
    var precision = 20;
    if (options && options.precision) {
        precision = options.precision;
    }
    return shape.length(precision);
};

vg.resampleByLength = function (shape, maxLength) {
    if (!shape) { return; }
    return shape.resampleByLength(maxLength);
};

vg.resampleByAmount = function (shape, amount, perContour) {
    if (!shape) { return; }
    return shape.resampleByAmount(amount, perContour);
};

vg.wiggle = function (shape, scope, offset, seed) {
    var rand, wigglePoints, wigglePaths, wiggleContours;
    scope = scope || 'points';
    if (offset === undefined) {
        offset = {x: 10, y: 10};
    } else if (typeof offset === 'number') {
        offset = {x: offset, y: offset};
    }
    seed = seed !== undefined ? seed : Math.random();
    rand = random.generator(seed);

    wigglePoints = function (shape) {
        var i, dx, dy;
        if (shape.commands) {
            var p = new Path([], shape.fill, shape.stroke, shape.strokeWidth);
            for (i = 0; i < shape.commands.length; i += 1) {
                dx = (rand(0, 1) - 0.5) * offset.x * 2;
                dy = (rand(0, 1) - 0.5) * offset.y * 2;
                var cmd = shape.commands[i];
                if (cmd.type === bezier.MOVETO) {
                    p.moveTo(cmd.x + dx, cmd.y + dy);
                } else if (cmd.type === bezier.LINETO) {
                    p.lineTo(cmd.x + dx, cmd.y + dy);
                } else if (cmd.type === bezier.CURVETO) {
                    p.curveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x + dx, cmd.y + dy);
                } else if (cmd.type === bezier.CLOSE) {
                    p.close();
                }
            }
            return p;
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, wigglePoints));
        } else if (Array.isArray(shape) && shape.length > 0 && shape[0].x !== undefined && shape[0].y !== undefined){
            var points = [];
            for (i = 0; i < shape.length; i += 1) {
                dx = (rand(0, 1) - 0.5) * offset.x * 2;
                dy = (rand(0, 1) - 0.5) * offset.y * 2;
                points.push(new Point(shape[i].x + dx, shape[i].y + dy));
            }
            return points;
        } else {
            return _.map(shape, wigglePoints);
        }
    };

    wigglePaths = function (shape) {
        if (shape.commands) {
            return shape;
        } else if (shape.shapes) {
            var i, subShape, dx, dy, t, newShapes = [];
            for (i = 0; i < shape.shapes.length; i += 1) {
                subShape = shape.shapes[i];
                if (subShape.commands) {
                    dx = (rand(0, 1) - 0.5) * offset.x * 2;
                    dy = (rand(0, 1) - 0.5) * offset.y * 2;
                    t = new Transform().translate(dx, dy);
                    newShapes.push(t.transformShape(subShape));
                } else if (subShape.shapes) {
                    newShapes.push(wigglePaths(subShape));
                }
            }
            return new Group(newShapes);
        } else {
            return _.map(shape, wigglePaths);
        }
    };

    wiggleContours = function (shape) {
        if (shape.commands) {
            var i, dx, dy, t,
                subPaths = vg.getContours(shape),
                commands = [];
            for (i = 0; i < subPaths.length; i += 1) {
                dx = (rand(0, 1) - 0.5) * offset.x * 2;
                dy = (rand(0, 1) - 0.5) * offset.y * 2;
                t = new Transform().translate(dx, dy);
                commands = commands.concat(t.transformShape(new Path(subPaths[i])).commands);
            }
            return new Path(commands, shape.fill, shape.stroke, shape.strokeWidth);
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, wiggleContours));
        } else {
            return _.map(shape, wiggleContours);
        }
    };

    if (scope === 'points') {
        return wigglePoints(shape);
    } else if (scope === 'paths') {
        return wigglePaths(shape);
    } else if (scope === 'contours') {
        return wiggleContours(shape);
    } else {
        throw new Error('Invalid scope.');
    }
};

vg.scatter = function (shape, amount, seed) {
    // Generate points within the boundaries of a shape.
    if (!shape) {
        return;
    }
    seed = seed !== undefined ? seed : Math.random();
    var i, j, tries, x, y,
        rand = random.generator(seed),
        bounds = shape.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height,
        contours = shape.contours(),
        paths = [],
        points = [];

    for (i = 0; i < contours.length; i++) {
        var contourPath = new Path(contours[i]);
        var nrKeypoints = contourPath.commands.length;
        var POINTS_PER_SEGMENT = 5;
        paths.push(contourPath.points(nrKeypoints * POINTS_PER_SEGMENT, {closed: true } ));
    }

    for (i = 0; i < amount; i += 1) {
        tries = 100;
        while (tries > 0) {
            var inContourCount = 0;
            x = bx + rand(0, 1) * bw;
            y = by + rand(0, 1) * bh;
            for (j = 0; j < paths.length; j++) {
                if (geo.pointInPolygon(paths[j], x, y)) {
                    inContourCount += 1;
                }
            }
            if (inContourCount % 2) {
                points.push(new Point(x, y));
                break;
            }
            tries -= 1;
        }
    }
    return points;
};

vg.connectPoints = function (points, closed) {
    if (!points) {
        return;
    }
    var p = new Path();
    for (var i = 0; i < points.length; i += 1) {
        var pt = points[i];
        if (i === 0) {
            p.moveTo(pt.x, pt.y);
        } else {
            p.lineTo(pt.x, pt.y);
        }
    }
    if (closed) {
        p.close();
    }
    p.fill = null;
    p.stroke = Color.BLACK;
    return p;
};

vg.align = function (shape, position, hAlign, vAlign) {
    if (!shape) {
        return;
    }
    var dx, dy, t,
        x = position.x,
        y = position.y,
        bounds = shape.bounds();
    if (hAlign === 'left') {
        dx = x - bounds.x;
    } else if (hAlign === 'right') {
        dx = x - bounds.x - bounds.width;
    } else if (hAlign === 'center') {
        dx = x - bounds.x - bounds.width / 2;
    } else {
        dx = 0;
    }
    if (vAlign === 'top') {
        dy = y - bounds.y;
    } else if (vAlign === 'bottom') {
        dy = y - bounds.y - bounds.height;
    } else if (vAlign === 'middle') {
        dy = y - bounds.y - bounds.height / 2;
    } else {
        dy = 0;
    }

    t = new Transform().translate(dx, dy);
    return t.transformShape(shape);
};

// Snap geometry to a grid.
vg.snap = function (shape, distance, strength, center) {
    if (!shape) {
        return;
    }
    strength = strength !== undefined ? strength : 1;
    center = center || Point.ZERO;

    var snapShape = function (shape) {
        if (shape.commands) {
            var p = new Path([], shape.fill, shape.stroke, shape.strokeWidth);
            for (var i = 0; i < shape.commands.length; i += 1) {
                var cmd = shape.commands[i];
                if (cmd.type === bezier.MOVETO || cmd.type === bezier.LINETO || cmd.type === bezier.CURVETO) {
                    var x = math.snap(cmd.x + center.x, distance, strength) - center.x;
                    var y = math.snap(cmd.y + center.y, distance, strength) - center.y;
                    if (cmd.type === bezier.MOVETO) {
                        p.moveTo(x, y);
                    } else if (cmd.type === bezier.LINETO) {
                        p.lineTo(x, y);
                    } else if (cmd.type === bezier.CURVETO) {
                        var x1 = math.snap(cmd.x1 + center.x, distance, strength) - center.x;
                        var y1 = math.snap(cmd.y1 + center.y, distance, strength) - center.y;
                        var x2 = math.snap(cmd.x2 + center.x, distance, strength) - center.x;
                        var y2 = math.snap(cmd.y2 + center.y, distance, strength) - center.y;
                        p.curveTo(x1, y1, x2, y2, x, y);
                    }
                } else if (cmd.type === bezier.CLOSE) {
                    p.close();
                } else {
                    throw new Error('Invalid path command ' + cmd);
                }
            }
            return p;
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, snapShape));
        } else {
            return _.map(shape, snapShape);
        }
    };

    return snapShape(shape);
};

vg.deletePoints = function (shape, bounding, deleteSelected) {
    var deletePoints = function (shape) {
        var i, cmd, commands = [];
        var pt, points = [];
        if (shape.commands) {
            for (i = 0; i < shape.commands.length; i += 1) {
                cmd = shape.commands[i];
                if (cmd.x === undefined ||
                        (!deleteSelected && bounding.contains(cmd.x, cmd.y)) ||
                        (deleteSelected && !bounding.contains(cmd.x, cmd.y))) {
                    commands.push(cmd);
                }
            }
            return new Path(commands, shape.fill, shape.stroke, shape.strokeWidth);
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, deletePoints));
        } else if (Array.isArray(shape) && shape.length > 0 && shape[0].x !== undefined && shape[0].y !== undefined){
            for (i = 0; i < shape.length; i += 1) {
                pt = shape[i];
                if ((!deleteSelected && bounding.contains(pt.x, pt.y)) ||
                   (deleteSelected && !bounding.contains(pt.x, pt.y))) {
                    points.push(pt);
                }
            }
            return points;
        } else {
            return _.map(shape, deletePoints);
        }
    };

    return deletePoints(shape);
};

vg.deletePaths = function (shape, bounding, deleteSelected) {
    var deletePaths = function (shape) {
        if (shape.commands) {
            return null;
        } else if (shape.shapes) {
            var i, j, s, selected, cmd, subShapes, newShapes = [];
            for (i = 0; i < shape.shapes.length; i += 1) {
                s = shape.shapes[i];
                if (s.commands) {
                    selected = false;
                    for (j = 0; j < s.commands.length; j += 1) {
                        cmd = s.commands[j];
                        if (cmd.x !== undefined && bounding.contains(cmd.x, cmd.y)) {
                            selected = true;
                            break;
                        }
                    }
                    if (selected !== deleteSelected) {
                        newShapes.push(s);
                    }
                } else if (s.shapes) {
                    subShapes = deletePaths(s);
                    if (subShapes.length !== 0) {
                        newShapes.push(subShapes);
                    }
                }
            }
            return new Group(newShapes);
        } else {
            return _.map(shape, deletePaths);
        }
    };

    return deletePaths(shape);
};

vg['delete'] = function (shape, bounding, scope, deleteSelected) {
    if (shape === null || bounding === null) { return null; }
    if (scope === 'points') { return vg.deletePoints(shape, bounding, deleteSelected); }
    if (scope === 'paths') { return vg.deletePaths(shape, bounding, deleteSelected); }
    throw new Error('Invalid scope.');
};

vg.pointOnPath = function (shape, t) {
    var pt;
    if (!shape) {
        return;
    }
    if (shape.shapes) {
        shape = new Path(vg.combinePaths(shape));
    }
    t = Math.abs(t % 1);
    pt = shape.point(t);
    return {x: pt.x, y: pt.y};
};

/*vg.shapeOnPath = function (shapes, path, amount, alignment, spacing, margin, baselineOffset) {
    if (!shapes) { return []; }
    if (path === null) { return []; }

    if (alignment === 'trailing') {
        shapes = shapes.slice();
        shapes.reverse();
    }

    var i, pos, p1, p2, a, t,
        length = path.length() - margin,
        m = margin / path.length(),
        c = 0,
        newShapes = [];

    function putOnPath(shape) {
        if (alignment === 'distributed') {
            var p = length / ((amount * shapes.length) - 1);
            pos = c * p / length;
            pos = m + (pos * (1 - 2 * m));
        } else {
            pos = ((c * spacing) % length) / length;
            pos = m + (pos * (1 - m));

            if (alignment === 'trailing') {
                pos = 1 - pos;
            }
        }

        p1 = path.point(pos);
        p2 = path.point(pos + 0.0000001);
        a = geo.angle(p1.x, p1.y, p2.x, p2.y);
        if (baselineOffset) {
            p1 = geo.coordinates(p1.x, p1.y, baselineOffset, a - 90);
        }
        t = new Transform();
        t = t.translate(p1.x, p1.y);
        t = t.rotate(a);
        newShapes.push(t.transformShape(shape));
        c += 1;
    }

    for (i = 0; i < amount; i += 1) {
        _.each(shapes, putOnPath);
    }
    return newShapes;
};*/

vg._x = function (shape) {
    if (shape.x !== undefined) {
        return shape.x;
    } else {
        return shape.bounds().x;
    }
};

vg._y = function (shape) {
    if (shape.y !== undefined) {
        return shape.y;
    } else {
        return shape.bounds().y;
    }
};

vg._angleToPoint = function (point) {
    return function (shape) {
        if (shape.x !== undefined && shape.y !== undefined) {
            return geo.angle(shape.x, shape.y, point.x, point.y);
        } else {
            var centerPoint = shape.bounds().centerPoint();
            return geo.angle(centerPoint.x, centerPoint.y, point.x, point.y);
        }
    };
};

vg._distanceToPoint = function (point) {
    return function (shape) {
        if (shape.x !== undefined && shape.y !== undefined) {
            return geo.distance(shape.x, shape.y, point.x, point.y);
        } else {
            var centerPoint = shape.bounds().centerPoint();
            return geo.distance(centerPoint.x, centerPoint.y, point.x, point.y);
        }
    };
};

vg.shapeSort = function (shapes, method, origin) {
    if (!shapes) {
        return;
    }
    origin = origin || Point.ZERO;

    var methods = {
        x: vg._x,
        y: vg._y,
        angle: vg._angleToPoint(origin),
        distance: vg._distanceToPoint(origin)
    };
    method = methods[method];
    if (method === undefined) { return shapes; }
    var newShapes = shapes.slice(0);
    newShapes.sort(function (a, b) {
        var _a = method(a),
            _b = method(b);
        if (_a < _b) { return -1; }
        if (_a > _b) { return 1; }
        return 0;
    });
    return newShapes;
};

vg.group = function () {
    return new Group(_.flatten(arguments));
};

vg.ungroup = function (shape) {
    if (!shape) {
        return [];
    } else if (shape.shapes) {
        var i, s, shapes = [];
        for (i = 0; i < shape.shapes.length; i += 1) {
            s = shape.shapes[i];
            if (s.commands) {
                shapes.push(s);
            } else if (s.shapes) {
                shapes = shapes.concat(vg.ungroup(s));
            }
        }
        return shapes;
    } else if (shape.commands) {
        return [shape];
    } else {
        return [];
    }
};

vg.centerPoint = function (shape) {
    if (!shape) {
        return Point.ZERO;
    }
    var r = shape.bounds();
    return new Point(r.x + r.width / 2, r.y + r.height / 2);
};

vg.link = function (shape1, shape2, orientation) {
    if (!shape1 || !shape2) {
        return;
    }

    var p = new Path();
    var a = shape1.bounds();
    var b = shape2.bounds();
    if (orientation === vg.HORIZONTAL) {
        var hw = (b.x - (a.x + a.width)) / 2;
        p.moveTo(a.x + a.width, a.y);
        p.curveTo(a.x + a.width + hw, a.y, b.x - hw, b.y, b.x, b.y);
        p.lineTo(b.x, b.y + b.height);
        p.curveTo(b.x - hw, b.y + b.height, a.x + a.width + hw, a.y + a.height, a.x + a.width, a.y + a.height);
        p.close();
    } else {
        var hh = (b.y - (a.y + a.height)) / 2;
        p.moveTo(a.x, a.y + a.height);
        p.curveTo(a.x, a.y + a.height + hh, b.x, b.y - hh, b.x, b.y);
        p.lineTo(b.x + b.width, b.y);
        p.curveTo(b.x + b.width, b.y - hh, a.x + a.width, a.y + a.height + hh, a.x + a.width, a.y + a.height);
        p.close();
    }
    return p;
};

vg.stack = function (shapes, direction, margin) {
    if (!shapes) {
        return [];
    }
    if (shapes.length <= 1) {
        return shapes;
    }
    var tx, ty, t, bounds,
        firstBounds = shapes[0].bounds(),
        newShapes = [];
    if (direction === vg.EAST) {
        tx = -(firstBounds.width / 2);
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(tx - bounds.x, 0);
            newShapes.push(t.transformShape(shape));
            tx += bounds.width + margin;
        });
    } else if (direction === vg.WEST) {
        tx = firstBounds.width / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(tx + bounds.x, 0);
            newShapes.push(t.transformShape(shape));
            tx -= bounds.width + margin;
        });
    } else if (direction === vg.NORTH) {
        ty = firstBounds.height / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(0, ty + bounds.y);
            newShapes.push(t.transformShape(shape));
            ty -= bounds.height + margin;
        });
    } else if (direction === vg.SOUTH) {
        ty = -(firstBounds.height / 2);
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(0, ty - bounds.y);
            newShapes.push(t.transformShape(shape));
            ty += bounds.height + margin;
        });
    }
    return newShapes;
};

vg.colorLookup = function (c, comp) {
    c = Color.parse(c);
    switch(comp) {
        case 'r':
            return c.r;
        case 'g':
            return c.g;
        case 'b':
            return c.b;
        case 'a':
            return c.a;
        case 'h':
            return c.h;
        case 's':
            return c.s;
        case 'v':
            return c.v;
        default:
            throw new Error('Unknown component ' + comp);
    }
};

vg.compound = function (shape1, shape2, method) {
    var methods = {
        'union': ClipperLib.ClipType.ctUnion,
        'difference': ClipperLib.ClipType.ctDifference,
        'intersection': ClipperLib.ClipType.ctIntersection,
        'xor': ClipperLib.ClipType.ctXor
    };

    function toPoints(shape) {
        var l1 = [];
        var i, l, s, j, pt;
        for (i = 0; i < shape.length; i += 1) {
            l = [];
            s = shape[i];
            for (j = 0; j < s.length; j += 1) {
                pt = s[j];
                if (pt.type !== bezier.CLOSE) {
                    l.push({X: pt.x, Y: pt.y});
                }
            }
            l1.push(l);
        }
        return l1;
    }

    if (!shape1.commands) { shape1 = Path.combine(shape1); }
    if (!shape2.commands) { shape2 = Path.combine(shape2); }
    var contours1 = shape1.resampleByLength(1).contours();
    var contours2 = shape2.resampleByLength(1).contours();

    var subjPaths = toPoints(contours1);
    var clipPaths = toPoints(contours2);
    var scale = 100;
    ClipperLib.JS.ScaleUpPaths(subjPaths, scale);
    ClipperLib.JS.ScaleUpPaths(clipPaths, scale);

    var cpr = new ClipperLib.Clipper();
    cpr.AddPaths(subjPaths, ClipperLib.PolyType.ptSubject, shape1.isClosed());
    cpr.AddPaths(clipPaths, ClipperLib.PolyType.ptClip, shape2.isClosed());

    var solutionPaths = new ClipperLib.Paths();
    cpr.Execute(methods[method], solutionPaths, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    solutionPaths = ClipperLib.JS.Clean(solutionPaths, 0.1 * scale);
    ClipperLib.JS.ScaleDownPaths(solutionPaths, scale);
    var path = new Path();
    var i, j, s;
    for (i = 0; i < solutionPaths.length; i += 1) {
        s = solutionPaths[i];
        for (j = 0; j < s.length ; j += 1) {
            if (j === 0) {
                path.moveTo(s[j].X, s[j].Y);
            } else {
                path.lineTo(s[j].X, s[j].Y);
            }
        }
        if (s[0].X !== s[s.length-1].X || s[0].Y !== s[s.length-1].Y) {
            path.closePath();
        }
    }
    return path;
};

module.exports = vg;
