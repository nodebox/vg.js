/*jslint sloppy:true, nomen:true */
/*global require, describe, xdescribe, it, xit, expect, _, g,  */

var _ = require('underscore'),
    g = require('./g.js');

describe('The math module', function () {

    it('can sum numbers', function () {
        expect(g.math.sum([])).toBe(0);
        expect(g.math.sum([1])).toBe(1);
        expect(g.math.sum([1, 2, 3])).toBe(6);
    });

    it('can round numbers', function () {
        expect(g.math.round(0.1)).toBe(0);
        expect(g.math.round(0.9)).toBe(1);
        expect(g.math.round(1.234, 1)).toBe(1.2);
        expect(g.math.round(1.289, 1)).toBe(1.3);
        expect(g.math.round(123, -1)).toBe(120);
        expect(g.math.round(123, -2)).toBe(100);
    });

    it('can clamp numbers', function () {
        expect(g.math.clamp(5, -10, 10)).toBe(5);
        expect(g.math.clamp(-100, -10, 10)).toBe(-10);
        expect(g.math.clamp(100, -10, 10)).toBe(10);
        expect(g.math.clamp(42, 0, 0)).toBe(0);
        // You can switch min / max
        expect(g.math.clamp(-100, -10, 10)).toBe(-10);
        expect(g.math.clamp(-100, 10, -10)).toBe(-10);
    });

    it('can interpolate two numbers', function () {
        expect(g.math.mix(0, 100, 0)).toBe(0);
        expect(g.math.mix(0, 100, 1)).toBe(100);
        expect(g.math.mix(0, 100, -1)).toBe(-100);
        expect(g.math.mix(0, 100, 2)).toBe(200);
        expect(g.math.mix(0, 100, -1, true)).toBe(0);
        expect(g.math.mix(0, 100, 2, true)).toBe(100);
    });

    it('can snap numbers', function () {
        expect(g.math.snap(0, 100)).toBe(0);
        expect(g.math.snap(49, 100)).toBe(0);
        expect(g.math.snap(50, 100)).toBe(100);

        expect(g.math.snap(50, 100, 0)).toBe(50);
        expect(g.math.snap(50, 100, 0.5)).toBe(75);
        expect(g.math.snap(50, 100, 1)).toBe(100);
    });

    it('can generate noise', function () {
        expect(g.math.noise(0, 0, 0)).toBe(0.5);
        expect(g.math.round(g.math.noise(0.1, 0.2, 0.3), 3)).toBe(0.676);
    });

});

describe('The bezier module', function () {

    it('can calculate line lengths', function () {
        expect(g.bezier.lineLength(0, 0, 100, 0)).toBe(100);
        expect(g.bezier.lineLength(100, 0, 0, 0)).toBe(100);
        expect(Math.round(g.bezier.lineLength(0, 0, 50, 50))).toBe(71);
    });

    it('can calculate segment lengths', function () {
        var segments = [], segmentLengths;
        segments.push(g.moveTo(0, 0));
        segments.push(g.lineTo(100, 0));
        segments.push(g.lineTo(100, 50));
        segments.push(g.close());
        segmentLengths = g.bezier.segmentLengths(segments);
        expect(segmentLengths.length).toBe(segments.length - 1);
        expect(segmentLengths[0]).toBe(100)
        expect(segmentLengths[1]).toBe(50)
        expect(Math.round(segmentLengths[2])).toBe(112);
    });

});

describe('A point', function () {

    it('has a sane constructor', function () {
        expect(new g.Point().xy).toEqual([0, 0]);
        expect(new g.Point(3, 5).xy).toEqual([3, 5]);
    });

});

describe('A path', function () {

    it('can render itself to SVG', function () {
        var p;
        p = new g.Path()
            .moveTo(10, 20)
            .lineTo(30, 40)
            .close();
        expect(p.toSVG()).toBe('<path d="M10 20L30 40Z"/>');
    });

    xit('can clone itself', function () {
        var p, newP;
        p = new g.Path();
        p.fill = 'red';
        p.stroke = 'green';
        p.strokeWidth = 5;
        p.tags = {'foo': true};
        p.moveTo(33, 66);
        newP = p.clone();
        expect(newP.commands).toEqual([
            {type: 'M', x: 33, y: 66}
        ]);
        expect(newP.fill).toBe('red');
        expect(newP.stroke).toBe('green');
        expect(newP.hasTag('foo')).toBeTruthy();
    });

});

