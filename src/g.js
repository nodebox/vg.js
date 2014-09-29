// g.js
// JavaScript library for vector graphics
// https://github.com/nodebox/g.js
// (c) 2014 EMRG
// g.js may be freely distributed under the MIT license.
// Based on: canvas.js, https://github.com/clips/pattern/blob/master/pattern/canvas.js (BSD)
// De Smedt T. & Daelemans W. (2012). Pattern for Python. Journal of Machine Learning Research.

'use strict';

var g = {};

// Sub-namespaces
g.bezier = require('./bezier');
g.geo = require('./geo');
g.math = require('./math');
g.random = require('./random');
g.svg = require('./svg');

// Objects
g.Color = require('./color').Color;
g.Group = require('./group').Group;
g.Matrix4 = require('./matrix4').Matrix4;
g.Path = require('./path').Path;
g.Point = g.Vec2 = require('./point').Point;
g.Rect = require('./rect').Rect;
g.Text = require('./text').Text;
g.Transform = g.Matrix3 = require('./transform').Transform;
g.Vec3 = require('./vec3').Vec3;

var k;
// Shape creation functions (e.g. rect, star)
var shapes = require('./shapes');
for (k in shapes) {
    g[k] = shapes[k];
}

// Commands (e.g. snap, rotate)
var commands = require('./commands');
for (k in commands) {
    g[k] = commands[k];
}

// Drawing commands (e.g. draw, isDrawable)
var commands = require('./draw');
for (k in commands) {
    g[k] = commands[k];
}

module.exports = g;