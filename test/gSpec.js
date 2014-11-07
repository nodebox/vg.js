'use strict';

var assert = require('assert');
var mocha = require('mocha');
var describe = mocha.describe;
var it = mocha.it;

var g = require('../src/g');

function assertAlmostEqual(v1, v2, delta) {
    delta = delta !== undefined ? delta : 0.0001;
    assert(Math.abs(v1 - v2) < delta);
}

function assertRectsAlmostEqual(r1, r2) {
    assertAlmostEqual(r1.x, r2.x);
    assertAlmostEqual(r1.y, r2.y);
    assertAlmostEqual(r1.width, r2.width);
    assertAlmostEqual(r1.height, r2.height);
}

function assertXYEqual(pt, x, y) {
    assert.equal(pt.x, x);
    assert.equal(pt.y, y);
}

describe('The math module', function () {

    it('can sum numbers', function () {
        assert.equal(g.math.sum([]), 0);
        assert.equal(g.math.sum([1]), 1);
        assert.equal(g.math.sum([1, 2, 3]), 6);
    });

    it('can round numbers', function () {
        assert.equal(g.math.round(0.1), 0);
        assert.equal(g.math.round(0.9), 1);
        assert.equal(g.math.round(1.234, 1), 1.2);
        assert.equal(g.math.round(1.289, 1), 1.3);
        assert.equal(g.math.round(123, -1), 120);
        assert.equal(g.math.round(123, -2), 100);
    });

    it('can clamp numbers', function () {
        assert.equal(g.math.clamp(5, -10, 10), 5);
        assert.equal(g.math.clamp(-100, -10, 10), -10);
        assert.equal(g.math.clamp(100, -10, 10), 10);
        assert.equal(g.math.clamp(42, 0, 0), 0);
        // You can switch min / max
        assert.equal(g.math.clamp(-100, -10, 10), -10);
        assert.equal(g.math.clamp(-100, 10, -10), -10);
    });

    it('can interpolate two numbers', function () {
        assert.equal(g.math.mix(0, 100, 0), 0);
        assert.equal(g.math.mix(0, 100, 1), 100);
        assert.equal(g.math.mix(0, 100, -1), -100);
        assert.equal(g.math.mix(0, 100, 2), 200);
        assert.equal(g.math.mix(0, 100, -1, true), 0);
        assert.equal(g.math.mix(0, 100, 2, true), 100);
    });

    it('can snap numbers', function () {
        assert.equal(g.math.snap(0, 100), 0);
        assert.equal(g.math.snap(49, 100), 0);
        assert.equal(g.math.snap(50, 100), 100);

        assert.equal(g.math.snap(50, 100, 0), 50);
        assert.equal(g.math.snap(50, 100, 0.5), 75);
        assert.equal(g.math.snap(50, 100, 1), 100);
    });

    it('can generate noise', function () {
        assert.equal(g.math.noise(0, 0, 0), 0.5);
        assert.equal(g.math.round(g.math.noise(0.1, 0.2, 0.3), 3), 0.676);
    });

});

describe('The bezier module', function () {

    it('can calculate line lengths', function () {
        assert.equal(g.bezier.lineLength(0, 0, 100, 0), 100);
        assert.equal(g.bezier.lineLength(100, 0, 0, 0), 100);
        assert.equal(Math.round(g.bezier.lineLength(0, 0, 50, 50)), 71);
    });

    it('can calculate segment lengths', function () {
        var p = new g.Path();
        p.moveTo(0, 0);
        p.lineTo(100, 0);
        p.lineTo(100, 50);
        p.close();
        var segmentLengths = g.bezier.segmentLengths(p.commands);
        assert.equal(segmentLengths.length, p.commands.length - 1);
        assert.equal(segmentLengths[0], 100);
        assert.equal(segmentLengths[1], 50);
        assert.equal(Math.round(segmentLengths[2]), 112);
    });

});

describe('A point', function () {

    it('has a sane constructor', function () {
        assert.deepEqual(new g.Point().xy, [0, 0]);
        assert.deepEqual(new g.Point(3, 5).xy, [3, 5]);
    });

});

