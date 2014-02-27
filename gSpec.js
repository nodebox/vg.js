/*jslint sloppy:true, nomen:true */
/*global require, describe, xdescribe, it, xit, expect */

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
        expect(segmentLengths[0]).toBe(100);
        expect(segmentLengths[1]).toBe(50);
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
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        expect(p.toSVG()).toBe('<path d="M10 20L30 40Z"/>');
    });

    it('can clone itself', function () {
        var p, newP;
        p = new g.Path();
        p.fill = 'red';
        p.stroke = 'green';
        p.strokeWidth = 5;
        // p.tags = {'foo': true};
        p.moveTo(33, 66);
        newP = p.clone();
        expect(newP.segments).toEqual([
            {type: 'M', point: new g.Point(33, 66)}
        ]);
        expect(newP.fill).toBe('red');
        expect(newP.stroke).toBe('green');
        // expect(newP.hasTag('foo')).toBeTruthy();
    });

    it('can be resampled', function () {
        var p = new g.Path(),
            newPath;
        p.addRect(10, 20, 30, 40);
        newPath = p.resampleByAmount(100);
        expect(newPath.segments.length).toBe(101); // 100 lines + 1 close segment
    });

});

describe('A group', function () {

    it('can render itself to SVG', function () {
        var group, p;
        group = new g.Group();
        expect(group.toSVG()).toBe('<g></g>');
        p = new g.Path();
        p.moveTo(10, 20);
        p.lineTo(30, 40);
        p.close();
        group = g.group([p]);
        expect(group.toSVG()).toBe('<g><path d="M10 20L30 40Z"/></g>');
    });

    it('can clone itself', function () {
        var group, newGroup;
        group = new g.Group();
        group.add(g.demoRect());
        // group.tag('foo', function () {
        //     return true;
        // });
        newGroup = group.clone();
        expect(newGroup.shapes.length).toBe(1);
        // expect(newGroup.paths[0].hasTag('foo')).toBeTruthy();
        // expect(newGroup.hasTag('foo')).toBeTruthy();
    });

    xit('can be tagged', function () {
        var group, p1, p2;
        group = new g.Group();
        p1 = new g.Path();
        p2 = new g.Path();
        group.paths = [p1, p2];

        expect(group.findByTag('foo')).toEqual([]);
        group.tag('foo', function () {
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
        p1 = new g.Path();
        p1.addRect(10, 20, 30, 40);
        group = g.group([p1]);
        expect(group.bounds()).toEqual(new g.Rect(10, 20, 30, 40));
        p2 = new g.Path();
        p2.addRect(100, 200, 10, 10);
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

describe('Drawables', function () {

    it('can discover if something is drawable', function () {
        expect(g.isDrawable(g.demoRect())).toBeTruthy();
        expect(g.isDrawable(new g.Point())).toBeTruthy();

        expect(g.isDrawable(null)).toBeFalsy();
        expect(g.isDrawable(0)).toBeFalsy();
        expect(g.isDrawable([])).toBeFalsy();
        expect(g.isDrawable([0])).toBeFalsy();
        expect(g.isDrawable(new g.Color(1, 0, 0))).toBeFalsy();
    });

    it('can get the bounds', function () {
        expect(g.bounds(g._rect(10, 20, 30, 40)).xywh).toEqual([10, 20, 30, 40]);
        expect(g.bounds([new g.Point(10, 20), new g.Point(30, 40)]).xywh).toEqual([10, 20, 20, 20]);

        expect(g.bounds([]).xywh).toEqual([0, 0, 0, 0]);
        expect(g.bounds(42).xywh).toEqual([0, 0, 0, 0]);
    });

});


describe('The grid generator', function () {

    it('generates grids', function () {
        var grid = g.grid(3, 3, 100, 100);
        expect(grid.length).toBe(3 * 3);
    });

});

describe('The colorize filter', function () {

    it('works on paths', function () {
        var p = new g.Path(),
            p2;
        p.addRect(10, 20, 30, 40);
        p2 = g.colorize(p, 'blue', 'red', 5);
        expect(p2.fill).toBe('blue');
        expect(p2.stroke).toBe('red');
        expect(p2.strokeWidth).toBe(5);
    });

    it('works on groups', function () {
        var g1 = g.group(g.demoRect()),
            g2,
            p1,
            p2;
        g2 = g.colorize(g1, 'blue', 'red', 5);
        p1 = g1.shapes[0];
        p2 = g2.shapes[0];
        expect(p1.fill).toBe('black');
        expect(p1.stroke).toBeNull();
        expect(p1.strokeWidth).toBe(1);
        expect(p2.fill).toBe('blue');
        expect(p2.stroke).toBe('red');
        expect(p2.strokeWidth).toBe(5);
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
