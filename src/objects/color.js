// Color object

'use strict';

var color = require('../util/color');

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
        _a = v1[3] !== undefined ? v1[3] : options.base || 1;
    } else if (v1.r !== undefined) {
        options = v2 || {};
        _r = v1.r;
        _g = v1.g;
        _b = v1.b;
        _a = v1.a !== undefined ? v1.a : options.base || 1;
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
                _a = options.base || 1;
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
                _a = options.base || 1;
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

    // The base option allows you to specify values in a different range.
    if (options.base !== undefined) {
        _r /= options.base;
        _g /= options.base;
        _b /= options.base;
        _a /= options.base;
    }
    // Convert HSB colors to RGB
    if (options.colorspace === HSB) {
        rgb = color.hsb2rgb(v1, v2, v3);
        _r = rgb[0];
        _g = rgb[1];
        _b = rgb[2];
    } else if (options.colorspace === HEX) {
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

Color.prototype.rgb = function () {
    return [this.r, this.g, this.b];
};

Color.prototype.rgba = function () {
    return [this.r, this.g, this.b, this.a];
};

Color.prototype._get = function () {
    return Color.toCSS(this);
};

Object.defineProperty(Color.prototype, 'h', {
    get: function () {
        return color.rgb2hsb(this.r, this.g, this.b)[0];
    }
});

Object.defineProperty(Color.prototype, 's', {
    get: function () {
        return color.rgb2hsb(this.r, this.g, this.b)[1];
    }
});

Object.defineProperty(Color.prototype, 'v', {
    get: function () {
        return color.rgb2hsb(this.r, this.g, this.b)[2];
    }
});

Color.clone = function (c) {
    if (c === null || c === undefined) {
        return null;
    } else if (typeof c === 'string') {
        return c;
    } else {
        return new Color(c.r, c.g, c.b, c.a);
    }
};

Color.get = function (c) {
    if (c === null) { return 'none'; }
    if (c === undefined) { return 'black'; }
    if (typeof c === 'string') { return c; }
    if (c instanceof Color) { return c._get(); }
    return new Color(c)._get();
};

Color.toCSS = function (c) {
    if (typeof c === 'string') {
        // We're going to assume the color is already a CSS string.
        return c;
    }
    var R = Math.round(c.r * 255),
        G = Math.round(c.g * 255),
        B = Math.round(c.b * 255);
    return 'rgba(' + R + ', ' + G + ', ' + B + ', ' + c.a + ')';
};

Color.make = function (r, g, b, a, options) {
    return new Color(r, g, b, a, options);
};

Color.parse = function (s) {
    if (s instanceof Color) {
        return s;
    } else if (color.namedColors[s]) {
        return Color.make.apply(null, color.namedColors[s]);
    } else if (s[0] === '#') {
        return new Color(s, 0, 0, 0, {colorspace: HEX});
    } else if (s === 'none') {
        return null;
    } else {
        return undefined;
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
    return new Color(hue / range, saturation / range, brightness / range, alpha / range, { colorspace: HSB });
};

module.exports = Color;