describe('A path', function () {

    it('can render itself to SVG', function () {
        var p;
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        assert.equal(p.toSVG(), '<path d="M10 20L30 40Z"/>');
    });

    it('can clone itself', function () {
        var p, newP;
        p = new g.Path();
        p.fill = 'red';
        p.stroke = 'green';
        p.strokeWidth = 5;
        p.moveTo(33, 66);
        newP = p.clone();
        assert.deepEqual(newP.commands, [
            {type: 'M', x: 33, y: 66}
        ]);
        assert.equal(newP.fill, 'red');
        assert.equal(newP.stroke, 'green');
    });

    it('can be resampled', function () {
        var p = new g.Path(),
            newPath;
        p.addRect(10, 20, 30, 40);
        newPath = p.resampleByAmount(100);
        assert.equal(newPath.commands.length, 101); // 100 lines + 1 close command
    });

    it('can resample open shapes', function () {
        var p = new g.Path();
        p.addLine(10, 20, 30, 40);
        var newPath = p.resampleByAmount(100);
        assert.equal(newPath.commands.length, 100);
    });
});

describe('A group', function () {

    it('can render itself to SVG', function () {
        var group, p;
        group = new g.Group();
        assert.equal(group.toSVG(), '<g></g>');
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        group = g.group([p]);
        assert.equal(group.toSVG(), '<g><path d="M10 20L30 40Z"/></g>');
    });

    it('can clone itself', function () {
        var group, newGroup;
        group = new g.Group();
        group.add(g.demoRect());
        newGroup = group.clone();
        assert.equal(newGroup.shapes.length, 1);
    });

    it('has bounds', function () {
        var group, p1, p2;
        group = new g.Group();
        assert.deepEqual(group.bounds(), new g.Rect(0, 0, 0, 0));
        p1 = new g.Path();
        p1.addRect(10, 20, 30, 40);
        group = g.group([p1]);
        assert.deepEqual(group.bounds(), new g.Rect(10, 20, 30, 40));
        p2 = new g.Path();
        p2.addRect(100, 200, 10, 10);
        group = g.group([p1, p2]);
        assert.deepEqual(group.bounds(), new g.Rect(10, 20, 100, 190));
    });

    it('can merge shapes together', function () {
        var group;

        group = g.merge(g.demoRect());
        assert.equal(group.shapes.length, 1);

        // Skip nulls and undefineds
        group = g.merge(null, g.demoRect(), undefined, g.demoRect());
        assert.equal(group.shapes.length, 2);

        // Flatten lists (this is important for Maak)
        group = g.merge([g.demoRect(), g.demoRect()], g.demoRect());
        assert.equal(group.shapes.length, 3);
    });

});

