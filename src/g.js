// g.js
// JavaScript library for vector graphics
// https://github.com/nodebox/g.js
// (c) 2014 EMRG
// g.js may be freely distributed under the MIT license.
// Based on: canvas.js, https://github.com/clips/pattern/blob/master/pattern/canvas.js (BSD)
// De Smedt T. & Daelemans W. (2012). Pattern for Python. Journal of Machine Learning Research.

'use strict';

var g = {};

// Utility functions
g.bezier = require('./util/bezier');
g.color = require('./util/color');
g.geo = require('./util/geo');
g.math = require('./util/math');
g.random = require('./util/random');
g.svg = require('./util/svg');

// Objects
g.Color = require('./objects/color');
g.Group = require('./objects/group');
g.Matrix4 = require('./objects/matrix4');
g.Path = require('./objects/path');
g.Point = g.Vec2 = require('./objects/point');
g.Rect = require('./objects/rect');
g.Text = require('./objects/text');
g.Transform = g.Matrix3 = require('./objects/transform');
g.Vec3 = require('./objects/vec3');

// Commands
function importCommands(module) {
    for (var k in module) {
        g[k] = module[k];
    }
}

importCommands(require('./commands/draw'));
importCommands(require('./commands/filters'));
importCommands(require('./commands/shapes'));

module.exports = g;