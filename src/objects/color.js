// Color object

'use strict';

var color = require('../util/color');
var js = require('../util/js');

// var RGB = 'RGB';
var HSB = 'HSB';
var HEX = 'HEX';

var Color = function (v1, v2, v3, v4, v5) {
    var _r, _g, _b, _a, rgb, options;
    if (v1 === undefined) {
        _r = _g = _b = 0;
        _a = 1;
    } else if (Array.isArray(v1)) {
        options = v2 || {};
        _r = v1[0] !== undefined ? v1[0] : 0;
        _g = v1[1] !== undefined ? v1[1] : 0;
        _b = v1[2] !== undefined ? v1[2] : 0;
        _a = v1[3] !== undefined ? v1[3] : options.range || 1;
    } else if (v1.r !== undefined) {
        options = v2 || {};
        _r = v1.r;
        _g = v1.g;
        _b = v1.b;
        _a = v1.a !== undefined ? v1.a : options.range || 1;
    } else if (typeof v1 === 'string') {
        rgb = color.hex2rgb(v1);
        _r = rgb[0];
        _g = rgb[1];
        _b = rgb[2];
        _a = 1;
    } else if (typeof v1 === 'number') {
        if (arguments.length === 1) { // Grayscale value
            _r = _g = _b = v1;
            _a = 1;
        } else if (arguments.length === 2) { // Gray and alpha or options
            _r = _g = _b = v1;
            if (typeof v2 === 'number') {
                _a = v2;
            } else {
                options = v2;
                _a = options.range || 1;
            }
        } else if (arguments.length === 3) { // RGB or gray, alpha and options
            if (typeof v3 === 'number') {
                _r = v1;
                _g = v2;
                _b = v3;
                _a = 1;
            } else {
                _r = _g = _b = v1;
                _a = v2;
                options = v3;
            }
        } else if (arguments.length === 4) { // RGB and alpha or options
            _r = v1;
            _g = v2;
            _b = v3;
            if (typeof v4 === 'number') {
                _a = v4;
            } else {
                options = v4;
                _a = options.range || 1;
            }
        } else { // RGBA + options
            _r = v1;
            _g = v2;
            _b = v3;
            _a = v4;
            options = v5;
        }
    }
    options = options || {};

    // The range option allows you to specify values in a different range.
    if (options.range !== undefined) {
        _r /= options.range;
        _g /= options.range;
        _b /= options.range;
        _a /= options.range;
    }
    // Convert HSB colors to RGB
    if (options.mode === HSB) {
        rgb = color.hsb2rgb(v1, v2, v3);
        _r = rgb[0];
        _g = rgb[1];
        _b = rgb[2];
    } else if (options.mode === HEX) {
        rgb = color.hex2rgb(v1);
        _r = rgb[0];
        _g = rgb[1];
        _b = rgb[2];
        _a = 1;
    }

    this.r = _r;
    this.g = _g;
    this.b = _b;
    this.a = _a;
};

Color.BLACK = new Color(0);
Color.WHITE = new Color(1);

js.defineAlias(Color, 'r', 'red');
js.defineAlias(Color, 'g', 'green');
js.defineAlias(Color, 'b', 'blue');
js.defineAlias(Color, 'a', 'alpha');

js.defineGetter(Color, 'h', function () {
    return color.rgb2hsb(this.r, this.g, this.b)[0];
});

js.defineGetter(Color, 's', function () {
    return color.rgb2hsb(this.r, this.g, this.b)[1];
});

js.defineGetter(Color, 'v', function () {
    return color.rgb2hsb(this.r, this.g, this.b)[2];
});

js.defineAlias(Color, 'h', 'hue');
js.defineAlias(Color, 's', 'saturation');
js.defineAlias(Color, 'v', 'value');
js.defineAlias(Color, 'v', 'brightness');


js.defineGetter(Color, 'rgb', function () {
    return [this.r, this.g, this.b];
});

js.defineGetter(Color, 'rgba', function () {
    return [this.r, this.g, this.b, this.a];
});

js.defineGetter(Color, 'hsb', function () {
    return color.rgb2hsb(this.r, this.g, this.b);
});

js.defineGetter(Color, 'hsba', function () {
    return color.rgb2hsb(this.r, this.g, this.b).concat([this.a]);
});

Color.prototype.toCSS = function () {
    return Color.toCSS(this);
};

Color.prototype.toHex = function () {
    if (this.a >= 1) {
        return color.rgb2hex(this.r, this.g, this.b);
    } else {
        return color.rgba2hex(this.r, this.g, this.b, this.a);
    }
};

Color.clone = function (c) {
    if (c === null || c === undefined) {
        return null;
    } else if (typeof c === 'string') {
        return c;
    } else {
        return new Color(c.r, c.g, c.b, c.a);
    }
};

Color.toCSS = function (c) {
    if (c === null) {
        return 'none';
    } else if (c === undefined) {
        return 'black';
    } else if (typeof c === 'string') {
        return c;
    } else if (c instanceof Color) {
        var r255 = Math.round(c.r * 255),
            g255 = Math.round(c.g * 255),
            b255 = Math.round(c.b * 255);
        return 'rgba(' + r255 + ', ' + g255 + ', ' + b255 + ', ' + c.a + ')';
    } else {
        throw new Error('Don\'t know how to convert ' + c + ' to CSS.');
    }
};

Color.toHex = function (c) {
    return Color.parse(c).toHex();
};

Color.make = function () {
    var c = Object.create(Color.prototype);
    c.constructor = Color.prototype;
    Color.apply(c, arguments);
    return c;
};

Color.parse = function (s) {
    if (s === undefined || s === null) {
        return new Color(0, 0, 0, 0);
    } else if (s instanceof Color) {
        return s;
    } else if (color.namedColors[s]) {
        return Color.make.apply(null, color.namedColors[s]);
    } else if (s[0] === '#') {
        return new Color(s, 0, 0, 0, { mode: HEX });
    } else if (s === 'none') {
        return new Color(0, 0, 0, 0);
    } else {
        throw new Error('Color ' + s + 'can not be parsed');
    }
};

Color.gray = function (gray, alpha, range) {
    range = Math.max(range, 1);
    return new Color(gray / range, gray / range, gray / range, alpha / range);
};

Color.rgb = function (red, green, blue, alpha, range) {
    range = Math.max(range, 1);
    return new Color(red / range, green / range, blue / range, alpha / range);
};

Color.hsb = function (hue, saturation, brightness, alpha, range) {
    range = Math.max(range, 1);
    return new Color(hue / range, saturation / range, brightness / range, alpha / range, { mode: HSB });
};

module.exports = Color;