describe('A text object', function () {

    function testArgs(t) {
        assert.equal(t.text, 'Hello');
        assert.equal(t.x, 10);
        assert.equal(t.y, 20);
        assert.equal(t.fontFamily, 'Helvetica');
        assert.equal(t.fontSize, 12);
        assert.equal(t.textAlign, 'right');
    }

    function testDefaultArgs(t) {
        assert.equal(t.text, 'Hello');
        assert.equal(t.x, 0);
        assert.equal(t.y, 0);
        assert.equal(t.fontFamily, 'sans-serif');
        assert.equal(t.fontSize, 24);
        assert.equal(t.textAlign, 'left');
    }

    it('has many constructor options', function () {
        testArgs(new g.Text('Hello', 10, 20, 'Helvetica', 12, 'right'));
        testArgs(new g.Text('Hello', [10, 20], 'Helvetica', 12, 'right'));
        testArgs(new g.Text('Hello', {x: 10, y: 20}, 'Helvetica', 12, 'right'));
        testArgs(new g.Text('Hello', 10, 20, {fontFamily: 'Helvetica', fontSize: 12, textAlign: 'right'}));
        testArgs(new g.Text('Hello', [10, 20], {fontFamily: 'Helvetica', fontSize: 12, textAlign: 'right'}));
        testArgs(new g.Text('Hello', [10, 20], {fontFamily: 'Helvetica', fontSize: 12, textAlign: 'right'}));
        testArgs(new g.Text('Hello', {x: 10, y: 20, fontFamily: 'Helvetica', fontSize: 12, textAlign: 'right'}));

        testDefaultArgs(new g.Text('Hello'));
        testDefaultArgs(new g.Text('Hello', 0, 0));
        testDefaultArgs(new g.Text('Hello', [0, 0]));
        testDefaultArgs(new g.Text('Hello', {x: 0, y: 0}));
        testDefaultArgs(new g.Text('Hello', 0, 0, 'sans-serif'));
        testDefaultArgs(new g.Text('Hello', {x: 0, y: 0}, 'sans-serif'));
        testDefaultArgs(new g.Text('Hello', {fontFamily: 'sans-serif'}));
    });

    it('has a corresponding function', function () {
        testArgs(g.text('Hello', 10, 20, 'Helvetica', 12, 'right'));
        testArgs(g.text('Hello', [10, 20], {fontFamily: 'Helvetica', fontSize: 12, textAlign: 'right'}));
        testDefaultArgs(g.text('Hello'));
        testDefaultArgs(g.text('Hello', [0, 0], 'sans-serif'));
    });

    it('can take options', function () {
        // `font` and `fontName` are aliases of `fontFamily`.
        var t = new g.Text('Hello', 20, 20, {fontSize: 18, font: 'Arial'});
        assert.equal(t.fontSize, 18);
        assert.equal(t.fontFamily, 'Arial');
    });

    it('is drawable', function () {
        var t = new g.Text('Hello', 20, 20);
        assert(g.isDrawable(t));
        t.bounds();
    });

    it('has bounds', function () {
        var text = 'Hello',
            fontSize = 24,
            t = new g.Text('Hello', 20, 20, {fontSize: fontSize}),
            bounds = g.bounds(t);
        assert.equal(bounds.x, 20);
        assert.equal(bounds.y, -4);
        // Because node.js doesn't have access to the canvas, we fake the width
        // measurement by taking the text.length and multiplying it by the font size,
        // then multiplying it by 0.6, which is the average character width across all
        // letters and font sizes.
        assert.equal(bounds.width, text.length * fontSize * 0.6);
        // The line height is hard-coded.
        assert.equal(bounds.height, 24 * 1.2);
    });

    it('supports alignment', function () {
        var tLeft = new g.Text('Hello', 0, 0, {textAlign: 'left'}),
            tRight = new g.Text('Hello', 0, 0, {textAlign: 'right'}),
            tCenter = new g.Text('Hello', 0, 0, {textAlign: 'center'});
        assert.equal(tLeft.bounds().x, 0);
        assert.equal(tRight.bounds().x, -(tRight.text.length * tRight.fontSize * 0.6));
        assert.equal(tCenter.bounds().x, -(tCenter.text.length * tRight.fontSize * 0.6) / 2);
    });

});