describe('A group', function () {

    it('can render itself to SVG', function () {
        var group, p;
        group = new g.Group();
        expect(group.toSVG()).toBe('<g></g>');
        p = new g.Path()
            .moveTo(10, 20)
            .lineTo(30, 40)
            .close();
        group = g.group([p]);
        expect(group.toSVG()).toBe('<g><path d="M10 20L30 40Z"/></g>');
    });

    xit('can clone itself', function () {
        var group, newGroup;
        group = new g.Group();
        group.paths.push(g.DEMO_RECT.clone());
        group.tag('foo', function () {
            return true;
        });
        newGroup = group.clone();
        expect(newGroup.paths.length).toBe(1);
        expect(newGroup.paths[0].hasTag('foo')).toBeTruthy();
        expect(newGroup.hasTag('foo')).toBeTruthy();
    });

    xit('can be tagged', function () {
        var group, p1, p2;
        group = new g.Group();
        p1 = new g.Path();
        p2 = new g.Path();
        group.paths = [p1, p2];

        expect(group.findByTag('foo')).toEqual([]);
        group.tag('foo', function (p) {
            return true;
        });
        expect(group.findByTag('foo')).toEqual([p1, p2]);
        group.tag('bar', function (p) {
            return p === p1;
        });
        expect(group.findByTag('bar')).toEqual([p1]);
    });

    it('has bounds', function () {
        var group, p1, p2;
        group = new g.Group();
        expect(group.bounds()).toEqual(new g.Rect(0, 0, 0, 0));
        p1 = new g.Path()
            .rect(10, 20, 30, 40);
        group = g.group([p1]);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 30, 40));
        p2 = new g.Path()
            .rect(100, 200, 10, 10);
        group = g.group([p1, p2]);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 100, 190));
    });

});

describe('A color', function () {

    it('has a default constructor', function () {
        var c = new g.Color();
        expect(c.rgba()).toEqual([0, 0, 0, 1]);
    });

    it('can be constructed using numbers', function () {
        var c;
        c = new g.Color(0.1, 0.2, 0.3);
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 1]);
        c = new g.Color(0.1, 0.2, 0.3, 0.4);
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('can take a base', function () {
        var c;
        c = new g.Color(10, 20, 30, {base: 100});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 1]);
        c = new g.Color(10, 20, 30, 40, {base: 100});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using an array', function () {
        var c;
        c = new g.Color([0.1, 0.2, 0.3, 0.4]);
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 0.4]);
        c = new g.Color([0, 0, 0, 0]);
        expect(c.rgba()).toEqual([0, 0, 0, 0]);
        c = new g.Color([10, 20, 30], {base: 100});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 1]);
        c = new g.Color([10, 20, 30, 40], {base: 100});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using a Color object', function () {
        var c;
        c = new g.Color({r: 0.1, g: 0.2, b: 0.3});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 1.0]);
        c = new g.Color({r: 0.1, g: 0.2, b: 0.3, a: 0.4});
        expect(c.rgba()).toEqual([0.1, 0.2, 0.3, 0.4]);
    });

    it('can be constructed using a string', function () {
        var c;
        c = new g.Color('#ff3366');
        expect(c.rgba()).toEqual([1, 0.2, 0.4, 1]);
    });

    it('can be constructed using a grayscale value', function () {
        var c;
        c = new g.Color(0.3);
        expect(c.rgba()).toEqual([0.3, 0.3, 0.3, 1]);
        c = new g.Color(30, {base: 100});
        expect(c.rgba()).toEqual([0.3, 0.3, 0.3, 1]);
        c = new g.Color(0.3, 0.5);
        expect(c.rgba()).toEqual([0.3, 0.3, 0.3, 0.5]);
        c = new g.Color(30, 50, {base: 100});
        expect(c.rgba()).toEqual([0.3, 0.3, 0.3, 0.5]);
    });

    it('can be converted to a hexadecimal value', function () {
        expect(g._rgb2hex(0, 0, 0)).toEqual('#000000');
        expect(g._rgb2hex(0.01, 0.01, 0.01)).toEqual('#030303');
        expect(g._rgb2hex(0.1, 0.5, 0.9)).toEqual('#1A80E6');
        expect(g._rgb2hex(0.99, 0.99, 0.99)).toEqual('#FCFCFC');
        expect(g._rgb2hex(1, 1, 1)).toEqual('#FFFFFF');
    });

});

xdescribe('Tagging', function () {

    it('can tag shapes', function () {
        var shape = g.DEMO_GROUP.clone();
        shape.tag('foo', function () {
            return true;
        });
        expect(shape.hasTag('foo')).toBeTruthy();
        _.each(shape.paths, function (path) {
            expect(path.hasTag('foo')).toBeTruthy();
        });
    });

});
