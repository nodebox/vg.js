// Object creation / manipulation commands

'use strict';

var _ = require('underscore');

var color = require('./color');
var Color = color.Color;
var geo = require('./geo');
var group = require('./group');
var Group = group.Group;
var path = require('./path');
var Path = path.Path;
var Point = require('./point').Point;
var random = require('./random');
var Rect = require('./rect').Rect;
var Transform = require('./transform').Transform;

var g = {};

g.bounds = function (o) {
    var r, i, n;
    if (!o) {
        return new Rect();
    } else if (typeof o.bounds === 'function') {
        return o.bounds();
    } else if (o.x !== undefined && o.y !== undefined) {
        return new Rect(o.x, o.y, 0, 0);
    } else if (o.r !== undefined && o.g !== undefined && o.b !== undefined) {
        return new g.Rect(0, 0, 30, 30);
    } else if (Array.isArray(o)) {
        r = null;
        n = o.length;
        // A color array is special since the colors have no inherent position.
        if (n > 0 && o[0].r !== undefined && o[0].g !== undefined && o[0].b !== undefined) {
            return new Rect(0, 0, o.length * 30, 30);
        }
        for (i = 0; i < n; i += 1) {
            if (!r) {
                r = g.bounds(o[i]);
            } else {
                r = r.unite(g.bounds(o[i]));
            }
        }
        return r || new Rect();
    } else {
        return new Rect();
    }
};

g.makeCenteredRect = function (cx, cy, width, height) {
    var x = cx - width / 2,
        y = cy - height / 2;
    return new Rect(x, y, width, height);
};

g.makePoint = function (x, y) {
    return new Point(x, y);
};

g.makeRect = function (x, y, width, height) {
    return new Rect(x, y, width, height);
};

// Combine all given shape arguments into a new group.
// This function works like makeGroup, except that this can take any number
// of arguments.
g.merge = function () {
    return new Group(_.reject(_.flatten(arguments, true), _.isEmpty));
};

g.combinePaths = function (shape) {
    if (shape.commands) { return shape.commands; }
    var i, commands = [];
    for (i = 0; i < shape.shapes.length; i += 1) {
        commands = commands.concat(g.combinePaths(shape.shapes[i]));
    }
    return commands;
};

g.shapePoints = g.toPoints = function (shape) {
    if (!shape) {
        return [];
    }
    if (shape.commands) {
        return _.map(_.filter(shape.commands, function (cmd) { if (cmd.x !== undefined) { return true; } return false; }), function (cmd) { return {x: cmd.x, y: cmd.y}; });
    }
    var i, points = [];
    for (i = 0; i < shape.shapes.length; i += 1) {
        points = points.concat(g.shapePoints(shape.shapes[i]));
    }
    return points;
};

// FILTERS //////////////////////////////////////////////////////////////

g.colorize = function (shape, fill, stroke, strokeWidth) {
    if (!shape) {
        return;
    }
    return shape.colorize(fill, stroke, strokeWidth);
};

g.translate = function (shape, position) {
    if (!position) { position = Point.ZERO; }
    var t = new Transform().translate(position.x, position.y);
    return t.transformShape(shape);
};

g.scale = function (shape, scale, origin) {
    if (!origin) { origin = Point.ZERO; }
    var sx, sy;
    if (typeof scale === 'number') {
        sx = scale;
        sy = scale;
    } else {
        sx = scale.x;
        sy = scale.y;
    }
    var t = new Transform();
    t = t.translate(origin.x, origin.y);
    t = t.scale(sx / 100, sy / 100);
    t = t.translate(-origin.x, -origin.y);
    return t.transformShape(shape);
};

g.rotate = function (shape, angle, origin) {
    if (!origin) { origin = Point.ZERO; }
    var t = new Transform();
    t = t.translate(origin.x, origin.y);
    t = t.rotate(angle);
    t = t.translate(-origin.x, -origin.y);
    return t.transformShape(shape);
};

g.skew = function (shape, skew, origin) {
    if (!origin) { origin = Point.ZERO; }
    var t = new Transform();
    t = t.translate(origin.x, origin.y);
    t = t.skew(skew.x, skew.y);
    t = t.translate(-origin.x, -origin.y);
    return t.transformShape(shape);
};