describe('A color', function () {

    it('has a default constructor', function () {
        var c = new g.Color();
        assert.deepEqual(c.rgba, [0, 0, 0, 1]);
    });

    it('can be constructed using numbers', function () {
        var c;
        c = new g.Color(0.1, 0.2, 0.3);
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 1]);
        c = new g.Color(0.1, 0.2, 0.3, 0.4);
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 0.4]);
    });

    it('can take a value range', function () {
        var c;
        c = new g.Color(10, 20, 30, {range: 100});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 1]);
        c = new g.Color(10, 20, 30, 40, {range: 100});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using an array', function () {
        var c;
        c = new g.Color([0.1, 0.2, 0.3, 0.4]);
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 0.4]);
        c = new g.Color([0, 0, 0, 0]);
        assert.deepEqual(c.rgba, [0, 0, 0, 0]);
        c = new g.Color([10, 20, 30], {range: 100});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 1]);
        c = new g.Color([10, 20, 30, 40], {range: 100});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using a Color object', function () {
        var c;
        c = new g.Color({r: 0.1, g: 0.2, b: 0.3});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 1.0]);
        c = new g.Color({r: 0.1, g: 0.2, b: 0.3, a: 0.4});
        assert.deepEqual(c.rgba, [0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using a string', function () {
        var c;
        c = new g.Color('#ff3366');
        assert.deepEqual(c.rgba, [1, 0.2, 0.4, 1]);
    });

    it('can be constructed using a grayscale value', function () {
        var c;
        c = new g.Color(0.3);
        assert.deepEqual(c.rgba, [0.3, 0.3, 0.3, 1]);
        c = new g.Color(30, {range: 100});
        assert.deepEqual(c.rgba, [0.3, 0.3, 0.3, 1]);
        c = new g.Color(0.3, 0.5);
        assert.deepEqual(c.rgba, [0.3, 0.3, 0.3, 0.5]);
        c = new g.Color(30, 50, {range: 100});
        assert.deepEqual(c.rgba, [0.3, 0.3, 0.3, 0.5]);
    });

    it('can be parsed', function () {
        assert.deepEqual(g.Color.parse(null).rgba, [0.0, 0.0, 0.0, 0.0]);
        assert.deepEqual(g.Color.parse(undefined).rgba, [0.0, 0.0, 0.0, 0.0]);
        assert.deepEqual(g.Color.parse('cornflowerblue').rgba, [0.39, 0.58, 0.93, 1.0]);
        assert.deepEqual(g.Color.parse('none').rgba, [0.0, 0.0, 0.0, 0.0]);
        assert.deepEqual(g.Color.parse(new g.Color(0.1, 0.2, 0.3, 0.4)).rgba, [0.1, 0.2, 0.3, 0.4]);
        assert.throws(function() { g.Color.parse(true); });
    });

    it('can be converted to a hexadecimal value', function () {
        assert.equal(new g.Color(0, 0, 0).toHex(), '#000000');
        assert.equal(new g.Color(0.01, 0.01, 0.01).toHex(), '#030303');
        assert.equal(new g.Color(0.1, 0.5, 0.9).toHex(), '#1A80E6');
        assert.equal(new g.Color(0.99, 0.99, 0.99).toHex(), '#FCFCFC');
        assert.equal(new g.Color(1, 1, 1).toHex(), '#FFFFFF');
        assert.equal(new g.Color(1, 1, 1, 0.5).toHex(), '#FFFFFF80');
    });

    it('has aliased properties', function () {
        var c = new g.Color(0.1, 0.2, 0.3, 0.4);
        assert.equal(c.red, c.r);
        assert.equal(c.green, c.g);
        assert.equal(c.blue, c.b);
        assert.equal(c.alpha, c.a);
        assert.deepEqual(c.rgb, [c.r, c.g, c.b]);
        assert.deepEqual(c.rgba, [c.r, c.g, c.b, c.a]);

        var hsb = g.color.rgb2hsb(c.r, c.g, c.b);
        assert.equal(c.h, hsb[0]);
        assert.equal(c.hue, hsb[0]);
        assert.equal(c.s, hsb[1]);
        assert.equal(c.saturation, hsb[1]);
        assert.equal(c.v, hsb[2]);
        assert.equal(c.value, hsb[2]);
        assert.equal(c.brightness, hsb[2]);
    });

    it('can be converted to CSS', function () {
        var c = new g.Color(0.1, 0.2, 0.3, 0.4);
        assert.equal(g.Color.toCSS(), 'black', 'Empty color is black');
        assert.equal(g.Color.toCSS(null), 'none', 'null is none, meaning no color');
        assert.equal(g.Color.toCSS('red'), 'red', 'strings are kept as-is');
        assert.equal(g.Color.toCSS(c), 'rgba(26, 51, 77, 0.4)', 'color objects are converted');
        assert.throws(function() { g.Color.toCSS(new g.Point()); });
    });

});

describe('Color utilities', function () {

    it('can convert a color to a hexadecimal value', function () {
        assert.equal(g.color.rgb2hex(0, 0, 0), '#000000');
        assert.equal(g.color.rgb2hex(0.01, 0.01, 0.01), '#030303');
        assert.equal(g.color.rgb2hex(0.1, 0.5, 0.9), '#1A80E6');
        assert.equal(g.color.rgb2hex(0.99, 0.99, 0.99), '#FCFCFC');
        assert.equal(g.color.rgb2hex(1, 1, 1), '#FFFFFF');
    });

});


describe('Drawables', function () {

    it('can discover if something is drawable', function () {
        assert(g.isDrawable(g.demoRect()));
        assert(g.isDrawable(new g.Point()));
        assert(g.isDrawable(new g.Color(1, 0, 0)));
        assert(g.isDrawable(new g.Text('Hello', 10, 10)));

        assert(!g.isDrawable(null));
        assert(!g.isDrawable(0));
        assert(!g.isDrawable([]));
        assert(!g.isDrawable([0]));
    });

    it('can get the bounds', function () {
        assert.deepEqual(g.bounds(g._rect(10, 20, 30, 40)).xywh, [10, 20, 30, 40]);
        assert.deepEqual(g.bounds([new g.Point(10, 20), new g.Point(30, 40)]).xywh, [10, 20, 20, 20]);

        assert.deepEqual(g.bounds([]).xywh, [0, 0, 0, 0]);
        assert.deepEqual(g.bounds(42).xywh, [0, 0, 0, 0]);
    });

});

