// Object cloning

'use strict';

var Color = require('./color').Color;

exports.color = function (c) {
    if (c === null || c === undefined) {
        return null;
    } else if (typeof c === 'string') {
        return c;
    } else {
        return new Color(c.r, c.g, c.b, c.a);
    }
};

exports.command = function (cmd) {
    var newCmd = {type: cmd.type};
    if (newCmd.type !== 'Z') {
        newCmd.x = cmd.x;
        newCmd.y = cmd.y;
    }
    if (newCmd.type === 'C') {
        newCmd.x1 = cmd.x1;
        newCmd.y1 = cmd.y1;
        newCmd.x2 = cmd.x2;
        newCmd.y2 = cmd.y2;
    }
    return newCmd;
};