g.copy = function (shape, copies, order, translate, rotate, scale) {
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

g.fit = function (shape, position, width, height, keepProportions) {
    if (!shape) {
        return;
    }
    keepProportions = keepProportions !== undefined ? keepProportions : true;
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

    if (keepProportions) {
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
// If keepProportions = true, the shape will not be stretched.
g.fitTo = function (shape, bounding, keepProportions) {
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

    return g.fit(shape, {x: bx + bw / 2, y: by + bh / 2}, bw, bh, keepProportions);
};

g.reflect = function (shape, position, angle, keepOriginal) {
    if (!shape) {
        return;
    }

    var f, reflectPath, reflectGroup, reflect, newShape;

    f = function (x, y) {
        var d = geo.distance(x, y, position.x, position.y),
            a = geo.angle(x, y, position.x, position.y),
            pt = geo.coordinates(position.x, position.y, d * Math.cos(g.math.radians(a - angle)), 180 + angle);
        d = geo.distance(x, y, pt.x, pt.y);
        a = geo.angle(x, y, pt.x, pt.y);
        pt = geo.coordinates(x, y, d * 2, a);
        return new Point(pt.x, pt.y);
    };

    reflectPath = function (path) {
        var commands = _.map(path.commands, function (cmd) {
            var pt, ctrl1, ctrl2;
            if (cmd.type === path.MOVETO) {
                pt = f(cmd.x, cmd.y);
                return path.moveTo(pt.x, pt.y);
            } else if (cmd.type === path.LINETO) {
                pt = f(cmd.x, cmd.y);
                return path.lineTo(pt.x, pt.y);
            } else if (cmd.type === path.CURVETO) {
                pt = f(cmd.x, cmd.y);
                ctrl1 = f(cmd.x1, cmd.y1);
                ctrl2 = f(cmd.x2, cmd.y2);
                return path.curveTo(ctrl1.x, ctrl1.y, ctrl2.x, ctrl2.y, pt.x, pt.y);
            } else {
                return cmd;
            }
        });
        return new Path(commands, path.fill, path.stroke, path.strokeWidth);
    };

    reflectGroup = function (group) {
        var shapes = _.map(group.shapes, function (shape) {
            return reflect(shape);
        });
        return new Group(shapes);
    };

    reflect = function (shape) {
        var fn = (shape.shapes) ? reflectGroup : reflectPath;
        return fn(shape);
    };

    newShape = reflect(shape);

    if (keepOriginal) {
        return new Group([shape, newShape]);
    } else {
        return newShape;
    }
};

g.resample = function (shape, method, length, points, perContour) {
    if (!shape) {
        return;
    }
    if (method === 'length') {
        return shape.resampleByLength(length);
    } else {
        return shape.resampleByAmount(points, perContour);
    }
};

g.wiggle = function (shape, scope, offset, seed) {
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
            var cmd, commands = [];
            for (i = 0; i < shape.commands.length; i += 1) {
                dx = (rand(0, 1) - 0.5) * offset.x * 2;
                dy = (rand(0, 1) - 0.5) * offset.y * 2;
                cmd = shape.commands[i];
                if (cmd.type === path.CLOSE) {
                    commands.push(cmd);
                } else if (cmd.type === path.MOVETO) {
                    commands.push(path.moveTo(cmd.x + dx, cmd.y + dy));
                } else if (cmd.type === path.LINETO) {
                    commands.push(path.lineTo(cmd.x + dx, cmd.y + dy));
                } else if (cmd.type === path.CURVETO) {
                    commands.push(path.curveTo(cmd.x1, cmd.y1,
                                     cmd.x2, cmd.y2,
                                     cmd.x + dx, cmd.y + dy));
                }
            }
            return new Path(commands, shape.fill, shape.stroke, shape.strokeWidth);
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
                subPaths = g.getContours(shape),
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

g.scatter = function (shape, amount, seed) {
    // Generate points within the boundaries of a shape.
    if (!shape) {
        return;
    }
    var i, tries, x, y,
        rand = random.generator(seed),
        bounds = shape.bounds(),
        bx = bounds.x,
        by = bounds.y,
        bw = bounds.width,
        bh = bounds.height,
        points = [];

    for (i = 0; i < amount; i += 1) {
        tries = 100;
        while (tries > 0) {
            x = bx + rand(0, 1) * bw;
            y = by + rand(0, 1) * bh;
            if (shape.contains(x, y)) {
                points.push(new Point(x, y));
                break;
            }
            tries -= 1;
        }
    }
    return points;
};

g.connect = function (points, closed) {
    if (!points) {
        return;
    }
    var i, pt, commands = [];
    for (i = 0; i < points.length; i += 1) {
        pt = points[i];
        commands.push((i === 0 ? path.moveTo : path.lineTo)(pt.x, pt.y));
    }
    if (closed) {
        commands.push(path.close());
    }
    return new Path(commands, null, Color.BLACK, 1);
};

g.align = function (shape, position, hAlign, vAlign) {
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
g.snap = function (shape, distance, strength, position) {
    if (!shape) {
        return;
    }
    if (!position) {
        position = Point.ZERO;
    }
    strength /= 100.0;

    var snapShape = function (shape) {
        if (shape.commands) {
            var commands = _.map(shape.commands, function (cmd) {
                if (cmd.type === path.CLOSE) { return cmd; }
                var x, y, ctrl1x, ctrl1y, ctrl2x, ctrl2y;
                x = g.math.snap(cmd.x + position.x, distance, strength) - position.x;
                y = g.math.snap(cmd.y + position.y, distance, strength) - position.y;
                if (cmd.type === path.MOVETO) {
                    return path.moveTo(x, y);
                } else if (cmd.type === path.LINETO) {
                    return path.lineTo(x, y);
                } else if (cmd.type === path.CURVETO) {
                    ctrl1x = g.math.snap(cmd.x1 + position.x, distance, strength) - position.x;
                    ctrl1y = g.math.snap(cmd.y1 + position.y, distance, strength) - position.y;
                    ctrl2x = g.math.snap(cmd.x2 + position.x, distance, strength) - position.x;
                    ctrl2y = g.math.snap(cmd.y2 + position.y, distance, strength) - position.y;
                    return path.curveTo(ctrl1x, ctrl1y, ctrl2x, ctrl2y, x, y);
                } else {
                    throw new Error('Invalid command type.');
                }
            });
            return new Path(commands, shape.fill, shape.stroke, shape.strokeWidth);
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, snapShape));
        } else {
            return _.map(shape, snapShape);
        }
    };

    return snapShape(shape);
};

g.deletePoints = function (shape, bounding, deleteSelected) {
    var deletePoints = function (shape) {
        if (shape.commands) {
            var i, cmd, commands = [];
            for (i = 0; i < shape.commands.length; i += 1) {
                cmd = shape.commands[i];
                if (cmd.x === undefined ||
                        (deleteSelected && bounding.contains(cmd.x, cmd.y)) ||
                        (!deleteSelected && !bounding.contains(cmd.x, cmd.y))) {
                    commands.push(cmd);
                }
            }
            return new Path(commands, shape.fill, shape.stroke, shape.strokeWidth);
        } else if (shape.shapes) {
            return new Group(_.map(shape.shapes, deletePoints));
        } else {
            return _.map(shape, deletePoints);
        }
    };

    return deletePoints(shape);
};

g.deletePaths = function (shape, bounding, deleteSelected) {
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

g['delete'] = function (shape, bounding, scope, operation) {
    if (shape === null || bounding === null) { return null; }
    var deleteSelected = operation === 'selected';
    if (scope === 'points') { return g.deletePoints(shape, bounding, deleteSelected); }
    if (scope === 'paths') { return g.deletePaths(shape, bounding, deleteSelected); }
    throw new Error('Invalid scope.');
};

g.pointOnPath = function (shape, t) {
    var pt;
    if (!shape) {
        return;
    }
    if (shape.shapes) {
        shape = new Path(g.combinePaths(shape));
    }
    t = Math.abs(t % 100);
    pt = shape.point(t / 100);
    return {x: pt.x, y: pt.x};
};

g.shapeOnPath = function (shapes, path, amount, alignment, spacing, margin, baselineOffset) {
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
};

g._x = function (shape) {
    if (shape.x) {
        return shape.x;
    } else {
        return shape.bounds().x;
    }
};

g._y = function (shape) {
    if (shape.y) {
        return shape.y;
    } else {
        return shape.bounds().y;
    }
};

g._angleToPoint = function (point) {
    return function (shape) {
        if (shape.x && shape.y) {
            return geo.angle(shape.x, shape.y, point.x, point.y);
        } else {
            var centroid = shape.bounds().centroid();
            return geo.angle(centroid.x, centroid.y, point.x, point.y);
        }
    };
};

g._distanceToPoint = function (point) {
    return function (shape) {
        if (shape.x && shape.y) {
            return geo.distance(shape.x, shape.y, point.x, point.y);
        } else {
            var centroid = shape.bounds().centroid();
            return geo.distance(centroid.x, centroid.y, point.x, point.y);
        }
    };
};

g.sort = function (shapes, orderBy, point) {
    if (!shapes) {
        return;
    }
    var methods, sortMethod, newShapes;
    methods = {
        x: g._x,
        y: g._y,
        angle: g._angleToPoint(point),
        distance: g._distanceToPoint(point)
    };
    sortMethod = methods[orderBy];
    if (sortMethod === undefined) { return shapes; }
    newShapes = shapes.slice(0);
    newShapes.sort(function (a, b) {
        var _a = sortMethod(a),
            _b = sortMethod(b);
        if (_a < _b) { return -1; }
        if (_a > _b) { return 1; }
        return 0;
    });
    return newShapes;
};

g.ungroup = function (shape) {
    if (!shape) {
        return [];
    } else if (shape.shapes) {
        var i, s, shapes = [];
        for (i = 0; i < shape.shapes.length; i += 1) {
            s = shape.shapes[i];
            if (s.commands) {
                shapes.push(s);
            } else if (s.shapes) {
                shapes = shapes.concat(g.ungroup(s));
            }
        }
        return shapes;
    } else if (shape.commands) {
        return [shape];
    } else {
        return [];
    }
};

g.centroid = function (shape) {
    if (!shape) {
        return Point.ZERO;
    }
    var i,
        commands = g.combinePaths(shape),
        xs = commands[0].x,
        ys = commands[0].y,
        count = 1;
    for (i = 1; i < commands.length; i += 1) {
        if (commands[i].x1 !== undefined) {
            xs += commands[i].x1;
            ys += commands[i].y1;
            xs += commands[i].x2;
            ys += commands[i].y2;
            count += 2;
        }
        if (commands[i].x !== undefined) {
            xs += commands[i].x;
            ys += commands[i].y;
            count += 1;
        }
    }
    return new Point(xs / count, ys / count);
};

g.link = function (shape1, shape2, orientation) {
    if (!shape1 || !shape2) {
        return;
    }
    var commands, hw, hh,
        a = shape1.bounds(),
        b = shape2.bounds();

    if (orientation === 'horizontal') {
        hw = (b.x - (a.x + a.width)) / 2;
        commands = [
            path.moveTo(a.x + a.width, a.y),
            path.curveTo(a.x + a.width + hw, a.y, b.x - hw, b.y, b.x, b.y),
            path.lineTo(b.x, b.y + b.height),
            path.curveTo(b.x - hw, b.y + b.height, a.x + a.width + hw, a.y + a.height, a.x + a.width, a.y + a.height)
        ];
    } else {
        hh = (b.y - (a.y + a.height)) / 2;
        commands = [
            path.moveTo(a.x, a.y + a.height),
            path.curveTo(a.x, a.y + a.height + hh, b.x, b.y - hh, b.x, b.y),
            path.lineTo(b.x + b.width, b.y),
            path.curveTo(b.x + b.width, b.y - hh, a.x + a.width, a.y + a.height + hh, a.x + a.width, a.y + a.height)
        ];
    }
    return new Path(commands);
};

g.stack = function (shapes, direction, margin) {
    if (!shapes) {
        return [];
    }
    if (shapes.length <= 1) {
        return shapes;
    }
    var tx, ty, t, bounds,
        firstBounds = shapes[0].bounds(),
        newShapes = [];
    if (direction === 'e') {
        tx = -(firstBounds.width / 2);
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(tx - bounds.x, 0);
            newShapes.push(t.transformShape(shape));
            tx += bounds.width + margin;
        });
    } else if (direction === 'w') {
        tx = firstBounds.width / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(tx + bounds.x, 0);
            newShapes.push(t.transformShape(shape));
            tx -= bounds.width + margin;
        });
    } else if (direction === 'n') {
        ty = firstBounds.height / 2;
        _.each(shapes, function (shape) {
            bounds = shape.bounds();
            t = new Transform().translate(0, ty + bounds.y);
            newShapes.push(t.transformShape(shape));
            ty -= bounds.height + margin;
        });
    } else if (direction === 's') {
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

g.colorLookup = function (color, comp) {
    if (color._namedColors[color]) {
        color = color._namedColors[color];
        color = new Color(color[0], color[1], color[2]);
    }
    var rgba = color.rgba();
    if (comp === 'r') { return rgba[0]; }
    else if (comp === 'g') { return rgba[1]; }
    else if (comp === 'b') { return rgba[2]; }
    else if (comp === 'a') { return rgba[3]; }
    else if (comp === 'h' || comp === 's' || comp === 'v') {
        var hsb = color._rgb2hsb(rgba[0], rgba[1], rgba[2]);
        if (comp === 'h') { return hsb[0]; }
        else if (comp === 's') { return hsb[1]; }
        else if (comp === 'v') { return hsb[2]; }
    }
    return null;
};

module.exports = g;