describe('The grid generator', function () {

    it('generates grids', function () {
        var grid = g.grid(3, 3, 100, 100);
        assert.equal(grid.length, 3 * 3);
    });

});

describe('The polygon command', function () {

    it('generates polygons', function () {
        var p3 = g.polygon(g.Point.ZERO, 100, 3);
        assert.equal(p3.commands.length, 3 + 1); // Extra close command
        var p5 = g.polygon(g.Point.ZERO, 100, 5);
        assert.equal(p5.commands.length, 5 + 1);
    });

});

describe('The colorize filter', function () {

    it('works on paths', function () {
        var p = new g.Path(),
            p2;
        p.addRect(10, 20, 30, 40);
        p2 = g.colorize(p, 'blue', 'red', 5);
        assert.equal(p2.fill, 'blue');
        assert.equal(p2.stroke, 'red');
        assert.equal(p2.strokeWidth, 5);
    });

    it('works on groups', function () {
        var g1 = g.group(g.demoRect()),
            g2,
            p1,
            p2;
        g2 = g.colorize(g1, 'blue', 'red', 5);
        p1 = g1.shapes[0];
        p2 = g2.shapes[0];
        assert.equal(p1.fill, 'black');
        assert(p1.stroke === null);
        assert.equal(p1.strokeWidth, 1);
        assert.equal(p2.fill, 'blue');
        assert.equal(p2.stroke, 'red');
        assert.equal(p2.strokeWidth, 5);
    });

});

describe('The centroid filter', function () {
    it ('works on paths', function () {
        var r = new g.rect(g.Point.ZERO, 100, 100);
        assert.deepEqual(g.centroid(r).xy, [0, 0]);
        var e = new g.ellipse(g.Point.ZERO, 100, 100);
        assert.deepEqual(g.centroid(e).xy, [0, 0]);
    });
});

describe('The reflect filter', function () {
    it('works on paths', function () {
        var r = new g._rect(0, 0, 100, 100);
        var rr = g.reflect(r);
        assertRectsAlmostEqual(rr.bounds(), new g.Rect(0, -100, 100, 100));
    });
});

describe('The snap filter', function () {
    it('works on paths', function () {
        var p1 = new g._ellipse(0, 0, 100, 100);
        var p2 = g.snap(p1, 50);
        assert.equal(p2.commands.length, p1.commands.length);
        assertXYEqual(p2.commands[0], 0, 50);
        assertXYEqual(p2.commands[1], 50, 0);
        assertXYEqual(p2.commands[2], 100, 50);
        assertXYEqual(p2.commands[3], 50, 100);
        assertXYEqual(p2.commands[4], 0, 50);
    });
});

describe('The SVG module', function () {
    it('can parse rects', function () {
        var r = g.svg.parseString('<rect x="10" y="20" width="30" height="40" fill="blue"/>');
        assert.deepEqual(r.bounds().xywh, [10, 20, 30, 40]);
        assert.deepEqual(r.fill.rgba, [0, 0, 1, 1]);
    });

    it('can parse paths', function () {
        var p = g.svg.parseString('<path d="M10,20 L30,40 L100,0 Z" fill="red"/>');
        assert.deepEqual(p.commands[0], {type: g.bezier.MOVETO, x: 10, y: 20});
        assert.deepEqual(p.commands[1], {type: g.bezier.LINETO, x: 30, y: 40});
        assert.deepEqual(p.commands[2], {type: g.bezier.LINETO, x: 100, y: 0});
        assert.deepEqual(p.commands[3], {type: g.bezier.CLOSE});
        assert.deepEqual(p.fill.rgba, [1, 0, 0, 1]);
    });

    it('can parse groups', function () {
        var p = g.svg.parseString('<g><rect x="10" y="20" width="30" height="40" fill="blue"/></g>');
        assert.equal(p.shapes.length, 1);
        var r = p.shapes[0];
        assert.deepEqual(r.fill.rgba, [0, 0, 1, 1]);
    });
});
