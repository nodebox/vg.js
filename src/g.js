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
g.bezier = require('./util/bezier');
g.geo = require('./util/geo');
g.math = require('./util/math');
g.random = require('./util/random');
g.svg = require('./util/svg');

// Objects
g.Color = require('./objects/color').Color;
g.Group = require('./objects/group').Group;
g.Matrix4 = require('./objects/matrix4').Matrix4;
g.Path = require('./objects/path').Path;
g.Point = g.Vec2 = require('./objects/point').Point;
g.Rect = require('./objects/rect').Rect;
g.Text = require('./objects/text').Text;
g.Transform = g.Matrix3 = require('./objects/transform').Transform;
g.Vec3 = require('./objects/vec3').Vec3;



// Commands
function importCommands(module) {
    for (var k in module) {
        g[k] = module[k];
    }
}

var drawModule = require('./commands/draw');
importCommands(drawModule);
var filterModule = require('./commands/filters');
importCommands(filterModule);
var shapesModule = require('./commands/shapes');
importCommands(shapesModule);

module.exports = g;